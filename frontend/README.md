# Digital Evidence Management System

A comprehensive, cloud-based digital evidence management system designed for legal, investigative, and compliance environments. Built with React and designed for deployment on Microsoft Azure.

## 🎯 Project Overview

This system allows secure upload, processing, and analysis of digital evidence including documents, images, audio files, and videos. It features role-based access control, case management, advanced search, and analytics capabilities.

## ✨ Key Features

### 🔐 Authentication & Authorization
- Role-based access control (Investigator, Officer, Higher Rank)
- Secure session management
- Department-based access restrictions
- Mock authentication system (production-ready for Azure Entra ID integration)

### 📁 Case Management
- Create and manage investigation cases
- Case categorization by priority, status, and department
- Timeline tracking with automatic timestamps
- Case notes and collaborative features
- Evidence association and organization

### 📤 Evidence Management
- Multi-format file upload (PDF, images, video, audio, text documents)
- Drag-and-drop interface
- File size validation (up to 50MB)
- Automatic metadata extraction simulation
- Tagging and categorization system
- Chain of custody tracking

### 🔍 Advanced Search
- Full-text search across all evidence
- Filter by file type, status, case, and date
- Real-time search results
- Case-specific evidence browsing

### 📊 Analytics Dashboard
- Evidence distribution charts
- Case status tracking
- Department statistics
- Timeline visualizations
- Interactive data visualizations with Recharts

### 👥 User Management
- User listing and role overview (Investigator access only)
- Permission matrix display
- Department assignments

### 📱 Responsive Design
- Mobile-first approach
- Optimized for tablets and desktops
- Touch-friendly interfaces
- Accessible navigation

## 🛠️ Technology Stack

### Frontend
- **React 19** - UI framework
- **React Router DOM 7** - Client-side routing
- **Recharts** - Data visualization
- **Lucide React** - Icon system
- **date-fns** - Date formatting
- **CSS3** - Modern styling with CSS variables

### Backend (Planned Integration)
- **Azure Functions** - Serverless processing
- **Azure Blob Storage** - File storage
- **Azure Cosmos DB** - Evidence metadata
- **Azure Cognitive Search** - Full-text search indexing
- **Azure Cognitive Services** - OCR, image analysis, transcription
- **Azure Synapse Analytics** - Data analytics
- **Azure Entra ID** - Authentication

## 📋 Prerequisites

- Node.js 14.x or higher
- npm 6.x or higher
- Modern web browser

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone [your-repo-url]

# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Install additional required packages
npm install recharts lucide-react date-fns
```

### 2. Start Development Server

```bash
npm start
```

Application will be available at `http://localhost:3000`

### 3. Login

