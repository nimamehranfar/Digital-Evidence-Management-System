# DEMS — API Architecture (Complete & Final)

This document is the authoritative API contract for the Digital Evidence Management System. It covers every endpoint implemented in the backend, every endpoint called by the frontend, the full cloud architecture, RBAC model, Cosmos data model, Search index, and the evidence processing pipeline.

---

## 1. High-Level Architecture

```
Browser (React SPA on Azure Static Web Apps)
        ↓  HTTPS · Authorization: Bearer <Entra JWT>
Azure API Management — apim-dems1
  https://apim-dems1.azure-api.net/func-dems1
  · JWT validation (audience + issuer)
  · CORS enforcement
  · Route forwarding
        ↓  Internal HTTP
Azure Functions — func-dems1 (Node.js v4 + TypeScript)
  · Second-layer JWT validation (defence-in-depth)
  · RBAC enforcement in code
  · HTTP API handlers
  · Blob-triggered processing pipeline
        ↓  DefaultAzureCredential (Managed Identity)
  ┌─────────────────────┐   ┌──────────────────┐   ┌────────────────────┐
  │  Cosmos DB           │   │  Blob Storage     │   │  Azure AI Search   │
  │  cos-dems1           │   │  stdems1          │   │  srch-dems1        │
  │  4 containers        │   │  evidence-raw     │   │  evidence-idx      │
  └─────────────────────┘   │  evidence-derived │   └────────────────────┘
                             └──────────────────┘
  ┌─────────────────────┐   ┌──────────────────┐   ┌────────────────────┐
  │  Key Vault           │   │  Azure AI Vision  │   │  Azure AI Speech   │
  │  kv-dems1            │   │  vis-dems         │   │  Speech Service    │
  │  vis-key1            │   │  OCR v3.2         │   │  continuous recog. │
  └─────────────────────┘   └──────────────────┘   └────────────────────┘

Entra ID App Registrations:
  dems-frontend  — SPA, MSAL redirect, delegated scope → dems-api
  dems-api       — exposes access_as_user scope, defines app roles
```

---

## 2. Authentication

| Item | Value                                                                                     |
|---|-------------------------------------------------------------------------------------------|
| Auth provider | Microsoft Entra ID (Workforce, default tenant)                                            |
| Frontend library | `@azure/msal-browser` (redirect flow, no `@azure/msal-react`)                             |
| Token type | OAuth 2.0 Bearer (JWT)                                                                    |
| Audience | `api://5c6***`                                                                            |
| Scope | `api://5c69***/access_as_user`                                                            |
| Accepted issuers | v1: `https://sts.windows.net/{tid}/` · v2: `https://login.microsoftonline.com/{tid}/v2.0` |
| Role source | `roles` claim in the JWT                                                                  |
| Frontend tenant ID | `2b1***`                                                                                  |
| Frontend client ID | `f56***`                                                                                  |

---

## 3. RBAC Model

Roles are defined as App Roles in the `dems-api` Entra registration. Both APIM (policy layer) and the backend Functions (code layer) enforce them.

| Role | Allowed Actions |
|---|---|
| `admin` | Manage departments (CRUD). View department list. **Zero access to cases, evidence, or search.** |
| `detective` | Full CRUD on cases and evidence across all departments. Upload, edit, delete, search. |
| `prosecutor` | Read-only access to all cases and evidence. View, search, download. Cannot create, edit, or delete. |

---

## 4. Complete API Contract

All routes are prefixed with the APIM base path: `https://apim-dems1.azure-api.net/func-dems1`

Every request must include `Authorization: Bearer <token>` (except OPTIONS preflight).

---

### 4.1 Auth

#### `GET /api/auth/me`

Returns the authenticated user's identity and roles from the JWT. Called by the frontend on every app load to determine the user's role and drive RBAC.

**Authorization:** Any valid token (all roles)

**Response 200:**
```json
{
  "id": "oid-from-token",
  "tenantId": "tenant-id",
  "username": "user@tenant.onmicrosoft.com",
  "name": "Display Name",
  "roles": ["detective"]
}
```

---

### 4.2 Departments

#### `GET /api/departments`

Returns all departments. All authenticated users can list departments.

**Authorization:** All roles

**Response 200:**
```json
[
  {
    "id": "dept-uuid",
    "name": "Homicide Unit",
    "description": "...",
    "createdAt": "2024-01-01T00:00:00Z",
    "createdBy": "admin-oid"
  }
]
```

---

#### `POST /api/departments`

Creates a new department.

**Authorization:** `admin`

**Request body:**
```json
{
  "name": "NYPD",
  "description": "Optional description"
}
```

**Response 201:** Created department object

---

#### `PATCH /api/departments/{id}`

Updates department name and/or description.

**Authorization:** `admin`

**Request body:** (all fields optional)
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response 200:** Updated department object

