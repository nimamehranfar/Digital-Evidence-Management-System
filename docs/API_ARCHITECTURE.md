# API Architecture Documentation

## Overview

The frontend application uses a clean API abstraction layer that allows seamless switching between mock and real backend implementations. Change the `USE_MOCK` flag in `api/config.js` to switch between modes.

## Architecture

```
Components/Pages
      ↓
Context Providers (AuthContext, CaseContext)
      ↓
API Layer (authApi, caseApi, evidenceApi, analyticsApi)
      ↓
     / \
    /   \
Mock API  Real API
```

## Configuration

**File: `api/config.js`**

```javascript
export const USE_MOCK = true; // Change to false for real backend

export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || "http://localhost:7071",
  TIMEOUT: 30000,
  HEADERS: {
    "Content-Type": "application/json"
  }
};
```

## API Modules

### 1. Authentication API (`api/authApi.js`)

**Mock Implementation:** `api/mock/mockAuthApi.js`  
**Real Implementation:** `api/real/realAuthApi.js`

#### Methods:

**`login(username, password)`**
- **Input:** `{ username: string, password: string }`
- **Output:** User object without password
- **Real Endpoint:** `POST /api/auth/login`

**`logout()`**
- **Output:** `{ success: boolean }`
- **Real Endpoint:** `POST /api/auth/logout`

**`getCurrentUser()`**
- **Output:** Current user object
- **Real Endpoint:** `GET /api/auth/me`

**`updateProfile(updates)`**
- **Input:** `{ fullName?, email? }`
- **Output:** Updated user object
- **Real Endpoint:** `PATCH /api/auth/profile`

**`getUsers()`**
- **Output:** Array of user objects
- **Real Endpoint:** `GET /api/users`

---

### 2. Case API (`api/caseApi.js`)

**Mock Implementation:** `api/mock/mockCaseApi.js`  
**Real Implementation:** `api/real/realCaseApi.js`

#### Methods:

**`getCases()`**
- **Output:** Array of case objects
- **Real Endpoint:** `GET /api/cases`

**`getCase(caseId)`**
- **Input:** `caseId: string`
- **Output:** Single case object
- **Real Endpoint:** `GET /api/cases/{caseId}`

**`createCase(caseData)`**
- **Input:**
```javascript
{
  title: string,
  description: string,
  priority: "high" | "medium" | "low",
  department: string,
  tags?: string[]
}
```
- **Output:** Created case object
- **Real Endpoint:** `POST /api/cases`

**`updateCase(caseId, updates)`**
- **Input:** `caseId: string, updates: Partial<Case>`
- **Output:** Updated case object
- **Real Endpoint:** `PATCH /api/cases/{caseId}`

**`deleteCase(caseId)`**
- **Input:** `caseId: string`
- **Output:** `{ success: true, id: string }`
- **Real Endpoint:** `DELETE /api/cases/{caseId}`

**`addCaseNote(caseId, noteText)`**
- **Input:** `caseId: string, noteText: string`
- **Output:** Updated case object with new note
- **Real Endpoint:** `POST /api/cases/{caseId}/notes`

---

### 3. Evidence API (`api/evidenceApi.js`)

**Mock Implementation:** `api/mock/mockEvidenceApi.js`  
**Real Implementation:** `api/real/realEvidenceApi.js`

#### Methods:

**`getEvidence()`**
- **Output:** Array of evidence objects
- **Real Endpoint:** `GET /api/evidence`

**`getEvidenceById(evidenceId)`**
- **Input:** `evidenceId: string`
- **Output:** Single evidence object
- **Real Endpoint:** `GET /api/evidence/{evidenceId}`

**`createEvidence(evidenceData)`**
- **Input:**
```javascript
{
  caseId: string,
  fileName: string,
  fileType: "pdf" | "image" | "video" | "audio" | "text",
  fileSize: number,
  description?: string,
  tags?: string[]
}
```
- **Output:** Created evidence object
- **Real Endpoint:** `POST /api/evidence`