Use one of the demo accounts:

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| Investigator | admin | admin123 | Full access |
| Officer | officer | officer123 | Department-limited |
| Higher Rank | chief | chief123 | Cross-department view + analytics |

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Interface                       │
│              (React Components + Routing)                │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│              Context Providers (State)                   │
│         AuthContext │ CaseContext                        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                  API Client Layer                        │
│          (Mock API / Real API Switcher)                  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│             Backend Services (Azure)                     │
│  Functions │ Storage │ Cosmos DB │ Cognitive Search     │
└─────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
frontend/
├── public/                       # Static assets
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── api/
│   │   ├── config.js             # Toggle mock/real
│   │   ├── authApi.js            # Interface
│   │   ├── caseApi.js            # Interface
│   │   ├── evidenceApi.js        # Interface
│   │   ├── analyticsApi.js       # Interface
│   │   ├── mock/                 # All mock data here
│   │   │   ├── mockAuthApi.js
│   │   │   ├── mockCaseApi.js
│   │   │   ├── mockEvidenceApi.js
│   │   │   └── mockAnalyticsApi.js
│   │   └── real/                 # HTTP implementations
│   │       ├── realAuthApi.js
│   │       ├── realCaseApi.js
│   │       ├── realEvidenceApi.js
│   │       └── realAnalyticsApi.js
│   ├── components/          # Reusable components
│   │   ├── Layout.jsx
│   │   └── ProtectedRoute.jsx
│   ├── context/             # React Context providers
│   │   ├── AuthContext.js
│   │   └── CaseContext.js
│   ├── pages/               # Page components
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── CasesPage.jsx
│   │   ├── CaseDetailPage.jsx
│   │   ├── UploadPage.jsx
│   │   ├── SearchPage.jsx
│   │   ├── AnalyticsPage.jsx
│   │   ├── UsersPage.jsx
│   │   └── ProfilePage.jsx
│   ├── styles/              # CSS styles
│   │   └── main.css
│   ├── App.js               # Root component
│   └── index.js             # Entry point
├── package.json
└── README.md
```

## 🎨 Design System

### Color Palette
- **Primary**: Blue (#2563eb) - Actions, links
- **Success**: Green (#10b981) - Success states
- **Warning**: Orange (#f59e0b) - Warnings
- **Danger**: Red (#ef4444) - Errors, destructive actions
- **Neutral**: Grays - Text, borders, backgrounds

### Typography
- System font stack for optimal performance
- Responsive font sizing
- Clear hierarchy

### Components
- Consistent spacing system (4px base)
- Border radius: 4px, 8px, 12px, 16px
- Shadows: sm, md, lg, xl
- Transitions: 150ms, 200ms, 300ms

## 🔒 Security Features

### Current Implementation (Demo)
- Session-based authentication
- Role-based route protection
- Permission checking on actions
- Input validation

### Production Requirements
- Azure Entra ID integration
- HTTPS enforcement
- CSRF protection
- Rate limiting
- Audit logging
- Encryption at rest and in transit

## 📊 Role Permissions Matrix

| Feature | Investigator | Officer | Higher Rank |
|---------|-------------|---------|-------------|
| View all cases | ✅ | ❌ (dept only) | ✅ |
| Create cases | ✅ | ❌ | ❌ |
| Edit cases | ✅ | ❌ | ❌ |
| Delete cases | ✅ | ❌ | ❌ |
| Upload evidence | ✅ | ✅ | ✅ |
| Delete evidence | ✅ | ❌ | ❌ |
| View analytics | ✅ | ❌ | ✅ |
| Manage users | ✅ | ❌ | ❌ |
| Add notes | ✅ | ✅ | ✅ |

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
# Create production build
npm run build

# Build output will be in /build directory
```

## 🌐 Browser Support

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)
- iOS Safari
- Chrome for Android

## 📱 Responsive Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px
- **Wide**: > 1400px

## 🚧 Roadmap

### Phase 1: Core Features ✅
- Authentication system
- Case management
- Evidence upload
- Basic search
- Role-based access

### Phase 2: Advanced Features (In Progress)
- Advanced search filters
- Analytics dashboard
- User management
- File preview

### Phase 3: Azure Integration (Planned)
- Azure Entra ID authentication
- Blob Storage integration
- Cosmos DB connection
- Cognitive Search implementation
- Real-time processing pipeline

### Phase 4: Enhanced Features (Future)
- Real-time notifications
- Advanced analytics
- Audit logs viewer
- Batch operations
- Export capabilities
- Mobile app

## 🤝 Contributing

This is an academic project. If you'd like to contribute:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

Academic project - check with your institution for usage rights.

## 👤 Author

**Nima**
- Email: yourname@studenti.unisa.it

## 🙏 Acknowledgments

- University of Salerno
- Microsoft Azure Documentation
- React Community
- Open Source Contributors

## 📞 Support

For issues and questions:
1. Check the documentation in `/docs`
2. Review `INSTALLATION.md` for setup help
3. Open an issue in the repository

## 📚 Additional Documentation

- [Installation Guide](INSTALLATION.md)
- [API ARCHITECTURE](docs/API_ARCHITECTURE.md)
- [Project Proposal](Digital_Evidence_Management_System_Final_Proposal.pdf)

---

**Note**: This is a demonstration project with mock authentication. For production deployment, implement proper security measures and integrate with Azure services as outlined in the project proposal.