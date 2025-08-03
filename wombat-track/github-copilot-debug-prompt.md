# GitHub Copilot Debug Prompt - React WebSocket & Governance Logger Errors

## 🚨 Current Issues

### Error 1: WebSocket Connection Failures
```
WebSocket connection to 'ws://localhost:3001/projects' failed: WebSocket is closed before the connection is established.
```

### Error 2: Missing Governance Logger Function
```
Uncaught TypeError: governanceLogger.logProjectSurfaceSelect is not a function
    at AllProjectsDashboard.tsx:104:22
```

### Error 3: API Endpoint Not Found
```
Failed to load resource: the server responded with a status of 404 (Not Found)
GET /api/orbis/projects/all?limit=100&sortBy=lastUpdated&sortOrder=desc
```

## 📋 Debug Instructions for GitHub Copilot

### Analysis Tasks:

1. **Examine `useOrbisAPI.ts:179`** - Find why WebSocket connection to localhost:3001 is failing
2. **Check `AllProjectsDashboard.tsx:104`** - Identify missing `logProjectSurfaceSelect` function
3. **Review governance logger imports** - Verify all required functions are exported
4. **Validate API endpoints** - Check if `/api/orbis/projects/all` route exists
5. **WebSocket server status** - Determine if localhost:3001 WebSocket server is running

### Specific Code Review:

#### File: `src/hooks/useOrbisAPI.ts`
- Line 179: WebSocket connection initialization
- Line 149: Error handling for WebSocket disconnection
- Line 154: WebSocket error event handling
- Check WebSocket URL configuration and fallback polling logic

#### File: `src/components/strategic/AllProjectsDashboard.tsx`
- Line 104: `governanceLogger.logProjectSurfaceSelect` call
- Verify import statement for governanceLogger
- Check if function exists in governance logger service

#### File: `src/services/governanceLogger.ts` or similar
- Confirm `logProjectSurfaceSelect` function is defined and exported
- Check function signature and implementation

#### File: Server API routes
- Look for `/api/orbis/projects/all` endpoint definition
- Check if route handler exists in server files
- Verify server is running on expected port

### Diagnostic Questions:

1. **WebSocket Server**: Is there a WebSocket server running on localhost:3001?
2. **API Server**: Is the main API server running and serving the expected routes?
3. **Governance Logger**: What functions are actually exported from the governance logger service?
4. **Port Configuration**: Are client and server configured for the same ports?
5. **Build Status**: Are there any TypeScript compilation errors?

### Expected Fixes:

1. **WebSocket Connection**:
   - Start WebSocket server on port 3001
   - OR update client to use correct WebSocket URL
   - OR improve fallback polling when WebSocket unavailable

2. **Governance Logger**:
   - Add missing `logProjectSurfaceSelect` function
   - OR update import to use correct function name
   - OR fix export statement in governance logger

3. **API Endpoint**:
   - Create missing `/api/orbis/projects/all` route
   - OR update client to use correct API endpoint
   - OR verify server routing configuration

### Code Pattern Analysis:

Please analyze these files and provide:
- Root cause for each error
- Suggested fixes with code snippets
- Missing function implementations
- Server configuration issues
- WebSocket connection troubleshooting steps

Focus on identifying inconsistencies between client expectations and server implementations.

## 🔍 Context Information

- **Frontend**: React with TypeScript running on localhost:5173
- **Expected API Server**: Should be serving routes under `/api/`
- **Expected WebSocket**: Should be running on localhost:3001
- **Governance System**: Uses structured logging for user interactions
- **Project Data**: Comes from oApp canonical schema (recently migrated)

## 🎯 Expected Deliverables

1. **Root cause analysis** for each error
2. **Code fixes** for missing functions and failed connections
3. **Server setup instructions** if services are not running
4. **Configuration updates** for correct port/URL mapping
5. **Error boundary implementation** to prevent complete UI failure

Please prioritize fixing the governance logger error first as it's causing the React component to crash and preventing the entire dashboard from rendering.