**`updateEvidence(evidenceId, updates)`**
- **Input:** `evidenceId: string, updates: Partial<Evidence>`
- **Output:** Updated evidence object
- **Real Endpoint:** `PATCH /api/evidence/{evidenceId}`

**`deleteEvidence(evidenceId)`**
- **Input:** `evidenceId: string`
- **Output:** `{ success: true, id: string }`
- **Real Endpoint:** `DELETE /api/evidence/{evidenceId}`

**`searchEvidence(filters)`**
- **Input:**
```javascript
{
  query?: string,
  fileType?: string,
  status?: string,
  caseId?: string,
  fromDate?: string,
  toDate?: string
}
```
- **Output:** Array of evidence objects
- **Real Endpoint:** `GET /api/evidence/search?query=...&fileType=...`

**`uploadFile(file, caseId, metadata)`**
- **Input:** `file: File, caseId: string, metadata: { description?, tags? }`
- **Output:** Created evidence object
- **Real Endpoint:** `POST /api/evidence/upload` (multipart/form-data)

---

### 4. Analytics API (`api/analyticsApi.js`)

**Mock Implementation:** `api/mock/mockAnalyticsApi.js`  
**Real Implementation:** `api/real/realAnalyticsApi.js`

#### Methods:

**`getStats(filters?)`**
- **Input (Optional):**
```javascript
{
  fromDate?: string,
  toDate?: string
}
```
- **Output:**
```javascript
{
  totalFiles: number,
  totalCases: number,
  activeCases: number,
  pendingCases: number,
  closedCases: number,
  highPriorityCases: number,
  totalStorageGB: string,
  avgEvidencePerCase: string,
  filesByType: Array<{ type: string, count: number }>,
  filesPerDay: Array<{ date: string, count: number }>,
  casesByStatus: { active: number, pending: number, closed: number },
  casesByPriority: { high: number, medium: number, low: number },
  casesByDepartment: { [dept: string]: number }
}
```
- **Real Endpoint:** `GET /api/analytics/stats?fromDate=...&toDate=...`

---

## Data Models

### User Object
```javascript
{
  id: string,
  username: string,
  email: string,
  fullName: string,
  role: "investigator" | "officer" | "higher_rank",
  department: string,
  badge: string,
  avatar: string | null,
  status?: "active" | "inactive",
  lastLogin?: string (ISO 8601)
}
```

### Case Object
```javascript
{
  id: string,
  caseNumber: string,
  title: string,
  description: string,
  status: "active" | "pending" | "closed",
  priority: "high" | "medium" | "low",
  department: string,
  createdBy: string (user id),
  assignedTo: string[] (user ids),
  createdAt: string (ISO 8601),
  updatedAt: string (ISO 8601),
  tags: string[],
  notes: Array<{
    id: string,
    text: string,
    createdBy: string,
    createdAt: string
  }>
}
```

### Evidence Object
```javascript
{
  id: string,
  caseId: string,
  fileName: string,
  fileType: "pdf" | "image" | "video" | "audio" | "text",
  fileSize: number (bytes),
  uploadedAt: string (ISO 8601),
  uploadedBy: string (user id),
  tags: string[],
  status: "RECEIVED" | "PROCESSING" | "COMPLETED" | "FAILED",
  description?: string,
  extractedText?: string,
  metadata?: object
}
```

---

## Mock Storage

Mock implementations use `sessionStorage` for data persistence during the session:

- **Authentication:** `"mock_auth_session"`
- **Cases:** `"mock_cases"`
- **Evidence:** `"mock_evidence"`

Data is automatically initialized on first access with sample data.

---

## Switching to Real Backend

1. Set `USE_MOCK = false` in `api/config.js`
2. Set `REACT_APP_API_BASE_URL` in `.env` file
3. Ensure backend implements the endpoints documented above
4. Backend must handle CORS and authentication cookies

### Example .env
```env
REACT_APP_API_BASE_URL=https://your-backend.azurewebsites.net
```

---

## Error Handling

All API functions throw errors with descriptive messages:

```javascript
try {
  const cases = await caseApi.getCases();
} catch (error) {
  console.error("Failed to load cases:", error.message);
  // Handle error appropriately
}
```

