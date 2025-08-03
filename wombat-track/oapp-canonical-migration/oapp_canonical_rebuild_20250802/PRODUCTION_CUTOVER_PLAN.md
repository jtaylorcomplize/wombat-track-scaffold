# oApp Production Cutover Plan
**Governance Anchor**: `oapp-canonical-schema-rebuild-20250802`  
**Date**: 2025-08-02  
**Migration**: Canonical Hierarchy Rebuild (18 Projects / 38 Phases)

---

## 🎯 Cutover Overview

### Objective
Promote validated canonical hierarchy from staging to production with zero data loss and minimal downtime.

### Scope
- **In Scope**: projects_canonical, phases_canonical, steps_canonical
- **Protected**: governance_logs, comms_canonical (remain untouched)
- **Impact**: oApp backend data alignment with Notion source

### Risk Assessment
- **Risk Level**: 🟡 Medium
- **Downtime**: < 5 minutes (database migration only)
- **Rollback Time**: < 2 minutes (restore from backup)
- **Data Loss Risk**: Minimal (governance preserved, canonical rebuilt)

---

## 🗓️ Pre-Cutover Checklist

### 📋 Staging Validation (Required)
- [ ] **Final Validation Pass**: Execute `04_validate_canonical_hierarchy.py`
  - [ ] ✅ Exactly 18 projects imported
  - [ ] ✅ Exactly 38 phases imported  
  - [ ] ✅ Zero orphaned phases
  - [ ] ✅ Zero orphaned steps
  - [ ] ✅ Data quality checks pass
  - [ ] ✅ No duplicate primary keys

### 🔧 Technical Preparation
- [ ] **Production Database Backup**: Full backup of oapp_production.db
- [ ] **Script Validation**: Test all scripts on staging replica
- [ ] **File Preparation**: Verify Notion CSV files are current
- [ ] **Environment Check**: Confirm production database accessibility
- [ ] **Service Dependencies**: Identify services requiring restart

### 📊 Business Preparation
- [ ] **Stakeholder Notification**: Inform users of maintenance window
- [ ] **Change Window**: Schedule approved downtime (if required)
- [ ] **Rollback Authorization**: Confirm rollback decision authority
- [ ] **Go/No-Go Decision**: Final approval from system owner

---

## 🚀 Cutover Execution Steps

### Phase 1: Pre-Migration (5 minutes)
```bash
# 1.1 Create production backup
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp oapp_production.db "oapp_production_backup_${BACKUP_TIMESTAMP}.db"

# 1.2 Verify backup integrity
sqlite3 "oapp_production_backup_${BACKUP_TIMESTAMP}.db" "SELECT COUNT(*) FROM projects_canonical;"

# 1.3 Final staging validation
cd oapp_canonical_rebuild_20250802
python3 04_validate_canonical_hierarchy.py

# 1.4 Log cutover start
echo "$(date): Starting oApp canonical cutover - anchor: oapp-canonical-schema-rebuild-20250802" >> /var/log/oapp_cutover.log
```

### Phase 2: Schema Migration (3 minutes)
```bash
# 2.1 Update production database path in scripts
sed -i 's/oapp_staging.db/oapp_production.db/g' *.py *.sql

# 2.2 Execute truncation (with production backup verified)
sqlite3 oapp_production.db < 01_truncate_hierarchy.sql

# 2.3 Import canonical data
python3 02_import_canonical_data.py

# 2.4 Extract steps
python3 03_extract_steps_advanced.py
```

### Phase 3: Validation & Verification (2 minutes)
```bash
# 3.1 Production validation
python3 04_validate_canonical_hierarchy.py

# 3.2 Verify governance tables untouched
sqlite3 oapp_production.db "SELECT COUNT(*) FROM governance_logs; SELECT COUNT(*) FROM comms_canonical;"

# 3.3 Quick smoke test
sqlite3 oapp_production.db "SELECT projectId, projectName FROM projects_canonical LIMIT 5;"
```

### Phase 4: Service Recovery (2 minutes)
```bash
# 4.1 Restart dependent services
sudo systemctl restart oapp-backend-service
sudo systemctl restart oapp-api-gateway

# 4.2 Verify service health
curl -f http://localhost:8080/api/health
curl -f http://localhost:8080/api/projects/count

# 4.3 Update MemoryPlugin anchor
echo "oapp-canonical-schema-rebuild-20250802-PRODUCTION" > /var/lib/oapp/memory_anchor.txt
```

---

## 🔄 Rollback Plan

### Immediate Rollback (< 2 minutes)
If validation fails or critical errors occur:

```bash
# Emergency rollback procedure
BACKUP_FILE=$(ls -t oapp_production_backup_*.db | head -1)
cp "$BACKUP_FILE" oapp_production.db

# Restart services
sudo systemctl restart oapp-backend-service
sudo systemctl restart oapp-api-gateway

# Verify rollback
sqlite3 oapp_production.db "SELECT COUNT(*) FROM projects_canonical;"

# Log rollback
echo "$(date): ROLLBACK EXECUTED - restored from $BACKUP_FILE" >> /var/log/oapp_cutover.log
```

### Rollback Decision Criteria
Execute rollback if ANY of these occur:
- Production validation script fails
- Row counts don't match expected (18/38)
- Orphaned records detected in production
- Service health checks fail after restart
- API endpoints return errors
- System owner requests abort

---

