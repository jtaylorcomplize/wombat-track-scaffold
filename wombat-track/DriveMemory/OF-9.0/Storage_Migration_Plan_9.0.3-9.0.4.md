# 📦 Storage Migration Plan: Steps 9.0.3 - 9.0.4

**Phase:** OF-9.0 Full Cloud Development & Multi-Agent Orchestration  
**Target Steps:** 9.0.3 (GitHub Sync & Merge Automation) and 9.0.4 (Azure Runtime)  
**Migration Scope:** MemoryPlugin + DriveMemory → oApp Native Storage  
**Generated:** 2025-08-06 15:30 AEST

---

## 1️⃣ Migration Objective

Transform the current file-based governance system (MemoryPlugin JSON + DriveMemory JSONL) into a fully integrated oApp native database storage system with real-time API access and enhanced query capabilities.

---

## 2️⃣ Current Architecture Analysis

### 📁 Current Storage Systems

#### MemoryPlugin System
- **Location:** `/DriveMemory/MemoryPlugin/`
- **Format:** JSON files with memory anchors
- **Current Anchors:**
  - `of-9.0-init-20250806.json` (Phase 9.0 initialization)
  - Previous phase anchors (of-8.5, of-8.7, etc.)
- **Access Pattern:** File-based read/write operations
- **Governance Integration:** Manual JSON updates

#### DriveMemory JSONL Logs  
- **Location:** `/DriveMemory/OF-9.0/Phase_9.0_Governance.jsonl`
- **Format:** Line-delimited JSON log entries
- **Current Entries:** Phase initialization, step tracking, governance events
- **Access Pattern:** Append-only log writing
- **Query Limitations:** Text-based searching, no structured queries

### 🔍 Current File Inventory

```
DriveMemory/
├── MemoryPlugin/
│   ├── of-9.0-init-20250806.json
│   ├── of-8.8-init-20250806.json
│   ├── of-8.7-memory-anchor-complete.json
│   └── [other phase anchors]
├── OF-9.0/
│   ├── Phase_9.0_Initialization.md
│   ├── Phase_9.0_Governance.jsonl
│   ├── Phase_9.0.1_WorkPacket.json
│   └── Storage_Migration_Plan_9.0.3-9.0.4.md
└── [other phase directories]
```

---

## 3️⃣ Target oApp Native Storage Architecture

### 🗄️ Database Schema Design

#### Memory Anchors Table
```sql
CREATE TABLE memory_anchors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anchor_id VARCHAR(255) UNIQUE NOT NULL,
    phase_id VARCHAR(50) NOT NULL,
    project_id VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(50),
    initialization_timestamp TIMESTAMP,
    planned_completion TIMESTAMP,
    linked_drive_path VARCHAR(500),
    phase_steps JSONB,
    technical_architecture JSONB,
    success_criteria JSONB,
    risk_register JSONB,
    roles JSONB,
    compliance_framework JSONB,
    deliverables JSONB,
    validation_checkpoints JSONB,
    memory_links JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Governance Events Table
```sql
CREATE TABLE governance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP NOT NULL,
    phase_id VARCHAR(50),
    step_id VARCHAR(50),
    entry_type VARCHAR(100),
    project_id VARCHAR(50),
    memory_anchor VARCHAR(255),
    summary TEXT,
    details JSONB,
    event_data JSONB,
    tags TEXT[],
    user_id VARCHAR(100),
    git_branch VARCHAR(255),
    audit_traceability BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Phase Steps Table
