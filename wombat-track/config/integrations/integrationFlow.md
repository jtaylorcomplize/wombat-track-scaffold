# oApp Gizmo Integration Flow

## Overview
This document describes the autonomous SDLC integration flow for Gizmo within the oApp environment, enabling automated governance closure, memory anchoring, and evidence capture.

## Integration Flow Diagram

```mermaid
flowchart LR
    A[oApp Event] --> B{Trigger Type?}
    B -->|PhaseStepComplete| C[Gizmo Validates Step]
    B -->|Branch Merge| D[AutoAudit + Governance JSON]
    B -->|UAT Closure| E[Puppeteer Logs + Evidence]

    C --> F[MemoryPlugin Anchor]
    D --> F
    E --> F

    F --> G[Governance JSON Logged]
    G --> H[DriveMemory Batch Import (Post-RAG)]
```

## Event Triggers

### 1. PhaseStepComplete
- **Trigger**: Completion of any phase step in the SDLC process
- **Actions**:
  - Validate step state and completion criteria
  - Generate structured GovernanceLog JSON entry
  - Push Memory Anchor to MemoryPlugin for immediate access
  - Store interim log for DriveMemory batch processing

### 2. BranchMergeToMain
- **Trigger**: Successful merge of feature branch to main branch
- **Actions**:
  - Trigger AutoAudit Agent for code quality checks
  - Generate comprehensive closure Governance JSON
  - Push Memory Anchor with merge details
  - Optionally trigger Puppeteer evidence capture for visual validation

### 3. UATClosure
- **Trigger**: Completion of User Acceptance Testing phase
- **Actions**:
  - Capture Puppeteer screenshots and console logs
  - Finalize comprehensive Governance JSON with test results
  - Archive all artifacts to DriveMemory when RAG becomes available

## Memory Anchor Format
All memory anchors follow the pattern: `wt-[project|phase]-[event]-[YYYYMMDD]`

Examples:
- `wt-project-phasecomplete-20250804`
- `wt-phase-branchmerge-20250804`
- `wt-uat-closure-20250804`

## Security Considerations
- All authentication tokens stored in server environment variables
- No sensitive credentials embedded in client-side code
- Secure API communication for all external integrations

## Archive Strategy
- Immediate MemoryPlugin anchoring for quick access
- Batch import to DriveMemory planned for post-local RAG integration
- Structured governance logs maintained in `DriveMemory/WT-IMP1/ClosureArtifacts`