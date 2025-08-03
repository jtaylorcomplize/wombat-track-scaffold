# Claude Handoff Instructions - oApp Canonical Rebuild Production Cutover

**Governance Anchor**: `oapp-canonical-schema-rebuild-20250802`  
**Handoff Date**: 2025-08-02  
**Claude Session**: Production Cutover Execution

---

## 🎯 Mission Brief for Claude

You are executing the **oApp Canonical Rebuild Production Cutover** to align Projects/Phases/Steps with the 18/38-row Notion source while preserving governance_logs and comms_canonical.

### Key Objectives
1. Execute production migration scripts in sequence
2. Populate QA templates with actual before/after data
3. Trigger MemoryPlugin anchor and GovernanceLog entry
4. Ensure zero data loss and full Notion alignment

---

## 📦 Pre-Built Assets Available

### Migration Scripts (Ready for Execution)
```
oapp-canonical-migration/oapp_canonical_rebuild_20250802/
├── 01_truncate_hierarchy.sql           # Safely truncates canonical tables
├── 02_import_canonical_data.py         # Imports 18 projects + 38 phases  
├── 03_extract_steps_advanced.py        # Regex-based step extraction
├── 04_validate_canonical_hierarchy.py  # Comprehensive QA validation
├── PRODUCTION_CUTOVER_PLAN.md          # Complete execution guide
└── README_REBUILD.md                   # Technical documentation
```

### QA Templates (Ready for Population)
```
DriveMemory/QA/Canonical_Rebuild/20250802/
├── validation_artifacts/
│   ├── QA_VALIDATION_TEMPLATE.csv      # Before/after metrics template
│   └── QA_SUMMARY_TEMPLATE.md          # Complete QA report template
├── before_cutover/                     # Store pre-migration snapshots
├── after_cutover/                      # Store post-migration snapshots
└── governance/                         # Store governance log entries
```

---

## 🔄 Step-by-Step Execution Plan

### Phase 1: Pre-Migration Backup (5 minutes)
```bash
# 1.1 Create timestamped backup directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p DriveMemory/QA/Canonical_Rebuild/20250802/before_cutover/$TIMESTAMP

# 1.2 Export current canonical data
sqlite3 oapp_prod.db ".mode csv" ".headers on" ".output DriveMemory/QA/Canonical_Rebuild/20250802/before_cutover/$TIMESTAMP/projects_before.csv" "SELECT * FROM projects_canonical;"
sqlite3 oapp_prod.db ".mode csv" ".headers on" ".output DriveMemory/QA/Canonical_Rebuild/20250802/before_cutover/$TIMESTAMP/phases_before.csv" "SELECT * FROM phases_canonical;"
sqlite3 oapp_prod.db ".mode csv" ".headers on" ".output DriveMemory/QA/Canonical_Rebuild/20250802/before_cutover/$TIMESTAMP/steps_before.csv" "SELECT * FROM steps_canonical;"

# 1.3 Capture before counts for QA template
sqlite3 oapp_prod.db "SELECT 'projects_canonical' as table_name, COUNT(*) as count FROM projects_canonical UNION ALL SELECT 'phases_canonical', COUNT(*) FROM phases_canonical UNION ALL SELECT 'steps_canonical', COUNT(*) FROM steps_canonical;" > DriveMemory/QA/Canonical_Rebuild/20250802/before_cutover/$TIMESTAMP/before_counts.txt
```

### Phase 2: Execute Migration Scripts (8 minutes)
```bash
# 2.1 Navigate to migration directory
cd oapp-canonical-migration/oapp_canonical_rebuild_20250802/

# 2.2 Update scripts to use production database
sed -i 's/oapp_staging.db/oapp_prod.db/g' *.py

# 2.3 Execute migration sequence
sqlite3 oapp_prod.db < 01_truncate_hierarchy.sql
python3 02_import_canonical_data.py
python3 03_extract_steps_advanced.py
python3 04_validate_canonical_hierarchy.py > ../../DriveMemory/QA/Canonical_Rebuild/20250802/after_cutover/validation_results.txt
```

### Phase 3: Post-Migration Validation & Documentation (10 minutes)
```bash
# 3.1 Export post-migration data
sqlite3 oapp_prod.db ".mode csv" ".headers on" ".output DriveMemory/QA/Canonical_Rebuild/20250802/after_cutover/projects_after.csv" "SELECT * FROM projects_canonical;"
sqlite3 oapp_prod.db ".mode csv" ".headers on" ".output DriveMemory/QA/Canonical_Rebuild/20250802/after_cutover/phases_after.csv" "SELECT * FROM phases_canonical;"
sqlite3 oapp_prod.db ".mode csv" ".headers on" ".output DriveMemory/QA/Canonical_Rebuild/20250802/after_cutover/steps_after.csv" "SELECT * FROM steps_canonical;"

# 3.2 Capture after counts
sqlite3 oapp_prod.db "SELECT 'projects_canonical' as table_name, COUNT(*) as count FROM projects_canonical UNION ALL SELECT 'phases_canonical', COUNT(*) FROM phases_canonical UNION ALL SELECT 'steps_canonical', COUNT(*) FROM steps_canonical;" > DriveMemory/QA/Canonical_Rebuild/20250802/after_cutover/after_counts.txt

# 3.3 Verify governance preservation
sqlite3 oapp_prod.db "SELECT COUNT(*) as governance_logs_count FROM governance_logs; SELECT COUNT(*) as comms_canonical_count FROM comms_canonical;" > DriveMemory/QA/Canonical_Rebuild/20250802/after_cutover/governance_verification.txt
```

