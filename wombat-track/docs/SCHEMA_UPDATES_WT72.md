# WT-7.2 Schema Updates Documentation

## Overview

This document outlines the schema updates implemented for the Wombat Track Notion database integration as part of WT-7.2.

## Canonical Database Naming

All databases now follow a lowercase, hyphenated naming convention:

| Old Name | New Canonical Name |
|----------|-------------------|
| WT Projects | wt-project-tracker |
| WT Phases | wt-phase-tracker |
| WT Phase Steps | wt-phase-steps |
| WT Governance Log (Enhanced) | wt-governance-log |
| *New* | wt-recovery-log |

## Schema Changes

### 1. wt-project-tracker

**New Fields Added:**
- `goals` (rich_text) - Project objectives (previously 'Goals')
- `tooling` (rich_text) - Tools and technologies used
- `knownIssues` (rich_text) - Known issues and blockers
- `forwardGuidance` (rich_text) - Future planning notes
- `openQuestions` (rich_text) - Unresolved questions
- `linkedPhaseIds` (rich_text) - Related phases (will become relation)

**Status Options Enhanced:**
- Added "Complete" (in addition to "Completed")
- Added "Blocked"

**Tags Enhanced:**
- Added "MemSync"
- Added "Schema"

### 2. wt-phase-tracker

**New Fields Added:**
- `goals` (rich_text) - Phase-specific objectives
- `purpose` (rich_text) - Why this phase exists
- `expectedOutcome` (rich_text) - Success criteria

**Status Options Enhanced:**
- Added "Complete" (in addition to "Completed")
- Added "On Hold"

### 3. wt-recovery-log (New Database)

A new database for tracking incomplete or dropped artefacts from chat archives.

**Fields:**
- `title` (title) - Recovery item title
- `chatTimestamp` (date) - Original chat timestamp
- `chatTitle` (rich_text) - Original chat title
- `artefactType` (select) - Project/Phase/Feature/SideQuest/Document/Configuration/Other
- `summary` (rich_text) - Brief description
- `status` (select) - Cancelled/Missing/Incomplete/Unlogged/Complete/Pending Validation
- `suggestedName` (rich_text) - Suggested canonical name
- `recoveryAction` (select) - Log/Ignore/Rebuild/Archive
- `notes` (rich_text) - Additional context
- `linkedCanonicalEntry` (rich_text) - Reference to existing entries
- `validationRequired` (checkbox) - Flags items needing review
- `createdAt` (created_time)
- `updatedAt` (last_edited_time)

## Implementation Notes

1. **Backward Compatibility**: The schema updates maintain backward compatibility by:
   - Supporting both "Complete" and "Completed" status values
   - Preserving all existing fields
   - Adding new fields without removing old ones

2. **Field Mapping**: Internal mappings ensure compatibility:
   - "Purpose" → goals (in projects)
   - "Context" → description
   - "Goals" → goals (normalized to lowercase)

3. **Database Relations**: The `linkedPhaseIds` field is currently text-based but will be converted to a proper Notion relation in the migration phase.

## Migration Path

1. Run `scripts/normalize-wt-databases.ts` to apply schema updates
2. Run `scripts/merge-claude-gizmo-databases.ts` if needed
3. Run `scripts/verify-wt-migration.ts` to verify changes
4. Use `scripts/create-recovery-log-database.ts` for recovery log setup

## Testing

The schema updates include:
- Comprehensive field validation
- Status mapping tests
- Relation integrity checks
- Archive verification

## Next Steps

After these schema updates are deployed:
1. Update application code to use canonical database names
2. Implement proper Notion relations for linked entities
3. Create database views for recovery tracking
4. Set up automated sync processes