# DEMS — Demo Checklist (Mock + Real)

Use this as a presentation-day checklist.

---

## A) Mock mode demo (offline)

### Start
1. Run frontend:
   ```bash
   cd frontend
   npm install
   npm start
   ```
2. Open:
   - `http://localhost:3000/?mock=1`

### Verify flows
1. Login as **detective**
   - Go to Departments: list visible
   - Go to Cases: create a case (department required)
   - Go to Upload: upload a file → status progresses to COMPLETED
   - Go to Search: search by keyword, see extractedText snippet
   - Delete evidence (enabled for detective)

2. Login as **prosecutor**
   - Can open dashboard/cases/search
   - Create/edit/delete/upload buttons are disabled/hidden

3. Login as **admin**
   - Can access Departments + Users only
   - Attempting to open `/cases` or `/search` shows “Not authorized”

---

## B) Real mode demo (Azure)

### Start
1. Ensure `frontend/.env` matches:
   - `REACT_APP_API_BASE_URL=https://apim-dems1.azure-api.net/func-dems1`
   - Entra settings (clientId/authority/scope)
2. Run:
   ```bash
   cd frontend
   npm install
   npm start
   ```
3. Open:
   - `http://localhost:3000/` (no `?mock=1`)

### Verify auth + RBAC
1. Login via Microsoft-hosted page
2. Confirm `/api/auth/me` drives UI roles:
   - admin is blocked from investigative pages
   - prosecutor is read-only

### Detective happy path
1. Departments page loads from `GET /api/departments`
2. Create a case (POST /api/cases)
3. Upload evidence:
   - init → PUT to SAS → confirm
4. Poll status endpoint until COMPLETED
5. Search evidence from `/api/evidence/search`
6. Delete evidence using `DELETE /api/evidence/id/{evidenceId}`

### Admin governance
1. Departments CRUD (admin only)
2. Users list loads from `GET /api/users`
3. Assign department to case_officer via `PATCH /api/users/{oid}`

---

## Expected “green” signals

- No crashes on 401/403.
- UI matches RBAC semantics exactly.
- Mock and Real behavior use the same shapes and screens.
