# ✅ SPQR Phase 5 – UAT & CI/CD Checklist

This checklist guides full QA and SDLC-compliant CI/CD validation before Go-Live.

## 1️⃣ Pre-UAT Verification

### ✓ Confirm Branch & PR
- [ ] Branch: `feature/spqr-phase5-runtime-surface`
- [ ] PR #30 open and ready for review
- [ ] GovernanceLog entry: `Phase5–LiveRuntimeSurfaceComplete` (line 35)

### ✓ CI/CD Checks Passed
- [ ] ✅ ESLint - No errors
- [ ] ✅ TypeScript checks - Clean compilation
- [ ] ✅ Vite Build - Successful
- [ ] ✅ Dev Server - Starts without errors

### ✓ Secrets Configured (if applicable)
- [ ] Looker report access configured
- [ ] Slack webhook URL set (if using alerts)
- [ ] Email server configured (if using email alerts)
- [ ] Custom webhook endpoints set (if using webhooks)

---

## 2️⃣ Functional UAT

| Area | Test Steps | Expected Result | Status |
|------|------------|-----------------|---------|
| **Dashboard Visibility** | Load `/spqr/runtime` | All 21 validated cards visible | [ ] |
| **Role-Based Filtering** | Switch roles (Partner → Admin) | Dashboard filters change; unauthorized data hidden | [ ] |
| **RAG Health Indicators** | Check each dashboard card | Health status matches GovernanceLogger metrics | [ ] |
| **Usage Analytics** | Interact with dashboards | Metrics recorded in GovernanceLog; DriveMemory receives summary | [ ] |
| **Alert Management** | Trigger alert test | Slack/Email/Webhook fires correctly | [ ] |
| **Error Handling** | Simulate failed dashboard load | Error boundary shows graceful fallback | [ ] |
| **Navigation & Layout** | Switch tabs and return | No layout breaks or missing components | [ ] |

---

## 3️⃣ Governance & Observability Checks

### ✓ GovernanceLog Entries
- [ ] Interaction logs with timestamps, user role, and dashboard context recorded
- [ ] Check `logs/governance.jsonl` for UAT session entries

### ✓ DriveMemory Reporting
- [ ] Daily/weekly usage summaries appear in `DriveMemory/SPQR/reports/`
- [ ] RAG scoring reports generated
- [ ] UAT session data captured

### ✓ Alert Logs
- [ ] Slack/Email/Webhook test alerts logged to GovernanceLog
- [ ] Alert history visible in UI

### ✓ MemoryPlugin Anchors
- [ ] Anchor `SPQR-Phase5-UAT` created for final QA traceability

---

## 4️⃣ CI/CD Sign-Off

- [ ] All tests passed in UAT environment
- [ ] No critical defects outstanding
- [ ] Performance benchmarks met
- [ ] Security validation complete
- [ ] Merge PR to main only after UAT pass
- [ ] Tag release `v5.0-SPQR-Runtime`
- [ ] Confirm GitHub Actions pipeline runs successfully post-merge
- [ ] GovernanceLog updated: `Phase5–LiveRuntimeSurfaceComplete`

---

## 5️⃣ Go-Live Handover

- [ ] Prepare UAT Sign-Off Report → `DriveMemory/SPQR/UAT/`
- [ ] Mark SPQR Sub-App production-ready
- [ ] Schedule production deployment
- [ ] Notify stakeholders of Go-Live readiness
- [ ] Transition to Phase 6 – Security & API Hardening (optional)

---

## Quick Test Commands

```bash
# Start dev server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build

# Check TypeScript
npx tsc --noEmit

# View governance log
tail -f logs/governance.jsonl | jq '.'
```

## Test User Credentials
| Role | Username | Access Level |
|------|----------|--------------|
| Partner | partner-001 | Full Access |
| Senior Manager | senior-mgr-002 | Most Dashboards |
| Associate | associate-003 | Limited Access |
| Paralegal | paralegal-001 | Operational Only |
| Admin | admin-001 | System Admin |

---

**Checklist Version**: 1.0  
**Last Updated**: 2025-07-29  
**Phase**: 5 – Live Runtime Surface & UAT