---

## 📊 QA Template Population Instructions

### 1. Populate QA_VALIDATION_TEMPLATE.csv
**Location**: `DriveMemory/QA/Canonical_Rebuild/20250802/validation_artifacts/QA_VALIDATION_TEMPLATE.csv`

**Data Sources**:
- `before_counts.txt` → [BEFORE_*] placeholders
- `after_counts.txt` → [AFTER_*] placeholders  
- `validation_results.txt` → [STATUS] placeholders
- Manual verification → [EXTRACTED_COUNT], [EXPECTED_*] values

**Critical Replacements**:
```
[BEFORE_PROJECTS] → Count from before_counts.txt
[AFTER_PROJECTS] → Should be 18
[BEFORE_PHASES] → Count from before_counts.txt  
[AFTER_PHASES] → Should be 38
[STATUS] → PASS/FAIL based on validation
```

### 2. Populate QA_SUMMARY_TEMPLATE.md
**Location**: `DriveMemory/QA/Canonical_Rebuild/20250802/validation_artifacts/QA_SUMMARY_TEMPLATE.md`

**Key Replacements**:
```
[EXECUTION_TIMESTAMP] → Current timestamp
[OVERALL_STATUS] → SUCCESS/FAILED
[BEFORE_PROJECTS] → Pre-migration project count
[AFTER_PROJECTS] → Post-migration project count (should be 18)
[BEFORE_PHASES] → Pre-migration phase count
[AFTER_PHASES] → Post-migration phase count (should be 38)
[EXTRACTED_STEPS] → Number of steps extracted from phase notes
[ORPHAN_PHASES] → Should be 0
[ORPHAN_STEPS] → Should be 0
[GOV_LOGS_COUNT] → Governance logs count (should be unchanged)
[COMMS_COUNT] → Communication records count (should be unchanged)
```

---

## 🔗 MemoryPlugin & Governance Integration

### MemoryPlugin Anchor Activation
```bash
# Create MemoryPlugin anchor file
echo "oapp-canonical-schema-rebuild-20250802-PRODUCTION-$(date +%Y%m%d_%H%M%S)" > /var/lib/oapp/memory_anchor.txt

# Log anchor in governance system
echo "$(date): MemoryPlugin anchor activated: oapp-canonical-schema-rebuild-20250802" >> DriveMemory/QA/Canonical_Rebuild/20250802/governance/anchor_log.txt
```

### Governance Log Entry Template
Create file: `DriveMemory/QA/Canonical_Rebuild/20250802/governance/governance_entry.json`
```json
{
  "event_type": "canonical_schema_rebuild",
  "governance_anchor": "oapp-canonical-schema-rebuild-20250802",
  "timestamp": "[EXECUTION_TIMESTAMP]",
  "status": "[SUCCESS/FAILED]",
  "migration_summary": {
    "projects_migrated": 18,
    "phases_migrated": 38,
    "steps_extracted": "[STEP_COUNT]",
    "orphans_detected": 0,
    "governance_preserved": true
  },
  "artifacts_location": "DriveMemory/QA/Canonical_Rebuild/20250802/",
  "validation_status": "[VALIDATION_STATUS]",
  "next_review_date": "2025-09-02"
}
```

---

## ✅ Success Criteria Checklist

**Database Validation**:
- [ ] Exactly 18 projects in projects_canonical
- [ ] Exactly 38 phases in phases_canonical  
- [ ] Zero orphaned phases (all have valid project references)
- [ ] Zero orphaned steps (all have valid phase references)
- [ ] Governance logs count unchanged
- [ ] Communication records count unchanged

**QA Documentation**:
- [ ] QA_VALIDATION_TEMPLATE.csv fully populated with actual data
- [ ] QA_SUMMARY_TEMPLATE.md completed with execution details
- [ ] Before/after CSV exports created
- [ ] Validation results captured

**Governance & Compliance**:
- [ ] MemoryPlugin anchor activated with production timestamp
- [ ] Governance log entry created in JSON format
- [ ] All artifacts stored in DriveMemory structure
- [ ] Audit trail complete and accessible

---

## ⚠️ Failure Scenarios & Rollback

### If Validation Fails
1. **STOP** migration immediately
2. Execute rollback from backup:
   ```bash
   LATEST_BACKUP=$(ls -t DriveMemory/QA/Canonical_Rebuild/20250802/before_cutover/*/projects_before.csv | head -1 | xargs dirname)
   # Restore from $LATEST_BACKUP directory
   ```
3. Update QA templates with FAILED status
4. Create incident governance log entry

### Emergency Contacts
- **System Owner**: [Contact for go/no-go decisions]
- **Database Admin**: [Technical escalation]
- **Claude Session Owner**: [Session coordinator]

---

## 🎯 Expected Outcome

Upon successful completion:
- **Clean canonical hierarchy**: 18 projects, 38 phases, extracted steps
- **Full Notion alignment**: Database matches authoritative source
- **Zero data loss**: Governance and communication history preserved  
- **Complete audit trail**: All artifacts in DriveMemory with governance anchor
- **Production ready**: oApp backend aligned and validated

---

**🚀 Ready for Claude Execution**

All preparation complete. Claude can now execute this plan by:
1. Following the step-by-step execution phases
2. Populating QA templates with actual data
3. Activating MemoryPlugin anchor and governance logging
4. Ensuring comprehensive documentation and audit trail

*This handoff ensures seamless Claude execution with complete governance compliance and audit readiness.*