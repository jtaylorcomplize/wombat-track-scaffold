# oApp Import Instructions for OF-8.7

## Import Process

### Step 1: Access oApp Admin
1. Navigate to **oApp Admin Dashboard**
2. Go to **Admin → Import Governance Package**

### Step 2: Import Governance Package
1. **File to Import:** `DriveMemory/OF-8.7/governance-package.jsonl`
2. **Package Contents:** 6 governance entries
   - 1 Phase registration entry
   - 5 Step initialization entries

### Step 3: Verification Checklist

After importing, verify the following elements appear correctly:

#### ✅ Project Overview
- [ ] Phase **OF-8.7** appears under project **OF-SDLC-IMP2**
- [ ] Phase status shows **"Planned"**
- [ ] Phase dates: **2025-08-06** to **2025-08-30**
- [ ] **5 planned steps** visible under the phase

#### ✅ Admin → Data Explorer  
- [ ] All **6 governance entries** visible in log
- [ ] Memory anchors linked correctly:
  - `of-8.7-init-20250805` (Phase)
  - `of-8.7.1-auto-scaling` (Step 1)
  - `of-8.7.2-security-hardening` (Step 2) 
  - `of-8.7.3-monitoring-observability` (Step 3)
  - `of-8.7.4-cost-optimization` (Step 4)
  - `of-8.7.5-governance-validation` (Step 5)

#### ✅ DriveMemory Integration
- [ ] **DriveMemory/OF-8.7/** directory accessible
- [ ] All **15 files** visible and accessible
- [ ] Memory anchors linked to respective JSON files

#### ✅ Sub-App Integration
- [ ] Phase linked to **prog-orbis-001 (Orbis Forge)**
- [ ] Runtime monitoring dashboards available
- [ ] Phase progress visible in sub-app interface

## Expected Results

### Phase Display
```
Project: OF-SDLC-IMP2
├─ Phase: OF-8.7 - Runtime Optimization & Cloud Scaling
   ├─ Status: Planned
   ├─ Duration: 24 days (Aug 6-30, 2025)
   ├─ Steps: 5 planned
   └─ Sub-App: prog-orbis-001 (Orbis Forge)
```

### Step Structure
```
OF-8.7.1 - Auto-Scaling & Load Testing (5 days) [Planned]
OF-8.7.2 - Security & Compliance Hardening (5 days) [Planned]  
OF-8.7.3 - Monitoring & Observability (5 days) [Planned]
OF-8.7.4 - Cost Optimization & Alerts (4 days) [Planned]
OF-8.7.5 - Governance & Final Validation (5 days) [Planned]
```

## Troubleshooting

### If Phase Doesn't Appear
1. Check import log for errors
2. Verify JSON formatting in governance package
3. Ensure project **OF-SDLC-IMP2** exists
4. Retry import process

### If Steps Missing
1. Verify all 6 entries imported successfully
2. Check step dependencies are correctly set
3. Refresh project overview page
4. Check admin permissions

### If Memory Anchors Not Linked
1. Verify DriveMemory path is accessible
2. Check file permissions on OF-8.7 directory
3. Validate anchor IDs match exactly
4. Re-sync DriveMemory integration

## Post-Import Actions

### 1. Validation
- Run system validation checks
- Confirm all governance entries logged
- Test sub-app integration
- Verify memory anchor accessibility

### 2. Team Notification
- Notify project stakeholders of phase initialization
- Schedule kickoff meeting for OF-8.7 execution
- Assign step owners and resources
- Establish communication channels

### 3. Begin Execution
- Phase is ready for step execution once imported
- Start with **OF-8.7.1 (Auto-Scaling & Load Testing)**
- Monitor progress through dashboards
- Update step status as work progresses

---

## Import Command Summary
```bash
# File to import in oApp Admin
/DriveMemory/OF-8.7/governance-package.jsonl

# Expected entries: 6
# Expected result: Phase OF-8.7 with 5 planned steps
# Integration: prog-orbis-001 (Orbis Forge)
```

✅ **Ready for Import** - All prerequisites met and documentation complete.