---

## Authentication Flow

1. User logs in via `authApi.login(username, password)`
2. Mock: User data stored in sessionStorage
3. Real: Backend sets HTTP-only cookie
4. All subsequent requests include credentials
5. Logout clears session/cookie

---

## File Upload Flow

1. User selects file in UploadPage
2. File validated on client (size, type)
3. `evidenceApi.uploadFile(file, caseId, metadata)` called
4. Mock: Simulates upload, creates evidence record
5. Real: Sends multipart/form-data to backend
6. Backend uploads to Azure Blob Storage
7. Backend creates evidence record in Cosmos DB
8. Returns evidence object to frontend

---

## Best Practices

1. **Always use the API layer** - Never access mock data directly from components
2. **Handle loading states** - All API calls are async
3. **Handle errors gracefully** - Display user-friendly messages
4. **Use Context for shared state** - Don't prop-drill API data
5. **Keep API functions pure** - No side effects in API layer
6. **Document custom endpoints** - If adding new endpoints, update this doc

---

## Testing

### Test Mock API:
```bash
USE_MOCK=true npm start
```

### Test Real API:
```bash
USE_MOCK=false REACT_APP_API_BASE_URL=http://localhost:7071 npm start
```

---


## API Calls
```bash
API Interfaces:

api/config.js - Configuration and toggle
api/authApi.js - Auth API interface
api/caseApi.js - Case API interface
api/evidenceApi.js - Evidence API interface
api/analyticsApi.js - Analytics API interface

Mock Implementations:

api/mock/mockAuthApi.js - Mock users database
api/mock/mockCaseApi.js - Mock cases database
api/mock/mockEvidenceApi.js - Mock evidence database
api/mock/mockAnalyticsApi.js - Computed analytics

Real Implementations:

api/real/realAuthApi.js - HTTP auth calls
api/real/realCaseApi.js - HTTP case calls
api/real/realEvidenceApi.js - HTTP evidence calls
api/real/realAnalyticsApi.js - HTTP analytics calls


4. Mock Data Storage
   All mock data now stored in sessionStorage with proper initialization:

Users: "mock_auth_session" (current user)
Cases: "mock_cases" (all cases)
Evidence: "mock_evidence" (all evidence)

5. API Method Signatures
   All API methods follow consistent patterns:
   javascript// Authentication
   await authApi.login(username, password)
   await authApi.logout()
   await authApi.getCurrentUser()
   await authApi.updateProfile(updates)
   await authApi.getUsers()

// Cases
await caseApi.getCases()
await caseApi.getCase(caseId)
await caseApi.createCase(caseData)
await caseApi.updateCase(caseId, updates)
await caseApi.deleteCase(caseId)
await caseApi.addCaseNote(caseId, noteText)

// Evidence
await evidenceApi.getEvidence()
await evidenceApi.getEvidenceById(evidenceId)
await evidenceApi.createEvidence(evidenceData)
await evidenceApi.updateEvidence(evidenceId, updates)
await evidenceApi.deleteEvidence(evidenceId)
await evidenceApi.searchEvidence(filters)
await evidenceApi.uploadFile(file, caseId, metadata)

// Analytics
await analyticsApi.getStats(filters)
```

### For Backend Developers:

Review docs/API_ARCHITECTURE.md for endpoint specs
Implement endpoints matching the signatures:

```bash
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
PATCH  /api/auth/profile
GET    /api/users

GET    /api/cases
GET    /api/cases/:id
POST   /api/cases
PATCH  /api/cases/:id
DELETE /api/cases/:id
POST   /api/cases/:id/notes

GET    /api/evidence
GET    /api/evidence/:id
POST   /api/evidence
PATCH  /api/evidence/:id
DELETE /api/evidence/:id
GET    /api/evidence/search
POST   /api/evidence/upload

GET    /api/analytics/stats
```

## Future Enhancements

- WebSocket support for real-time updates
- File upload progress tracking
- Request caching and invalidation
- Optimistic UI updates
- Retry logic for failed requests
- Request deduplication