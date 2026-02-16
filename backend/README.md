# DEMS Backend (Azure Functions, Node.js + TypeScript)

This backend is the **final** Azure Functions implementation for the Digital Evidence Management System (DEMS).

It implements:
- Microsoft Entra ID (Workforce) JWT validation (roles: `admin`, `detective`, `case_officer`, `prosecutor`).
- Evidence upload via **short-lived User Delegation SAS** (frontend uploads directly to Blob Storage).
- Blob-trigger processing: OCR (Azure Vision Read v3.2) + status updates in Cosmos DB + indexing in Azure AI Search.
- CRUD for Departments and Cases.
- Admin-only `POST /api/users` user provisioning via Microsoft Graph (requires extra env vars).

> The HTTP functions are **authLevel=anonymous** because auth is done by APIM (front door) and re-checked in code.

## Local development

### Prereqs
- Node.js 18+
- Azure Functions Core Tools v4 (`func`)
- Azure CLI (`az`)

### 1) Install

```bash
cd backend
npm install
```

### 2) Local settings

`local.settings.json` is included for convenience. For OCR, the backend reads the Vision key from Key Vault using `DefaultAzureCredential`.

So for local OCR to work:
- Run `az login`
- Ensure your signed-in identity has **Key Vault Secrets User** (or higher) on the vault.

### 3) Start Azurite (optional)

If you want local storage instead of Azure Storage:

```bash
npm run azurite
```

Then keep `AzureWebJobsStorage=UseDevelopmentStorage=true`.

### 4) Run functions

```bash
npm run start
```

Local base URL (default):
- `http://localhost:7071`

## Deploy

From `backend/`:

```bash
npm install
npm run build
func azure functionapp publish func-dems1
```

You must also enable Managed Identity and assign RBAC roles (see Part 2 handoff report).
