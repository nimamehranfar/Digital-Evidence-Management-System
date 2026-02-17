# Digital Evidence Management System — Frontend (Part 5)

React 19 + CRA app deployed to Azure Static Web Apps (SWA).  
Auth: Microsoft Entra ID (Workforce) via MSAL redirect (`@azure/msal-browser`).  
Backend: Azure Functions behind APIM.

---

## 1. Environment variables

Embed at **build time** (CRA bakes them in at `npm run build`).  
For SWA GitHub Actions, add these as **GitHub Secrets** and inject them in the build step:

| Secret name                 | Example value                                              |
|-----------------------------|------------------------------------------------------------|
| `REACT_APP_API_BASE_URL`    | `https://apim-dems1.azure-api.net/func-dems1`              |
| `REACT_APP_ENTRA_TENANT_ID` | `2b14e728-abf9-4076-8465-8c1520df0e48`                    |
| `REACT_APP_ENTRA_CLIENT_ID` | `f5697764-8b86-4cb8-beda-3f986ee268f5`                    |
| `REACT_APP_ENTRA_AUTHORITY` | `https://login.microsoftonline.com/<tenantId>`             |
| `REACT_APP_ENTRA_API_SCOPE` | `api://5c696d12-ced1-409f-bde9-5806053165b3/access_as_user`|

> If any env var is missing at build time, MSAL will throw on first use. Always verify secrets are present in the GitHub Actions log before debugging auth.

---

## 2. Run locally

```bash
cd frontend
npm install
# Create .env for local dev (not committed)
cp .env.example .env   # then fill in real values
npm start
```

---

## 3. Mock mode (offline demo)

Edit `frontend/src/api/config.js`:

```js
export const USE_MOCK = true;   // default: false
```

Then `npm start`. A role picker appears on the login page. No Entra ID or APIM required.

---

## 4. Authentication flow (real mode)

```
User clicks "Sign in with Microsoft"
   → MSAL loginRedirect()
   → Microsoft-hosted login UI
   → redirect back to window.location.origin
   → index.js bootstrap:
       msalInstance.initialize()
       clearMsalInteractionLocks()      ← clears any stale state
       msalInstance.handleRedirectPromise()  ← processes hash, stores tokens
       msalInstance.setActiveAccount()
   → React renders App
   → AuthContext useEffect:
       msalInstance.getAllAccounts() > 0 → true
       acquireTokenSilent() → Bearer token
       GET /api/auth/me → { id, name, roles, department? }
   → user set in state → ProtectedRoute passes → dashboard renders
```

### Token refresh / interaction_required

If `acquireTokenSilent` throws `InteractionRequiredAuthError`:
- `acquireToken()` in `msalInstance.js` calls `acquireTokenRedirect()`
- The browser goes to Microsoft with the existing SSO session
- Microsoft mints a fresh token and returns to the app
- The user sees a brief redirect — no full re-login needed

### Redirect-back-to-intended-page

- `ProtectedRoute` passes `{ state: { from: location } }` when redirecting to `/login`
- `LoginPage` reads `location.state.from`
- After `user` is set, `useEffect` in `LoginPage` navigates to `from` (or role default)

---

## 5. RBAC

| Role          | Can see                              | Cannot see                    |
|---------------|--------------------------------------|-------------------------------|
| `admin`       | `/departments`, `/users`, `/profile` | Dashboard, cases, evidence    |
| `detective`   | Everything investigative             | `/users`                      |
| `case_officer`| Department-scoped investigative      | Other departments, `/users`   |
| `prosecutor`  | Read-only investigative              | Upload, edit, delete, `/users`|

---

## 6. API routes

See `docs/FRONTEND_GUIDE.md` for the complete contract.

---

## 7. Common issues

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Blank page after redirect | `navigateToLoginRequestUrl: true` was set | Part 5 sets it to `false` |
| `interaction_in_progress` | Stale sessionStorage lock | `clearMsalInteractionLocks()` runs before `handleRedirectPromise` |
| `/api/auth/me` returns 401 | Wrong `REACT_APP_ENTRA_API_SCOPE` | Verify scope matches `dems-api` app registration |
| `/api/auth/me` returns 403 | No app role assigned | Admin must assign role in Entra portal → user must re-login |
| "Failed to fetch" | APIM CORS not configured for SWA origin | Backend/APIM fix required (Part 3 scope) |
| App stuck on loading spinner | MSAL `handleRedirectPromise` never resolves | Usually means `initialize()` was not awaited — fixed in Part 5 bootstrap |
