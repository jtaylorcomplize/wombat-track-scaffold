# Phase 9.0.7 Database Schema Verification & UX Refactor Recommendations

**Date:** 2025-08-06  
**Purpose:** Pre-Phase 9.0.7 schema verification and best-practice recommendations  
**Status:** ✅ Schema Analysis Complete

---

## 📊 1️⃣ Current Schema Analysis

### Existing Tables Overview

| Table | Primary Key | Key Fields | Foreign Keys | Status |
|-------|------------|------------|--------------|---------|
| **projects** | projectId | projectName, owner, status, subApp_ref | ❌ No FK on subApp_ref | ✅ Has draft support |
| **phases** | phaseid | phasename, project_ref, status, RAG | ✅ FK to projects(projectId) | ✅ Has draft support |
| **step_progress** | stepId | phaseId, stepName, status, progress | ✅ FK to phases(phaseid) | ✅ Exists |
| **governance_logs** | id (AUTO) | event_type, resource_type, resource_id | ❌ No FKs | ⚠️ Generic linkage |
| **sub_apps** | - | - | - | ❌ **NOT FOUND** |
| **documents** | - | - | - | ❌ **NOT FOUND** |

### Critical Findings

#### ✅ **What EXISTS:**
1. **Projects Table:**
   - ✅ Has `subApp_ref VARCHAR(50)` column
   - ❌ **NOT a foreign key** (no sub_apps table exists)
   - ✅ Has draft support (isDraft, draftEditedBy, draftEditedAt)
   - ✅ Has editableByAdmin flag

2. **Phases Table:**
   - ✅ Has proper FK to projects
   - ✅ Has draft support
   - ❌ **No checkpoint fields**
   - ⚠️ Steps exist in separate `step_progress` table

3. **Step Progress Table:**
   - ✅ **EXISTS** - Phase steps are implemented!
   - ✅ Has FK to phases
   - ✅ Tracks progress (0-100%)
   - ❌ No checkpoint review fields

4. **Governance Logs Table:**
   - ✅ **EXISTS** with generic linkage
   - ✅ Can link to any resource via resource_type/resource_id
   - ❌ No specific phaseId or docId columns
   - ⚠️ Uses generic pattern (flexible but not enforced)

#### ❌ **What's MISSING:**
1. **sub_apps table** - Referenced but doesn't exist
2. **documents table** - No document management
3. **checkpoints table** - No checkpoint reviews
4. **Soft delete support** - Not implemented anywhere

---

## 🔧 2️⃣ Recommended Schema Extensions

### Priority 1: Create Missing Tables (SAFE)

#### **A. sub_apps Table** (Critical for SubApp linking)
```sql
CREATE TABLE sub_apps (
    subAppId VARCHAR(50) PRIMARY KEY,
    subAppName TEXT NOT NULL,
    status TEXT DEFAULT 'Active', -- Active, Inactive, Maintenance
    url TEXT,
    icon TEXT,
    category TEXT, -- Operating, Support, Development
    healthScore INTEGER DEFAULT 100,
    lastHealthCheck DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add proper foreign key to projects
ALTER TABLE projects 
ADD CONSTRAINT fk_projects_subapp 
FOREIGN KEY (subApp_ref) REFERENCES sub_apps(subAppId);
```

#### **B. documents Table** (With soft delete)
```sql
CREATE TABLE documents (
    docId TEXT PRIMARY KEY,
    docName TEXT NOT NULL,
    docType TEXT, -- governance, technical, requirement, etc.
    project_ref TEXT,
    phase_ref TEXT,
    driveMemoryPath TEXT,
    memoryPluginAnchor TEXT,
    content TEXT,
    version INTEGER DEFAULT 1,
    isDeleted BOOLEAN DEFAULT 0,
    deletedAt DATETIME,
    deletedBy TEXT,
    retentionDays INTEGER DEFAULT 30,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdBy TEXT,
    lastEditedBy TEXT,
    FOREIGN KEY (project_ref) REFERENCES projects(projectId),
    FOREIGN KEY (phase_ref) REFERENCES phases(phaseid)
);

CREATE INDEX idx_documents_soft_delete ON documents(isDeleted, deletedAt);
CREATE INDEX idx_documents_project ON documents(project_ref);
CREATE INDEX idx_documents_phase ON documents(phase_ref);
```

#### **C. checkpoints Table** (Phase checkpoint reviews)
```sql
CREATE TABLE checkpoints (
    checkpointId TEXT PRIMARY KEY,
    phaseId TEXT NOT NULL,
    checkpointName TEXT NOT NULL,
    checkpointType TEXT, -- milestone, gate, review
    status TEXT DEFAULT 'Pending', -- Pending, InReview, Approved, Failed
    reviewDate DATETIME,
    reviewedBy TEXT,
    approvalNotes TEXT,
    criteriaJson TEXT, -- JSON for flexible criteria
    evidenceLinks TEXT, -- JSON array of document/evidence links
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (phaseId) REFERENCES phases(phaseid)
);

CREATE INDEX idx_checkpoints_phase ON checkpoints(phaseId);
CREATE INDEX idx_checkpoints_status ON checkpoints(status);
```

### Priority 2: Enhance Existing Tables (SAFE)

#### **A. Enhance governance_logs for specific linkage**
```sql
-- Add specific columns for better linkage (backward compatible)
ALTER TABLE governance_logs ADD COLUMN phaseId TEXT;
ALTER TABLE governance_logs ADD COLUMN docId TEXT;
ALTER TABLE governance_logs ADD COLUMN projectId TEXT;

-- Add indexes for performance
CREATE INDEX idx_governance_phase ON governance_logs(phaseId);
CREATE INDEX idx_governance_doc ON governance_logs(docId);
CREATE INDEX idx_governance_project ON governance_logs(projectId);

-- Note: Keep resource_type/resource_id for backward compatibility
```

