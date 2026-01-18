# Digital Evidence Management System

A comprehensive, cloud-based digital evidence management system with role-based access control, Azure Cognitive Services integration, and advanced search capabilities.

## 🎯 Project Overview

This system provides secure upload, processing, and analysis of digital evidence including documents, images, audio files, and videos. It features granular role-based access control, automated metadata extraction via Azure Cognitive Services simulation, and comprehensive search and analytics capabilities.

## ✨ Key Features

### 🔐 Four-Tier Role-Based Access Control

#### 1. **Admin (System Administrator)**
- **Purpose**: Platform governance and system configuration
- **Access**: User management, roles, departments, authentication settings
  - Add and delete users
  - Edit user role, department, and badge ID at any time
  - Manage departments (add, edit display name, delete when not in use)
  - Username is immutable after creation; users change their own password from Profile
- **Restrictions**: ZERO access to investigative content (cases, evidence, analytics)
- **Use Case**: IT administrators, system managers who should not view investigative data

#### 2. **Detective (Cross-Department Investigator)**
- **Purpose**: Senior investigative authority with full operational access
- **Access**: All departments, all cases, full CRUD operations on cases and evidence
- **Capabilities**: Create/edit/delete cases, upload/delete evidence, view analytics, cross-department search
- **Use Case**: Senior detectives, task force members, central investigative units

#### 3. **Case Officer (Department-Scoped Investigator)**
- **Purpose**: Department-specific investigative work
- **Access**: Only cases within assigned department
- **Capabilities**: Create/manage department cases, upload evidence, add notes, department-specific search
- **Restrictions**: Cannot access other departments' cases or evidence
- **Use Case**: Field officers, department investigators, unit-specific personnel

#### 4. **Prosecutor (Judicial / Legal Reviewer)**
- **Purpose**: Legal oversight and case preparation
- **Access**: Read-only access to ALL departments, cases, and evidence
- **Capabilities**: Review evidence, metadata, timelines, chain-of-custody, analytics
- **Restrictions**: Cannot upload, modify, delete, or reclassify any evidence
- **Use Case**: District attorneys, legal reviewers, judicial oversight

### 📤 Azure Cognitive Services Integration

All uploaded evidence is automatically processed with simulated Azure Cognitive Services:

#### Computer Vision API (Images)
- Object detection with confidence scores and bounding boxes
- Face detection and counting
- Landmark identification
- Color analysis and dominant color extraction
- Adult content filtering
- Scene classification
- Auto-tagging based on detected objects

#### Form Recognizer + OCR (PDFs)
- Multi-page document processing
- Text extraction with confidence scoring
- Layout analysis and text block identification
- Language detection
- Orientation detection
- Structured data extraction

#### Speech-to-Text (Audio)
- Full audio transcription
- Speaker diarization (multiple speaker identification)
- Language detection with confidence
- Key phrase extraction
- Sentiment analysis
- Timestamp synchronization

#### Video Indexer (Videos)
- Scene detection and segmentation
- Keyframe extraction
- Face tracking across frames
- Object tracking
- Shot-type classification
- Audio transcription from video
- Scene break identification

#### Text Analytics (Text Files)
- Sentiment analysis (positive/neutral/negative)
- Key phrase extraction
- Entity recognition (people, places, dates)
- Language detection
- Word/character count statistics

**Important**: Each evidence item receives:
- **Auto Tags**: Generated automatically by Azure services
- **User Tags**: Added manually by investigators
- **Combined Tags**: Searchable union of both tag types
- **Extracted Content**: Full text/analysis from Azure services
- **Rich Metadata**: Service-specific metadata (faces, objects, speakers, etc.)

### 🔍 Advanced Search Capabilities

#### Global Evidence Search
- Full-text search across filenames, descriptions, extracted content, and tags
- Filter by file type (PDF, Image, Video, Audio, Text)
- Filter by processing status (Completed, Processing, Received, Failed)
- Date range filtering
- Cross-department search (Detective and Prosecutor only)

#### Per-Case Evidence Search
- Case-specific evidence filtering
- Search within case by filename, description, or tags
- Type and status filtering within case context
- Real-time search results

### 📊 Analytics Dashboard
- Evidence distribution by type (pie charts)
- Case status tracking (bar charts)
- 7-day upload trend analysis (line charts)
- Priority distribution
- Department-wise case distribution
- Storage utilization tracking
- Average evidence per case metrics