---

#### `DELETE /api/departments/{id}`

Deletes the department. **Cascades:** deletes all cases and all evidence within the department (Cosmos records, blobs, Search index entries).

**Authorization:** `admin`

**Response 200:**
```json
{
  "ok": true,
  "deletedDepartmentId": "dept-uuid",
  "deletedCases": 3,
  "deletedEvidence": 12
}
```

---

### 4.3 Cases

#### `GET /api/cases`

Returns cases accessible to the caller. Supports optional `?department=` filter.

**Authorization:** `detective`, `prosecutor`

**Query params:** `department` (optional) — filter by department ID

**Response 200:** Array of case objects

---

#### `POST /api/cases`

Creates a new case. The referenced department must exist.

**Authorization:** `detective`

**Request body:**
```json
{
  "department": "dept-uuid",
  "title": "Case Title",
  "description": "Optional description",
  "status": "OPEN"
}
```

**Response 200:** Created case object

---

#### `GET /api/cases/{caseId}`

Returns a single case document including its `notes` array.

**Authorization:** `detective`, `prosecutor`

**Response 200:**
```json
{
  "id": "case-uuid",
  "department": "dept-uuid",
  "title": "Case Title",
  "status": "OPEN",
  "createdAt": "...",
  "notes": [
    { "id": "note-uuid", "text": "...", "createdAt": "...", "createdBy": "oid" }
  ]
}
```

---

#### `PATCH /api/cases/{caseId}`

Updates case title, description, and/or status.

**Authorization:** `detective`

**Request body:** (all fields optional)
```json
{
  "title": "Updated Title",
  "description": "...",
  "status": "CLOSED"
}
```

**Valid status values:** `OPEN`, `CLOSED`, `ON_HOLD`

**Response 200:** Updated case object

---

#### `DELETE /api/cases/{caseId}`

Deletes the case. **Cascades:** deletes all evidence within the case (Cosmos, Blob Storage, Search index).

**Authorization:** `detective`

**Response 200:** `{ "ok": true }`

---

#### `POST /api/cases/{caseId}/notes`

Appends a note to the case's notes array.

**Authorization:** `detective`

**Request body:**
```json
{ "text": "Note content here" }
```

**Response 200:** Updated case object with new note

---

#### `DELETE /api/cases/{caseId}/notes/{noteId}`

Removes a note from the case's notes array by noteId.

**Authorization:** `detective`

**Response 200:** Updated case object with note removed

---

### 4.4 Evidence

#### `POST /api/evidence/upload-init`

Step 1 of the SAS upload flow. Validates the case exists. Generates a new evidenceId and a short-lived (15 min) User Delegation SAS upload URL for the raw evidence blob. Does **not** create a Cosmos record yet.

**Authorization:** `detective`

**Request body:**
```json
{
  "caseId": "case-uuid",
  "fileName": "interview.mp3",
  "contentType": "audio/mpeg",
  "fileSize": 4096000
}
```

**Response 200:**
```json
{
  "evidenceId": "evidence-uuid",
  "uploadUrl": "https://stdems1.blob.core.windows.net/evidence-raw/{caseId}/{evidenceId}/{fileName}?<SAS>",
  "blobPath": "{caseId}/{evidenceId}/{fileName}",
  "expiresOn": "2024-01-01T00:15:00Z"
}
```

> The frontend also maps `uploadUrl` to `sasUrl` for backward compatibility.

---

#### `PUT <uploadUrl>` *(direct browser-to-Blob, no backend)*

Step 2 — browser uploads the file directly to Azure Blob Storage. The backend is **not involved**.

**Required header:** `x-ms-blob-type: BlockBlob`

**Content-Type:** the file's MIME type

---

#### `POST /api/evidence/upload-confirm`

Step 3 — creates the Cosmos evidence record after the blob upload completes. Copies `department` from the case. Sets initial status to `UPLOADED`. The blob trigger will fire asynchronously to begin processing.

**Authorization:** `detective`

**Request body:**
```json
{
  "evidenceId": "evidence-uuid",
  "caseId": "case-uuid",
  "description": "Interview with witness",
  "userTags": ["witness", "interview"]
}
```

**Response 200:** Evidence record with `status: "UPLOADED"`

---

#### `GET /api/evidence`

Lists evidence records. Supports `?caseId=` filter.

**Authorization:** `detective`, `prosecutor`

**Query params:** `caseId` (optional)

**Response 200:** Array of evidence objects

---

#### `GET /api/evidence/id/{evidenceId}`

Returns a single evidence record including `extractedText`, `ocrLines`, `ocrLanguage`, `tags`, and processing metadata.

**Authorization:** `detective`, `prosecutor`

**Response 200:** Full evidence object

---

#### `DELETE /api/evidence/id/{evidenceId}`

