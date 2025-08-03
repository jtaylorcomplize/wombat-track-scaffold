// Debug Analysis Script for React Hook Recursion
// Analyzing useOrbisAPI.ts dependency chains

console.log("🔍 CRITICAL RECURSION ISSUES FOUND:\n");

console.log("❌ ISSUE 1: useEffect dependency mismatch");
console.log("   Location: useAllProjects - lines 234-246");
console.log("   Problem: useEffect depends on [filters] but calls setupWebSocket()");
console.log("   Impact: When filters change, WebSocket restarts unnecessarily");
console.log("   Fix: Move setupWebSocket to separate useEffect with empty deps\n");

console.log("❌ ISSUE 2: Circular dependency chain");
console.log("   Location: useAllProjects - lines 214-232");  
console.log("   Chain: fetchProjects → setupPolling → fetchProjects (circular)");
console.log("   Problem: setupPolling depends on fetchProjects, causing recreation");
console.log("   Fix: Use useRef for stable function reference\n");

console.log("❌ ISSUE 3: Filter object recreation");
console.log("   Location: useAllProjects - line 212");
console.log("   Problem: [filters] dependency assumes filters is stable");
console.log("   Issue: If filters object recreated on each render = infinite loop");
console.log("   Fix: Memoize filters object or use individual filter values\n");

console.log("❌ ISSUE 4: Multiple useEffect cleanup race");
console.log("   Location: All hooks - useEffect cleanup");
console.log("   Problem: WebSocket and polling cleanup in same useEffect"); 
console.log("   Issue: Filter changes trigger full WebSocket restart");
console.log("   Fix: Separate concerns - data fetching vs connection management\n");

console.log("❌ ISSUE 5: fetchProjects called twice on mount");
console.log("   Location: useAllProjects - lines 235-236");
console.log("   Problem: fetchProjects() + setupWebSocket() both trigger fetch");
console.log("   Issue: Duplicate initial API calls");
console.log("   Fix: Remove direct fetchProjects call, let WebSocket handle it\n");

console.log("🎯 PRIORITY FIX ORDER:");
console.log("1. Fix filter dependency chain (Issue 3) - CRITICAL");
console.log("2. Separate WebSocket lifecycle from filter changes (Issue 1)");
console.log("3. Break circular dependency (Issue 2)"); 
console.log("4. Eliminate duplicate fetch calls (Issue 5)");
console.log("5. Separate cleanup concerns (Issue 4)");