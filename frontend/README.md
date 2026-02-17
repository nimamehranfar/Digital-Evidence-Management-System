# Digital Evidence Management System — Frontend

This is the React frontend for the Digital Evidence Management System (DEMS).

- **Real mode**: Microsoft Entra ID (Workforce) via **MSAL redirect** + backend behind **APIM**.
- **Mock mode**: local in-browser mocks with the **same request/response contracts** as real mode.

The backend is Azure Functions (Node.js + TypeScript) behind APIM:

- Base URL: `https://apim-dems1.azure-api.net/func-dems1`

---

## 1) Requirements

- Node.js 18+ recommended
- npm

---

## 2) Environment variables (REAL mode)

Create `frontend/.env` with the exact keys below (these already exist in this repo’s `frontend/.env`):

```env
REACT_APP_API_BASE_URL=https://apim-dems1.azure-api.net/func-dems1
REACT_APP_ENTRA_TENANT_ID=2b14e728-abf9-4076-8465-8c1520df0e48
REACT_APP_ENTRA_CLIENT_ID=f5697764-8b86-4cb8-beda-3f986ee268f5
REACT_APP_ENTRA_AUTHORITY=https://login.microsoftonline.com/2b14e728-abf9-4076-8465-8c1520df0e48
REACT_APP_ENTRA_API_SCOPE=api://5c696d12-ced1-409f-bde9-5806053165b3/access_as_user
```

**Notes**
- `REACT_APP_API_BASE_URL` must point to the APIM front door (no extra `/api` in this value).
- `REACT_APP_ENTRA_API_SCOPE` is the scope used when acquiring an access token for the Functions API.

---

## 3) Run commands

### Install

```bash
cd frontend
npm install
```

### Start (dev)

```bash
npm start
```

### Build

```bash
npm run build
```

Expected outcomes:
- `npm run build` completes with no errors.
- Browser opens at `http://localhost:3000` (dev).

---

## 4) Mock mode vs Real mode

### Real mode (default)

Real mode is the default behavior.

- Login uses **Microsoft-hosted** Entra ID login page (MSAL redirect).
- After login, the frontend calls `GET /api/auth/me` and drives UI permissions from the response.

### Mock mode (for offline demo)

Mock mode is toggled without inventing new env vars. It uses the existing `USE_MOCK` switch in `frontend/src/api/config.js`, but you can toggle it at runtime:

- URL param: `
  Example: `http://localhost:3000/
- URL param: `?mock=0` forces real mode
- localStorage: `localStorage.setItem("USE_MOCK","true")` (or `"false"`)

Mock mode expected outcomes:
- Login screen shows a role dropdown (admin / detective / case_officer / prosecutor).
- All pages work without Azure, using mocks that match real API contracts.

---

## 5) Authentication (MSAL redirect)

- Sign-in is handled by MSAL redirect using:
  - `REACT_APP_ENTRA_CLIENT_ID`
  - `REACT_APP_ENTRA_AUTHORITY`
  - `REACT_APP_ENTRA_API_SCOPE`

Closed system rules:
- **No self-registration UI**
- Users are **created/invited by admins in Entra ID portal**
- Role assignment happens in the portal (app roles), not in the frontend

---

## 6) RBAC rules enforced in the UI (and backed by the API)

### Roles

- **admin**: governance only (Departments + Users). **No access** to cases/evidence/search.
- **detective**: full CRUD across all departments/cases/evidence.
- **case_officer**: CRUD only within their assigned department.
- **prosecutor**: read-only across all departments/cases/evidence.

### UI expectations by role

- **admin**
  - Can open: `/departments`, `/users`, `/profile`
  - Cannot open: `/dashboard`, `/cases`, `/upload`, `/search`
- **prosecutor**
  - Read-only: buttons for create/edit/delete/upload are hidden/disabled
- **case_officer**
  - Department-scoped: UI and backend prevent cross-department access

---

## 7) Evidence upload flow (SAS-based)

Upload sequence used by the frontend:

1. `POST /api/evidence/upload-init`
2. `PUT` file bytes directly to the returned **Blob SAS URL**
3. `POST /api/evidence/upload-confirm`
4. Poll: `GET /api/evidence/id/{evidenceId}/status` until `COMPLETED` or `FAILED`

This matches the backend design:
- Blob-trigger processing
- Search indexing
- Status transitions

---

## 8) Common issues & meaning

### 401 Unauthorized
- Not logged in (missing/expired token), or token acquisition failed.

### 403 Forbidden
- Role not allowed (RBAC). The UI prevents access, but direct navigation may still hit 403 from the API.

### CORS
- If APIM/Functions CORS is misconfigured, calls from `localhost:3000` will fail.
  (Backend/Azure CORS is expected to be handled in Part 3.)

---

## 9) Frontend API routes implemented (final contract)

Auth:
- `GET /api/auth/me`

Departments:
- `GET /api/departments`
- `POST /api/departments` (**admin**)
- `PATCH /api/departments/{id}` (**admin**)
- `DELETE /api/departments/{id}` (**admin**, cascade)

Cases:
- `GET /api/cases`
- `POST /api/cases`
- `GET /api/cases/{caseId}`
- `PATCH /api/cases/{caseId}`
- `DELETE /api/cases/{caseId}`
- `POST /api/cases/{caseId}/notes`

Evidence:
- `POST /api/evidence/upload-init`
- `POST /api/evidence/upload-confirm`
- `GET /api/evidence`
- `GET /api/evidence/id/{evidenceId}`
- `DELETE /api/evidence/id/{evidenceId}`
- `GET /api/evidence/id/{evidenceId}/status`
- `GET /api/evidence/search`

Users (**admin**):
- `GET /api/users`
- `PATCH /api/users/{oid}` (assign/update case_officer department)

---

## 10) What was intentionally removed

- Analytics UI and any analytics API usage (not used in this project)
- Any registration / sign-up flows (closed system)
- Any in-app “Create user” flows (handled in Entra ID portal)



## Azure Static Web Apps: environment variables (React build-time)

React (Create React App) reads `REACT_APP_*` variables **at build time**, not at runtime.

Because `.env` is not committed, you must provide these values to the GitHub Actions build:

1. In GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**
2. Create these secrets (names must match exactly):

- `REACT_APP_API_BASE_URL`
- `REACT_APP_ENTRA_TENANT_ID`
- `REACT_APP_ENTRA_CLIENT_ID`
- `REACT_APP_ENTRA_AUTHORITY`
- `REACT_APP_ENTRA_API_SCOPE`

3. The workflow `.github/workflows/azure-static-web-apps-*.yml` exports them as job env vars so the SWA build embeds them.

If any of these are missing, MSAL may crash at runtime (example error: `Cannot read properties of undefined (reading 'endsWith')`).


## Mock mode

Mock mode is hard-coded in `src/api/config.js`:

- `export const USE_MOCK = false;` (real mode)
- `export const USE_MOCK = true;` (mock mode)

Change it, rebuild, redeploy.
