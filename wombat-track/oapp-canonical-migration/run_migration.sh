#!/bin/bash

# ===========================================
# oApp Canonical Migration Execution Script
# Phase: Projects / Phases / Steps / Comms
# MemoryPlugin Anchor: oapp-canonical-schema-migration-20250802
# ===========================================

set -e  # Exit on any error

echo "🚀 Starting oApp Canonical Schema Migration..."
echo "Phase: Projects, Phases, Steps, Communications"
echo "Target: oapp_staging.db"
echo "Date: $(date)"
echo "=========================================="

# Check prerequisites
echo "🔍 Checking prerequisites..."

if [ ! -f "oApp_Projects_Local_Schema_20250802.json" ]; then
    echo "❌ Missing: oApp_Projects_Local_Schema_20250802.json"
    exit 1
fi

if [ ! -f "oApp_Phases_Export_20250802.json" ]; then
    echo "❌ Missing: oApp_Phases_Export_20250802.json"
    exit 1
fi

if [ ! -f "oApp_AgentLogs_20250802.json" ]; then
    echo "❌ Missing: oApp_AgentLogs_20250802.json"
    exit 1
fi

echo "✅ All prerequisite files found"

# Step 1: Create canonical tables
echo "📋 Step 1: Creating canonical schema..."
sqlite3 oapp_staging.db < 01_create_canonical_tables.sql
echo "✅ Canonical tables created"

# Step 2: Backfill projects
echo "📂 Step 2: Backfilling projects..."
python3 02_backfill_projects.py
echo "✅ Projects backfilled"

# Step 3: Backfill phases
echo "📋 Step 3: Backfilling phases..."
python3 03_backfill_phases.py
echo "✅ Phases backfilled"

# Step 4: Extract and backfill steps
echo "📝 Step 4: Extracting and backfilling steps..."
python3 04_extract_steps.py
echo "✅ Steps extracted and backfilled"

# Step 5: Merge communications
echo "💬 Step 5: Merging communications..."
python3 05_merge_comms.py
echo "✅ Communications merged"

# Step 6: Validate migration
echo "🔍 Step 6: Validating migration..."
python3 06_validate_migration.py

if [ $? -eq 0 ]; then
    echo "✅ Migration validation PASSED"
    
    # Generate final governance log
    echo "📝 Generating final governance log..."
    cat > final_migration_governance.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "event_type": "canonical_migration_complete",
  "user_id": "migration_script",
  "user_role": "system",
  "resource_type": "oapp_canonical_schema",
  "action": "full_migration",
  "success": true,
  "details": {
    "anchor": "oapp-canonical-schema-migration-20250802",
    "phase": "staging",
    "tables_created": ["projects_canonical", "phases_canonical", "steps_canonical", "comms_canonical"],
    "data_sources": [
      "oApp_Projects_Local_Schema_20250802.json",
      "oApp_Phases_Export_20250802.json", 
      "oApp_AgentLogs_20250802.json"
    ],
    "governance_logs": [
      "governance_projects_backfill.json",
      "governance_phases_backfill.json",
      "governance_steps_extraction.json",
      "governance_comms_merge.json",
      "validation_report.json"
    ],
    "next_phase": "production_deployment"
  }
}
EOF
    
    echo "🎉 Migration completed successfully!"
    echo "📊 Check validation_report.json for details"
    echo "📝 Governance logs created:"
    echo "   - governance_projects_backfill.json"
    echo "   - governance_phases_backfill.json"
    echo "   - governance_steps_extraction.json"
    echo "   - governance_comms_merge.json"
    echo "   - validation_report.json"
    echo "   - final_migration_governance.json"
    echo ""
    echo "🚀 Ready for production deployment!"
    
else
    echo "❌ Migration validation FAILED"
    echo "🔍 Check validation_report.json for issues"
    exit 1
fi