#### **B. Add auto-save tracking to projects**
```sql
ALTER TABLE projects ADD COLUMN autoSaveEnabled BOOLEAN DEFAULT 1;
ALTER TABLE projects ADD COLUMN lastAutoSave DATETIME;
ALTER TABLE projects ADD COLUMN autoSaveVersion INTEGER DEFAULT 0;
```

#### **C. Add checkpoint support to phases**
```sql
ALTER TABLE phases ADD COLUMN hasCheckpoints BOOLEAN DEFAULT 0;
ALTER TABLE phases ADD COLUMN nextCheckpointId TEXT;
ALTER TABLE phases ADD COLUMN checkpointStatus TEXT DEFAULT 'NotStarted';
```

---

## 🔄 3️⃣ Migration Strategy (Production-Safe)

### Phase 1: Non-Breaking Additions (Week 1)
```sql
-- 1. Create new tables (no breaking changes)
CREATE TABLE sub_apps (...);
CREATE TABLE documents (...);
CREATE TABLE checkpoints (...);

-- 2. Add new columns (nullable, with defaults)
ALTER TABLE governance_logs ADD COLUMN phaseId TEXT;
ALTER TABLE governance_logs ADD COLUMN docId TEXT;
ALTER TABLE projects ADD COLUMN autoSaveEnabled BOOLEAN DEFAULT 1;
```

### Phase 2: Data Migration (Week 2)
```sql
-- 1. Populate sub_apps from existing subApp_ref values
INSERT INTO sub_apps (subAppId, subAppName, status)
SELECT DISTINCT subApp_ref, subApp_ref, 'Active'
FROM projects WHERE subApp_ref IS NOT NULL;

-- 2. Link governance logs to phases
UPDATE governance_logs 
SET phaseId = resource_id 
WHERE resource_type = 'phase';

-- 3. Create initial checkpoints for existing phases
INSERT INTO checkpoints (checkpointId, phaseId, checkpointName, status)
SELECT 
    'CP-' || phaseid,
    phaseid,
    'Phase Completion Review',
    CASE WHEN status = 'Completed' THEN 'Approved' ELSE 'Pending' END
FROM phases;
```

### Phase 3: Add Constraints (Week 3)
```sql
-- Only after data is clean and migrated
ALTER TABLE projects 
ADD CONSTRAINT fk_projects_subapp 
FOREIGN KEY (subApp_ref) REFERENCES sub_apps(subAppId);
```

---

## 🎯 4️⃣ API/Mutation Recommendations

### Auto-Save Implementation
```typescript
// API Endpoint: POST /api/projects/autosave
interface AutoSavePayload {
  projectId: string;
  changes: Partial<Project>;
  version: number;
  timestamp: string;
}

// Mutation Strategy
const autoSaveMutation = `
  UPDATE projects 
  SET ${changedFields},
      lastAutoSave = CURRENT_TIMESTAMP,
      autoSaveVersion = autoSaveVersion + 1
  WHERE projectId = ? 
    AND autoSaveEnabled = 1
    AND autoSaveVersion = ?  -- Optimistic locking
`;
```

### Soft Delete Implementation
```typescript
// API Endpoint: DELETE /api/documents/:docId
const softDeleteDocument = `
  UPDATE documents 
  SET isDeleted = 1,
      deletedAt = CURRENT_TIMESTAMP,
      deletedBy = ?
  WHERE docId = ?
`;

// Auto-purge job (runs nightly)
const purgeSoftDeleted = `
  DELETE FROM documents 
  WHERE isDeleted = 1 
    AND deletedAt < datetime('now', '-30 days')
`;
```

### SubApp Linking
```typescript
// API Endpoint: POST /api/projects/:projectId/link-subapp
const linkSubApp = `
  UPDATE projects 
  SET subApp_ref = ?,
      updatedAt = CURRENT_TIMESTAMP
  WHERE projectId = ?
    AND EXISTS (SELECT 1 FROM sub_apps WHERE subAppId = ?)
`;
```

---

## ✅ 5️⃣ Final Recommendations Summary

### **MUST HAVE for Phase 9.0.7:**
1. ✅ Create `sub_apps` table - Critical for SubApp linking
2. ✅ Create `documents` table with soft delete - Document management
3. ✅ Add specific linkage columns to `governance_logs`
4. ✅ Add auto-save fields to `projects`

### **NICE TO HAVE:**
1. ⚡ Create `checkpoints` table - Phase review gates
2. ⚡ Add checkpoint fields to `phases`
3. ⚡ Create audit triggers for all tables

### **DO NOT CHANGE:**
1. ❌ Don't modify existing column types
2. ❌ Don't remove any existing columns
3. ❌ Don't change primary keys
4. ❌ Don't break existing foreign keys

### **Migration Safety Checklist:**
- ✅ All changes are additive (no breaking changes)
- ✅ New tables don't conflict with existing ones
- ✅ All new columns have defaults or are nullable
- ✅ Foreign keys added only after data migration
- ✅ Indexes added for performance
- ✅ Backward compatibility maintained

---

## 🚀 Next Steps for Phase 9.0.7

1. **Execute Phase 1 migrations** (create tables)
2. **Implement auto-save API endpoints**
3. **Add soft delete UI controls**
4. **Test SubApp linking with new FK**
5. **Update governance logging to use specific columns**
6. **Deploy checkpoint review UI (if time permits)**

**Risk Level:** LOW - All changes are production-safe and backward-compatible

---

*Generated for Phase 9.0.7 UX/UI Refactor Planning*  
*Schema verified against production.db on 2025-08-06*