-- oApp Canonical Schema Rebuild - Truncate Hierarchy
-- Governance Anchor: oapp-canonical-schema-rebuild-20250802
-- Date: 2025-08-02
-- Purpose: Clean slate for canonical Projects/Phases/Steps rebuild

-- IMPORTANT: Backup canonical data first to JSONL or CSV before executing this script
-- Example backup commands:
-- sqlite3 oapp_staging.db ".mode csv" ".headers on" ".output projects_backup.csv" "SELECT * FROM projects_canonical;"
-- sqlite3 oapp_staging.db ".mode csv" ".headers on" ".output phases_backup.csv" "SELECT * FROM phases_canonical;"
-- sqlite3 oapp_staging.db ".mode csv" ".headers on" ".output steps_backup.csv" "SELECT * FROM steps_canonical;"

BEGIN TRANSACTION;

-- Truncate canonical hierarchy tables in proper order (child to parent)
DELETE FROM steps_canonical;
DELETE FROM phases_canonical;
DELETE FROM projects_canonical;

-- Reset auto-increment sequences for clean IDs
DELETE FROM sqlite_sequence WHERE name IN ('steps_canonical','phases_canonical','projects_canonical');

-- Vacuum to reclaim space and optimize
VACUUM;

COMMIT;

-- Verification queries
SELECT 'projects_canonical' as table_name, COUNT(*) as row_count FROM projects_canonical
UNION ALL
SELECT 'phases_canonical' as table_name, COUNT(*) as row_count FROM phases_canonical
UNION ALL
SELECT 'steps_canonical' as table_name, COUNT(*) as row_count FROM steps_canonical;

-- Governance Log: Canonical hierarchy truncated for rebuild
-- Next step: Execute 02_import_canonical_data.py