```sql
CREATE TABLE phase_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id VARCHAR(255) UNIQUE NOT NULL,
    phase_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'planned',
    estimated_duration VARCHAR(50),
    dependencies JSONB,
    objectives JSONB,
    governance_triggers JSONB,
    tasks JSONB,
    next_steps JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 🚀 API Endpoints Design

#### Memory Anchors API
- `GET /api/memory-anchors` - List all anchors
- `GET /api/memory-anchors/:anchorId` - Get specific anchor
- `POST /api/memory-anchors` - Create new anchor  
- `PUT /api/memory-anchors/:anchorId` - Update anchor
- `DELETE /api/memory-anchors/:anchorId` - Archive anchor

#### Governance Events API
- `GET /api/governance/events` - List governance events (paginated)
- `POST /api/governance/events` - Log new governance event
- `GET /api/governance/events/phase/:phaseId` - Get events by phase
- `GET /api/governance/events/step/:stepId` - Get events by step
- `GET /api/governance/summary/:phaseId` - Get governance summary

#### Phase Steps API
- `GET /api/phase-steps/:phaseId` - Get steps for phase
- `POST /api/phase-steps` - Create new step
- `PUT /api/phase-steps/:stepId` - Update step status/details
- `GET /api/phase-steps/:stepId/governance` - Get governance events for step

---

## 4️⃣ Migration Strategy

### 📋 Step 9.0.3: Database Schema & API Setup

#### 9.0.3.1: Database Migration Scripts
- Create schema migration scripts for production database
- Set up indexes for performance optimization
- Configure database constraints and relationships
- Create backup procedures for rollback capability

#### 9.0.3.2: API Service Development  
- Implement REST API endpoints with Express.js/TypeScript
- Add authentication and authorization middleware
- Implement request validation and error handling
- Add logging and monitoring for API operations

#### 9.0.3.3: Data Migration Scripts
- **Memory Anchor Migration:**
  ```typescript
  async function migrateMemoryAnchors() {
    const anchorFiles = glob.sync('DriveMemory/MemoryPlugin/*.json');
    for (const file of anchorFiles) {
      const anchor = JSON.parse(fs.readFileSync(file));
      await db.memoryAnchors.create(transformAnchorData(anchor));
    }
  }
  ```
- **Governance Events Migration:**
  ```typescript
  async function migrateGovernanceEvents() {
    const logFiles = glob.sync('DriveMemory/*/Phase_*_Governance.jsonl');
    for (const file of logFiles) {
      const events = parseJSONLFile(file);
      for (const event of events) {
        await db.governanceEvents.create(transformEventData(event));
      }
    }
  }
  ```

### 📋 Step 9.0.4: Service Integration & Testing

#### 9.0.4.1: Cloud IDE Integration
- Update `cloudIDEGovernance.ts` to use API endpoints instead of file operations
- Implement real-time governance logging via REST API
- Add retry logic and error handling for API failures
- Test governance events flow through database

#### 9.0.4.2: GitHub Integration Updates
- Update `githubIDEIntegration.ts` to log events via API
- Implement webhook handlers for GitHub events
- Connect CI/CD workflows to governance database
- Test PR creation and CI/CD trigger logging

#### 9.0.4.3: Azure Runtime Integration
- Deploy API services to Azure Functions/Container Apps
- Configure Azure SQL Database or PostgreSQL
- Set up Application Insights monitoring
- Implement Azure KeyVault for secrets management

---

## 5️⃣ Data Transformation Mapping

### 🔄 MemoryPlugin JSON → Memory Anchors Table

| Current JSON Field | Target DB Column | Transformation |
|-------------------|------------------|----------------|
| `anchor_id` | `anchor_id` | Direct mapping |
| `phase_id` | `phase_id` | Direct mapping |
| `project_id` | `project_id` | Direct mapping |
| `description` | `description` | Direct mapping |
| `status` | `status` | Direct mapping |
| `phase_steps` | `phase_steps` | JSON → JSONB |
| `technical_architecture` | `technical_architecture` | JSON → JSONB |
| `success_criteria` | `success_criteria` | JSON → JSONB |
| `risk_register` | `risk_register` | JSON → JSONB |

### 🔄 DriveMemory JSONL → Governance Events Table  

| Current JSONL Field | Target DB Column | Transformation |
|---------------------|------------------|----------------|
| `timestamp` | `timestamp` | String → TIMESTAMP |
| `phaseId` | `phase_id` | Direct mapping |
| `stepId` | `step_id` | Direct mapping |
| `entry_type` | `entry_type` | Direct mapping |
| `summary` | `summary` | Direct mapping |
| `details` | `details` | JSON → JSONB |
| `tags` | `tags` | Array → TEXT[] |

---

## 6️⃣ Migration Timeline

### 🗓️ Step 9.0.3 (Week 5-6)
- **Day 1-2:** Database schema design and creation
- **Day 3-5:** API service development and testing  
- **Day 6-7:** Data migration scripts development
- **Day 8-10:** Initial data migration and validation

### 🗓️ Step 9.0.4 (Week 7-8)  
- **Day 1-3:** Service integration updates (IDE, GitHub)
- **Day 4-6:** Azure deployment and configuration
- **Day 7-8:** End-to-end testing and validation
- **Day 9-10:** Performance optimization and monitoring setup

---

## 7️⃣ Risk Mitigation & Rollback Plan

### ⚠️ Identified Risks
1. **Data Loss during Migration:** Complete backup of all DriveMemory files before migration
2. **API Performance Issues:** Load testing and database optimization 
3. **Integration Failures:** Maintain file-based fallback during transition
4. **Azure Deployment Issues:** Local development environment for testing

### 🔄 Rollback Strategy
1. **Immediate Rollback:** Disable API endpoints, revert to file-based operations
2. **Data Recovery:** Restore from DriveMemory backup files
3. **Service Restoration:** Redeploy previous version of IDE and GitHub services
4. **Validation:** Verify all governance logging continues via file system

---

## 8️⃣ Success Criteria

### ✅ Migration Completion Checklist
- [ ] All memory anchors successfully migrated to database
- [ ] All governance events imported with full history
- [ ] API endpoints operational with <200ms response time
- [ ] Cloud IDE logging events to database in real-time
- [ ] GitHub integration creating governance entries via API
- [ ] Azure deployment stable with 99.9% uptime
- [ ] DriveMemory files archived but accessible for audit
- [ ] Full regression testing completed successfully

### 📊 Performance Targets
- API response time: <200ms for 95th percentile
- Database queries: <50ms for governance event retrieval
- Real-time logging: <1s latency from event to database
- System availability: 99.9% uptime SLA

---

## 9️⃣ Post-Migration Governance

### 📁 DriveMemory Transition
- **Status:** Archive-only after successful migration
- **Access:** Read-only for audit and historical reference
- **Retention:** Maintain for compliance and rollback capability
- **Location:** `/DriveMemory/Archive/pre-native-storage/`

### 🔍 Monitoring & Validation
- Real-time governance event monitoring dashboard
- Daily validation reports comparing API vs. file-based logging
- Performance metrics tracking for all database operations
- Automated backup verification for disaster recovery

---

## 🔟 Flagged Dependencies for CC Execution

### 🚨 Step 9.0.3 Dependencies
- [ ] **Database Schema Review:** Architecture team validation required
- [ ] **API Security Review:** Security team approval for endpoints  
- [ ] **Migration Script Testing:** QA validation on staging environment
- [ ] **Performance Baseline:** Load testing with realistic data volumes

### 🚨 Step 9.0.4 Dependencies  
- [ ] **Azure Resource Provisioning:** Infrastructure team setup required
- [ ] **CI/CD Pipeline Updates:** DevOps integration for API deployment
- [ ] **Monitoring Setup:** Application Insights configuration
- [ ] **Security Hardening:** Azure security baseline implementation

---

**Migration Lead:** Claude Code (CC)  
**Review Required:** Jackson Taylor / Architecture Team  
**Target Completion:** Step 9.0.4 completion (Week 8)  
**Governance Tracking:** Memory Anchor `of-9.0-init-20250806`