## 📊 Post-Cutover Verification

### Immediate Checks (5 minutes)
```bash
# Data integrity verification
sqlite3 oapp_production.db << EOF
.headers on
.mode column
SELECT 'Projects' as type, COUNT(*) as count FROM projects_canonical
UNION ALL
SELECT 'Phases' as type, COUNT(*) as count FROM phases_canonical  
UNION ALL
SELECT 'Steps' as type, COUNT(*) as count FROM steps_canonical
UNION ALL
SELECT 'Governance' as type, COUNT(*) as count FROM governance_logs;
EOF

# API health verification
curl -s http://localhost:8080/api/projects | jq '.length'
curl -s http://localhost:8080/api/phases | jq '.length'
```

### Extended Monitoring (30 minutes)
- [ ] **API Response Times**: Monitor for performance degradation
- [ ] **Error Logs**: Check for database-related errors
- [ ] **User Acceptance**: Verify UI shows correct project/phase data
- [ ] **Integration Tests**: Run automated test suite
- [ ] **Business Logic**: Verify project-phase relationships work correctly

---

## 📋 Governance & Documentation

### MemoryPlugin Integration
```bash
# Update memory anchor for permanent reference
echo "Production cutover completed: $(date)" >> /var/lib/oapp/governance.log
echo "Anchor: oapp-canonical-schema-rebuild-20250802-PRODUCTION" >> /var/lib/oapp/governance.log
echo "Projects: 18, Phases: 38, Status: ACTIVE" >> /var/lib/oapp/governance.log
```

### Archive Management
```bash
# Archive cutover artifacts
mkdir -p DriveMemory/QA/Canonical_Rebuild/20250802/production_cutover
cp oapp_canonical_rebuild_20250802/* DriveMemory/QA/Canonical_Rebuild/20250802/production_cutover/
cp /var/log/oapp_cutover.log DriveMemory/QA/Canonical_Rebuild/20250802/production_cutover/
cp oapp_production_backup_*.db DriveMemory/QA/Canonical_Rebuild/20250802/production_cutover/
```

### Governance Record Template
```json
{
  "event": "oApp Canonical Production Cutover",
  "anchor": "oapp-canonical-schema-rebuild-20250802-PRODUCTION",
  "timestamp": "2025-08-02T[EXECUTION_TIME]Z",
  "source": "Notion CSV canonical (18 projects, 38 phases)",
  "target": "oapp_production.db",
  "validation": {
    "projects_count": 18,
    "phases_count": 38,
    "steps_count": "[EXTRACTED_COUNT]",
    "orphan_detection": "PASSED",
    "data_quality": "PASSED"
  },
  "downtime_minutes": "[ACTUAL_DOWNTIME]",
  "rollback_executed": false,
  "status": "SUCCESS",
  "artifacts_location": "DriveMemory/QA/Canonical_Rebuild/20250802/",
  "next_validation_due": "2025-09-02"
}
```

---

## 🔍 Success Criteria

### ✅ Cutover Success Indicators
- [ ] **Data Counts Match**: 18 projects, 38 phases in production
- [ ] **Zero Orphans**: All referential integrity maintained
- [ ] **Services Operational**: All APIs responding normally
- [ ] **Performance Maintained**: Response times within SLA
- [ ] **Governance Preserved**: Historical logs untouched
- [ ] **User Verification**: UI displays correct canonical data

### 📊 Key Metrics
- **Total Cutover Time**: Target < 12 minutes
- **Downtime**: Target < 5 minutes  
- **Rollback Time**: Target < 2 minutes (if needed)
- **Data Loss**: 0% (governance preserved)
- **API Availability**: 99%+ during cutover window

---

## 📞 Emergency Contacts

| Role | Contact | Responsibility |
|------|---------|---------------|
| System Owner | [PRIMARY_CONTACT] | Go/No-Go decisions |
| Database Admin | [DBA_CONTACT] | Technical execution |
| Application Owner | [APP_CONTACT] | Service validation |
| Business Sponsor | [BIZ_CONTACT] | Business impact assessment |

---

## 📝 Execution Log Template

```
=== oApp Canonical Cutover Execution Log ===
Date: 2025-08-02
Anchor: oapp-canonical-schema-rebuild-20250802

[TIMESTAMP] START: Pre-cutover checklist
[TIMESTAMP] ✓ Production backup created: [BACKUP_FILE]
[TIMESTAMP] ✓ Staging validation passed
[TIMESTAMP] START: Schema migration
[TIMESTAMP] ✓ Truncation completed
[TIMESTAMP] ✓ Data import completed
[TIMESTAMP] ✓ Step extraction completed  
[TIMESTAMP] START: Production validation
[TIMESTAMP] ✓ Validation passed - 18 projects, 38 phases
[TIMESTAMP] START: Service restart
[TIMESTAMP] ✓ Services restarted successfully
[TIMESTAMP] ✓ API health checks passed
[TIMESTAMP] SUCCESS: Cutover completed
[TIMESTAMP] MemoryPlugin anchor updated
[TIMESTAMP] Artifacts archived to DriveMemory

RESULT: SUCCESS
DOWNTIME: [ACTUAL_MINUTES] minutes
STATUS: oApp canonical hierarchy aligned with Notion source
```

---

*This cutover plan ensures safe, auditable migration of the canonical hierarchy to production with comprehensive validation and rollback capabilities.*