### 📝 Enhanced Note Management
- Add notes to any case (with proper permissions)
- Delete notes with role-based authorization:
    - **Detective**: Can delete any note
    - **Case Officer**: Can delete own notes only
    - **Prosecutor**: Can delete own notes only
- Real-time note updates
- Timestamp and author tracking

## 🛠️ Technology Stack

### Frontend
- **React 19** - Latest React with improved performance
- **React Router DOM 7** - Client-side routing
- **Recharts** - Data visualization and charts
- **Lucide React** - Modern icon system
- **date-fns** - Comprehensive date manipulation
- **CSS3** - Modern styling with CSS custom properties

### Backend (Planned Azure Integration)
- **Azure Functions** - Serverless compute for processing
- **Azure Blob Storage** - Scalable file storage
- **Azure Cosmos DB** - NoSQL database for metadata
- **Azure Cognitive Search** - Full-text search indexing
- **Azure Computer Vision** - Image analysis
- **Azure Form Recognizer** - Document OCR
- **Azure Speech Services** - Audio transcription
- **Azure Video Indexer** - Video analysis
- **Azure Text Analytics** - NLP and sentiment analysis
- **Azure Synapse Analytics** - Data warehousing
- **Azure Entra ID** - Enterprise authentication (to replace mock auth)

## 📋 Prerequisites

- Node.js 14.x or higher
- npm 6.x or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
cd frontend

# Install dependencies
npm install

# Install required packages (if not already in package.json)
npm install recharts lucide-react date-fns
```

### 2. Start Development Server

```bash
npm start
```

Application will be available at `http://localhost:3000`

### 3. Login with Demo Accounts

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| **Admin** | admin | admin123 | System management only, NO investigative access |
| **Detective** | detective | detective123 | Full cross-department investigative access |
| **Case Officer (HQ)** | officer_hq | officer123 | Headquarters department only |
| **Case Officer (District A)** | officer_da | officer123 | District A department only |
| **Prosecutor** | prosecutor | prosecutor123 | Read-only access to all cases/evidence |

**Additional Test Accounts:**
- `detective2` / `detective123` (Forensics department)
- `officer_db` / `officer123` (District B department)

## 📐 Architecture

### System Architecture
```
┌─────────────────────────────────────────────────────────┐
│              User Interface (React)                      │
│  LoginPage │ Dashboard │ Cases │ Evidence │ Analytics   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│           Context Providers (Global State)               │
│         AuthContext │ CaseContext                        │
│    (Permissions & Auth) │ (Cases & Evidence)            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│              API Client Layer                            │
│       authApi │ caseApi │ evidenceApi │ analyticsApi    │
│              (Mock / Real Switcher)                      │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
┌────────┴──────────┐   ┌────────┴────────────────────────┐
│   Mock API        │   │   Real API (Azure Services)      │
│ - SessionStorage  │   │ - Azure Functions                │
│ - Simulated Azure │   │ - Cognitive Services             │
│   Cognitive Svcs  │   │ - Blob Storage                   │
│ - Local Data      │   │ - Cosmos DB                      │
└───────────────────┘   │ - Cognitive Search               │
                        │ - Synapse Analytics              │
                        └──────────────────────────────────┘
```

### Role Permission Matrix

| Feature | Admin | Detective | Case Officer | Prosecutor |
|---------|-------|-----------|-------------|-----------|
| **SYSTEM MANAGEMENT** | | | | |
| Manage users | ✅ | ❌ | ❌ | ❌ |
| Configure departments | ✅ | ❌ | ❌ | ❌ |
| Manage authentication | ✅ | ❌ | ❌ | ❌ |
| View audit logs | ✅ | ✅ | ❌ | ❌ |
| **CASE OPERATIONS** | | | | |
| View all cases | ❌ | ✅ | ❌ (dept only) | ✅ |
| Create cases | ❌ | ✅ | ✅ (dept only) | ❌ |
| Edit cases | ❌ | ✅ | ✅ (dept only) | ❌ |
| Delete cases | ❌ | ✅ | ❌ | ❌ |
| **EVIDENCE OPERATIONS** | | | | |
| View evidence | ❌ | ✅ | ✅ (dept only) | ✅ |
| Upload evidence | ❌ | ✅ | ✅ | ❌ |
| Edit evidence metadata | ❌ | ✅ | ✅ (own only) | ❌ |
| Delete evidence | ❌ | ✅ | ❌ | ❌ |
| **NOTES & COLLABORATION** | | | | |
| Add notes | ❌ | ✅ | ✅ | ✅ |
| Delete own notes | ❌ | ✅ | ✅ | ✅ |
| Delete any note | ❌ | ✅ | ❌ | ❌ |
| **ANALYTICS & SEARCH** | | | | |
| View analytics | ❌ | ✅ | ✅ (dept data) | ✅ |
| Cross-dept search | ❌ | ✅ | ❌ | ✅ |
| Export data | ❌ | ✅ | ❌ | ✅ |

