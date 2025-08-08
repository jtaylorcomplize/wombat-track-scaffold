# WombatTrack Post-Generation Setup Checklist

This checklist ensures all automation and governance hooks are properly configured after initial project generation.

## Part 1: Database Schema Verification

### 1.1 Core Tables
- [ ] `projects` table has `keyTasks` TEXT column
- [ ] `projects` table has `aiPromptLog` TEXT column  
- [ ] `enhanced_governance_logs` table exists with proper schema
- [ ] `enhanced_log_links` table exists for cross-references

### 1.2 Schema Migration
```bash
# Verify schema
sqlite3 databases/production.db ".schema projects" | grep -E "(keyTasks|aiPromptLog)"

# If missing, run migration
npm run migrate
```

## Part 2: Service Integration

### 2.1 Governance Logs Service
- [ ] `GovernanceLogsService` is imported and configured
- [ ] Service creates logs in `enhanced_governance_logs` table
- [ ] API endpoints mounted at `/api/admin/governance_logs/*`

### 2.2 Governance Project Hooks
- [ ] `GovernanceProjectHooks.getInstance()` is functional
- [ ] Hook triggers on governance log creation
- [ ] `processGovernanceEntry()` creates projects automatically

#### Test Commands:
```bash
# Test governance service integration
npx tsx scripts/test-governance-auto-creation.ts

# Test API service integration  
npx tsx scripts/test-api-governance-creation.ts
```

## Part 3: API Integration

### 3.1 Admin Server Routes
- [ ] `/api/admin/governance_logs` - CRUD operations
- [ ] `/api/admin/governance_logs/search` - Full-text search
- [ ] `/api/admin/governance_logs/links/:targetId` - Cross-references
- [ ] Admin server runs on port 3002

### 3.2 Dev Server Integration
- [ ] Dev server includes governance log endpoints
- [ ] CORS configured for admin server communication
- [ ] Error handling for governance operations

#### Test Commands:
```bash
# Start admin server
npm run admin-server

# Test API endpoints
curl http://localhost:3002/api/admin/governance_logs
curl -X POST http://localhost:3002/api/admin/governance_logs \
  -H "Content-Type: application/json" \
  -d '{"entryType": "Decision", "summary": "Test project auto-creation"}'
```

## Part 4: UI Integration

### 4.1 Project Display
- [ ] New projects appear in projects list without manual refresh
- [ ] Project cards show governance-generated metadata
- [ ] `keyTasks` displayed properly in project view
- [ ] `aiPromptLog` accessible via project details

### 4.2 Admin Dashboard
- [ ] Governance logs visible in admin interface
- [ ] Project creation events logged appropriately
- [ ] Cross-references between logs and projects functional

## Part 5: Automation & Governance Hooks ⭐

### 5.1 Governance Hook Requirements
- [ ] `GovernanceProjectHooks.getInstance()` called on governance log creation
- [ ] Hook processes project ID patterns: `OF-*`, `WT-*`, `[A-Z]+-*`
- [ ] Auto-registration verifies project creation linkage
- [ ] Failed hooks log appropriate warnings but don't block operations

### 5.2 Auto-Registration Verification
- [ ] ✅ **CRITICAL**: Governance logs with project references automatically create projects
- [ ] ✅ **CRITICAL**: Created projects have `keyTasks` and `aiPromptLog` populated
- [ ] ✅ **CRITICAL**: Project auto-creation is logged to governance system
- [ ] ✅ **CRITICAL**: Backfill script can recover orphaned governance entries

#### Pre-Merge Checklist Item:
```bash
# REQUIRED: Verify auto-registration before merging
npx tsx scripts/test-governance-auto-creation.ts
# Should create test project with populated keyTasks and aiPromptLog

# REQUIRED: Test backfill functionality  
npx tsx scripts/backfill-orphaned-governance-logs.ts
# Should identify and backfill any orphaned governance entries
```

## Part 6: File System Integration (Phase 9.3)

### 6.1 DriveMemory Watcher (OF-9.3.1)
- [ ] File watcher monitors `/DriveMemory/GovernanceLogs/*.jsonl`
- [ ] New files trigger database upsert operations
- [ ] GovernanceProjectHooks triggers on file-based entries
- [ ] Watcher handles file moves, renames, and deletions

