# Digital Evidence Management System (DEMS)

A cloud-based digital evidence management system with strict RBAC, SAS-based evidence uploads, and Azure Search indexing.

Repo layout:

- `frontend/` — React app (MSAL redirect auth + mock/real API toggle)
- `backend/` — Azure Functions (Node.js + TypeScript), fronted by APIM
- `docs/` — Project documentation

## Quick start (frontend)

```bash
cd frontend
npm install
npm start
```

For real-mode environment variables and the full frontend guide, see: `frontend/README.md`.

## Docs

- `docs/API_ARCHITECTURE.md` — Final API contract + cloud architecture
- `docs/FRONTEND_GUIDE.md` — Frontend behavior: auth, RBAC, mock/real parity
- `docs/DEMO_CHECKLIST.md` — Step-by-step demo validation (mock + real)
