# Digital Evidence Management System

React-based Digital Evidence Management System with a clean API abstraction layer that can switch between **mock** and **real** backends using a single flag.

## Repo Layout

- `frontend/` — React app (routing, UI, contexts, API layer)
- `backend/` — Not specified yet
- `docs/` — Architecture and API documentation

## Running the Frontend

```bash
cd frontend
cd backend
npm install
npm start
```

### Switch Mock ↔ Real APIs

In `frontend/src/api/config.js`:

```js
export const USE_MOCK = true; // false => real API
```

When `USE_MOCK=false`, the Real API implementations call the following base URL:

- `REACT_APP_API_BASE_URL` (if set), otherwise `http://localhost:7071`



## Documentation

- API modules and endpoint map: `docs/API_ARCHITECTURE.md`
