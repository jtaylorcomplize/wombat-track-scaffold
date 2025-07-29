# WT Database Normalization and Migration Guide

This guide documents the database normalization and migration process for the Wombat Track system.

## Overview

The migration implements:
1. **Canonical DB naming** - Standardizing all database names to lowercase hyphenated format
2. **Schema updates** - Adding new fields to project and phase trackers
3. **Data reconciliation** - Updating statuses based on governance logs
4. **Data archival** - Creating merge archive for data retention
5. **Relation alignment** - Ensuring proper links between databases

## Migration Scripts

### 1. Main Migration Script
```bash
./scripts/normalize-wt-databases.ts
```

This script handles:
- Renaming databases to canonical format
- Updating schemas for wt-project-tracker and wt-phase-tracker
- Creating the wt-merged-data-archive database
- Applying status corrections
- Aligning relations between databases

### 2. Claude-Gizmo Merge Script
```bash
./scripts/merge-claude-gizmo-databases.ts
```

This script:
- Merges Claude-Gizmo Exchange into Claude-Gizmo Communication
- Archives dropped fields in the merge archive
- Marks the Exchange database as archived

### 3. Verification Script
```bash
./scripts/verify-wt-migration.ts
```

This script runs post-migration checks:
- Verifies all canonical databases exist
- Checks schema updates were applied
- Confirms status corrections
- Validates database relations
- Ensures data integrity

## Database Mappings

| Old Name | Canonical Name |
|----------|----------------|
| WT Projects | wt-project-tracker |
| WT Phase Database | wt-phase-tracker |
| MemSync Implementation Phases | memsync-implementation-phases |
| Claude-Gizmo Communication | claude-gizmo-comm |
| Claude-Gizmo Exchange | claude-gizmo-comm (merged) |
| Sub-Apps | sub-apps |

## New Schema Fields

### wt-project-tracker
- `projectId` - Project identifier
- `tooling` - Tools and technologies used
- `knownIssues` - Known issues and blockers
- `forwardGuidance` - Future planning notes
- `openQuestions` - Unresolved questions
- `aiPromptLog` - AI interaction history
- `linkedPhaseIds` - Related phases

### wt-phase-tracker
- `phaseId` - Phase identifier
- `goals` - Phase objectives
- `purpose` - Why this phase exists
- `expectedOutcome` - Success criteria
- `status` - Not Started/In Progress/Blocked/On Hold/Complete

## Status Updates Applied

| Entry | Status | Source |
|-------|--------|--------|
| WT-7.2 | Complete | MemSync + PR #22 |
| WT-7.3 | On Hold | System context |
| All WT-5.x | Complete | Phase logs |

## Running the Migration

1. **Backup your Notion data first!**

2. Ensure environment variables are set:
   ```bash
   NOTION_TOKEN=your_token
   NOTION_WT_PARENT_PAGE_ID=parent_page_id
   ```

3. Run the migrations in order:
   ```bash
   # Main migration
   npm run tsx scripts/normalize-wt-databases.ts
   
   # Claude-Gizmo merge (if needed)
   npm run tsx scripts/merge-claude-gizmo-databases.ts
   
   # Verify migration
   npm run tsx scripts/verify-wt-migration.ts
   ```

## Post-Migration Tasks

1. **Review the verification report** - Check for any failed consistency checks
2. **Inspect the archive database** - Verify dropped fields were properly archived
3. **Test database queries** - Ensure your application still works with renamed databases
4. **Update application code** - Update any hardcoded database names to use canonical names

## Rollback

If issues occur:
1. The archive database contains all original data
2. Database names can be manually reverted in Notion
3. Schema changes are additive (old fields remain)

## Archive Database

The `wt-merged-data-archive` stores:
- Original values of dropped/merged fields
- Orphaned records
- Migration logs and timestamps
- Reasons for each archive entry

This ensures no data is lost during migration.