Deletes the evidence record from Cosmos, the raw blob from Blob Storage, and the document from the Search index.

**Authorization:** `detective`

**Response 200:** `{ "ok": true, "deletedEvidenceId": "evidence-uuid" }`

---

#### `GET /api/evidence/id/{evidenceId}/status`

Returns the current processing status. Used by the frontend to poll after upload-confirm until the blob trigger completes.

**Authorization:** `detective`, `prosecutor`

**Response 200:**
```json
{
  "evidenceId": "evidence-uuid",
  "status": "PROCESSING",
  "statusUpdatedAt": "2024-01-01T00:01:00Z",
  "processingError": null,
  "processedAt": null
}
```

**Status values:** `UPLOADED` → `PROCESSING` → `COMPLETED` | `FAILED`

---

#### `GET /api/evidence/id/{evidenceId}/read-url`

Generates a 15-minute read-only SAS URL for downloading or viewing the raw evidence file.

**Authorization:** `detective`, `prosecutor`

**Response 200:**
```json
{
  "readUrl": "https://stdems1.blob.core.windows.net/evidence-raw/...?<SAS>",
  "expiresOn": "2024-01-01T00:15:00Z"
}
```

---

#### `GET /api/evidence/search`

Full-text search across all evidence via Azure AI Search index `evidence-idx`.

**Authorization:** `detective`, `prosecutor`

**Query params:**

| Param | Type | Description |
|---|---|---|
| `q` | string | Free-text query (searches `extractedText`, `fileName`, `description`, `tags`) |
| `caseId` | string | Filter by case ID |
| `department` | string | Filter by department ID |
| `status` | string | Filter by status (`COMPLETED`, `FAILED`, etc.) |
| `tag` | string | Filter by tag (any/contains match) |
| `top` | number | Page size (default 20) |
| `skip` | number | Offset for pagination (default 0) |

**Response 200:**
```json
{
  "count": 42,
  "results": [
    {
      "id": "evidence-uuid",
      "caseId": "case-uuid",
      "department": "dept-uuid",
      "fileName": "interview.mp3",
      "fileType": "audio",
      "uploadedAt": "...",
      "status": "COMPLETED",
      "extractedText": "Witness stated that...",
      "tags": ["witness", "interview"]
    }
  ]
}
```

---

#### `PATCH /api/evidence/id/{evidenceId}/tags`

Updates the user-editable tags on an evidence record. Recomputes the `tags` field (autoTags + userTags) and syncs the update to the Azure AI Search index.

**Authorization:** `detective`

**Request body:**
```json
{
  "userTags": ["witness", "interview", "suspect"]
}
```

**Response 200:** Updated evidence object

---

### 4.5 APIM Operations List (verified)

The following operations are registered in APIM (`func-dems1` API):

```
GET    /api/auth/me
GET    /api/departments
POST   /api/departments
PATCH  /api/departments/{id}
DELETE /api/departments/{id}
GET    /api/cases
POST   /api/cases
GET    /api/cases/{caseId}
PATCH  /api/cases/{caseId}
DELETE /api/cases/{caseId}
POST   /api/cases/{caseId}/notes
DELETE /api/cases/{caseId}/notes/{noteId}
GET    /api/evidence
POST   /api/evidence/upload-init
POST   /api/evidence/upload-confirm
GET    /api/evidence/id/{evidenceId}
DELETE /api/evidence/id/{evidenceId}
GET    /api/evidence/id/{evidenceId}/status
GET    /api/evidence/id/{evidenceId}/read-url
GET    /api/evidence/search
PATCH  /api/evidence/id/{evidenceId}/tags
```

---

## 5. Evidence Upload Sequence Diagram

```
Frontend                    APIM + Backend              Blob Storage    Blob Trigger
   |                              |                         |               |
   | POST /evidence/upload-init   |                         |               |
   |----------------------------->|                         |               |
   |                              | validate JWT, case      |               |
   |                              | generate evidenceId     |               |
   |                              | generate SAS URL        |               |
   |<-----------------------------|                         |               |
   |  { evidenceId, uploadUrl }   |                         |               |
   |                              |                         |               |
   | PUT file bytes to uploadUrl  |                         |               |
   |-------------------------------------------------->|   |               |
   |  x-ms-blob-type: BlockBlob   |                         |               |
   |<--------------------------------------------------|   |               |
   |  HTTP 201 Created            |                         |               |
   |                              |                         |  blob created  |
   |                              |                         |-------------->|
   |                              |                         |               | load evidence
   |                              |                         |               | PROCESSING
   |                              |                         |               | OCR/Speech/...
   |                              |                         |               | COMPLETED
   |                              |                         |               | push to Search
   |                              |                         |               |
   | POST /evidence/upload-confirm|                         |               |
   |----------------------------->|                         |               |
   |                              | create Cosmos record    |               |
   |                              | status: UPLOADED        |               |
   |<-----------------------------|                         |               |
   |  evidence record             |                         |               |
   |                              |                         |               |
   | GET /evidence/id/{id}/status (poll every 2s)           |               |
   |----------------------------->|                         |               |
   |<-----------------------------|                         |               |
   |  { status: "COMPLETED" }     |                         |               |
```

