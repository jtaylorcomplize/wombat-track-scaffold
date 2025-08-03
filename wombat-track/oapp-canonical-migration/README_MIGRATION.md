# oApp Canonical Migration Package – 2025-08-02

## Overview
This package creates canonical oApp tables (Projects, Phases, Steps, Comms) and backfills them from current JSON exports with comprehensive governance logging and validation.

**MemoryPlugin Anchor:** `oapp-canonical-schema-migration-20250802`

## Package Contents

### 📋 SQL Schema
- `01_create_canonical_tables.sql` - Creates all canonical tables with indexes

### 🐍 Python Migration Scripts
- `02_backfill_projects.py` - Migrates projects from JSON export
- `03_backfill_phases.py` - Migrates phases with project relationships
- `04_extract_steps.py` - Extracts steps from phase notes using regex patterns
- `05_merge_comms.py` - Merges Agent Exchange + Claude-Gizmo communications
- `06_validate_migration.py` - Validates data integrity and relationships

### 🚀 Execution Script
- `run_migration.sh` - Complete automated migration with error handling

## Prerequisites

Ensure these data files are in the migration directory:
- `oApp_Projects_Local_Schema_20250802.json` (92 records)
- `oApp_Phases_Export_20250802.json` (257 records)  
- `oApp_AgentLogs_20250802.json` (133 records)

## Execution Steps for Claude / DevOps

### Automated Execution (Recommended)
```bash
# Copy data files to migration directory
cp oApp_*.json oapp-canonical-migration/
cd oapp-canonical-migration/

# Run complete migration
./run_migration.sh
```

### Manual Step-by-Step Execution
```bash
# 1. Create canonical schema
sqlite3 oapp_staging.db < 01_create_canonical_tables.sql

# 2. Backfill Projects
python3 02_backfill_projects.py

# 3. Backfill Phases  
python3 03_backfill_phases.py

# 4. Extract Steps from Phase Notes
python3 04_extract_steps.py

# 5. Merge Communications Logs
python3 05_merge_comms.py

# 6. Validate Migration
python3 06_validate_migration.py
```

## Canonical Schema Structure

### projects_canonical
- `projectId` (TEXT PRIMARY KEY)
- `projectName` (TEXT NOT NULL)
- `owner`, `status`, `goals`, `description`
- `aiPromptLog`, `keyTasks`, `tags`, `scopeNotes`
- `govLog`, `checkpointReview`, `claudeGizmoExchange`
- `createdAt`, `updatedAt`

### phases_canonical
- `phaseId` (TEXT PRIMARY KEY)
- `phaseName` (TEXT NOT NULL)
- `project_ref` (FK to projects_canonical)
- `status`, `RAG`, `startDate`, `endDate`, `notes`

### steps_canonical
- `stepId` (TEXT PRIMARY KEY)
- `stepName`, `phase_ref` (FK), `project_ref` (FK)
- `status`, `startDate`, `endDate`, `outputNotes`

### comms_canonical
- `id` (INTEGER PRIMARY KEY)
- `projectId` (FK), `phaseId` (FK), `timestamp`
- `agentType` (Claude/Gizmo/System), `eventType`, `messagePayload` (JSON)

## Validation & QA

The migration includes comprehensive validation:
- **Record Count Verification** - Ensures all source records migrated
- **Relationship Integrity** - Checks FK constraints and orphaned records
- **Agent Distribution** - Validates communication classification
- **Sample Data Review** - Provides data quality samples

### Expected Results
- **Projects:** ~92 canonical project records
- **Phases:** ~257 phase records with project links
- **Steps:** ~100+ extracted steps from phase notes
- **Communications:** ~133 agent interaction logs

## Governance Logging

Each migration step creates detailed governance logs:
- `governance_projects_backfill.json`
- `governance_phases_backfill.json`
- `governance_steps_extraction.json`
- `governance_comms_merge.json`
- `validation_report.json`
- `final_migration_governance.json`

## Production Deployment

After staging validation passes:
1. **Review validation_report.json** for any warnings
2. **Submit PR** with migration package and governance logs
3. **Run in production** using same scripts with `oapp_production.db`
4. **Generate MemoryPlugin anchor** for completion tracking

## Error Handling

- Scripts exit on first error for data integrity
- Comprehensive error logging with specific failure details
- Rollback capability via database transactions
- Validation failure prevents production promotion

## Next Steps Post-Migration

1. **Update oApp API endpoints** to use canonical tables
2. **Modify UI components** to reference new schema
3. **Archive legacy tables** after validation period
4. **Enable real-time sync** between Notion and canonical schema

---

**Migration Status:** Ready for Claude execution in staging environment
**Validation:** Comprehensive integrity checks included
**Governance:** Full audit trail with MemoryPlugin integration