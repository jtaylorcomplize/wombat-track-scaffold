# 🛡️ Wombat Track SDLC PR Template

## Phase Information
**Phase ID**: WT-X.X  
**Phase Description**: 

## Summary
<!-- Briefly describe the changes in this PR -->

## Changes Made
<!-- List the key changes, features, or fixes -->
- 
- 
- 

## SDLC Compliance Checklist
<!-- All items must be checked before merge -->

### 📋 Required Fields
- [ ] **Phase ID**: PR title includes WT-X.X format
- [ ] **Commit Messages**: All commits follow `WT-<phase>: [<scope>] Description` format
- [ ] **Tests**: New functionality includes appropriate tests
- [ ] **Documentation**: Changes are documented where necessary

### 🔄 MemoryPlugin & Governance
- [ ] **MemoryPlugin Sync**: Memory tags updated for governance integration
- [ ] **GovernanceLog Metadata**: If applicable, includes `isLive`, `dispatchMode`, and performance tracking
- [ ] **Single Source**: No conflicting modifications to `governanceLogger.ts` in open PRs

### 🧪 Testing & Quality
- [ ] **Build**: `npm run build` completes successfully
- [ ] **Lint**: `npm run lint` passes with no errors
- [ ] **Type Check**: TypeScript compilation succeeds
- [ ] **Tests**: `npm test` passes all existing tests
- [ ] **Manual Testing**: Functionality tested manually in browser

### 📊 Component Status (if applicable)
- [ ] **Sidebar**: Renders correctly and maintains state
- [ ] **Breadcrumb**: Navigation functions properly
- [ ] **Dispatchers**: AI agents respond with correct status indicators
- [ ] **AgentMesh**: CRUD operations work as expected

## Governance Metadata (if applicable)
<!-- Complete this section if PR modifies governance, dispatcher, or console files -->

**AI Dispatcher Status**:
- Claude dispatcher: [ ] Live API [ ] Fallback mode
- Gizmo dispatcher: [ ] Live API [ ] Fallback mode

**Performance Tracking**:
- [ ] Response times logged to governance
- [ ] Live/fallback status indicators implemented
- [ ] Dispatch mode metadata included

**Memory Integration**:
- [ ] DriveMemory tags: `wt-5.5-governance-log-hook`, `ai-console-logging`
- [ ] Phase-specific tags added (e.g., `wt-5.6-live-agent-dispatch`)

## Breaking Changes
<!-- List any breaking changes and migration steps -->
- [ ] No breaking changes
- [ ] Breaking changes documented below:

## Rollback Plan
<!-- How to rollback if issues are discovered post-merge -->
- [ ] Standard git revert available
- [ ] Manual rollback steps documented below:

## Additional Notes
<!-- Any additional context, screenshots, or links -->

---

**🤖 AI Generated**: This PR was created with assistance from Claude Code  
**🔗 Related Issues**: #  
**📋 Epic/Project**: 

<!-- 
SDLC Enforcement: This template ensures compliance with Wombat Track development standards.
For questions, see: https://github.com/jtaylorcomplize/wombat-track-scaffold/wiki/SDLC-Guidelines
-->