# 🚀 UAT Deployment Guide - OF-BEV Phase 3
## Orbis Forge Back-End Visibility - Staging Environment Setup

**Target Environment:** `https://orbis-forge-admin.staging.oapp.io`  
**Deployment Date:** 2025-07-30  
**Phase:** OF-BEV Phase 3 - Live Database Operations  

---

## 📋 Pre-Deployment Checklist

### Environment Preparation
- [ ] Staging server provisioned with Node.js 18+ and npm 9+
- [ ] SSL certificate installed for `orbis-forge-admin.staging.oapp.io`
- [ ] Database storage allocated (minimum 10GB for staging)
- [ ] Environment variables configured (see below)
- [ ] Monitoring tools configured for health checks

### Required Environment Variables
```bash
# Core Application
NODE_ENV=staging
PORT=3000
HOST=0.0.0.0

# Database Configuration
DATABASE_PATH=./databases/staging.db
DATABASE_BACKUP_PATH=./backups
MAX_DATABASE_CONNECTIONS=20

# Governance & Logging
ENABLE_GOVERNANCE_LOGGING=true
LOG_LEVEL=debug
GOVERNANCE_LOG_PATH=./logs/governance.jsonl

# DriveMemory Configuration
MEMORY_PLUGIN_PATH=./DriveMemory
ENABLE_MEMORY_ANCHORS=true

# Security
CORS_ORIGINS=https://orbis-forge-admin.staging.oapp.io
SESSION_SECRET=<generate-secure-random-string>
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=15

# Monitoring
HEALTH_CHECK_INTERVAL=30000
AUTO_BACKUP_INTERVAL=3600000
```

---

## 🔧 Deployment Steps

### 1. Application Deployment
```bash
# Clone and setup
git clone <repository-url>
cd wombat-track
git checkout feature/wt-7-4-lint-pass-4

# Install dependencies
npm ci --production

# Build application
npm run build

# Initialize database
npm run db:init

# Start application
npm run start:staging
```

### 2. Database Initialization
```bash
# Create database directories
mkdir -p databases backups logs DriveMemory

# Initialize staging database with schema
node -e "
const DatabaseManager = require('./dist/server/database/connection.js').default;
(async () => {
  const db = DatabaseManager.getInstance();
  await db.getConnection('staging');
  console.log('✅ Staging database initialized');
})();
"
```

### 3. Seed Data Population
```bash
# Import sample data for UAT testing
node -e "
const fs = require('fs');
const DatabaseManager = require('./dist/server/database/connection.js').default;

const sampleData = {
  projects: [
    { projectId: 'UAT-TEST-001', projectName: 'UAT Test Project 1', owner: 'test_user', status: 'Active' },
    { projectId: 'UAT-TEST-002', projectName: 'UAT Test Project 2', owner: 'test_user', status: 'Planning' }
  ],
  phases: [
    { phaseid: 'UAT-PHASE-001', phasename: 'UAT Phase 1', project_ref: 'UAT-TEST-001', status: 'Active', RAG: 'Green' },
    { phaseid: 'UAT-PHASE-002', phasename: 'UAT Phase 2', project_ref: 'UAT-TEST-002', status: 'Planning', RAG: 'Amber' }
  ]
};

(async () => {
  const db = DatabaseManager.getInstance();
  
  for (const project of sampleData.projects) {
    await db.executeQuery(
      'INSERT INTO projects (projectId, projectName, owner, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [project.projectId, project.projectName, project.owner, project.status, new Date().toISOString(), new Date().toISOString()]
    );
  }
  
  for (const phase of sampleData.phases) {
    await db.executeQuery(
      'INSERT INTO phases (phaseid, phasename, project_ref, status, RAG, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [phase.phaseid, phase.phasename, phase.project_ref, phase.status, phase.RAG, new Date().toISOString(), new Date().toISOString()]
    );
  }
  
  console.log('✅ Sample data seeded for UAT testing');
})();
"
```

---

## 🧪 UAT Testing Protocol

