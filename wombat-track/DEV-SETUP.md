# Wombat Track Development Setup

## Quick Start

Run the full development stack with:

```bash
npm run dev:full
```

This will start all three services concurrently:

### 🎨 Frontend (Vite)
- **Port:** `5173` (or next available)
- **URL:** http://localhost:5173
- **Description:** React + TypeScript + Vite development server
- **Hot reload:** Enabled

### 🔧 Backend (Express)
- **Port:** `3001`
- **URL:** http://localhost:3001
- **Description:** Main application server with governance logging
- **Endpoints:**
  - `GET /health` - Health check
  - `POST /api/governance/log` - Governance logging
  - `POST /api/github/trigger` - GitHub workflow triggers

### 🔐 Admin Backend (Express + SQLite)
- **Port:** `3002`
- **URL:** http://localhost:3002
- **Description:** Admin API server for OF-BEV Phase 4.0
- **Endpoints:**
  - `GET /api/admin/live/*` - Live database CRUD operations
  - `GET /api/admin/tables/*` - Table data access  
  - `GET /api/admin/csv/*` - CSV import/export operations
  - `GET /api/admin/json/*` - JSON import/export operations
  - `GET /api/admin/orphans/*` - Orphan detection and repair
  - `GET /api/admin/runtime/*` - Runtime status monitoring

## Alternative Scripts

### Backend Only
```bash
npm run dev:backend
```
Runs just the backend services (ports 3001 & 3002)

### Individual Services
```bash
npm run dev          # Frontend only (Vite)
npm run server       # Backend only (Express)
npm run admin-server # Admin backend only (Express + SQLite)
```

## Features

✅ **Concurrent Development** - All services run simultaneously with colored logs  
✅ **Auto-restart** - Backend services restart on file changes (with tsx)  
✅ **Hot Reload** - Frontend updates instantly on changes  
✅ **Professional Logging** - Color-coded service prefixes for easy debugging  
✅ **Full Stack Integration** - Frontend communicates with both backend services  

## Service Status Check

Once running, verify all services:

```bash
# Frontend (should return HTML)
curl http://localhost:5173

# Backend health
curl http://localhost:3001/health

# Admin backend health  
curl http://localhost:3002/health
```

## Dependencies

Key packages for the full stack:

- **concurrently** - Run multiple commands concurrently
- **tsx** - TypeScript execution for admin server
- **vite** - Frontend build tool and dev server
- **express** - Backend web framework
- **sqlite3 + sqlite** - Database for admin operations
- **cors** - Cross-origin requests
- **csv-parser/csv-stringify** - CSV import/export
- **multer** - File upload handling

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │  Admin Backend  │
│   (React/Vite)  │◄──►│   (Express)     │    │  (Express/SQLite)│
│   Port 5173     │    │   Port 3001     │    │   Port 3002     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

Frontend makes API calls to both backend services for different functionalities:
- **Backend (3001)**: Governance logging, GitHub integration, general app features
- **Admin Backend (3002)**: Data management, import/export, system administration

## Phase 4.0 Sidebar & UX Refactor

The development environment now supports the new Phase 4.0 features:
- Collapsible sidebar sections
- Sub-app health monitoring  
- Professional blue-gray admin theme
- Enhanced data explorer with inline editing
- Real-time admin operations

Ready for development! 🚀