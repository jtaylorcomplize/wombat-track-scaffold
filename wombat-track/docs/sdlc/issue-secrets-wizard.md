# Secrets Integration Wizard - oApp Implementation

## Issue Overview
Implement automated secrets setup wizard for Gizmo OAuth2 + AI Agents integration in oApp, eliminating manual .env population and enabling zero-touch integrations.

## Purpose
- Fully automate secrets setup for Gizmo and AI Agents in oApp
- Replace manual .env editing with secure UI wizard
- Auto-activate agent monitoring and memory anchoring
- Provide seamless integration experience for new deployments

## Current State Analysis
### Existing Infrastructure
- ✅ oApp Secrets Manager exists
- ✅ `gizmo-auth.ts` handles token refresh
- ✅ `AgentMonitoringService` can detect secret validity
- ✅ Environment variables support exists

### Current Gaps
- ❌ Manual .env editing required for first-time setup
- ❌ No UI for secrets management
- ❌ No automatic environment propagation
- ❌ Missing governance logging for secret changes
- ❌ No memory anchoring for integration events

## Required Environment Variables
```env
GIZMO_CLIENT_ID=<client-id>
GIZMO_CLIENT_SECRET=<client-secret>
GIZMO_TOKEN_ENDPOINT=<token-endpoint>
GIZMO_MEMORY_ENDPOINT=<memory-endpoint>
GIZMO_AGENT_ENDPOINT=<agent-endpoint>
```

## Implementation Scope

### A. Admin UI Wizard Components
**Path:** `src/components/admin/SecretsWizard/`
- `SecretsWizardModal.tsx` - Main wizard container
- `CredentialsStep.tsx` - Client ID & Secret input
- `EnvironmentStep.tsx` - Dev/Staging/Prod selection
- `ValidationStep.tsx` - Connection testing
- `ActivationStep.tsx` - Agent activation confirmation

### B. Backend API Endpoints
**Path:** `src/server/api/secrets/`
- `POST /api/secrets/validate` - Test OAuth2 credentials
- `POST /api/secrets/store` - Save to Secrets Manager
- `POST /api/secrets/propagate` - Update runtime + CI/CD
- `POST /api/secrets/activate-agents` - Restart/refresh agents

### C. Services Integration
- Secrets Manager integration
- Environment propagation service
- Agent activation service
- Governance logging service
- Memory anchoring service

## Risks & Mitigation
### High Risk
- **Existing secret overwrite** → Backup existing secrets before update
- **Service downtime during propagation** → Graceful restart mechanism
- **Secret exposure in logs** → Sanitize all logging output

### Medium Risk
- **Duplicate environment entries** → Validation before write
- **CI/CD propagation failure** → Rollback mechanism
- **Agent activation failure** → Manual fallback option

### Low Risk
- **UI/UX confusion** → Clear step-by-step wizard
- **Performance impact** → Async operations with loading states

## QA Test Plan

### Scenario 1: Fresh Setup (New Installation)
1. Launch Admin → Integrations → "Connect Gizmo"
2. Enter Client ID & Secret
3. Select Environment (Dev)
4. Validate connection → Verify ✅ token response
5. Store secrets → Confirm propagation to .env
6. Activate agents → Verify AgentMonitoringService shows 🟢
7. Verify GovernanceLog entry created
8. Verify Memory Anchor created with format: `gizmo-secrets-setup-dev-{timestamp}`

### Scenario 2: Credential Update (Existing Setup)
1. Access wizard with existing credentials
2. Update Client Secret
3. Validate new credentials
4. Propagate changes → Verify no service downtime
5. Verify agent token refresh
6. Verify GovernanceLog captures rotation event
7. Verify new Memory Anchor created

### Scenario 3: Error Handling
1. Invalid credentials → Display clear error message
2. Network failure → Retry mechanism with backoff
3. Propagation failure → Rollback to previous state
4. Agent activation failure → Manual override option

## Success Criteria
- ✅ Zero manual .env editing required
- ✅ Complete wizard flow in <5 minutes
- ✅ All agents activate automatically
- ✅ Governance logging for all secret operations
- ✅ Memory anchoring for integration events
- ✅ No service downtime during updates
- ✅ Clear error handling and recovery

## SDLC Compliance
- **Branch Protection:** Feature branch only, no direct main commits
- **CI/CD Testing:** Unit + integration tests for all endpoints
- **Manual QA:** Required on dev/staging before prod merge
- **Governance:** Mandatory logging and memory anchoring
- **Security:** Secret sanitization in all logs and outputs

## Timeline
- **Phase 1:** Backend API endpoints (2 days)
- **Phase 2:** UI wizard components (2 days)
- **Phase 3:** Integration & testing (1 day)
- **Phase 4:** QA & documentation (1 day)

## Merge Criteria
- All unit tests passing
- Integration tests covering full wizard flow
- Manual QA completed on staging
- GovernanceLog integration verified
- Memory anchoring functionality confirmed
- Security review passed (no secret exposure)