---

## 6. Evidence Processing Pipeline

### File type → service mapping

| `fileType` | Extensions | Azure Service | Library |
|---|---|---|---|
| `image` | `.png .jpg .jpeg .bmp .tif .tiff .gif .webp` | Azure AI Vision v3.2 Read API | REST (fetch) |
| `pdf` | `.pdf` | Azure AI Vision v3.2 Read API | REST (fetch) |
| `audio` | `.wav .mp3 .m4a .aac .ogg .flac` | Azure AI Speech (continuous recognition) | `microsoft-cognitiveservices-speech-sdk` |
| `text` | `.txt .log .csv .json .xml` | None (UTF-8 decode) | Node.js built-in |
| `docx` | `.docx` | None (text extraction) | `mammoth` npm package |
| `video` | `.mp4 .mov .avi .mkv .webm` | None | — |
| `office` | `.pptx .xlsx` | None | — |
| `file` | other | None | — |

### Status lifecycle

```
upload-confirm written → status: UPLOADED
blob trigger starts   → status: PROCESSING
extraction completes  → status: COMPLETED (extractedText populated)
extraction fails      → status: FAILED (processingError populated)
```

Idempotency: if `status == COMPLETED && processedAt != null`, the trigger skips re-processing.

---

## 7. Azure AI Search Index Schema (`evidence-idx`)

```json
{
  "name": "evidence-idx",
  "fields": [
    { "name": "id",            "type": "Edm.String",               "key": true,  "retrievable": true, "filterable": true },
    { "name": "caseId",        "type": "Edm.String",               "retrievable": true, "filterable": true, "facetable": true, "sortable": true },
    { "name": "department",    "type": "Edm.String",               "retrievable": true, "filterable": true, "facetable": true, "sortable": true },
    { "name": "fileName",      "type": "Edm.String",               "retrievable": true, "searchable": true },
    { "name": "fileType",      "type": "Edm.String",               "retrievable": true, "filterable": true, "facetable": true },
    { "name": "uploadedAt",    "type": "Edm.DateTimeOffset",       "retrievable": true, "filterable": true, "sortable": true },
    { "name": "uploadedBy",    "type": "Edm.String",               "retrievable": true, "filterable": true, "facetable": true },
    { "name": "status",        "type": "Edm.String",               "retrievable": true, "filterable": true, "facetable": true, "sortable": true },
    { "name": "description",   "type": "Edm.String",               "retrievable": true, "searchable": true },
    { "name": "tags",          "type": "Collection(Edm.String)",   "retrievable": true, "searchable": true, "filterable": true, "facetable": true },
    { "name": "extractedText", "type": "Edm.String",               "retrievable": true, "searchable": true }
  ]
}
```

Documents are pushed/merged via `search.mergeOrUploadDocuments()` after each evidence upload-confirm and after each blob-trigger completion. Tags are re-synced on `PATCH /api/evidence/id/{evidenceId}/tags`.

---

## 8. Cosmos DB Partition Key Design

| Container | Partition Key | Rationale |
|---|---|---|
| `departments` | `/id` | Small collection, no cross-document queries needed |
| `cases` | `/department` | Allows efficient per-department queries; matches RBAC scoping |
| `evidence` | `/caseId` | Allows efficient per-case queries; matches natural access pattern |
| `users` | `/id` | OID-keyed, point-read optimised |

Cascade delete operations query across partition keys using cross-partition queries (no partition key specified) when needed, then delete items using their known partition keys.

---

## 9. Error Response Format

All API errors follow a consistent JSON format:

```json
{
  "error": {
    "title": "Brief error description",
    "detail": "More specific information about what went wrong",
    "status": 403
  }
}
```

| Status | Cause |
|---|---|
| 400 | Invalid request body (Zod validation failed) or missing required path/query parameter |
| 401 | Missing or invalid Authorization header; JWT signature or audience check failed |
| 403 | Authenticated but insufficient role (RBAC); or cross-department access attempt |
| 404 | Resource not found in Cosmos DB |
| 405 | Method not allowed for the route |
| 500 | Unexpected server error (logged in Application Insights / Function logs) |

---

## 10. What Is Intentionally Excluded

- No analytics endpoints or UI
- No self-registration or sign-up flows (closed workforce system)
- No soft-delete or audit trail (hard deletes only)
- No Event Grid (blob trigger is used directly instead)
- No real-time notifications (status is polled by the frontend)