#### Implementation Status:
```bash
# TODO: Implement DriveMemory watcher
# - Watch /DriveMemory/GovernanceLogs/*.jsonl
# - Parse JSONL entries and upsert to enhanced_governance_logs
# - Trigger GovernanceProjectHooks on new entries
```

### 6.2 Event-Based Auto-Logging (OF-9.3.2)
- [ ] PhaseStep completion triggers governance log creation
- [ ] PR merge events create governance entries
- [ ] Checkpoint pass/fail results logged
- [ ] Significant AI actions create governance entries

#### Implementation Status:
```bash
# TODO: Implement event hooks
# - Hook into PhaseStep.complete()
# - Hook into PR merge workflows  
# - Hook into test/checkpoint systems
# - Hook into AI action logging
```

## Part 7: Testing & Validation

### 7.1 Unit Tests
- [ ] Governance service tests pass
- [ ] Project hooks tests pass  
- [ ] API endpoint tests pass
- [ ] Database integrity tests pass

### 7.2 Integration Tests
- [ ] End-to-end governance → project creation
- [ ] UI displays auto-created projects
- [ ] Backfill operations work correctly
- [ ] Error handling graceful

#### Test Commands:
```bash
# Run governance integration tests
npm test tests/governance-project-integration.spec.js

# Verify database integrity
sqlite3 databases/production.db "
  SELECT COUNT(*) as projects_with_governance_data 
  FROM projects 
  WHERE keyTasks IS NOT NULL AND aiPromptLog IS NOT NULL
"
```

## Part 8: Production Readiness

### 8.1 Performance Considerations
- [ ] Governance log creation doesn't block UI operations
- [ ] Project auto-creation happens asynchronously
- [ ] Database queries are indexed appropriately
- [ ] Error logging doesn't impact performance

### 8.2 Error Handling
- [ ] Failed project creation logs warnings but continues
- [ ] Invalid governance entries handled gracefully
- [ ] Database connection failures retry appropriately
- [ ] UI shows appropriate error states

### 8.3 Monitoring & Observability
- [ ] Governance operations logged to system logs
- [ ] Project creation metrics tracked
- [ ] Failed auto-registration alerts configured
- [ ] Database health monitoring enabled

## Part 9: Documentation & Maintenance

### 9.1 API Documentation
- [ ] OpenAPI spec updated for governance endpoints
- [ ] Request/response examples documented
- [ ] Error codes and handling documented

### 9.2 Runbook Documentation
- [ ] Troubleshooting guide for failed auto-registration
- [ ] Backfill procedures documented
- [ ] Database maintenance procedures
- [ ] Monitoring and alerting setup

---

## Quick Verification Commands

```bash
# 1. Test complete governance → project workflow
npx tsx scripts/test-governance-auto-creation.ts

# 2. Check for orphaned governance logs
npx tsx scripts/backfill-orphaned-governance-logs.ts

# 3. Verify database schema
sqlite3 databases/production.db ".schema projects" | grep -E "(keyTasks|aiPromptLog)"

# 4. Test API endpoints
curl -s http://localhost:3002/health
curl -s http://localhost:3002/api/admin/governance_logs | head -20

# 5. Run integration tests
npm test tests/governance-project-integration.spec.js
```

## Status: ✅ Phase 9.2 Complete

- ✅ PR #44 merged: `feature/project-registration-repair → production`
- ✅ Governance log → project auto-creation verified
- ✅ UI displays newly created projects  
- ✅ CI/CD tests for governance integration added
- ✅ Orphaned governance logs backfilled successfully
- ✅ Documentation updated with governance hooks requirements

### Next Phase: 9.3 - File/Event Sync + Auto-Log Triggers
- 🔄 **OF-9.3.1**: DriveMemory watcher implementation
- 🔄 **OF-9.3.2**: Auto-log creation on events (PhaseStep, PR, Checkpoint, AI actions)
- 🔄 **OF-9.4**: UI workspace upgrades (Governance Log Cards, GovLog Manager Modal)

---

*Last Updated: 2025-08-08 - OF-9.2 Implementation Complete*