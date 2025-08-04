# SDLC Import API Endpoints - Implementation Issue

## Purpose
Enable direct ingestion of Projects → Phases → PhaseSteps → Governance Logs → Memory Anchors from chat-generated canonical JSON into oApp. This closes the loop between Chat → SDLC → oApp, allowing Gizmo & AI agents to operate fully.

## Implementation Scope

### New API Endpoints (Phase 1)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/projects/import` | POST | Accept canonical Project JSON |
| `/api/admin/phases/import` | POST | Accept array of Phases for a Project |
| `/api/admin/phase-steps/import` | POST | Accept PhaseSteps with SDLC fields |
| `/api/admin/governance-logs/import` | POST | Accept GovernanceLog JSON entries |
| `/api/admin/memory-anchors/import` | POST | Accept MemoryPlugin anchor JSON entries |

### Behavior Requirements

#### Validation & Logging
- Validate schema for each incoming payload
- Log import event to DriveMemory with timestamp and payload hash

#### SDLC Hygiene
- Auto-create PhaseStep(Debug) if missing for imported items
- Link GovernanceLog → PhaseStep → Project
- Memory anchors only activated if QA = Complete

#### Agent Triggers
Import event triggers:
- SideQuestDetector for unanchored or incomplete steps
- AutoAuditAgent to verify governance & compliance
- MemoryAnchorAgent post-QA

## Risks & Considerations
- **DB Schema Alignment**: Ensure incoming JSON matches current database schema
- **Duplicate Records**: Handle duplicate imports gracefully with upsert logic
- **Memory Anchor Handling**: Only create anchors after QA completion verification
- **Transaction Safety**: Ensure atomic operations for related record creation

## Manual QA Plan
1. Test canonical import of OF-SDLC-IMP1 JSON payload
2. Verify all database relationships are correctly established
3. Confirm agent triggers fire appropriately
4. Validate memory anchor creation only after QA complete
5. Test error handling for malformed payloads

## Success Criteria
- [ ] All 5 import endpoints operational
- [ ] Canonical OF-SDLC-IMP1.json imports successfully
- [ ] Database relationships maintained
- [ ] Agent triggers confirmed
- [ ] Memory anchors restricted to post-QA
- [ ] DriveMemory logging functional