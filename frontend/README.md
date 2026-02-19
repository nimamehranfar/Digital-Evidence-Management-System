# DEMS — Frontend

React 19 single-page application deployed to **Azure Static Web Apps**.  
Authentication via **Microsoft Entra ID** using `@azure/msal-browser` (redirect flow).  
Backend: Azure Functions behind Azure API Management.

> For the high-level architecture and Azure service overview, see the [root README](../README.md).

---

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [Running Locally](#2-running-locally)
3. [How Authentication Works](#3-how-authentication-works)
4. [RBAC — Route and UI Guards](#4-rbac--route-and-ui-guards)
5. [Evidence Upload Flow](#5-evidence-upload-flow)
6. [Full File Tree with Explanations](#7-full-file-tree-with-explanations)

---

## 1. Environment Setup

All `REACT_APP_*` variables are **baked into the JavaScript bundle at build time** by Create React App. They are not runtime-injectable.
For local development, `frontend/.env` created:

```env
REACT_APP_API_BASE_URL
REACT_APP_ENTRA_TENANT_ID
REACT_APP_ENTRA_CLIENT_ID
REACT_APP_ENTRA_AUTHORITY
REACT_APP_ENTRA_API_SCOPE
```

For the deployed SWA, these are provided as **GitHub Secrets** and injected into the build step in the GitHub Actions workflow.

---

## 2. Running Locally

```bash
cd frontend
npm install
npm start           # http://localhost:3000
```

Build for production:

```bash
npm run build       # output in build/
```

---

## 3. How Authentication Works

### Bootstrap sequence (`src/index.js`)

The MSAL bootstrap runs **before React renders** to ensure tokens are in cache when `AuthContext` first runs:

```
1. msalInstance.initialize()
2. clearMsalInteractionLocks()
       clears both MSAL v2 and v3 interaction-lock keys from
       sessionStorage and localStorage — prevents stale locks from
       blocking handleRedirectPromise after an interrupted redirect
3. msalInstance.handleRedirectPromise()
       processes the hash fragment from the Entra redirect
       sets the active account if an account was returned
4. Pick first cached account if no account was set by step 3
       handles "already signed in, hard reload" case
5. ReactDOM.createRoot().render(<App />)
```

### Sign-in (`src/api/real/realAuthApi.js`)

```
User clicks "Sign in with Microsoft"
  → clearStaleMsalInteractionState()  (clears v2 + v3 lock keys)
  → msalInstance.loginRedirect({ scopes: [ENTRA_API_SCOPE], prompt: "select_account" })
  → Browser navigates to Microsoft-hosted login
  → User authenticates
  → Redirect back to window.location.origin
  → Bootstrap runs (step 3 above captures the redirect result)
  → AuthContext calls GET /api/auth/me → sets user state
  → LoginPage useEffect detects user → navigates to state.from or role default
```

### Token acquisition (`src/auth/msalInstance.js — acquireToken()`)

```
acquireTokenSilent() succeeds → returns access token
                   throws InteractionRequiredAuthError
                       → acquireTokenRedirect() (SSO session, no login prompt)
                       → browser redirects briefly, returns with fresh token
```

### Sign-out

```
msalInstance.logoutRedirect({ postLogoutRedirectUri: origin + "/login" })
→ Microsoft clears session
→ browser redirected to /login
→ MSAL cache cleared
```

---

## 4. RBAC — Route and UI Guards

### `ProtectedRoute` component

Wraps every protected route. Checks two things:
1. `user` is set (authenticated) — if not, redirects to `/login` with `{ state: { from: location } }` so the user lands on the intended page after sign-in
2. `requiredRole` array — if the user's roles don't intersect, shows an "Access Denied" card instead of the page content

### Route table

| Path | Required roles |
|---|---|
| `/login` | public |
| `/departments` | `admin`, `detective`, `prosecutor` |
| `/dashboard` | `detective`, `prosecutor` |
| `/cases` | `detective`, `prosecutor` |
| `/cases/:caseId` | `detective`, `prosecutor` |
| `/upload` | `detective` |
| `/search` | `detective`, `prosecutor` |
| `/profile` | any authenticated user |
| `/users` | `admin` (link disabled in nav — page rendered but greyed out) |

The Case Officer role has been disabled due to incomplete implementation.


### `AuthContext` permission helpers

| Helper | Returns true when |
|---|---|
| `canCreateOrEditCases()` | role is `detective` |
| `canDeleteCases()` | role is `detective` |
| `canAddEvidence()` | role is `detective` |
| `canDeleteEvidence()` | role is `detective` |
| `canManageDepartments()` | role is `admin` |

These booleans drive button visibility and form availability across all pages.

---

## 5. Evidence Upload Flow

Implemented in `UploadPage.jsx` and `CaseContext.jsx`:

```
1. uploadInit({ caseId, fileName, contentType })
       POST /api/evidence/upload-init
       ← { evidenceId, uploadUrl (SAS), blobPath, expiresOn }

2. uploadToSasUrl(uploadUrl, file)
       PUT file bytes directly to Azure Blob Storage SAS URL
       Headers: x-ms-blob-type: BlockBlob, Content-Type: <file.type>
       No backend involved in this step

3. uploadConfirm({ evidenceId, caseId, blobPath, fileName, fileType, description, userTags })
       POST /api/evidence/upload-confirm
       ← evidence record (status: UPLOADED)

4. Poll getEvidenceStatus(evidenceId)
       GET /api/evidence/id/{evidenceId}/status
       until status = COMPLETED or FAILED
       UploadPage shows a progress bar and status chip
```

---

## 6. Full File Tree with Explanations

```
frontend/
├── public/
├── src/
│   │
│   ├── index.js
│   │     Application entry point.
│   │
│   ├── index.css
│   │     Minimal base reset and font imports. Most styling is in main.css.
│   │
│   ├── App.js
│   │     Root routing component.
│   │
│   ├── auth/
│   │   ├── msalConfig.js
│   │   │     MSAL PublicClientApplication configuration. Key settings:
│   │   │     - cacheLocation: localStorage (tokens survive refresh)
│   │   │     - storeAuthStateInCookie: true (Safari + proxy fallback)
│   │   │     - Reads REACT_APP_ENTRA_* from process.env (build-time)
│   │   │     Also exports loginRequest (scopes array for token acquisition).
│   │   │
│   │   └── msalInstance.js
│   │         Singleton PublicClientApplication instance shared across the app.
│   │         Exports ensureActiveAccount() and acquireToken() which tries silent then
│   │         falls back to acquireTokenRedirect on InteractionRequiredAuthError.
│   │
│   ├── api/
│   │   ├── config.js
│   │   │     Exports USE_MOCK (hardcoded false in production) and API_CONFIG
│   │   │     with BASE_URL from REACT_APP_API_BASE_URL.
│   │   │
│   │   ├── authApi.js
│   │   │     Router: re-exports login, logout, getCurrentUser, updateProfile,
│   │   │     getUsers, updateUser from real/realAuthApi.js.
│   │   │
│   │   ├── caseApi.js
│   │   │     Router: re-exports getCases, getCase, createCase, updateCase,
│   │   │     deleteCase, addCaseNote, deleteNote from real/realCaseApi.js.
│   │   │
│   │   ├── evidenceApi.js
│   │   │     Router: re-exports uploadInit, uploadToSasUrl, uploadConfirm,
│   │   │     getEvidence, getEvidenceById, deleteEvidence, getEvidenceStatus,
│   │   │     getEvidenceReadUrl, searchEvidence, updateEvidenceTags from
│   │   │     real/realEvidenceApi.js.
│   │   │
│   │   ├── departmentApi.js
│   │   │     Router: re-exports getDepartments, createDepartment,
│   │   │     updateDepartment, deleteDepartment from real/realDepartmentApi.js.
│   │   │
│   │   ├── mock/
│   │   │     Legacy mock implementations. Not used in production.
│   │   │     Kept as artefact from development phase.
│   │   │
│   │   └── real/
│   │       ├── apiClient.js
│   │       │     Central HTTP client. apiFetch(path, options) acquires a Bearer
│   │       │     token via acquireToken(), prepends API_CONFIG.BASE_URL, adds
│   │       │     Authorization header and parses JSON response. Used by all real* API files.
│   │       │
│   │       ├── realAuthApi.js
│   │       │     login() — clears stale MSAL state then calls loginRedirect.
│   │       │     logout() — logoutRedirect to /login.
│   │       │     getCurrentUser() — GET /api/auth/me.
│   │       │     getUsers() — GET /api/users (admin only, disabled due to incompletion).
│   │       │     updateUser() — PATCH /api/users/{oid} (admin only, disabled due to incompletion).
│   │       │
│   │       ├── realCaseApi.js
│   │       │     getCases()       → GET  /api/cases
│   │       │     getCase(id)      → GET  /api/cases/{caseId}
│   │       │     createCase(body) → POST /api/cases
│   │       │     updateCase(id)   → PATCH /api/cases/{caseId}
│   │       │     deleteCase(id)   → DELETE /api/cases/{caseId}
│   │       │     addCaseNote(id)  → POST /api/cases/{caseId}/notes
│   │       │     deleteNote(id,noteId) → DELETE /api/cases/{caseId}/notes/{noteId}
│   │       │
│   │       ├── realEvidenceApi.js
│   │       │     uploadInit(body)       → POST /api/evidence/upload-init
│   │       │     uploadToSasUrl(url,f)  → PUT directly to Blob SAS URL
│   │       │     uploadConfirm(body)    → POST /api/evidence/upload-confirm
│   │       │     getEvidence(params)    → GET  /api/evidence[?caseId=]
│   │       │     getEvidenceById(id)    → GET  /api/evidence/id/{evidenceId}
│   │       │     deleteEvidence(id)     → DELETE /api/evidence/id/{evidenceId}
│   │       │     getEvidenceStatus(id)  → GET  /api/evidence/id/{evidenceId}/status
│   │       │     getEvidenceReadUrl(id) → GET  /api/evidence/id/{evidenceId}/read-url
│   │       │     searchEvidence(params) → GET  /api/evidence/search[?q=&caseId=&...]
│   │       │     updateEvidenceTags(id) → PATCH /api/evidence/id/{evidenceId}/tags
│   │       │
│   │       └── realDepartmentApi.js
│   │             getDepartments()     → GET    /api/departments
│   │             createDepartment(b)  → POST   /api/departments
│   │             updateDepartment(id) → PATCH  /api/departments/{id}
│   │             deleteDepartment(id) → DELETE /api/departments/{id}
│   │
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   │     Manages authenticated user state. Sets user, loading,
│   │   │     authError state. Derives role booleans (isAdmin, isDetective,
│   │   │     isProsecutor) and permission helpers.
│   │   │     Exposes login(), logout(), retryAuth() (re-runs /api/auth/me
│   │   │     without a full page reload).
│   │   │     Listens to window storage events for cross-tab account changes.
│   │   │
│   │   └── CaseContext.jsx
│   │         Manages cases and evidence list state. On user set, loads both
│   │         getCases() and getEvidence() in parallel. Exposes:
│   │         createCase, updateCase, deleteCase, addCaseNote, deleteNote,
│   │         uploadEvidenceSas (full 3-step SAS upload),
│   │         refreshEvidenceStatus, deleteEvidence, updateEvidenceTags,
│   │         reloadCases.
│   │
│   ├── components/
│   │   ├── Layout.jsx
│   │   │     Shell component rendered by the / protected route. Contains
│   │   │     the responsive sidebar navigation and an
│   │   │     <Outlet /> for child page content.
│   │   │
│   │   └── ProtectedRoute.jsx
│   │         Guards child routes. Redirects
│   │         to /login (with state.from) when not authenticated.
│   │
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   │     Shown to unauthenticated users.
│   │   │
│   │   ├── DashboardPage.jsx
│   │   │     Home page for investigators.
│   │   │
│   │   ├── DepartmentsPage.jsx
│   │   │     Lists all departments in a table.
│   │   │
│   │   ├── CasesPage.jsx
│   │   │     Lists all accessible cases.
│   │   │
│   │   ├── CaseDetailPage.jsx
│   │   │     Detailed view of a single case.
│   │   │
│   │   ├── UploadPage.jsx
│   │   │     Full SAS upload flow page. Drag-and-drop or click-to-select file.
│   │   │
│   │   ├── SearchPage.jsx
│   │   │     Full-text evidence search.
│   │   │
│   │   ├── UsersPage.jsx
│   │   │     Admin-only page. Currently disabled
│   │   │     For now users are managed exclusively through the Entra ID portal.
│   │   │
│   │   └── ProfilePage.jsx
│   │         Signed-in user's profile page.
│   │
│   └── styles/
│       └── main.css
│             Complete CSS design system for the entire application.
│
├── package.json
│     Dependencies: react 19, react-dom 19, react-router-dom, @azure/msal-browser,
│     lucide-react, recharts, date-fns. Scripts: start, build, test, eject.
│
└── README.md
      This file.
```