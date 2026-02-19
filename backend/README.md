# DEMS — Backend

Azure Functions (Node.js v4 programming model, TypeScript) deployed behind Azure API Management.

> For the high-level architecture and Azure service overview, see the [root README](../README.md).

APIM base URL used by the frontend:
```
https://apim-dems1.azure-api.net/func-dems1
```

---

## Table of Contents

1. [How the Backend Works](#1-how-the-backend-works)
2. [Authentication and Authorization](#2-authentication-and-authorization)
3. [Evidence Processing Pipeline](#3-evidence-processing-pipeline)
4. [Data Model](#4-data-model)
5. [Full File Tree with Explanations](#5-full-file-tree-with-explanations)
6. [Local Development](#6-local-development)
7. [Deploy to Azure](#7-deploy-to-azure)
8. [Managed Identity Role Assignments](#8-managed-identity-role-assignments)

---

## 1. How the Backend Works

The backend is a collection of Azure Functions — serverless HTTP handlers and one Blob-triggered function. All HTTP functions are registered under the `api/` path prefix (set in `host.json`) and are exposed publicly through Azure API Management.

Every HTTP function follows the same pattern:

```typescript
export async function handler(req: HttpRequest, context: InvocationContext) {
  if (req.method === "OPTIONS") return handleOptions(req);   // CORS preflight
  return safeHandler(req, context, async () => {
    const auth = await requireAuth(req);     // validate JWT, extract roles
    requireInvestigativeRead(auth);          // or requireRole(auth, ["admin"])
    // ... business logic using Cosmos, Storage, Search
    return json(200, result);
  });
}
```

`safeHandler` wraps the inner function in try/catch and maps known error messages (`"Missing Authorization"`, `"Missing required role"`, `"Forbidden"`) to the correct HTTP status codes, then applies CORS headers to every response.

---

## 2. Authentication and Authorization

### JWT Validation (`src/lib/auth.ts`)

Every request must carry an `Authorization: Bearer <token>` header. The token is validated using the `jose` library against Azure's JWKS endpoint for the tenant:

```
https://login.microsoftonline.com/{tenantId}/discovery/v2.0/keys
```

Validation checks:
- **Audience:** must be `ENTRA_API_AUDIENCE` (`api://5c696d12-...`)
- **Issuer:** accepts both v1 (`sts.windows.net/{tid}/`) and v2 (`login.microsoftonline.com/{tid}/v2.0`) issuers — Azure CLI tokens use v1, browser MSAL tokens use v2
- **Signature:** verified against live JWKS (keys are cached in memory after first fetch)

After validation, the `roles` claim is extracted and filtered to the known allowed values.

### RBAC (`src/lib/authz.ts`)

| Function | Meaning |
|---|---|
| `requireInvestigativeRead(auth)` | Requires `detective` or `prosecutor` |
| `requireInvestigativeWrite(auth)` | Requires `detective` |
| `requireInvestigativeDelete(auth)` | Requires `detective` |
| `requireRole(auth, ["admin"])` | Requires exact role match |
| `assertDepartmentAccess(auth, deptId)` | Detectives and prosecutors: always pass. Others: blocked. |

**Strict admin isolation:** Admin users have zero access to investigative endpoints. Having the `admin` role alone will return 403 on all cases and evidence routes.

---

## 3. Evidence Processing Pipeline

The Blob-triggered function (`src/functions/triggers/evidenceBlobIngest.ts`) fires automatically when a file lands in the `evidence-raw` container. It is the only non-HTTP function in the backend.

### Trigger binding

```
container: evidence-raw
path pattern: {caseId}/{evidenceId}/{fileName}
```

`caseId` and `evidenceId` are extracted from the blob path via trigger metadata.

### Processing branches

```
fileType == "image" or "pdf"
    → ocrRead(blob) [Azure Computer Vision]
    → poll Operation-Location until succeeded
    → extractedText = lines joined by \n

fileType == "text"
    → extractedText = blob.toString("utf-8")

fileType == "audio"
    → transcribeAudio(blob) [Azure Speech SDK, continuous recognition]
    → all recognised utterances collected
    → extractedText = segments joined by " "

fileType == "docx"
    → mammoth.extractRawText({ buffer: blob })
    → extractedText = result.value

fileType == "video", "office", "file", other
    → no extraction
    → mark COMPLETED immediately
```

### Status transitions

```
UPLOADED  →  PROCESSING  →  COMPLETED
                         →  FAILED (error stored in processingError field)
```

Idempotency: if `status == COMPLETED && processedAt` is already set, the function skips processing and returns. Safe to re-trigger.

### After extraction

1. Evidence record upserted to Cosmos with `extractedText`, `ocrLines`, `ocrLanguage`, `status: COMPLETED`, `processedAt`
2. Indexable document pushed to Azure AI Search index (`evidence-idx`) via `search.mergeOrUploadDocuments()`

---

## 4. Data Model

### Cosmos DB containers

**`departments`** (partition key: `/id`)
```typescript
{
  id: string          // partition key
  name: string
  description?: string
  createdAt: string
  createdBy?: string  // oid of admin who created
}
```

**`cases`** (partition key: `/department`)
```typescript
{
  id: string
  department: string  // partition key — must reference existing department
  title: string
  description?: string
  status: "OPEN" | "CLOSED" | "ON_HOLD"
  createdAt: string
  createdBy?: string
  updatedAt?: string
  notes?: Array<{ id, text, createdAt, createdBy? }>
}
```

**`evidence`** (partition key: `/caseId`)
```typescript
{
  id: string
  caseId: string        // partition key — must reference existing case
  department?: string   // copied from case at upload-init time
  fileName: string
  fileType: string      // "image" | "pdf" | "audio" | "text" | "docx" | "video" | "office" | "file"
  fileSize?: number
  contentType?: string
  blobPathRaw: string   // {caseId}/{evidenceId}/{fileName}
  blobUrlRaw: string
  uploadedAt: string
  uploadedBy?: string   // oid from token
  description?: string
  userTags?: string[]   // user-editable tags
  autoTags?: string[]   // reserved for future auto-tagging
  tags?: string[]       // combined: autoTags + userTags (pushed to Search index)
  status: "UPLOADED" | "PROCESSING" | "COMPLETED" | "FAILED"
  statusUpdatedAt: string
  extractedText?: string
  ocrLanguage?: string
  ocrLines?: number
  processingError?: string
  processedAt?: string
}
```

**`users`** (partition key: `/id`)
```typescript
{
  id: string        // Entra OID
  displayName?: string
  email?: string
  roles?: Role[]
  department?: string
  createdAt: string
}
```

### Cascade deletes (enforced server-side in `src/lib/cascadeDelete.ts`)

- `DELETE /api/departments/{id}` → deletes all cases in department → deletes all evidence in each case → deletes blobs → removes from Search index
- `DELETE /api/cases/{caseId}` → deletes all evidence in case → deletes blobs → removes from Search index
- `DELETE /api/evidence/id/{evidenceId}` → deletes blob → removes from Search index

### AI Search index schema (`evidence-idx`)

Key fields (all retrievable):

| Field | Type | Searchable | Filterable | Facetable |
|---|---|---|---|---|
| `id` | Edm.String (key) | — | ✅ | — |
| `caseId` | Edm.String | — | ✅ | ✅ |
| `department` | Edm.String | — | ✅ | ✅ |
| `fileName` | Edm.String | ✅ | — | — |
| `fileType` | Edm.String | — | ✅ | ✅ |
| `uploadedAt` | Edm.DateTimeOffset | — | ✅ | — |
| `uploadedBy` | Edm.String | — | ✅ | ✅ |
| `status` | Edm.String | — | ✅ | ✅ |
| `description` | Edm.String | ✅ | — | — |
| `tags` | Collection(Edm.String) | ✅ | ✅ | ✅ |
| `extractedText` | Edm.String | ✅ | — | — |

---

## 5. Full File Tree with Explanations

```
backend/
├── src/
│   │
│   ├── config/
│   │   └── env.ts
│   │         Zod schema that validates all environment variables on cold start.
│   │
│   ├── lib/
│   │   ├── auth.ts
│   │   │     JWT validation using the jose library. getBearerToken() extracts
│   │   │     the token from the Authorization header. requireAuth() validates
│   │   │     signature, audience, and both v1/v2 issuers via JWKS.
│   │   │     Extracts oid, tid, upn, name, and roles[] from the payload.
│   │   │     requireRole() throws if the user lacks any of the required roles.
│   │   │     JWKS keys are cached per tenantId after first fetch.
│   │   │
│   │   ├── authz.ts
│   │   │     Higher-level RBAC helpers built on top of auth.ts.
│   │   │     requireInvestigativeRead()   — detective or prosecutor
│   │   │     requireInvestigativeWrite()  — detective only
│   │   │     requireInvestigativeDelete() — detective only
│   │   │     assertDepartmentAccess()     — detectives/prosecutors pass through;
│   │   │                                   others are blocked
│   │   │     getCaseOfficerDepartment()   — looks up Cosmos users container for
│   │   │                                   the case_officer's assigned department
│   │   │
│   │   ├── cosmos.ts
│   │   │     Cosmos DB client singleton using DefaultAzureCredential (Managed
│   │   │     Identity in production, az login locally). getContainers() returns
│   │   │     typed container references for users, departments, cases, evidence.
│   │   │     Also exports upsert() and readById() helper wrappers.
│   │   │
│   │   ├── storage.ts
│   │   │     Azure Blob Storage client helpers. createUploadSas() generates a
│   │   │     User Delegation SAS (write-only, 15 min) for evidence-raw.
│   │   │     createReadSas() generates a read-only SAS for downloading evidence.
│   │   │     getContainerClient() returns a BlobServiceClient container reference.
│   │   │     Uses DefaultAzureCredential for User Delegation Key generation.
│   │   │
│   │   ├── search.ts
│   │   │     Azure AI Search client. getSearchClients() returns a SearchClient
│   │   │     (for querying and pushing documents to evidence-idx) and a
│   │   │     SearchIndexClient (for ensuring the index exists / creating it).
│   │   │     Exports EvidenceSearchDoc type matching the evidence-idx schema.
│   │   │     ensureEvidenceIndex() creates the index if it doesn't exist.
│   │   │     Uses DefaultAzureCredential.
│   │   │
│   │   ├── vision.ts
│   │   │     Azure AI Vision v3.2 Read API client. ocrRead(buffer) POSTs the
│   │   │     binary file to /vision/v3.2/read/analyze, then polls the returned
│   │   │     Operation-Location URL (750ms intervals, up to 20 attempts) until
│   │   │     status == "succeeded". Returns extracted text lines and language.
│   │   │     Vision key is resolved first from AI_VISION_KEY env var, then
│   │   │     falls back to Key Vault via readSecret().
│   │   │
│   │   ├── speech.ts
│   │   │     Azure AI Speech SDK client (microsoft-cognitiveservices-speech-sdk).
│   │   │     transcribeAudio(buffer, language?) uses continuous recognition mode
│   │   │     (not recognizeOnceAsync) so audio files of any length are handled
│   │   │     correctly. Pushes the entire buffer into an AudioInputStream, collects
│   │   │     all recognised utterance segments, and returns them joined as a
│   │   │     single text string with segment count. Uses SPEECH_KEY and
│   │   │     SPEECH_REGION from environment variables.
│   │   │
│   │   ├── cascadeDelete.ts
│   │   │     Server-side cascade delete logic used by department and case DELETE
│   │   │     handlers.
│   │   │     cascadeDeleteEvidence(evidence) — deletes blob from Storage, removes
│   │   │       document from Search index, deletes Cosmos record.
│   │   │     cascadeDeleteCase(caseId, deptId) — queries all evidence for the
│   │   │       case, calls cascadeDeleteEvidence for each, then deletes the case.
│   │   │     cascadeDeleteDepartment(deptId) — queries all cases for the dept,
│   │   │       calls cascadeDeleteCase for each, returns counts.
│   │   │
│   │   ├── http.ts
│   │   │     HTTP response helpers for Functions.
│   │   │     json(status, body) — returns HttpResponseInit with jsonBody.
│   │   │     problem(status, title, detail?) — returns JSON error body.
│   │   │     readJson(req) — reads and parses the request body as JSON.
│   │   │     getQuery(req) — converts req.query entries to a plain object.
│   │   │
│   │   ├── keyVault.ts
│   │   │     readSecret(kvUri, secretName) — fetches a secret from Azure Key
│   │   │     Vault using DefaultAzureCredential (Managed Identity in production).
│   │   │     Used by vision.ts to resolve the Vision API key from the vault.
│   │   │
│   │   └── users.ts
│   │         getUserRecord(oid) — fetches a user record from the Cosmos users
│   │         container by OID. Used by getCaseOfficerDepartment() in authz.ts
│   │         to resolve the department assignment for case_officer role scoping(currently unused).
│   │
│   ├── models/
│   │   ├── types.ts
│   │   │     TypeScript type definitions:
│   │   │     Department, CaseNote, Case, EvidenceStatus, Evidence, UserRecord.
│   │   │     These types are the single source of truth for data shapes used
│   │   │     across all function handlers and lib files.
│   │   │
│   │   └── schemas.ts
│   │         Zod validation schemas for all request bodies:
│   │         DepartmentCreateSchema, DepartmentUpdateSchema,
│   │         CaseCreateSchema, CaseUpdateSchema, CaseNoteCreateSchema,
│   │         EvidenceUploadInitSchema, EvidenceUploadConfirmSchema,
│   │         EvidenceTagsUpdateSchema, EvidenceSearchSchema,
│   │         UserCreateSchema, UserUpdateSchema.
│   │         All HTTP handlers parse request bodies through these schemas
│   │         before processing — invalid input throws a Zod error which
│   │         safeHandler maps to a 400/500 response.
│   │
│   └── functions/
│       ├── http/
│       │   ├── _middleware.ts
│       │   │     Cross-cutting concerns for all HTTP handlers.
│       │   │     withCors(req, resp) — adds CORS headers based on
│       │   │       CORS_ALLOWED_ORIGINS env var and the request's Origin header.
│       │   │     handleOptions(req) — returns 204 for CORS preflight (OPTIONS).
│       │   │     safeHandler(req, ctx, fn) — wraps the handler in try/catch,
│       │   │       maps auth/RBAC errors to 401/403, applies withCors to
│       │   │       every response including errors.
│       │   │
│       │   ├── authMe.ts
│       │   │     GET /api/auth/me
│       │   │     Validates the JWT (requireAuth), returns:
│       │   │     { id (oid), tenantId, username (upn), name, roles[] }
│       │   │     This is the frontend's single source of truth for the
│       │   │     signed-in user's identity and role set.
│       │   │
│       │   ├── departments.ts
│       │   │     GET /api/departments
│       │   │       All authenticated users. Returns all departments.
│       │   │     POST /api/departments (admin only)
│       │   │       Creates a department with uuid id.
│       │   │     PATCH /api/departments/{id} (admin only)
│       │   │       Updates name and/or description.
│       │   │     DELETE /api/departments/{id} (admin only)
│       │   │       Calls cascadeDeleteDepartment() then deletes the department.
│       │   │       Returns { ok, deletedDepartmentId, deletedCases, deletedEvidence }.
│       │   │
│       │   ├── cases.ts
│       │   │     GET /api/cases (investigative read)
│       │   │       Optionally filtered by ?department=. Returns all or filtered cases.
│       │   │     POST /api/cases (detective)
│       │   │       Validates department exists. Stores case with uuid id.
│       │   │     GET /api/cases/{caseId} (investigative read)
│       │   │       Returns single case document.
│       │   │     PATCH /api/cases/{caseId} (detective)
│       │   │       Updates title, description, status.
│       │   │     DELETE /api/cases/{caseId} (detective)
│       │   │       Calls cascadeDeleteCase() then deletes case record.
│       │   │     POST /api/cases/{caseId}/notes (detective)
│       │   │       Appends a note object to the case's notes array.
│       │   │     DELETE /api/cases/{caseId}/notes/{noteId} (detective)
│       │   │       Removes a note from the notes array by noteId.
│       │   │
│       │   ├── evidence.ts
│       │   │     POST /api/evidence/upload-init (detective)
│       │   │       Validates caseId exists. Generates evidenceId (uuid).
│       │   │       Calls createUploadSas() → returns { evidenceId, uploadUrl,
│       │   │       blobPath, expiresOn }. No Cosmos write yet.
│       │   │     POST /api/evidence/upload-confirm (detective)
│       │   │       Creates the evidence Cosmos record with status UPLOADED.
│       │   │       Copies department from the case record.
│       │   │     GET /api/evidence (investigative read)
│       │   │       Supports ?caseId= filter. Returns evidence list.
│       │   │     GET /api/evidence/id/{evidenceId} (investigative read)
│       │   │       Returns full evidence record including extractedText.
│       │   │     DELETE /api/evidence/id/{evidenceId} (detective)
│       │   │       Calls cascadeDeleteEvidence() — blob + Search + Cosmos.
│       │   │     GET /api/evidence/id/{evidenceId}/status (investigative read)
│       │   │       Returns { evidenceId, status, statusUpdatedAt,
│       │   │       processingError, processedAt } — used for upload polling.
│       │   │     GET /api/evidence/id/{evidenceId}/read-url (investigative read)
│       │   │       Generates a 15-min read SAS URL for the raw blob file.
│       │   │       Returns { readUrl, expiresOn }.
│       │   │     GET /api/evidence/search (investigative read)
│       │   │       Passes q, caseId, status, tag, top, skip to Azure AI Search.
│       │   │       Returns { count, results: EvidenceSearchDoc[] }.
│       │   │     PATCH /api/evidence/id/{evidenceId}/tags (detective)
│       │   │       Updates userTags array. Recomputes tags = autoTags + userTags.
│       │   │       Upserts Cosmos record. Syncs updated tags to Search index.
│       │   │
│       │   └── users.ts
│       │         GET /api/users (admin only)
│       │           Returns all records from Cosmos users container.
│       │         POST /api/users (admin only, not implemented)
│       │           Creates a user in Entra via Microsoft Graph API.
│       │           Requires GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, GRAPH_TENANT_ID.
│       │           Returns 501 if Graph credentials are not configured.
│       │           Recommended workflow: create users in Entra portal directly.
│       │         PATCH /api/users/{oid} (admin only, not implemented)
│       │           Updates department assignment and optional display name/email
│       │           in the Cosmos users container.
│       │
│       └── triggers/
│           └── evidenceBlobIngest.ts
│                 Blob-triggered function. Fires when a file lands in evidence-raw.
│                 Extracts caseId, evidenceId from blob path metadata.
│                 Loads evidence record from Cosmos. Checks idempotency.
│                 Transitions status → PROCESSING. Branches processing by fileType:
│                   image/pdf → ocrRead() [Azure AI Vision]
│                   text      → UTF-8 decode
│                   audio     → transcribeAudio() [Azure AI Speech SDK]
│                   docx      → mammoth.extractRawText()
│                   other     → skip extraction
│                 Upserts completed evidence to Cosmos.
│                 Pushes EvidenceSearchDoc to Azure AI Search index.
│                 On error: stores processingError, transitions status → FAILED.
│
├── host.json
│     Azure Functions host configuration. Sets the function app route prefix
│     and any global timeout settings.
│
├── tsconfig.json
│     TypeScript compiler config. Target: ES2022. Module: commonjs (required
│     by Functions v4). Output: dist/. Strict mode enabled.
│
├── package.json
│     Key runtime dependencies:
│     @azure/functions v4, @azure/identity, @azure/cosmos, @azure/storage-blob,
│     @azure/search-documents, @azure/keyvault-secrets,
│     microsoft-cognitiveservices-speech-sdk, @microsoft/microsoft-graph-client,
│     jose (JWT validation), mammoth (DOCX extraction), uuid, zod.
│     Scripts: build (tsc), start (func start), watch (tsc -w + func start).
│
├── .funcignore
│     Excludes TypeScript source, source maps, test files, local.settings.json,
│     and dev-only node_modules from the deployment package.
│
└── local.settings.json   [NOT committed]
      Used for local development. Contains all environment variables that the
      Function App reads. Set AzureWebJobsStorage to Azurite or a real storage
      connection for local blob trigger testing.
```

---

## 6. Local Development

### Prerequisites

- Node.js 18+
- Azure Functions Core Tools v4: `npm install -g azure-functions-core-tools@4`
- Azure CLI: `az login` (provides `DefaultAzureCredential` for Cosmos, Storage, Search, Key Vault)

### Install and run

```bash
cd backend
npm install
nano local.settings.json
# Fill in values from Azure Portal

az login   # authenticate for DefaultAzureCredential
npm run start
# Azure Functions host at http://localhost:7071
```

### Local blob trigger testing

Use Azurite to emulate Azure Storage locally:

```bash
npm run azurite   # starts Azurite on default ports
```

Then set `AzureWebJobsStorage` in `local.settings.json` to `UseDevelopmentStorage=true`.

Upload a blob to the local `evidence-raw` container to trigger `evidenceBlobIngest` locally.

---

## 7. Deploy to Azure

### Manual deploy

```bash
cd backend
npm install
npm run build        # compiles TypeScript → dist/
func azure functionapp publish func-dems1
```

### CI/CD (GitHub Actions)

Workflow: `.github/workflows/main_func-dems1.yml`

Authenticates with Azure via **OIDC** (no client secret in GitHub) using a Federated Credential on the Entra service principal. Runs `npm install`, `npm run build`, then deploys using `Azure/functions-action@v1`.

---

## 8. Managed Identity Role Assignments

The Function App (`func-dems1`) uses its **System-Assigned Managed Identity** to authenticate to all Azure services. No connection strings or API keys are stored in environment variables (except Vision and Speech keys, which are Key Vault references).

Required role assignments in Azure Portal:

| Resource | Role |
|---|---|
| `stdems1` (Storage) | Storage Blob Data Contributor |
| `cos-dems1` (Cosmos DB) | Cosmos DB Built-in Data Contributor |
| `srch-dems1` (AI Search) | Search Index Data Contributor |
| `kv-dems1` (Key Vault) | Key Vault Secrets User |
