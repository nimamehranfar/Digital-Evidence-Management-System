# DEMS Backend (Azure Functions, Node.js + TypeScript)

Backend for **Digital Evidence Management System (DEMS)**.

Deployed as **Azure Functions (Node.js v4 programming model)** behind **Azure API Management (APIM)**.

APIM base URL used by the frontend:

```
https://apim-dems1.azure-api.net/func-dems1
```

## What this backend does

### Identity + Authorization (Entra ID)

The backend validates Microsoft Entra access tokens and enforces RBAC **in code** (APIM also enforces as defense-in-depth).

Roles are read from the `roles` claim and only these role values are accepted:

- `admin`
- `detective`
- `case_officer`
- `prosecutor`

RBAC semantics (locked):

- **admin**: platform governance only (users + roles + departments). **NO access to cases/evidence/search.**
- **detective**: full CRUD across all departments/cases/evidence.
- **case_officer**: CRUD only within assigned department.
- **prosecutor**: read-only across all departments/cases/evidence.

Multi-role is supported: a user with any investigative role can access investigative endpoints; `admin` alone never grants investigative access.

### Evidence upload (SAS-based)

Evidence upload is **SAS-based**:

1) client calls `POST /api/evidence/upload-init`
2) backend returns a short-lived **User Delegation SAS URL**
3) client `PUT`s the file directly to Blob Storage
4) client calls `POST /api/evidence/upload-confirm`

Blob path convention (raw):

```
{caseId}/{evidenceId}/{fileName}
```

### Processing pipeline (blob-trigger)

Blob creation triggers a Function:

- OCR via **Azure AI Vision Read**
- updates evidence status in **Cosmos DB**
- pushes searchable fields (including `extractedText`) into **Azure AI Search** index `evidence-idx`

No Event Grid is used.

## API routes (final)

All routes are under the APIM base path `/func-dems1`.

Auth:

- `GET /api/auth/me`

Departments (admin-only mutating):

- `GET /api/departments`
- `POST /api/departments` (admin)
- `PATCH /api/departments/{id}` (admin)
- `DELETE /api/departments/{id}` (admin)  **cascades delete**: deletes cases + evidence under that department

Cases (investigative):

- `GET /api/cases` (investigative read; case_officer is scoped)
- `POST /api/cases` (detective/case_officer)
- `GET /api/cases/{caseId}` (scoped)
- `PATCH /api/cases/{caseId}` (detective/case_officer; scoped)
- `DELETE /api/cases/{caseId}` (detective/case_officer; scoped) **cascades delete** evidence
- `POST /api/cases/{caseId}/notes` (detective/case_officer; scoped)

Evidence (investigative):

- `GET /api/evidence` (investigative read; supports `?caseId=`)
- `POST /api/evidence/upload-init` (detective/case_officer; scoped by case department)
- `POST /api/evidence/upload-confirm` (detective/case_officer; scoped)
- `GET /api/evidence/id/{evidenceId}` (scoped)
- `DELETE /api/evidence/id/{evidenceId}` (detective/case_officer; scoped)
- `GET /api/evidence/id/{evidenceId}/status` (scoped)
- `GET /api/evidence/search` (scoped for case_officer)

Users (platform governance):

- `GET /api/users` (admin; lists Cosmos users container records)
- `PATCH /api/users/{oid}` (admin; set `department` for case officers, optional displayName/email)
- `POST /api/users` (admin; optional Graph provisioning; requires Graph config)

## Cosmos DB model (final)

Containers (names match Function App settings):

- `departments` partition key: `/id`
- `cases` partition key: `/department`
- `evidence` partition key: `/caseId`
- `users` partition key: `/id`

Relationship enforcement:

- A case must reference an existing department.
- Evidence upload-init requires an existing case.
- Evidence records store `department` copied from the case so search scoping is reliable.

Delete constraints (server-side):

- Department delete cascades to all cases and all evidence under those cases.
- Case delete cascades to all evidence in that case.

## Local development

### Prereqs

- Node.js 18+
- Azure Functions Core Tools v4 (`func`)
- Azure CLI (`az`)

### Install

```bash
cd backend
npm ci
```

### Local settings

- `local.settings.json` is used for local runs.
- OCR and other Azure access uses `DefaultAzureCredential`.

Typical flow:

```bash
az login
cd backend
npm run start
```

Local URL:

```
http://localhost:7071
```

## Deploy (manual)

```bash
cd backend
npm ci
npm run build
func azure functionapp publish func-dems1
```

## CI/CD (GitHub Actions)

Workflow file:

- `.github/workflows/azure-functions-backend.yml`

It uses **OIDC** (no client secret) via `azure/login` and publishes using `func azure functionapp publish`.

GitHub repo variables required:

- `AZURE_CLIENT_ID` (Entra app / service principal)
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

You must configure a Federated Credential on the Entra app for GitHub Actions.

## Testing

PowerShell scripts:

- `backend/scripts/test-happy-path.ps1`
- `backend/scripts/test-rbac.ps1`

These scripts hit APIM (not the Functions hostname) and require an access token.

## Known limits

- `POST /api/users` Graph provisioning is optional and not required for production; portal invitation + app roles is recommended.
- Evidence delete is implemented, but “audit trail / legal retention” is not implemented (future feature).
