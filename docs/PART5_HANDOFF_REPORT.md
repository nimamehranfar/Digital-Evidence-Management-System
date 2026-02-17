# PART 5 — FRONTEND FINALIZATION HANDOFF REPORT

Date: 2026-02-17

---

## 1. Root cause analysis: why `/api/auth/me` failed

Three compounding bugs caused the login → `/api/auth/me` → dashboard flow to fail:

### Bug A — `navigateToLoginRequestUrl: true` (critical)
**File:** `frontend/src/auth/msalConfig.js`  
**Symptom:** After the MSAL redirect returned, the app appeared to load briefly and then the URL changed back to `/login`, leaving the user stuck.  
**Cause:** When `navigateToLoginRequestUrl` is `true`, MSAL internally re-navigates the browser to the URL that originally called `loginRedirect()`. Since that URL was `/login`, the user was sent back to `/login` even after a successful Entra authentication. React Router then re-rendered the login page, `msalInstance.getAllAccounts()` returned the new account, but `AuthContext` re-evaluated and the page stayed on `/login` because the account was now visible but `/api/auth/me` had not been called yet.  
**Fix:** Set `navigateToLoginRequestUrl: false`. Post-redirect navigation is now handled entirely by `LoginPage`'s `useEffect` (watches `user` state → navigates to `state.from` or role default).

### Bug B — Stale interaction lock not cleared before `handleRedirectPromise`
**File:** `frontend/src/index.js`  
**Symptom:** After returning from Microsoft, `handleRedirectPromise` sometimes threw `interaction_in_progress` and the redirect result was silently discarded.  
**Cause:** If the previous session ended with an interrupted redirect (tab closed, network error), MSAL left an interaction-in-progress lock in `sessionStorage`. On the next load, MSAL refused to process the new redirect result.  
**Fix:** `clearMsalInteractionLocks()` now runs *before* `handleRedirectPromise()` in the bootstrap. Both MSAL v2 key patterns (`msal.interaction.status`) and MSAL v3 patterns (`<clientId>.interaction.status`) are cleared.

### Bug C — `interaction_required` surfaced as error instead of triggering token refresh
**File:** `frontend/src/auth/msalInstance.js` (new) + `frontend/src/api/real/apiClient.js`  
**Symptom:** On first load after login, `acquireTokenSilent` threw `InteractionRequiredAuthError`. The old `apiClient.js` wrapped this into a custom error object and let it bubble up to `AuthContext`, which showed "Signed into Microsoft, but a new consent/interaction is required". The user had to manually click "Try sign-in again".  
**Cause:** A brand-new login via `loginRedirect` doesn't always populate the silent token cache for the API scope. This is normal MSAL behaviour when the first login is for the ID token and the first API scope acquire needs a fresh redirect.  
**Fix:** `acquireToken()` in `msalInstance.js` now catches `InteractionRequiredAuthError` and immediately calls `msalInstance.acquireTokenRedirect()`. This sends the user to Microsoft *using the existing SSO session* — no re-login dialog appears — and returns with a fresh access token. The app reloads from the redirect and `acquireTokenSilent` succeeds.

---

## 2. Redirect-back-to-intended-page

**Files:** `ProtectedRoute.jsx`, `LoginPage.jsx`, `App.js`

- `ProtectedRoute` already passed `state={{ from: location }}` — no change needed.
- `LoginPage` now reads `location.state?.from` and navigates there after `user` is set in `AuthContext`.
- `App.js` `HomeRedirect` also checks `location.state?.from` for the `/` → redirect case.

---

## 3. No permanent lock from cached state

- "Try sign-in again" button calls `retryAuth()` on `AuthContext`, which bumps `authTick` → re-runs the load effect.
- "Sign out & clear state" button calls `authApi.logout()` → `msalInstance.logoutRedirect()` which clears MSAL cache and redirects to `/login`.
- Users can always re-click the Microsoft sign-in button (it calls `clearStaleMsalInteractionState()` before `loginRedirect`).

---

## 4. Files changed (frontend only)

