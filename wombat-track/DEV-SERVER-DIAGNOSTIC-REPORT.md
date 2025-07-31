# Dev Server Project Visibility Diagnostic Report

**Date:** 2025-07-29  
**Status:** 🔍 DIAGNOSTIC COMPLETE  
**Operation:** Dev Server Data Loading Analysis

## Issue Summary

The dev server is not displaying project data from the WT-8.0.9 unified oApp database because the application is still configured to use hardcoded mock data instead of connecting to the production database.

## Root Cause Analysis

### 1. Data Source Configuration
- **Current:** Application uses hardcoded `mockProjects` in `src/components/layout/AppLayout.tsx:21-99`
- **Expected:** Application should load from oApp production database via API or direct connection
- **Environment Variables:** Missing `DATABASE_URL` and `OAPP_DB_ENV` in dev environment

### 2. Application Architecture
```
src/App.tsx (USE_NEW_LAYOUT = true)
  └── AppLayout.tsx (initialProjects = mockProjects) 
      └── ProjectProvider (initialProjects = [])
          └── Components use useProjectContext()
```

### 3. Database Status
- **oApp Production:** 715+ records across 6 schemas ✅ Available
- **Projects:** 92 clean records after WT-8.0.8 deduplication ✅ Available  
- **Dev Environment:** Missing database connection configuration ❌ Not connected

## Technical Findings

### Missing Database Integration
1. **No API Layer:** Application lacks REST API to fetch from oApp database
2. **Mock Data Override:** `AppLayout.tsx` hardcodes 3 mock projects instead of fetching real data
3. **Environment Config:** `.env` file missing database connection strings for dev server
4. **Browser Compatibility:** `governance-logger.ts` uses Node.js `fs/promises` causing build warnings

### Data Flow Issues
```
Expected: oApp DB → API → React Context → Components
Actual:   Mock Data → React Context → Components
```

### Available Data Sources
- **Mock Projects:** 5 projects in `src/data/mockProjects.ts`
- **Mock Programs:** Available in `src/data/mockPrograms.ts`
- **oApp Production:** 92 real projects not accessible to dev environment

## Recommended Solutions

### Immediate Fix (Option A: Add API Layer)
1. **Create API Service:**
   ```typescript
   // src/services/projectAPI.ts
   export async function fetchProjectsFromOApp(): Promise<Project[]> {
     const response = await fetch('/api/projects');
     return response.json();
   }
   ```

2. **Update AppLayout.tsx:**
   ```typescript
   const [projects, setProjects] = useState<Project[]>([]);
   
   useEffect(() => {
     fetchProjectsFromOApp().then(setProjects);
   }, []);
   ```

3. **Create Backend Endpoint:**
   - Express.js route: `/api/projects`
   - Connect to oApp production database
   - Return cleaned project data

### Alternative Fix (Option B: Direct Database)
1. **Add Database Connection:**
   - Install database client (sqlite3/postgres)
   - Add connection string to `.env`
   - Create direct database service

2. **Update Environment:**
   ```bash
   DATABASE_URL=sqlite:///path/to/oapp_production.db
   OAPP_DB_ENV=development
   ```

### Browser Compatibility Fix
1. **Fix governance-logger.ts:**
   ```typescript
   // Replace Node.js fs with browser-compatible solution
   const logToLocalStorage = (entry: GovernanceLogEntry) => {
     const logs = JSON.parse(localStorage.getItem('governance_logs') || '[]');
     logs.push(entry);
     localStorage.setItem('governance_logs', JSON.stringify(logs));
   };
   ```

## Impact Assessment

### Current State
- **Dev Server:** Shows 3 mock projects ❌
- **User Experience:** Developers cannot see real migrated data ❌
- **Data Validation:** Cannot test with production dataset ❌
- **Development Flow:** Disconnected from oApp unification work ❌

### Post-Fix State
- **Dev Server:** Shows 92 real projects ✅
- **User Experience:** Full visibility into migrated data ✅
- **Data Validation:** Can test with real dataset ✅
- **Development Flow:** Connected to oApp ecosystem ✅

## Next Steps

### Priority 1: Quick Fix
1. Create simple API endpoint: `/api/projects`
2. Update `AppLayout.tsx` to fetch from API
3. Test dev server shows real project data

### Priority 2: Full Integration
1. Add complete oApp API layer
2. Implement real-time sync with oApp database
3. Add error handling and fallback to mock data

### Priority 3: Enhancement
1. Fix browser compatibility warnings
2. Add caching layer for performance
3. Implement real-time updates via WebSocket

## Governance Log Entry

```json
{
  "timestamp": "2025-07-29T18:30:00.000Z",
  "event_type": "dev_server_diagnostic",
  "user_id": "claude",
  "user_role": "developer",
  "resource_type": "development_environment",
  "resource_id": "wombat-track-dev-server",
  "action": "diagnose_data_visibility",
  "success": true,
  "details": {
    "issue": "Dev server using mock data instead of oApp database",
    "root_cause": "Missing API layer and database connection",
    "impact": "Developers cannot see real migrated project data",
    "solution": "Add API endpoint to fetch from oApp production database",
    "estimated_fix_time": "2-4 hours"
  }
}
```

---

**Diagnostic Engineer:** Claude  
**Final Status:** 🔍 Root Cause Identified - API Integration Required  
**Recommended Action:** Implement API layer to connect dev server to oApp database