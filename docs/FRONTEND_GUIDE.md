# DEMS — Frontend Guide (Final)

This document focuses on **frontend-facing** behavior: auth, RBAC, mock/real parity, and the evidence flow.

---

## 1) Modes

### Real mode (default)
- MSAL redirect login with Microsoft-hosted Entra ID UI.
- API calls go to APIM and include bearer token.

### Mock mode (offline demo)
- Final production behavior: mock mode is not switchable by URL or browser storage.
- Toggle is a code constant in `frontend/src/api/config.js`.
- Login screen lets you pick a role and (for case_officer) a department.
- Mock APIs mirror the exact endpoint shapes used by the real APIs.

---

## 2) Authentication

- Flow: MSAL redirect
- Scope: `REACT_APP_ENTRA_API_SCOPE`
- After login, the frontend calls:
  - `GET /api/auth/me`

### Build-time env vars (Static Web Apps)

This frontend is Create React App. `REACT_APP_*` variables are embedded at build time.

For Azure Static Web Apps deployments from GitHub, inject these via GitHub Secrets during the workflow build:

- `REACT_APP_API_BASE_URL`
- `REACT_APP_ENTRA_TENANT_ID`
- `REACT_APP_ENTRA_CLIENT_ID`
- `REACT_APP_ENTRA_AUTHORITY`
- `REACT_APP_ENTRA_API_SCOPE`

### Client-side routing (Static Web Apps)

The app uses React Router. Static Web Apps must rewrite unknown paths (e.g. `/login`, `/cases/123`) to `/index.html`.

This repo includes `frontend/public/staticwebapp.config.json` to enable navigation fallback.

`/api/auth/me` is the **source of truth** for:
- display name
- roles
- department (for case_officer, if exposed)

---

## 3) RBAC enforcement in UI

### Routing guards
- Admin-only:
  - `/departments`
  - `/users`
- Investigative (admin blocked):
  - `/dashboard`, `/cases`, `/cases/:id`, `/search`
- Upload (write roles only):
  - `/upload` (detective + case_officer)
- Everyone:
  - `/profile`

### Button-level permissions
- prosecutor: hide/disable all write actions (create/edit/delete/upload)
- detective: full permissions
- case_officer: permissions only inside their department (backend enforces this)

---

## 4) Error handling

- 401: not logged in or token invalid/expired → user should re-login (UI shows Not Authorized / redirects to login)
- 403: RBAC forbidden → UI shows “Not authorized” without crashing

---

## 5) Evidence upload flow

The upload page follows SAS flow:

1) `POST /api/evidence/upload-init`  
2) `PUT` the bytes to the returned Blob SAS URL  
3) `POST /api/evidence/upload-confirm`  
4) Poll `GET /api/evidence/id/{evidenceId}/status` until `COMPLETED`/`FAILED`

Mock mode simulates the same contract and status progression:
- UPLOADED → PROCESSING → COMPLETED

---

## 6) Removed features

- Analytics UI and any analytics API usage.
- Self-registration / sign-up flows.
- In-app user creation: handled in Entra portal.
