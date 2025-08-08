# React/Vite Hook Recursion Debug - Handover Documentation

## 🎯 **Objective**
Debug and resolve React/Vite hook recursion issues in the Enhanced Sidebar v3.1 system, specifically related to the `useOrbisAPI.ts` implementation.

## 📍 **Current Status**
- **Branch**: `feature/useorbis-api-hooks-fix`
- **Commit**: `56dd5d3` - WT-8.2: [hooks] Add useOrbisAPI.ts hooks for Enhanced Sidebar v3.1
- **File**: `src/hooks/useOrbisAPI.ts` (656 lines)
- **GitHub PR**: https://github.com/jtaylorcomplize/wombat-track-scaffold/pull/new/feature/useorbis-api-hooks-fix

## 🔍 **Known Issues & Fixes Applied**

### **1. Hook Recursion Problem**
**Issue**: React hooks creating infinite re-render loops
**Location**: `src/hooks/useOrbisAPI.ts:174-212, 275-305, 456-483`
**Root Cause**: Improperly managed dependencies in `useCallback` and `useEffect`

**Fixes Applied**:
```typescript
// ✅ FIXED: Proper dependency management
const fetchProjects = useCallback(async () => {
  // Implementation with proper error handling
}, [filters]); // ✅ Correct dependency array

// ✅ FIXED: Prevents duplicate intervals
const setupPolling = useCallback(() => {
  if (pollIntervalRef.current) return; // ✅ Guard clause
  pollIntervalRef.current = setInterval(() => {
    fetchProjects();
  }, 30000);
}, [fetchProjects]);
```

### **2. Memory Leak Prevention** 
**Issue**: WebSocket connections and intervals not cleaned up
**Location**: `src/hooks/useOrbisAPI.ts:234-246, 362-374, 545-557`

**Fixes Applied**:
```typescript
// ✅ FIXED: Proper cleanup in useEffect
useEffect(() => {
  fetchProjects();
  setupWebSocket();
  
  return () => {
    if (wsRef.current) {
      wsRef.current.close(); // ✅ WebSocket cleanup
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current); // ✅ Interval cleanup
    }
  };
}, [filters]);
```

### **3. WebSocket Instability in Development**
**Issue**: WebSocket connections failing in Vite dev mode
**Location**: `src/hooks/useOrbisAPI.ts:224-232, 318-322, 494-499`

**Fixes Applied**:
```typescript
// ✅ FIXED: Disable WebSocket in development
const setupWebSocket = useCallback(() => {
  if (import.meta.env.DEV) {
    console.log('[useAllProjects] Using polling in development mode');
    setupPolling();
    return; // ✅ Skip WebSocket in dev
  }
  // Production WebSocket setup...
}, [setupPolling]);
```

## 🧩 **Hook Architecture Overview**

### **Core Hooks Implemented**:
1. **`useAllProjects(filters)`** - Projects with pagination and filtering
2. **`useSubApps(includeProjects)`** - Sub-applications with project counts
3. **`useSubAppRecentProjects(subAppId, limit)`** - Recent projects for specific sub-app
4. **`useRuntimeStatus()`** - Real-time system status monitoring
5. **`useProject(projectId)`** - Individual project details
6. **`useAPIHealth()`** - API availability monitoring

### **Data Flow Pattern**:
```
API Call → Error Handling → Mock Fallback → State Update → Component Re-render
    ↓
WebSocket/Polling Setup → Real-time Updates → Cleanup on Unmount
```

## 🚨 **Critical Debug Areas**

### **1. Dependency Array Management**
**Check these lines for proper dependencies**:
- `useOrbisAPI.ts:212` - `fetchProjects` callback dependencies
- `useOrbisAPI.ts:220` - `setupPolling` callback dependencies  
- `useOrbisAPI.ts:232` - `setupWebSocket` callback dependencies
- `useOrbisAPI.ts:246` - `useEffect` dependency array

### **2. State Update Patterns**
**Potential recursion triggers**:
```typescript
// ❌ BAD: Can cause recursion
const [data, setData] = useState(null);
useEffect(() => {
  setData(newData); // If newData changes every render
}, [data]); // ❌ This creates a loop

// ✅ GOOD: Stable references
const [data, setData] = useState(null);
const fetchData = useCallback(async () => {
  const result = await api.fetch();
  setData(result);
}, []); // ✅ Empty deps if no external dependencies
```