## 📁 Project Structure

```
frontend/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── api/
│   │   ├── config.js                 # Toggle mock/real API
│   │   ├── authApi.js                # Auth interface
│   │   ├── caseApi.js                # Case interface
│   │   ├── evidenceApi.js            # Evidence interface
│   │   ├── analyticsApi.js           # Analytics interface
│   │   ├── mock/                     # Mock implementations
│   │   │   ├── mockAuthApi.js        # Mock auth with all 4 roles
│   │   │   ├── mockCaseApi.js        # Mock cases with notes
│   │   │   ├── mockEvidenceApi.js    # Mock with Azure simulation
│   │   │   └── mockAnalyticsApi.js   # Computed analytics
│   │   └── real/                     # Real API implementations
│   │       ├── realAuthApi.js        # HTTP auth calls
│   │       ├── realCaseApi.js        # HTTP case calls
│   │       ├── realEvidenceApi.js    # HTTP evidence calls
│   │       └── realAnalyticsApi.js   # HTTP analytics calls
│   ├── components/
│   │   ├── Layout.jsx                # Main layout with nav
│   │   └── ProtectedRoute.jsx        # Route protection
│   ├── context/
│   │   ├── AuthContext.jsx           # Auth + granular permissions
│   │   └── CaseContext.jsx           # Case/evidence state
│   ├── pages/
│   │   ├── LoginPage.jsx             # Login with 4 roles
│   │   ├── DashboardPage.jsx         # Dashboard
│   │   ├── CasesPage.jsx             # Cases list
│   │   ├── CaseDetailPage.jsx        # Case detail + evidence search
│   │   ├── UploadPage.jsx            # Evidence upload
│   │   ├── SearchPage.jsx            # Global search
│   │   ├── AnalyticsPage.jsx         # Analytics dashboard
│   │   ├── UsersPage.jsx             # User management (Admin)
│   │   └── ProfilePage.jsx           # User profile
│   ├── styles/
│   │   └── main.css                  # Complete styling
│   ├── App.js                        # Main app component
│   └── index.js                      # Entry point
├── docs/
│   └── API_ARCHITECTURE.md           # API documentation
├── package.json
├── README.md
└── INSTALLATION.md
```

## 🔒 Security Architecture

### Current Implementation (Demo)
- Session-based authentication via sessionStorage
- Role-based route protection
- Permission checking on all operations
- Input validation
- XSS prevention via React

### Production Requirements
1. **Authentication**: Replace mock auth with Azure Entra ID (OAuth 2.0 + OpenID Connect)
2. **Transport Security**: HTTPS enforcement, TLS 1.3
3. **Data Protection**: Encryption at rest (Cosmos DB), encryption in transit
4. **CSRF Protection**: Anti-forgery tokens on state-changing operations
5. **Rate Limiting**: API throttling to prevent abuse
6. **Audit Logging**: Comprehensive logging of all actions with Azure Monitor
7. **Input Sanitization**: Server-side validation and sanitization
8. **File Validation**: Content-type checking, malware scanning for uploads

## 🎨 Design System

