# Digital Evidence Management System - Installation Guide

## Complete Frontend Application Setup

This is a comprehensive, production-ready Digital Evidence Management System built with React, featuring role-based access control, case management, evidence tracking, and analytics.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation Steps

### 1. Install Dependencies

Navigate to the frontend directory and install all required packages:

```bash
cd frontend
npm install
```

### 2. Install Additional Required Packages

The application requires these additional packages that aren't in the current package.json:

```bash
npm install recharts lucide-react date-fns
```

**Package Versions (Compatible with React 19):**
- `recharts`: ^2.15.0 (charts and data visualization)
- `lucide-react`: ^0.454.0 (icon library)
- `date-fns`: ^4.1.0 (date formatting utilities)

### 3. Project Structure

After setup, your project should have this structure:

```
frontend/
├── public/
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
│   ├── components/
│   │   ├── Layout.jsx          # Main layout with navigation
│   │   └── ProtectedRoute.jsx # Route protection
│   ├── context/
│   │   ├── AuthContext.js      # Authentication context
│   │   └── CaseContext.js      # Case management context
│   ├── pages/
│   │   ├── LoginPage.jsx       # Login page
│   │   ├── DashboardPage.jsx   # Dashboard
│   │   ├── CasesPage.jsx       # Cases list
│   │   ├── CaseDetailPage.jsx  # Case details
│   │   ├── UploadPage.jsx      # Evidence upload
│   │   ├── SearchPage.jsx      # Evidence search
│   │   ├── AnalyticsPage.jsx   # Analytics dashboard
│   │   ├── UsersPage.jsx       # User management
│   │   └── ProfilePage.jsx     # User profile
│   ├── styles/
│   │   └── main.css            # Complete application styles
│   ├── App.js                   # Main app component
│   ├── index.js                 # Entry point
│   └── index.css                # Base styles
├── package.json
└── README.md
```

### 4. Start Development Server

```bash
npm start
```

The application will open at `http://localhost:3000`

### 5. Build for Production

```bash
npm run build
```

## Demo Credentials

The system includes three demo user accounts with different permission levels:

### Investigator (Full Access)
- **Username:** admin
- **Password:** admin123
- **Permissions:** Full access to all features including user management, case creation/editing/deletion, analytics

### Officer (Limited Access)
- **Username:** officer
- **Password:** officer123
- **Permissions:** Can view and upload evidence to cases in their department only

### Higher Rank (Read-Only + Analytics)
- **Username:** chief
- **Password:** chief123
- **Permissions:** Can view all cases across departments, access analytics, upload evidence

## Features Overview

### 1. **Authentication System**
- Mock authentication (replaces Azure Entra ID for demo)
- Session-based user management
- Role-based access control

### 2. **Role-Based Permissions**
- **Investigator**: Full system access
- **Higher Rank**: Cross-department viewing + analytics
- **Officer**: Department-specific access

### 3. **Case Management**
- Create, edit, delete cases (investigators only)
- Case categorization (status, priority, department)
- Case notes and timeline
- Evidence association

### 4. **Evidence Management**
- Multi-format support (PDF, images, video, audio, text)
- File upload with drag-and-drop
- Metadata tagging
- Full-text search
- Case-based organization

### 5. **Search & Discovery**
- Advanced search filters
- File type filtering
- Full-text search across evidence
- Case-specific search

### 6. **Analytics Dashboard**
- Evidence statistics
- Case distribution charts
- Department analytics
- Timeline visualizations
- Export-ready data

### 7. **User Management**
- User listing (investigators only)
- Role assignment viewing
- Permission overview

### 8. **Responsive Design**
- Mobile-first approach
- Tablet optimization
- Desktop layouts
- Touch-friendly interfaces

## Configuration

### API Mode Toggle

In `src/api/apiClient.js`, you can switch between mock and real API:

```javascript
const USE_MOCK = true; // Change to false when backend is ready
```

### Environment Variables

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_BASE_URL=http://localhost:7071
```

## Architecture Details

### Context Providers

1. **AuthContext**: Manages user authentication, sessions, and permissions
2. **CaseContext**: Handles case and evidence data management

### State Management

- Uses React Context API for global state
- SessionStorage for persistence
- No external state management library required

### Styling Approach

- CSS Variables for theming
- BEM-inspired naming convention
- Responsive breakpoints at 480px, 640px, 768px, 992px, 1200px
- Print-optimized styles

### Data Flow

```
User Action → Component → Context → SessionStorage
                ↓
         UI Update via React State
```

## Customization

### Theme Colors

Edit CSS variables in `src/styles/main.css`:

```css
:root {
  --color-primary: #2563eb;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  /* ... more variables */
}
```

### Adding New Roles

1. Update `AuthContext.js` with new role
2. Add permission checks
3. Update `UsersPage.jsx` with role information

### Adding New Evidence Types

1. Update file type detection in `UploadPage.jsx`
2. Add file icon styles in `main.css`
3. Update search filters in `SearchPage.jsx`

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Optimization

- Code splitting with React.lazy (can be added)
- Optimized bundle size with tree shaking
- Lazy loading for charts
- Efficient re-renders with proper key usage

## Security Considerations

This is a **DEMO APPLICATION** with mock authentication. For production:

1. Replace mock auth with real Azure Entra ID or OAuth
2. Implement HTTPS
3. Add CSRF protection
4. Implement rate limiting
5. Add input validation and sanitization
6. Use secure session management
7. Implement audit logging

## Testing

Run tests with:

```bash
npm test
```

## Troubleshooting

### Port 3000 Already in Use

```bash
PORT=3001 npm start
```

### Test Mock API:
```bash
USE_MOCK=true npm start
```

### Test Real API:
```bash
USE_MOCK=false REACT_APP_API_BASE_URL=Address.of.your.url npm start
```

### Module Not Found Errors

```bash
rm -rf node_modules package-lock.json
npm install
```

### Styling Issues

Clear browser cache and restart dev server

## Next Steps for Production

1. **Backend Integration**: Connect to Azure Functions API
2. **Real Authentication**: Implement Azure Entra ID
3. **File Storage**: Connect to Azure Blob Storage
4. **Database**: Connect to Azure Cosmos DB
5. **Search**: Integrate Azure Cognitive Search
6. **Analytics**: Connect to Azure Synapse Analytics
7. **Deployment**: Deploy to Azure Static Web Apps

## Support & Documentation

- Frontend Documentation: `/docs/API_ARCHITECTURE.md`
- Project Proposal: `/Digital_Evidence_Management_System_Final_Proposal.pdf`

## License

This is an academic project. Check with your institution for usage rights.