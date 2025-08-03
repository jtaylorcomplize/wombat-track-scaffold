# 🚨 CRITICAL: React Hook Recursion Issues Identified & Fixed

## ❌ **ROOT CAUSE ANALYSIS COMPLETE**

**Primary Issue**: Filter object recreation causing infinite re-renders in `useAllProjects` hook.

### **Issue Location**: `AllProjectsDashboard.tsx:59-66`
```typescript
// ❌ BROKEN: Object literal recreated on every render
} = useAllProjects({
  search: searchQuery || undefined,
  status: filterStatus !== 'all' ? filterStatus : undefined,
  priority: filterPriority !== 'all' ? filterPriority : undefined,
  sortBy,
  sortOrder: 'desc',
  limit: 100
});
```

**Problem**: This object is recreated on every render, causing `useAllProjects` hook to see new `[filters]` dependency → triggers `fetchProjects` → causes re-render → infinite loop.

---

## 🎯 **IMMEDIATE FIXES REQUIRED**

### **Fix 1: Memoize filters object**
```typescript
// ✅ FIXED: Stable filter object reference
const filters = useMemo(() => ({
  search: searchQuery || undefined,
  status: filterStatus !== 'all' ? filterStatus : undefined,
  priority: filterPriority !== 'all' ? filterPriority : undefined,
  sortBy,
  sortOrder: 'desc' as const,
  limit: 100
}), [searchQuery, filterStatus, filterPriority, sortBy]);

const { data, loading, error, refresh } = useAllProjects(filters);
```

### **Fix 2: Separate WebSocket lifecycle from filter changes**
```typescript
// ✅ FIXED: Split useEffect concerns
useEffect(() => {
  fetchProjects(); // Only fetch when filters change
}, [fetchProjects, filters]);

useEffect(() => {
  setupWebSocket(); // Setup once on mount
  return () => {
    if (wsRef.current) wsRef.current.close();
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  };
}, []); // Empty deps - setup once
```

### **Fix 3: Break circular dependency chain**
```typescript
// ✅ FIXED: Use useRef for stable function reference
const fetchProjectsRef = useRef<() => Promise<void>>();

const fetchProjects = useCallback(async () => {
  // implementation
}, [filters]);

fetchProjectsRef.current = fetchProjects;

const setupPolling = useCallback(() => {
  if (pollIntervalRef.current) return;
  pollIntervalRef.current = setInterval(() => {
    fetchProjectsRef.current?.(); // Stable ref, no circular dependency
  }, 30000);
}, []); // No dependencies needed
```

### **Fix 4: Eliminate duplicate API calls**
```typescript
// ✅ FIXED: Remove duplicate fetchProjects call
useEffect(() => {
  // setupWebSocket() will trigger initial fetch via polling
  setupWebSocket();
  // ❌ REMOVED: fetchProjects(); // Don't call twice
}, []);
```

---

## 🔧 **IMPLEMENTATION PRIORITY**

1. **CRITICAL**: Fix `AllProjectsDashboard.tsx` filter object (30 seconds)
2. **HIGH**: Apply fixes to `useOrbisAPI.ts` hooks (5 minutes)
3. **MEDIUM**: Test all hook implementations (10 minutes)

---

## 🚀 **QUICK FIXES - COPY/PASTE READY**

### **For AllProjectsDashboard.tsx**:
```typescript
import React, { useState, useEffect, useMemo } from 'react';

// Add useMemo for filters
const filters = useMemo(() => ({
  search: searchQuery || undefined,
  status: filterStatus !== 'all' ? filterStatus : undefined,
  priority: filterPriority !== 'all' ? filterPriority : undefined,
  sortBy,
  sortOrder: 'desc' as const,
  limit: 100
}), [searchQuery, filterStatus, filterPriority, sortBy]);

const { data, loading, error, refresh } = useAllProjects(filters);
```

### **For useOrbisAPI.ts - useAllProjects hook**:
```typescript
export const useAllProjects = (filters?: FilterType) => {
  const [data, setData] = useState<ProjectsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchProjectsRef = useRef<() => Promise<void>>();

  const fetchProjects = useCallback(async () => {
    // existing implementation
  }, [filters]);

  fetchProjectsRef.current = fetchProjects;

  const setupPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(() => {
      fetchProjectsRef.current?.();
    }, 30000);
  }, []);

  // Separate concerns: data fetching vs connection setup
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    setupWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  return { data, loading, error, refresh };
};
```

---

## ✅ **VERIFICATION STEPS**

1. **Check React DevTools Profiler**: No excessive re-renders
2. **Console Check**: No "Maximum update depth exceeded" warnings  
3. **Memory Check**: Stable memory usage after initial load
4. **Network Check**: API calls limited to 30-second intervals

---

## 🎯 **EXPECTED RESULTS AFTER FIX**

- ✅ Stable filter object references
- ✅ No infinite re-render loops
- ✅ Proper WebSocket lifecycle management
- ✅ Single API call on mount + 30-second intervals
- ✅ Clean component unmounting

**Status**: Ready for immediate implementation - all issues identified and solutions provided.