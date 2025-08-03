# oApp Canonical Schema Rebuild – 2025-08-02

## 🎯 Purpose
Complete canonical rebuild of Projects, Phases, and Steps hierarchy to align with the authoritative Notion source:
- **Projects**: 18 canonical records
- **Phases**: 38 canonical records  
- **Steps**: Extracted from phase notes using advanced regex
- **Governance Logs**: Remain intact and unmodified

**Governance Anchor**: `oapp-canonical-schema-rebuild-20250802`

---

## 📦 Package Contents

| File | Purpose | Description |
|------|---------|-------------|
| `01_truncate_hierarchy.sql` | Schema Reset | Safely truncates Projects/Phases/Steps with backup instructions |
| `02_import_canonical_data.py` | Data Import | Imports canonical CSV/JSON from Notion to staging DB |
| `03_extract_steps_advanced.py` | Step Extraction | Advanced regex-based step extraction from phase notes |
| `04_validate_canonical_hierarchy.py` | QA Validation | Comprehensive validation with orphan detection |
| `README_REBUILD.md` | Documentation | This file - execution guide and governance |

---

## 🔄 Execution Steps

### Prerequisites
1. **Backup Current Data**
   ```bash
   # Backup existing canonical tables
   sqlite3 oapp_staging.db ".mode csv" ".headers on" ".output projects_backup.csv" "SELECT * FROM projects_canonical;"
   sqlite3 oapp_staging.db ".mode csv" ".headers on" ".output phases_backup.csv" "SELECT * FROM phases_canonical;"
   sqlite3 oapp_staging.db ".mode csv" ".headers on" ".output steps_backup.csv" "SELECT * FROM steps_canonical;"
   ```

2. **Prepare Notion Exports**
   - Place `WT Projects canonical.csv` in working directory
   - Place `WT Phase Database canonical.csv` in working directory
   - Verify files contain expected 18 projects and 38 phases

### Step-by-Step Execution

#### 1️⃣ Truncate Existing Hierarchy
```bash
sqlite3 oapp_staging.db < 01_truncate_hierarchy.sql
```
**Expected Result**: All canonical tables empty, sequences reset

#### 2️⃣ Import Canonical Data
```bash
python3 02_import_canonical_data.py
```
**Expected Result**: 
- 18 projects imported to `projects_canonical`
- 38 phases imported to `phases_canonical`
- 0 orphaned phases

#### 3️⃣ Extract Steps from Phase Notes
```bash
python3 03_extract_steps_advanced.py
```
**Expected Result**: 
- Steps extracted using advanced regex patterns
- Step IDs formatted as `{phaseId}-S{counter}`
- All steps properly linked to phases and projects

#### 4️⃣ Validate Complete Hierarchy
```bash
python3 04_validate_canonical_hierarchy.py
```
**Expected Result**: 
- ✅ Row counts match Notion source (18/38)
- ✅ Zero orphaned records
- ✅ Data quality checks pass
- ✅ Hierarchy integrity confirmed

#### 5️⃣ Manual QA Review
- Review validation report output
- Verify sample records match Notion source
- Confirm governance logs remain intact
- Test query performance on new hierarchy

#### 6️⃣ Production Cutover (if validation passes)
- Execute production cutover plan
- Update MemoryPlugin anchor: `oapp-canonical-schema-rebuild-20250802`
- Archive staging artifacts to `DriveMemory/QA/Canonical_Rebuild/20250802`

---

## 🔍 Validation Criteria

### ✅ Success Criteria
- **Exact Row Counts**: 18 projects, 38 phases
- **Zero Orphans**: No phases without valid project references
- **Zero Orphans**: No steps without valid phase references  
- **Data Integrity**: All required fields populated
- **No Duplicates**: Unique project and phase IDs
- **Governance Preserved**: governance_logs and comms_canonical untouched

### ❌ Failure Conditions
- Row count mismatch with Notion source
- Orphaned records detected
- Missing required field data
- Duplicate primary keys
- Validation script errors

---

## 🗂️ File Structure After Completion

```
oapp_staging.db
├── projects_canonical      (18 rows - Notion aligned)
├── phases_canonical        (38 rows - Notion aligned)  
├── steps_canonical         (Variable - extracted from notes)
├── governance_logs         (Untouched - historical integrity)
└── comms_canonical         (Untouched - communication records)
```

---

## 🔧 Advanced Features

### Enhanced Step Extraction
The step extraction uses multiple regex patterns to capture various step formats:
- `StepTaskOutput 1.1`, `StepTaskOutput 1.1a`
- `WT-1.1 Step`, `WT-1.1a Step`  
- `Step 1.1`, `Task 1.1`
- `1.1 - Description`
- `Milestone 1.1`

### Comprehensive Validation
The validation script performs:
- Row count verification against expected values
- Orphan detection for phases and steps
- Data quality checks for required fields
- Duplicate detection for primary keys
- Hierarchy integrity analysis
- Summary statistics and distribution analysis

### Error Handling
- All scripts include comprehensive error handling
- Transactions ensure atomicity
- Detailed logging for troubleshooting
- Graceful failure with rollback capability

---

## 🎯 Expected Outcomes

### ✅ Upon Successful Completion
- **Clean Canonical Hierarchy**: Projects → Phases → Steps properly linked
- **Notion Alignment**: Database matches authoritative Notion source  
- **Zero Data Loss**: Governance and communication records preserved
- **Production Ready**: Validated and ready for MemoryPlugin promotion
- **Audit Trail**: Complete governance documentation and timestamps

### 📋 Governance Record
```
Event: oApp Canonical Schema Rebuild
Date: 2025-08-02  
Anchor: oapp-canonical-schema-rebuild-20250802
Source: Notion CSV exports (18 projects, 38 phases)
Target: oapp_staging.db canonical tables
Validation: Comprehensive QA with orphan detection
Status: [PENDING|COMPLETED|FAILED]
Artifacts: DriveMemory/QA/Canonical_Rebuild/20250802/
```

---

## 🚀 Production Cutover Plan

### Pre-Cutover Checklist
- [ ] Staging validation passes completely
- [ ] Manual QA review completed
- [ ] Backup of production database created
- [ ] Downtime window scheduled (if required)
- [ ] Rollback plan prepared

### Cutover Steps
1. **Final Staging Validation** - Re-run validation script
2. **Production Backup** - Full database backup
3. **Schema Migration** - Apply scripts to production
4. **Post-Migration Validation** - Verify production data
5. **MemoryPlugin Update** - Update anchor reference
6. **Service Restart** - Restart dependent services
7. **Smoke Testing** - Verify application functionality

### Post-Cutover
- Monitor application logs for errors
- Verify API endpoints returning correct data
- Archive migration artifacts
- Update documentation and governance logs

---

**🔗 Related Documentation**
- Notion Database Schema: [WT Projects canonical.csv](./WT%20Projects%20canonical.csv)
- Phase Database: [WT Phase Database canonical.csv](./WT%20Phase%20Database%20canonical.csv)
- Governance Framework: DriveMemory governance standards

---
*This rebuild ensures oApp has a clean, canonical foundation aligned with the authoritative Notion source while preserving all governance and communication history.*