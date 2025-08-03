# 🚨 URGENT DEBUG FIXES - React App Errors

## Root Cause Analysis

### ❌ Issue 1: Missing `logProjectSurfaceSelect` Function
**File:** `src/services/enhancedGovernanceLogger.ts:546`  
**Problem:** The `governanceLogger` export object doesn't properly include the `logProjectSurfaceSelect` method.

**Current Code:**
```typescript
export const governanceLogger = {
  // Enhanced methods
  ...enhancedGovernanceLogger,  // ❌ This spread doesn't work properly
  
  // Legacy methods
  logSidebarInteraction: (params) => { ... }
};
```

**Fix Required:**
```typescript
export const governanceLogger = {
  // Explicitly export the method that's being called
  logProjectSurfaceSelect: enhancedGovernanceLogger.logProjectSurfaceSelect,
  logSubAppSelect: enhancedGovernanceLogger.logSubAppSelect,
  logProjectNavigation: enhancedGovernanceLogger.logProjectNavigation,
  
  // Legacy methods for backward compatibility
  logSidebarInteraction: (params: {
    action: string;
    target: string;
    context: string;
    metadata?: Record<string, any>;
  }) => {
    // Existing implementation
  }
};
```

### ❌ Issue 2: Missing API Endpoint
**URL:** `GET /api/orbis/projects/all`  
**Problem:** The endpoint doesn't exist in the server routing.

**Expected Route:** `src/server/api/orbis.ts` should handle `/api/orbis/projects/all`

### ❌ Issue 3: WebSocket Server Not Running
**URL:** `ws://localhost:3001/projects`  
**Problem:** No WebSocket server listening on port 3001.

**Solutions:**
1. **Option A:** Start WebSocket server on port 3001
2. **Option B:** Update client to use correct WebSocket URL
3. **Option C:** Improve fallback to polling-only mode

## 🔧 Immediate Fixes Needed

### Fix 1: Update Enhanced Governance Logger Export
```typescript
// src/services/enhancedGovernanceLogger.ts (line 546)
export const governanceLogger = {
  // Explicitly include all public methods
  logProjectSurfaceSelect: enhancedGovernanceLogger.logProjectSurfaceSelect.bind(enhancedGovernanceLogger),
  logSubAppSelect: enhancedGovernanceLogger.logSubAppSelect.bind(enhancedGovernanceLogger),
  logProjectNavigation: enhancedGovernanceLogger.logProjectNavigation.bind(enhancedGovernanceLogger),
  logSessionStart: enhancedGovernanceLogger.logSessionStart.bind(enhancedGovernanceLogger),
  
  // Legacy compatibility methods
  logSidebarInteraction: (params: {
    action: string;
    target: string;
    context: string;
    metadata?: Record<string, any>;
  }) => {
    switch (params.action) {
      case 'surface_switch':
        enhancedGovernanceLogger.logProjectSurfaceSelect(params.target);
        break;
      case 'sub_app_switch':
        enhancedGovernanceLogger.logSubAppSelect(
          params.metadata?.sub_app_id || params.target,
          params.target,
          params.metadata?.projects_count || 0,
          params.metadata?.recent_projects || []
        );
        break;
      default:
        console.warn('Unknown legacy action:', params.action);
    }
  }
};
```

### Fix 2: Create Missing API Endpoint
```typescript
// src/server/api/orbis.ts
app.get('/api/orbis/projects/all', async (req, res) => {
  try {
    const { limit = 100, sortBy = 'lastUpdated', sortOrder = 'desc', search, status, priority } = req.query;
    
    // Get projects from canonical schema or fallback to CSV
    const projects = await getCanonicalProjects({
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as string,
      search: search as string,
      status: status as string,
      priority: priority as string
    });
    
    res.json({
      projects,
      total: projects.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});
```

### Fix 3: WebSocket Fallback Improvement
```typescript
// src/hooks/useOrbisAPI.ts
const setupWebSocket = useCallback(() => {
  // Skip WebSocket if server is not available
  if (process.env.NODE_ENV === 'development') {
    console.log('[WebSocket] Skipping WebSocket in development, using polling only');
    setupPolling();
    return;
  }
  
  try {
    const ws = new WebSocket(`ws://localhost:3001/projects`);
    
    ws.onopen = () => {
      console.log('[WebSocket] Connected to projects updates');
      setIsLive(true);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProjectsData(data);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('[WebSocket] Failed to parse message:', err);
      }
    };
    
    ws.onclose = () => {
      console.log('[WebSocket] Disconnected from projects updates, falling back to polling');
      setIsLive(false);
      setupPolling();
    };
    
    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      setIsLive(false);
      setupPolling();
    };
    
    wsRef.current = ws;
  } catch (err) {
    console.error('[WebSocket] Failed to connect, using polling:', err);
    setIsLive(false);
    setupPolling();
  }
}, [fetchProjects]);
```

## 🚀 Execution Priority

1. **CRITICAL:** Fix governance logger export (prevents React crash)
2. **HIGH:** Create missing API endpoint (enables data loading)
3. **MEDIUM:** Improve WebSocket fallback (enhances UX)

## 🧪 Testing Steps

1. **Fix governance logger** → Component should render without crashing
2. **Add API endpoint** → Projects should load in dashboard
3. **Update WebSocket** → Should gracefully fall back to polling
4. **Verify functionality** → All projects dashboard should work properly

The governance logger fix is the most critical as it's causing the React component to crash and preventing the entire UI from rendering.