### Test Environment Access
- **URL:** `https://orbis-forge-admin.staging.oapp.io`
- **Test User:** `uat_tester@oapp.io`
- **Test Password:** `UAT2025!Secure`

### Core Functionality Tests

#### 1. Data Explorer Testing
**Objective:** Verify data browsing and search capabilities

```bash
# Test Steps:
1. Navigate to /admin/data-explorer
2. Verify all 4 table cards are displayed
3. Click on "projects" table
4. Verify sample data loads (UAT-TEST-001, UAT-TEST-002)
5. Test search functionality with "UAT"
6. Verify pagination controls appear for large datasets
7. Test table switching between projects/phases/step_progress
```

#### 2. Runtime Status Testing  
**Objective:** Confirm system monitoring capabilities

```bash
# Test Steps:
1. Navigate to /admin/runtime-status
2. Verify 3 health indicators (AI, GitHub, Database)
3. Check active jobs section displays
4. Toggle auto-refresh checkbox
5. Verify status updates occur automatically
6. Test manual refresh functionality
```

#### 3. Data Integrity Testing
**Objective:** Validate orphan detection and resolution

```bash
# Test Steps:
1. Navigate to /admin/data-integrity
2. Verify integrity summary cards display
3. Check for orphaned record detection
4. Test table filter dropdown
5. Verify severity categorization
6. Test self-healing suggestions
```

#### 4. Inline Editing Testing
**Objective:** Confirm live database edit capabilities

```bash
# Test Steps:
1. Navigate to /admin/data-explorer
2. Select "projects" table
3. Click edit button on UAT-TEST-001
4. Modify projectName field
5. Save changes and verify persistence
6. Check governance log entry created
7. Test cancel functionality
8. Verify read-only fields are protected
```

#### 5. JSON Operations Testing
**Objective:** Validate import/export functionality

```bash
# Test Steps:
1. Navigate to /admin/data-explorer  
2. Click export button
3. Verify JSON download with correct structure
4. Test import preview with exported file
5. Verify change analysis accuracy
6. Test full import with backup creation
7. Verify governance logging of operations
```

### Automated Test Execution
```bash
# Run Puppeteer integration tests
npm test -- --testPathPattern=admin-puppeteer.test.js

# Expected Results:
# ✅ Data Explorer Page Load
# ✅ Table Selection and Search  
# ✅ Runtime Status Dashboard
# ✅ Data Integrity Page Load
# ✅ Inline Editing Test
# ✅ JSON Export Test
# ✅ Governance Logging Verification
# ✅ Network Error Handling
# ✅ Session State Persistence
```

---

## 📊 Performance Benchmarks

### Expected Performance Metrics
- **Page Load Time:** < 2 seconds for tables with 500+ records
- **Transaction Response:** < 500ms for single record updates  
- **Export Generation:** < 10 seconds for full database export
- **Import Processing:** < 30 seconds for 1000+ record import
- **Database Query Time:** < 100ms for standard SELECT operations

### Load Testing Commands
```bash
# Test concurrent users (requires artillery)
npx artillery quick --count 10 --num 50 https://orbis-forge-admin.staging.oapp.io/admin/data-explorer

# Database stress test
node -e "
const DatabaseManager = require('./dist/server/database/connection.js').default;
(async () => {
  const db = DatabaseManager.getInstance();
  const start = Date.now();
  
  for (let i = 0; i < 100; i++) {
    await db.executeQuery('SELECT COUNT(*) FROM projects');
  }
  
  console.log(\`100 queries completed in \${Date.now() - start}ms\`);
})();
"
```

---

## 🔐 Security Validation

### Security Checklist
- [ ] HTTPS enforced for all connections
- [ ] CORS origins properly configured
- [ ] Rate limiting active and tested
- [ ] SQL injection prevention verified
- [ ] File upload restrictions validated
- [ ] Session security configured
- [ ] Error handling doesn't expose sensitive data

