# API Contract — Digital Evidence Management System

This document defines the **frontend–backend API contract** for the *Digital Evidence Management and Analytics System on Microsoft Azure*.
It is implementation-agnostic and serves as a binding agreement between frontend and backend teams.

---

## 1. General Conventions

- **Base Path**: `/api`
- **Protocol**: HTTPS (HTTP allowed only for local development)
- **Authentication**: Azure Entra ID (via Azure Static Web Apps built-in authentication)
- **Authorization**: Enforced upstream (API Management)
- **Data Format**: JSON (except file upload)
- **Time Format**: ISO 8601 in UTC (example: `2026-01-15T10:21:00Z`)
- **IDs**: UUID v4
- **Pagination** (search): `skip` + `top` (default `top=25`, max `top=100`)

---

## 2. Authentication Model

Authentication is enforced at platform level:

- Azure Static Web Apps handles login using **Azure Entra ID**
- Frontend calls APIs with the user's authenticated session
- Backend must validate that requests are authenticated (e.g., via APIM policy) and may rely on identity headers inserted by Static Web Apps / APIM.

**No custom authentication logic is implemented in the frontend.**

---

## 3. Evidence Upload API

### Endpoint
`POST /api/evidence`

### Description
Uploads a digital evidence file and triggers the processing pipeline.

### Request
- **Content-Type**: `multipart/form-data`
- **Form Field**:
  - `file` (binary): document, image, or audio file

### Response — 201 Created
```json
{
  "evidenceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "fileName": "contract.pdf",
  "fileType": "pdf",
  "status": "RECEIVED",
  "uploadedAt": "2026-01-15T10:21:00Z"
}
```

### Processing Notes
- File is stored in **Azure Blob Storage**
- Upload event triggers **Azure Event Grid**
- Processing handled asynchronously by **Azure Functions**
- `status` transitions: `RECEIVED` → `PROCESSING` → `COMPLETED` or `FAILED`

---

## 4. Evidence Search API

### Endpoint
`GET /api/search`

### Description
Searches evidence metadata indexed in Azure Cognitive Search.

### Query Parameters
| Name | Type | Required | Description |
|---|---|---:|---|
| q | string | no | Full-text search query |
| fileType | string | no | Filter by type (`pdf`, `image`, `audio`) |
| status | string | no | Filter by processing status (`RECEIVED`, `PROCESSING`, `COMPLETED`, `FAILED`) |
| fromDate | string | no | ISO timestamp (inclusive start) |
| toDate | string | no | ISO timestamp (inclusive end) |
| skip | integer | no | Offset for pagination (default `0`) |
| top | integer | no | Page size (default `25`, max `100`) |

### Response — 200 OK
```json
{
  "count": 1,
  "items": [
    {
      "evidenceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "fileName": "contract.pdf",
      "fileType": "pdf",
      "tags": ["contract", "legal"],
      "extractedTextPreview": "This agreement is made between...",
      "status": "COMPLETED",
      "uploadedAt": "2026-01-15T10:21:00Z"
    }
  ]
}
```

### Data Source
- Metadata stored in **Azure Cosmos DB**
- Indexed via **Azure Cognitive Search**

---

## 5. Evidence Details API

### Endpoint
`GET /api/evidence/{id}`

### Description
Retrieves full metadata and extracted content for a single evidence item.

### Response — 200 OK
```json
{
  "evidenceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "fileName": "contract.pdf",
  "fileType": "pdf",
  "uploadedAt": "2026-01-15T10:21:00Z",
  "status": "COMPLETED",
  "ocrText": "Full extracted text...",
  "imageTags": [],
  "audioTranscript": null,
  "processingSteps": [
    { "name": "STORE_BLOB", "status": "COMPLETED", "timestamp": "2026-01-15T10:21:02Z" },
    { "name": "OCR", "status": "COMPLETED", "timestamp": "2026-01-15T10:21:08Z" },
    { "name": "INDEX_SEARCH", "status": "COMPLETED", "timestamp": "2026-01-15T10:21:12Z" }
  ]
}
```

---

## 6. Analytics API

### Endpoint
`GET /api/stats`

### Description
Returns aggregated statistics for analytics and reporting.

### Query Parameters
| Name | Type | Required | Description |
|---|---|---:|---|
| fromDate | string | no | ISO timestamp (inclusive start) |
| toDate | string | no | ISO timestamp (inclusive end) |

### Response — 200 OK
```json
{
  "totalFiles": 128,
  "filesByType": [
    { "type": "pdf", "count": 54 },
    { "type": "image", "count": 42 },
    { "type": "audio", "count": 32 }
  ],
  "filesPerDay": [
    { "date": "2026-01-14", "count": 18 },
    { "date": "2026-01-15", "count": 27 }
  ]
}
```

### Data Flow
- Data prepared by **Azure Data Factory**
- Aggregations executed in **Azure Synapse Analytics** (serverless SQL recommended)

---

## 7. Error Handling

All errors follow this format:

```json
{
  "errorCode": "INVALID_FILE_TYPE",
  "message": "The uploaded file type is not supported."
}
```

### Common HTTP Status Codes
- `400` Bad Request (validation)
- `401` Unauthorized (not logged in)
- `403` Forbidden (logged in but not allowed)
- `404` Not Found
- `413` Payload Too Large
- `429` Too Many Requests
- `500` Internal Server Error

### Common Error Codes
- `UNAUTHORIZED`
- `FORBIDDEN`
- `INVALID_FILE_TYPE`
- `PAYLOAD_TOO_LARGE`
- `NOT_FOUND`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

---

## 8. Non-Functional Requirements

- APIs are stateless
- Backend scales via Azure Functions (Consumption Plan)
- Secrets managed via **Azure Key Vault**
- No business logic implemented in frontend

---

## 9. Ownership

- **Frontend**: UI, API consumption, Static Web Apps configuration
- **Backend**: Azure Functions, processing pipeline, databases, indexing
- **Integration**: API Management policies and routing

This contract must be updated if endpoints or data models change.