### **3. Ref Usage for Cleanup**
**Check these ref patterns**:
- `wsRef.current` - WebSocket instance management
- `pollIntervalRef.current` - Polling interval management
- Ensure refs are properly nullified on cleanup

## 🔧 **Debugging Commands**

### **React DevTools Profiler**:
```bash
# Install React DevTools extension
# Enable profiler to track re-renders
# Look for excessive render cycles in Enhanced Sidebar components
```

### **Console Debugging**:
```typescript
// Add to useOrbisAPI.ts for debugging
console.log('[DEBUG] Hook render count:', ++renderCount);
console.log('[DEBUG] Dependencies changed:', { filters, includeProjects });
console.log('[DEBUG] WebSocket state:', wsRef.current?.readyState);
```

### **Vite Development Checks**:
```bash
# Check for HMR issues
npm run dev
# Watch browser console for:
# - "Maximum update depth exceeded"
# - WebSocket connection errors
# - Memory warnings
```

## 🎯 **Testing Strategy**

### **1. Hook Isolation Testing**:
```typescript
// Test each hook individually
import { renderHook } from '@testing-library/react';
import { useAllProjects } from '../useOrbisAPI';

test('useAllProjects should not cause infinite re-renders', () => {
  const { result, rerender } = renderHook(() => useAllProjects());
  // Check render count, memory usage
});
```

### **2. Integration Testing**:
```bash
# Run existing tests
npm test tests/sidebar-structure.test.js

# Check for memory leaks in Puppeteer tests
BASE_URL=http://localhost:5177 npx jest tests/nested-dashboards/nested-dashboard.spec.js --testTimeout=60000
```

## 🔍 **Gizmo AI Debugging Prompts**

### **Hook Recursion Analysis**:
```
@workspace Analyze src/hooks/useOrbisAPI.ts for React hook recursion issues. Focus on:
1. useCallback dependency arrays (lines 174-212, 275-305, 456-483)
2. useEffect cleanup patterns (lines 234-246, 362-374, 545-557) 
3. State update chains that could cause infinite loops
4. WebSocket connection management and ref usage
```

### **Memory Leak Detection**:
```
@workspace Check for memory leaks in Enhanced Sidebar components using useOrbisAPI.ts hooks:
1. Component unmounting cleanup
2. WebSocket connection disposal
3. Polling interval clearance
4. Event listener removal patterns
```

## 🚀 **GitHub Copilot Debug Workflow**

### **1. Hook Dependency Analysis**:
```typescript
// Copilot: Check this useCallback for dependency issues
const fetchProjects = useCallback(async () => {
  // Implementation
}, [filters]); // Are all dependencies included?
```

### **2. State Management Review**:
```typescript
// Copilot: Review this state pattern for recursion
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
// Does this create update loops?
```

### **3. Cleanup Pattern Verification**:
```typescript
// Copilot: Verify cleanup completeness
useEffect(() => {
  return () => {
    // Is cleanup comprehensive?
  };
}, []);
```

## 📊 **Performance Monitoring**

### **Metrics to Track**:
- **Component render count** (should stabilize after initial load)
- **Memory usage** (should not continuously increase)
- **WebSocket connections** (max 3-4 concurrent)
- **API call frequency** (30-second intervals, not continuous)

### **Error Patterns to Watch**:
- `Warning: Maximum update depth exceeded`
- `WebSocket connection failed`
- `Cannot update component during render`
- Memory usage climbing continuously

## 🎯 **Next Steps for Debug Team**

1. **Immediate**: Run React DevTools Profiler on Enhanced Sidebar
2. **Priority 1**: Check `useAllProjects` hook dependency array
3. **Priority 2**: Verify WebSocket cleanup in development mode
4. **Priority 3**: Test all 6 hooks individually for recursion
5. **Validation**: Run full test suite with memory monitoring

## 📞 **Handover Contact Points**

- **Branch**: `feature/useorbis-api-hooks-fix` 
- **Primary File**: `src/hooks/useOrbisAPI.ts`
- **Test Files**: `tests/sidebar-structure.test.js`
- **Related Components**: All Enhanced Sidebar v3.1 components

**Status**: Ready for Gizmo AI and GitHub Copilot debugging assistance.