# DEMS — API & Cloud Architecture (Final)

This document describes the final, deployed API contract and how the frontend integrates with it.

---

## 1) High-level architecture

- **Frontend**: Azure Static Web Apps (React)
- **API front door**: **Azure API Management (APIM)**
- **Backend**: **Azure Functions (Node.js + TypeScript)**
- **Auth**: Microsoft **Entra ID (Workforce)** with **MSAL redirect** in the frontend and JWT validation in backend/APIM
- **Evidence storage**: Azure Blob Storage
- **Processing**: Blob-triggered Functions (OCR/extraction pipeline)
- **Search**: Azure AI Search indexing (search endpoint exposed via Functions)

Frontend base URL (APIM):
- `https://apim-dems1.azure-api.net/func-dems1`

---

## 2) Frontend integration strategy

The frontend has a clean API abstraction layer with mock/real parity:

```
Pages/Components
      ↓
Contexts (AuthContext, CaseContext)
      ↓
API Layer (authApi, departmentApi, caseApi, evidenceApi)
      ↓
     /     /   Mock API  Real API (APIM)
```

- **Real API** calls include `Authorization: Bearer <access_token>` from MSAL.
- **Mock API** implements the same request/response shapes to allow offline demos.

---

## 3) Final API contract (must match backend)

### Auth
- `GET /api/auth/me`

### Departments
- `GET /api/departments`
- `POST /api/departments` (admin)
- `PATCH /api/departments/{id}` (admin)
- `DELETE /api/departments/{id}` (admin, cascade)

### Cases
- `GET /api/cases`
- `POST /api/cases`
- `GET /api/cases/{caseId}`
- `PATCH /api/cases/{caseId}`
- `DELETE /api/cases/{caseId}`
- `POST /api/cases/{caseId}/notes`

### Evidence
- `POST /api/evidence/upload-init`
- `PUT` to Blob SAS URL (client-side)
- `POST /api/evidence/upload-confirm`
- `GET /api/evidence`
- `GET /api/evidence/id/{evidenceId}`
- `DELETE /api/evidence/id/{evidenceId}`
- `GET /api/evidence/id/{evidenceId}/status`
- `GET /api/evidence/search`

### Users (admin only)
- `GET /api/users`
- `PATCH /api/users/{oid}` (assign/update case_officer department)

---

## 4) RBAC (strict semantics)

- **admin**: governance only (departments + users). **No** cases/evidence/search access.
- **detective**: full CRUD across all departments/cases/evidence.
- **case_officer**: CRUD only within assigned department.
- **prosecutor**: read-only across all departments/cases/evidence.

The frontend enforces RBAC in routes and UI controls, and the backend is authoritative.

---

## 5) Evidence upload (SAS) sequence

1. `POST /api/evidence/upload-init`
   - backend returns `{ evidenceId, sasUrl, blobPath, ... }`
2. Frontend `PUT` file bytes directly to `sasUrl` (BlockBlob)
3. `POST /api/evidence/upload-confirm`
4. Frontend polls `GET /api/evidence/id/{evidenceId}/status` until `COMPLETED` or `FAILED`
5. Search uses `GET /api/evidence/search` (Azure Search index behind the scenes)

---

## 6) What is intentionally NOT part of the final system

- No analytics endpoints or UI.
- No sign-up / registration flows (closed workforce system).
- No in-app user creation (users are created/invited and assigned roles in Entra portal).