| File | Change summary |
|------|---------------|
| `frontend/src/auth/msalConfig.js` | `navigateToLoginRequestUrl: false`; `storeAuthStateInCookie: true` for Safari; cleaner config |
| `frontend/src/auth/msalInstance.js` | New `acquireToken()` helper: silent → `acquireTokenRedirect` on `InteractionRequiredAuthError` |
| `frontend/src/index.js` | Robust bootstrap: `clearMsalInteractionLocks()` before `handleRedirectPromise`; error-swallowed hash_empty; last-resort render on bootstrap failure |
| `frontend/src/api/config.js` | Clean `USE_MOCK` constant + `API_CONFIG` |
| `frontend/src/api/real/apiClient.js` | Uses `acquireToken()` from msalInstance; removed duplicate InteractionRequiredAuthError handling |
| `frontend/src/api/real/realAuthApi.js` | Covers MSAL v2 + v3 key patterns in `clearStaleMsalInteractionState`; `postLogoutRedirectUri` set to `/login` |
| `frontend/src/context/AuthContext.jsx` | Removed MSAL event callback (React 19 StrictMode double-fire); uses `window.storage` event for cross-tab; `retryAuth()` exposed; cleaner error messages |
| `frontend/src/App.js` | `HomeRedirect` respects `location.state.from`; `profile` route wrapped in `ProtectedRoute` |
| `frontend/src/components/ProtectedRoute.jsx` | Friendly "Access Denied" UI with role info |
| `frontend/src/components/Layout.jsx` | Responsive sidebar; `sidebar-open` CSS class; user avatar initials; modern header |
| `frontend/src/pages/LoginPage.jsx` | Reads `state.from`; auto-redirect when already authenticated; Microsoft logo SVG; `retryAuth` integration; mock role picker |
| `frontend/src/pages/DashboardPage.jsx` | Modern stat cards; case/evidence lists; empty states |
| `frontend/src/pages/CasesPage.jsx` | Full rewrite: filter bar; create modal; delete; pagination-ready table |
| `frontend/src/pages/CaseDetailPage.jsx` | Full rewrite: editor + notes + evidence table; SAS status chips |
| `frontend/src/pages/DepartmentsPage.jsx` | Full CRUD with create/edit modal; admin/read separation |
| `frontend/src/pages/UsersPage.jsx` | Admin: list users + assign department; Entra portal link |
| `frontend/src/pages/SearchPage.jsx` | Full-text + caseId search; modern results table |
| `frontend/src/pages/UploadPage.jsx` | SAS upload flow: init → PUT → confirm → poll; drag-and-drop; progress bar |
| `frontend/src/pages/ProfilePage.jsx` | Identity + role + access summary; permissions table |
| `frontend/src/styles/main.css` | Complete rewrite: design tokens; all components; mobile-first responsive |
| `frontend/public/staticwebapp.config.json` | `navigationFallback` for SPA deep links; 404 → 200 rewrite |
| `frontend/README.md` | Updated auth flow, troubleshooting table |
| `docs/PART5_HANDOFF_REPORT.md` | This file |

---

## 5. Validation steps

### 5.1 Local build smoke-test
```bash
cd frontend
npm install
npm run build          # must complete with 0 errors
```

### 5.2 Mock mode end-to-end
```bash
# Set USE_MOCK = true in src/api/config.js
npm start
```
1. Login page shows role picker → select `detective` → click "Sign in as detective"
2. Redirects to `/dashboard` — stat cards visible
3. Navigate to `/cases` → create a case → open it → add a note → upload evidence
4. Navigate to `/search` → search returns results
5. Navigate to `/profile` → identity fields populated
6. Switch to `admin` role → `/departments` and `/users` visible; `/dashboard` blocked (Access Denied)
7. Switch to `case_officer` → department-scoped view
8. Switch to `prosecutor` → read-only (create/delete buttons hidden)
9. Logout → returns to login page

### 5.3 Real mode (deployed SWA)
1. Confirm GitHub Secrets contain all 5 `REACT_APP_*` variables
2. Push a commit → wait for GitHub Actions build to succeed
3. Open SWA URL → login page
4. Click "Sign in with Microsoft" → Microsoft-hosted login
5. Enter tenant credentials (e.g. `detective@<tenant>.onmicrosoft.com`)
6. Redirected back to SWA → loading spinner briefly → dashboard
7. Open DevTools → Network → verify `GET /api/auth/me` returns **200** with `{ id, name, roles }`
8. Navigate to each page and verify no console errors

### 5.4 Interaction_required recovery check
1. Clear localStorage and sessionStorage in DevTools
2. Reload the page (active MSAL account but no token cache)
3. App should auto-trigger `acquireTokenRedirect` → brief Microsoft redirect → return to dashboard

### 5.5 Redirect-back check
1. Copy `/cases/some-id` URL
2. Open in new incognito tab → redirected to `/login`
3. Sign in → lands on `/cases/some-id` (not `/dashboard`)

### 5.6 Mobile responsive
1. Open on mobile or DevTools mobile view
2. Hamburger menu works; sidebar slides in/out; cards stack

---

## 6. Known limitations (not changed — backend scope)

- APIM CORS must allow the SWA origin (`https://swa-dems.azurestaticapps.net`). This is a backend/APIM configuration task.
- App roles must be assigned in Entra ID portal for users to get a valid `/api/auth/me` response with roles.
- `GET /api/users` returns Entra-synced users only if the backend's Graph integration is configured (Part 2/3 scope).

---

END OF PART 5 HANDOFF REPORT
