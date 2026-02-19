# Digital Evidence Management System (DEMS)

A cloud-native, closed-workforce platform for managing digital evidence across investigation cases and departments. Built entirely on Microsoft Azure with strict role-based access control, a SAS-based evidence upload pipeline, automated text and audio extraction, and full-text search.

> **Sub-system documentation:**
> - Frontend file tree, auth flow, and page details → [`frontend/README.md`](./frontend/README.md)
> - Backend file tree, API internals, and processing pipeline → [`backend/README.md`](./backend/README.md)
> - Full API contract → [`docs/API_ARCHITECTURE.md`](./docs/API_ARCHITECTURE.md)

> There are legacy mock API files inside `frontend/src/api/mock/` — these are a development artefact and have never been used in production.

---

## Table of Contents

1. [What the System Does](#1-what-the-system-does)
2. [Azure Services Used and Why](#2-azure-services-used-and-why)
3. [How All Services Connect](#3-how-all-services-connect)
4. [Authentication — How Sign-In Works](#4-authentication--how-sign-in-works)
5. [Roles and Permissions](#5-roles-and-permissions)
6. [How Users Are Added and Assigned Roles](#6-how-users-are-added-and-assigned-roles)
7. [Department and Case Workflow](#7-department-and-case-workflow)
8. [Evidence Workflow — End to End](#8-evidence-workflow--end-to-end)
9. [Accepted File Types and What Happens to Each](#9-accepted-file-types-and-what-happens-to-each)
10. [Repository Layout](#10-repository-layout)
11. [Running the Project Locally](#11-running-the-project-locally)
12. [Deploying to Azure](#12-deploying-to-azure)
13. [CI/CD Pipeline](#13-cicd-pipeline)

---

## 1. What the System Does

DEMS gives detectives and prosecutors a single platform to:

- Organise investigative work into **Departments** and **Cases**
- Upload any digital evidence file — images, PDFs, audio, documents, video
- **Automatically extract searchable text** from those files using Azure AI services (OCR, speech-to-text, document parsing)
- **Search** across all evidence full-text, powered by Azure AI Search
- Enforce strict role-based rules so each user only sees what they are permitted to see, enforced both at the API layer and in the frontend UI

The system is **closed** — there is no public registration page. All users are created by an administrator directly in the Microsoft Entra ID portal and assigned an app role before they can log in.

---

## 2. Azure Services Used and Why

### Microsoft Entra ID (Workforce)
The identity provider for the entire system. Two app registrations exist:

- **`dems-frontend`** — SPA registration used by the browser MSAL client (redirect URI: SWA origin). Granted delegated permission to `dems-api`.
- **`dems-api`** — API registration that exposes the `access_as_user` scope and defines app roles (`admin`, `detective`, `prosecutor`). The backend validates tokens against this registration's audience.

Sign-in flow is entirely Microsoft-hosted (no custom login UI). Users click "Sign in with Microsoft", are redirected to Microsoft's login page, authenticate, and are redirected back to the application.

---

### Azure Static Web Apps (SWA) — `swa-dems`
Hosts the compiled React frontend. Provides a globally distributed CDN, built-in GitHub Actions integration for automatic deployment on push to `main`, and native support for SPA client-side routing via `staticwebapp.config.json` (rewrites all unknown paths to `/index.html` so React Router can handle them).

All `REACT_APP_*` environment variables are embedded at build time through GitHub Secrets — they are baked into the JavaScript bundle and are not runtime-configurable.

**Why SWA:** Zero server management, tight GitHub Actions integration, free global CDN, and native SPA routing support.

---

### Azure API Management (APIM) — `apim-dems1`
The single public entry point for every API call from the frontend. APIM sits in front of the Azure Functions backend and is responsible for:

- **JWT validation** — verifies the Entra-issued token audience (`api://5c6***`) and both v1 and v2 issuers before the request reaches the Function
- **CORS enforcement** — allows the SWA origin and `localhost:3000` in development
- **Stable public URL** — the frontend always targets `https://apim-dems1.azure-api.net/func-dems1`; the underlying Functions deployment can change without touching the frontend configuration

**Why APIM:** Decouples the stable API surface from the deployment runtime, provides a centralised auth enforcement point as defence-in-depth, and handles CORS globally.

---

### Azure Functions — `func-dems1`
The backend runtime. Written in **Node.js + TypeScript** using the Azure Functions v4 programming model (Consumption plan — scales to zero when idle). Hosts:

- All HTTP API handlers: auth, departments, cases, evidence
- A **Blob-triggered** processing pipeline that fires automatically whenever a new evidence file lands in Blob Storage

The backend performs its own JWT validation **in addition to APIM's** as defence-in-depth. Roles are extracted from the `roles` claim in the validated token and used to enforce RBAC at the function level.

**Why Functions:** Serverless, no infrastructure management, native Blob trigger support, Managed Identity for secure secret access, and scales with demand.

---

### Azure Cosmos DB — `cos-dems1`
NoSQL document store (Core SQL API) for all application metadata. Four containers:

| Container | Partition Key | Stores |
|---|---|---|
| `departments` | `/id` | Department name and description |
| `cases` | `/department` | Case title, status, notes array, timestamps |
| `evidence` | `/caseId` | Evidence metadata, processing status, extracted text |
| `users` | `/id` | Lightweight user records (OID as key) |

Cascade delete relationships are enforced server-side in code:
- Deleting a **Department** deletes all its Cases and all Evidence under those Cases
- Deleting a **Case** deletes all Evidence within it

**Why Cosmos DB:** Flexible schema for evolving data models, native `DefaultAzureCredential` authentication (no connection string in production), and efficient partition-key-based queries for per-department and per-case access patterns.

---

### Azure Blob Storage — `stdems1`
Two containers store evidence files:

- `evidence-raw` — original files as uploaded, path pattern: `{caseId}/{evidenceId}/{fileName}`
- `evidence-derived` — reserved for future derived outputs from the processing pipeline

Evidence files are **never routed through the backend application code**. The backend issues a short-lived **User Delegation SAS URL** valid for 15 minutes; the browser uploads the raw file bytes directly to Blob Storage using a `PUT` request. This keeps large file transfers off the Functions runtime and avoids request size limits.

**Why SAS-based upload:** Prevents the backend from becoming a bottleneck for large files, eliminates file-size limits imposed by the Functions runtime, and keeps network transfer costs low.

---

### Azure AI Search — `srch-dems1`
Hosts a full-text search index named `evidence-idx`. After each evidence file is processed by the blob-trigger pipeline, an indexable document is pushed to this index containing: `id`, `caseId`, `department`, `fileName`, `fileType`, `uploadedAt`, `uploadedBy`, `status`, `description`, `tags`, and `extractedText`.

The Search page in the frontend queries this index via `GET /api/evidence/search`, supporting free-text queries plus filters by `caseId`, `department`, `status`, and `tag`.

**Why AI Search:** Purpose-built for full-text search with relevance ranking, filtering, faceting, and pagination — all in a managed service with no infrastructure to operate.

---

### Azure Computer Vision — `vis-dems`
Used by the blob-trigger pipeline to perform **OCR** on image files and PDF documents. The Vision v3.2 Read API processes the binary file asynchronously, polling until results are ready, then returns structured lines of recognised text. These lines are concatenated and stored as `extractedText` in the Cosmos evidence record, then pushed to the Search index.

**API used:** `POST /vision/v3.2/read/analyze` → poll `Operation-Location` until `succeeded`

The Vision API key is stored in Key Vault as secret `vis-key1` and referenced by the Function App via a Key Vault reference — never stored in plaintext.

**Why Azure AI Vision:** Native Azure service, no GPU infrastructure required, handles multi-page PDFs and a wide range of image formats.

---

### Azure Speech Service
Used by the blob-trigger pipeline to **transcribe audio evidence** to text. The backend uses the `microsoft-cognitiveservices-speech-sdk` with **continuous recognition** mode — unlike single-utterance recognition, continuous mode handles audio files of any length correctly by collecting all recognised utterance segments until the stream ends.

The transcribed text is stored as `extractedText` in Cosmos and pushed to the Search index, making audio evidence fully searchable by content.

**Required environment variables:** `SPEECH_KEY`, `SPEECH_REGION` (e.g. `eastus`)

**Why Speech SDK continuous recognition:** Single-utterance recognition (`recognizeOnceAsync`) only captures the first ~15 seconds. Continuous recognition correctly handles interview recordings, body cam audio, and other long-form files.

---

### Azure Key Vault — `kv-dems1`
Stores sensitive credentials that must never appear in plaintext:

- `vis-key1` — Azure AI Vision API key

The Function App uses a **System-Assigned Managed Identity** to authenticate to Key Vault at runtime. Key Vault references in the Function App configuration (format: `@Microsoft.KeyVault(SecretUri=...)`) are resolved automatically — no secrets are stored in plaintext in application settings. The Speech key is similarly referenced via Key Vault.

**Why Key Vault + Managed Identity:** Eliminates the need to rotate secrets in app settings. The Managed Identity is a first-party Azure identity with no credentials to manage or rotate.

---

## 3. How All Services Connect

```
┌─────────────────────────────────────────────────────────────┐
│                   Microsoft Entra ID                         │
│  dems-frontend (SPA)        dems-api (API + App Roles)       │
│  Client ID: f5697764-...    Audience: api://5c696d12-...     │
│  App Roles: admin, detective, prosecutor                     │
└──────────────┬──────────────────────────────────────────────┘
               │  MSAL redirect flow  ↕  JWT (roles + audience)
               │
┌──────────────▼──────────────────────────────────────────────┐
│        Azure Static Web Apps — swa-dems                      │
│        React SPA · globally distributed CDN                  │
│        staticwebapp.config.json → SPA route rewrites         │
└──────────────┬──────────────────────────────────────────────┘
               │  HTTPS · Authorization: Bearer <Entra JWT>
               │
┌──────────────▼──────────────────────────────────────────────┐
│        Azure API Management — apim-dems1                     │
│        https://apim-dems1.azure-api.net/func-dems1           │
│        · JWT validation (audience + issuer)                  │
│        · CORS policy                                         │
│        · Route forwarding to Azure Functions                 │
└──────────────┬──────────────────────────────────────────────┘
               │  Internal HTTP
               │
┌──────────────▼──────────────────────────────────────────────┐
│        Azure Functions — func-dems1                          │
│        Node.js v4 · TypeScript · Consumption plan            │
│                                                              │
│  HTTP Triggers: auth · departments · cases · evidence        │
│  Blob Trigger:  evidenceBlobIngest (evidence-raw container)  │
│                                                              │
│  ┌─────────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │  Cosmos DB       │  │  Blob Storage │  │  AI Search    │  │
│  │  cos-dems1       │  │  stdems1      │  │  srch-dems1   │  │
│  │  4 containers    │  │  evidence-raw │  │  evidence-idx │  │
│  └─────────────────┘  │  evid.-derived│  └───────────────┘  │
│                        └───────────────┘                     │
│  ┌─────────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │  Key Vault       │  │  AI Vision    │  │  AI Speech    │  │
│  │  kv-dems1        │  │  vis-dems     │  │  (SDK)        │  │
│  │  vis-key1 secret │  │  OCR v3.2     │  │  continuous   │  │
│  └─────────────────┘  └───────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
               ↑
               │  Browser PUT (file bytes, no backend involved)
               │  SAS URL (15-min expiry, write-only)
┌──────────────┴──────────────────────────────────────────────┐
│        Browser (SWA) — direct upload to Blob Storage         │
└─────────────────────────────────────────────────────────────┘
```

**Managed Identity role assignments** required on `func-dems1`:

| Service | Role |
|---|---|
| Azure Blob Storage | Storage Blob Data Contributor |
| Azure Cosmos DB | Cosmos DB Built-in Data Contributor |
| Azure AI Search | Search Index Data Contributor |
| Azure Key Vault | Key Vault Secrets User |

---

## 4. Authentication — How Sign-In Works

The system uses **MSAL redirect flow** (`@azure/msal-browser` only. There is no custom login UI; all authentication is handled by Microsoft's hosted login page.

### Sign-In Sequence

```
1. User visits DEMS → unauthenticated → redirected to /login
2. User clicks "Sign in with Microsoft"
3. msalInstance.loginRedirect() → browser navigates to Microsoft login
4. User enters credentials on Microsoft-hosted page
5. Microsoft issues a token and redirects back to the SWA origin
6. index.js bootstrap (before React renders):
     a. msalInstance.initialize()
     b. clearMsalInteractionLocks()     ← clears any stale state
     c. msalInstance.handleRedirectPromise()  ← processes hash, caches tokens
     d. msalInstance.setActiveAccount()
7. React renders → AuthContext runs:
     a. acquireTokenSilent() → gets Bearer token for dems-api scope
     b. GET /api/auth/me via APIM → { id, name, roles }
8. user set in state → ProtectedRoute passes → role-appropriate page renders
```

### Token Refresh

If `acquireTokenSilent` fails with `InteractionRequiredAuthError` (token expired, consent required):
- `acquireToken()` in `msalInstance.js` automatically calls `acquireTokenRedirect()`
- Browser goes to Microsoft using the existing SSO session — no login prompt appears
- Microsoft returns a fresh token; the user sees only a brief redirect

### MSAL Configuration Decisions

| Setting | Value | Why |
|---|---|---|
| `navigateToLoginRequestUrl` | `false` | Prevents MSAL from re-navigating back to `/login` after redirect, which caused the user to get stuck on the login page |
| `cacheLocation` | `localStorage` | Tokens survive tab close and page refresh |
| `storeAuthStateInCookie` | `true` | Safari and some corporate proxies block storage writes during cross-origin redirect; cookie fallback prevents auth state loss |

---

## 5. Roles and Permissions

Roles are defined as **App Roles** in the `dems-api` Entra app registration. When a user signs in, Entra includes their assigned roles in the JWT `roles` claim. Both the APIM policy and the backend Functions code validate and enforce these roles — the frontend mirrors the same logic for UI control, but the backend is always authoritative.

| Role | Access |
|---|---|
| `admin` | Manage departments only. **Zero access** to cases, evidence, or search. |
| `detective` | Full CRUD on all cases and evidence across all departments. Can upload, edit, delete. |
| `prosecutor` | Read-only access to all cases and evidence. Cannot upload, create, edit, or delete anything. |

**Route guards in the frontend:**

| Page / Route | Allowed roles |
|---|---|
| `/departments` | `admin`, `detective`, `prosecutor` |
| `/dashboard` | `detective`, `prosecutor` |
| `/cases`, `/cases/:id` | `detective`, `prosecutor` |
| `/upload` | `detective` |
| `/search` | `detective`, `prosecutor` |
| `/profile` | all authenticated users |

The `admin` role is explicitly blocked from investigative pages — seeing case or evidence data is not in scope for system administrators.

---

## 6. How Users Are Added and Assigned Roles

This is a **closed workforce system**. There is no self-registration flow anywhere in the application.

**To add a new user:**

1. Open [Microsoft Entra admin center](https://entra.microsoft.com)
2. Navigate to **Users** → **New user** → Create a new member user in the tenant, or use **Invite user** for an external collaborator
3. After the user is created, navigate to **Enterprise applications** → `dems-api` → **Users and groups** → **Add user/group**
4. Select the user and assign one of the app roles: `admin`, `detective`, or `prosecutor`
5. The user now receives an access token containing the assigned role in the `roles` claim when they next sign in
6. The user visits the SWA URL, clicks "Sign in with Microsoft", and authenticates with their tenant credentials

---

## 7. Department and Case Workflow

The data model enforces a strict **Department → Case → Evidence** hierarchy.

### Creating a Department (admin only)
1. Admin signs in → lands on `/departments`
2. Clicks "New Department" → enters name and optional description
3. `POST /api/departments` → stored in Cosmos `departments` container
4. All investigative users can now see the department in the Departments list

### Creating a Case (detective)
1. Detective navigates to `/cases` → clicks "New Case"
2. Selects a department, enters title and optional description
3. `POST /api/cases` → backend validates the department exists, stores case in Cosmos `cases` container (partitioned by `/department`)
4. Case appears in the case list and is accessible to other detectives and prosecutors

### Managing a Case
- **Edit title/status:** `PATCH /api/cases/{caseId}` — status values: `OPEN`, `CLOSED`, `ON_HOLD`
- **Add a note:** `POST /api/cases/{caseId}/notes` — notes are stored as an array inside the case document
- **Delete a note:** `DELETE /api/cases/{caseId}/notes/{noteId}`
- **Delete a case:** `DELETE /api/cases/{caseId}` — cascades: all evidence under the case is also deleted from Cosmos, Blob Storage, and the Search index

---

## 8. Evidence Workflow — End to End

### Upload (SAS-based — no file goes through the backend)

```
1. Detective opens /upload or the upload section of a case
2. Selects or drag-drops a file
3. POST /api/evidence/upload-init
      { caseId, fileName, contentType? }
   ← { evidenceId, uploadUrl (SAS), blobPath, expiresOn }
4. Browser PUT file bytes directly to uploadUrl (Blob Storage)
      Header: x-ms-blob-type: BlockBlob
5. POST /api/evidence/upload-confirm
      { evidenceId, caseId, description?, userTags? }
   ← evidence record (status: UPLOADED)
6. Frontend polls GET /api/evidence/id/{evidenceId}/status
   until status = COMPLETED or FAILED
```

Blob path convention: `{caseId}/{evidenceId}/{fileName}`

### Processing Pipeline (automatic, no human action needed)

When a file lands in `evidence-raw`, the Blob trigger function `evidenceBlobIngest` fires:

```
Blob arrives in evidence-raw
    → Function reads evidenceId from blob path metadata
    → Loads evidence record from Cosmos
    → Idempotency check: if status = COMPLETED, skip
    → Transitions status → PROCESSING (upsert to Cosmos)
    → Branches by fileType:
          image / pdf   → Azure AI Vision OCR → extractedText
          text          → UTF-8 decode → extractedText
          audio         → Azure AI Speech continuous recognition → extractedText
          docx          → mammoth library text extraction → extractedText
          video / other → no extraction, mark COMPLETED immediately
    → Transitions status → COMPLETED (upsert to Cosmos with extractedText)
    → Pushes indexable document to Azure AI Search evidence-idx
```

### Search

```
GET /api/evidence/search?q=knife&caseId=...&department=...&status=COMPLETED&tag=fingerprint
    → backend queries Azure AI Search evidence-idx
    → returns { count, results: [...] }
```

### Evidence Management
- **View details:** `GET /api/evidence/id/{evidenceId}`
- **Get read URL:** `GET /api/evidence/id/{evidenceId}/read-url` → returns a 15-min SAS read URL for the raw file
- **Update tags:** `PATCH /api/evidence/id/{evidenceId}/tags` → `{ userTags: [...] }` — syncs to Cosmos and Search index
- **Delete:** `DELETE /api/evidence/id/{evidenceId}` — removes from Cosmos, deletes blob from Storage, removes from Search index

---

## 9. Accepted File Types and What Happens to Each

| File Type | Extensions | Processing | Result |
|---|---|---|---|
| Image | `.png .jpg .jpeg .bmp .tif .tiff .gif .webp` | Azure AI Vision OCR (v3.2 Read API) | Text extracted, stored in `extractedText`, indexed in Search |
| PDF | `.pdf` | Azure AI Vision OCR (v3.2 Read API) | Text extracted from all pages, stored in `extractedText`, indexed |
| Audio | `.wav .mp3 .m4a .aac .ogg .flac` | Azure AI Speech SDK (continuous recognition) | Transcribed to text, stored in `extractedText`, indexed |
| Document | `.docx` | mammoth library (Node.js, no Azure service) | Raw text extracted, stored in `extractedText`, indexed |
| Plain text | `.txt .log .csv .json .xml` | UTF-8 decode | Content stored directly as `extractedText`, indexed |
| Video | `.mp4 .mov .avi .mkv .webm` | None (no extraction) | Stored in Blob, marked COMPLETED, not indexed with text |
| Office (other) | `.pptx .xlsx` | None (no extraction) | Stored in Blob, marked COMPLETED, not indexed with text |

---

## 10. Repository Layout

```
/
├── frontend/                   React SPA (CRA, React 19)
│   ├── public/
│   │   ├── index.html
│   │   ├── staticwebapp.config.json  ← SPA route rewrites for SWA
│   │   └── ...
│   ├── src/
│   │   ├── auth/               MSAL configuration and singleton instance
│   │   ├── api/                API abstraction layer (real/ implementations)
│   │   ├── context/            AuthContext, CaseContext
│   │   ├── components/         Layout, ProtectedRoute
│   │   ├── pages/              One file per page/route
│   │   └── styles/main.css     Complete CSS design system
│   ├── package.json
│   └── README.md               ← Frontend details
│
├── backend/                    Azure Functions (Node.js v4 + TypeScript)
│   ├── src/
│   │   ├── config/env.ts       Zod-validated environment variable schema
│   │   ├── lib/                Shared libraries (auth, cosmos, storage, etc.)
│   │   ├── models/             TypeScript types and Zod schemas
│   │   └── functions/
│   │       ├── http/           HTTP-triggered API handlers
│   │       └── triggers/       Blob-triggered processing pipeline
│   ├── tsconfig.json
│   ├── package.json
│   ├── host.json
│   └── README.md               ← Backend details
│
├── docs/
│   └── API_ARCHITECTURE.md     Full API contract and architecture
│
├── .github/
│   └── workflows/
│       ├── azure-static-web-apps-*.yml   Frontend CI/CD → SWA
│       └── main_func-dems1.yml           Backend CI/CD → Azure Functions
│
├── .gitignore
└── README.md                   ← This file
```

---

## 11. Running the Project Locally

### Prerequisites

- Node.js 18+
- Azure Functions Core Tools v4 (`npm install -g azure-functions-core-tools@4`)
- Azure CLI (`az`)
- An active Azure subscription with all resources provisioned (see Part 1 report)
)

```bash
# Log in with Azure CLI — DefaultAzureCredential uses this for Cosmos, Blob, Search, Key Vault
az login

cd backend
npm install

# local.settings.json is used at runtime (NOT committed — contains sensitive values)
# Copy the example and fill in values from Azure Portal
nano local.settings.json

npm run start
# Azure Functions host starts at http://localhost:7071
```

---

## 12. Deploying to Azure

### Frontend (manual)

```bash
cd frontend
npm install
npm run build
# Deploy the build/ folder to Azure Static Web Apps via the Azure Portal
# or let the GitHub Actions workflow handle it automatically on push to main
```

### Backend (manual)

```bash
cd backend
npm install
npm run build       # compiles TypeScript to dist/
func azure functionapp publish func-dems1
```

> **APIM note:** After deploying new routes to the Function App, manually add the corresponding operations in APIM (Azure Portal → API Management → APIs → func-dems1 → Add operation). Deployment does not update APIM automatically.

---

## 13. CI/CD Pipeline

### Frontend → Azure Static Web Apps

**Workflow file:** `.github/workflows/azure-static-web-apps-delightful-beach-03107e803.yml`

Triggers on: push to `main`, pull request open/synchronise/reopen/close against `main`

What it does:
1. Checks out the repository
2. Runs `Azure/static-web-apps-deploy@v1` which internally runs `npm install` and `npm run build` inside `./frontend`
3. Injects all `REACT_APP_*` environment variables from GitHub Secrets into the build step (so they are baked into the bundle)
4. Deploys the `build/` output to SWA
5. On PR close: cleans up the preview environment

**Required GitHub Secrets for frontend build:**

| Secret | Value |
|---|---|
| `REACT_APP_API_BASE_URL` | `https://apim-dems1.azure-api.net/func-dems1` |
| `REACT_APP_ENTRA_TENANT_ID` | Entra tenant ID |
| `REACT_APP_ENTRA_CLIENT_ID` | `dems-frontend` client ID |
| `REACT_APP_ENTRA_AUTHORITY` | `https://login.microsoftonline.com/<tenantId>` |
| `REACT_APP_ENTRA_API_SCOPE` | `api://5c696d12-.../access_as_user` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_*` | SWA deployment token |

---

### Backend → Azure Functions

**Workflow file:** `.github/workflows/main_func-dems1.yml`

Triggers on: push to `main`, manual `workflow_dispatch`

What it does:
1. Checks out the repository
2. Sets up Node.js 22.x
3. Inside `./backend`: `npm install`, `npm run build`, `npm test` (no-op currently)
4. Zips the workspace as a release artifact
5. Authenticates to Azure using **OIDC** (Federated Credential — no client secret stored in GitHub)
6. Deploys using `Azure/functions-action@v1` to the `Production` slot of `func-dems1`

**Required GitHub Secrets for backend deploy:**

| Secret | Value |
|---|---|
| `AZUREAPPSERVICE_CLIENTID_*` | Service principal / app client ID for OIDC |
| `AZUREAPPSERVICE_TENANTID_*` | Entra tenant ID |
| `AZUREAPPSERVICE_SUBSCRIPTIONID_*` | Azure subscription ID |

OIDC is used (no `AZURE_CLIENT_SECRET`) — the GitHub Actions workflow identity is federated to an Entra app registration with a Federated Credential targeting the `main` branch.

All backend runtime secrets (Cosmos, Storage, Search, Vision, Speech) live in the **Azure Function App's Environment Variables** in the Azure Portal (not in GitHub), resolved from Key Vault references at runtime.

---