### Security Testing Commands
```bash
# Test CORS configuration
curl -H "Origin: https://malicious.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://orbis-forge-admin.staging.oapp.io/api/live-admin/projects

# Test rate limiting
for i in {1..100}; do
  curl -s https://orbis-forge-admin.staging.oapp.io/admin/data-explorer > /dev/null
done

# Test SQL injection prevention (should fail safely)
curl -X POST https://orbis-forge-admin.staging.oapp.io/api/live-admin/projects \
     -H "Content-Type: application/json" \
     -d '{"projectId": "'; DROP TABLE projects; --", "projectName": "test"}'
```

---

## 📈 Monitoring & Alerting

### Health Check Endpoints
- **Application Health:** `GET /health`
- **Database Health:** `GET /health/database`  
- **System Status:** `GET /admin/runtime-status`

### Monitoring Commands
```bash
# Application health check
curl https://orbis-forge-admin.staging.oapp.io/health

# Database connectivity check  
curl https://orbis-forge-admin.staging.oapp.io/health/database

# Governance log monitoring
tail -f logs/governance.jsonl | grep -E "(error|failed)"
```

### Alert Configuration
```yaml
# Example alert configuration for monitoring system
alerts:
  - name: "High Error Rate"
    condition: "error_rate > 5%"
    action: "email_admin"
  
  - name: "Database Response Slow"  
    condition: "db_response_time > 1s"
    action: "slack_notification"
    
  - name: "System Health Down"
    condition: "health_check_failed"
    action: "immediate_page"
```

---

## 🚦 Go/No-Go Criteria

### ✅ GO Criteria (All Must Pass)
- [ ] All automated tests pass (9/9 Puppeteer tests)
- [ ] Performance benchmarks met (<2s page load, <500ms transactions)
- [ ] Security validation complete (HTTPS, CORS, rate limiting)
- [ ] Sample data operations successful (CRUD, import/export)
- [ ] Governance logging functional (all operations tracked)
- [ ] Error handling graceful (no application crashes)
- [ ] DriveMemory archival working (artifacts saved correctly)

### ❌ NO-GO Criteria (Any One Fails)
- [ ] Database connectivity issues
- [ ] Transaction rollback failures  
- [ ] Data corruption detected
- [ ] Security vulnerabilities found
- [ ] Performance below acceptable thresholds
- [ ] Critical functionality broken

---

## 📞 Support & Escalation

### UAT Support Team
- **Technical Lead:** UAT Testing Team
- **Database Admin:** Platform Engineering  
- **Security Review:** InfoSec Team
- **Performance Analysis:** DevOps Team

### Issue Escalation Matrix
1. **P1 (Critical):** Security vulnerabilities, data corruption
2. **P2 (High):** Functionality broken, performance issues
3. **P3 (Medium):** UI/UX issues, minor bugs
4. **P4 (Low):** Documentation, cosmetic issues

### Emergency Procedures
```bash
# Emergency rollback
git checkout previous-stable-version
npm run deploy:staging:rollback

# Database backup restore
cp backups/latest-backup.db databases/staging.db
npm restart

# Emergency contact
echo "UAT EMERGENCY: $(date) - $(describe-issue)" | mail -s "URGENT UAT Issue" uat-support@oapp.io
```

---

## ✅ UAT Sign-Off

### Stakeholder Approval Required
- [ ] **Technical Lead:** Functionality and performance approved
- [ ] **Security Team:** Security validation complete
- [ ] **Product Owner:** User experience acceptable  
- [ ] **DevOps Team:** Deployment and monitoring ready
- [ ] **Quality Assurance:** Testing protocols satisfied

### Final UAT Checklist
- [ ] All test scenarios executed successfully
- [ ] Performance benchmarks validated
- [ ] Security requirements met
- [ ] Documentation complete and accurate
- [ ] Support procedures tested
- [ ] Go-live readiness confirmed

**UAT Completion Date:** _____________  
**Go-Live Authorization:** _____________  
**Production Deployment Window:** _____________

---

**UAT Environment Status:** 🟢 **READY FOR TESTING**  
**Production Readiness:** 🟡 **PENDING UAT SIGN-OFF**

**Next Step:** Execute UAT testing protocol and obtain stakeholder sign-off for production deployment.