### Color Palette
- **Primary**: Blue (#2563eb) - Actions, navigation, important elements
- **Success**: Green (#10b981) - Success states, completed items
- **Warning**: Orange (#f59e0b) - Warnings, pending states
- **Danger**: Red (#ef4444) - Errors, delete actions
- **Info**: Blue (#3b82f6) - Informational elements
- **Neutral**: Gray scale - Text, borders, backgrounds

### Typography
- System font stack for optimal performance and native appearance
- Responsive font sizing (16px base)
- Clear hierarchy with consistent line-height (1.6)

### Components
- 4px base spacing system
- Border radius: 4px, 8px, 12px, 16px, full
- Box shadows: sm, md, lg, xl
- Transitions: 150ms (fast), 200ms (normal), 300ms (slow)

### Responsive Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px
- **Wide**: > 1400px

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## 🏗️ Building for Production

```bash
# Create optimized production build
npm run build

# Build output will be in /build directory
# Deploy to Azure Static Web Apps
```

## 🔄 Switching Between Mock and Real Backend

### Using Mock API (Default)
```javascript
// In src/api/config.js
export const USE_MOCK = true;
```

### Using Real Backend
```javascript
// In src/api/config.js
export const USE_MOCK = false;

// In .env file
REACT_APP_API_BASE_URL=https://your-backend.azurewebsites.net
```

## 📊 Azure Cognitive Services Data Flow

```
User Uploads File
       ↓
Evidence Created (Status: PROCESSING)
       ↓
Azure Cognitive Services API Call
       ↓
  ┌────┴────────────────────────┐
  │ Computer Vision (Images)    │
  │ Form Recognizer (PDFs)      │
  │ Speech-to-Text (Audio)      │
  │ Video Indexer (Videos)      │
  │ Text Analytics (Text)       │
  └────┬────────────────────────┘
       ↓
Extract: Tags, Text, Metadata
       ↓
Update Evidence (Status: COMPLETED)
       ↓
Store in Cosmos DB + Index in Cognitive Search
       ↓
Available for Search & Analysis
```

## 🚀 Deployment

### Azure Static Web Apps Deployment

```bash
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Login to Azure
az login

# Create Static Web App
az staticwebapp create \
  --name digital-evidence-system \
  --resource-group your-resource-group \
  --source ./ \
  --branch main \
  --app-location "frontend" \
  --api-location "api" \
  --output-location "build"

# Deploy
npm run build
swa deploy
```

## 📚 Additional Documentation

- **[Installation Guide](INSTALLATION.md)** - Detailed setup instructions
- **[API Architecture](docs/API_ARCHITECTURE.md)** - API endpoints and data models
- **[Project Proposal](Digital_Evidence_Management_System_Final_Proposal.pdf)** - Original proposal

## 🌐 Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- iOS Safari
- Chrome for Android

## 🚧 Known Issues & Limitations

1. **Mock Authentication**: Demo uses sessionStorage. Replace with Azure Entra ID for production.
2. **File Upload Simulation**: Mock API simulates uploads. Real implementation requires Azure Blob Storage.
3. **Azure Services Simulation**: Cognitive Services responses are simulated with realistic data structures.
4. **No Real-Time Updates**: Mock implementation doesn't support WebSockets. Use Azure SignalR for real-time features.
5. **Limited Concurrency Handling**: Last-write-wins for concurrent edits. Implement optimistic locking for production.

## 🔮 Roadmap

### Phase 1: Core Features ✅
- ✅ Four-tier role-based access control
- ✅ Case management with CRUD operations
- ✅ Evidence upload and metadata management
- ✅ Azure Cognitive Services simulation
- ✅ Per-case and global evidence search
- ✅ Note management with deletion

### Phase 2: Azure Integration (In Progress)
- 🔄 Azure Entra ID authentication
- 🔄 Azure Blob Storage for file storage
- 🔄 Real Azure Cognitive Services integration
- 🔄 Azure Cosmos DB for metadata
- 🔄 Azure Cognitive Search for full-text search

### Phase 3: Advanced Features (Planned)
- 📋 Real-time notifications with Azure SignalR
- 📋 Advanced analytics with custom dashboards
- 📋 Audit log viewer with filtering
- 📋 Batch operations for evidence management
- 📋 Export capabilities (PDF reports, CSV data)
- 📋 Evidence timeline visualization
- 📋 Collaborative annotations on evidence
- 📋 Mobile app (React Native)

### Phase 4: Enterprise Features (Future)
- 📋 Multi-tenant support
- 📋 Custom workflow automation
- 📋 Integration with court systems
- 📋 Advanced reporting engine
- 📋 Machine learning for evidence classification
- 📋 Blockchain for chain-of-custody verification

## 🤝 Contributing

This is an academic project. For contributions:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

Academic project - check with your institution for usage rights.

## 👤 Author

**Nima**
- Email: yourname@studenti.unisa.it
- University: University of Salerno

## 🙏 Acknowledgments

- University of Salerno
- Microsoft Azure Documentation
- React Community
- Lucide Icons
- Recharts Community
- Open Source Contributors

## 📞 Support

For issues and questions:
1. Check the [Installation Guide](INSTALLATION.md)
2. Review [API Architecture](docs/API_ARCHITECTURE.md)
3. Check [Known Issues](#-known-issues--limitations)
4. Open an issue in the repository

---

**Note**: This is a demonstration project with simulated Azure Cognitive Services and mock authentication. For production deployment, implement proper security measures and integrate with real Azure services as outlined in the project proposal.

**Important**: The system currently uses mock authentication. In production, this must be replaced with Azure Entra ID (formerly Azure Active Directory) for enterprise-grade security and compliance.