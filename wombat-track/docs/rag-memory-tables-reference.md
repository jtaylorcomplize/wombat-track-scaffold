# RAG Memory Tables Reference - WT Integration Phase 6.0

## Overview
This document provides a reference for the 5 RAG Memory Tables implemented in Notion for WT Integration Phase 6.0.

## Parent Page
- **URL**: https://www.notion.so/roammigrationlaw/Replicated-oApp-Databases-23de1901e36e8082a619c72ebfc05f84
- **Page ID**: 23de1901e36e8082a619c72ebfc05f84

## Implemented Tables

### 1. wt-governance-memory
- **Purpose**: Tracks governance decisions and RAG status for WT Integration
- **Database ID**: 23de1901-e36e-810b-8e56-c59721bcb3e1
- **URL**: https://www.notion.so/23de1901e36e810b8e56c59721bcb3e1
- **Schema**:
  - `eventId` (Title): Unique event identifier
  - `eventType` (Select): Decision, PhaseUpdate, StatusChange, RiskAssessment, Approval
  - `projectId` (Relation → wt-project-tracker): Link to project
  - `phaseId` (Relation → wt-project-tracker): Link to phase
  - `agent` (Select): Claude, Gizmo, Human
  - `decision` (Text): Decision details
  - `confidence` (Select): High, Medium, Low
  - `timestamp` (Date): When the event occurred
  - `RAG` (Select): Red, Amber, Green

### 2. wt-project-tracker
- **Purpose**: Central project tracking for WT Integration
- **Database ID**: 23de1901-e36e-812e-986e-c3dac934e20e
- **URL**: https://www.notion.so/23de1901e36e812e986ec3dac934e20e
- **Schema**:
  - `projectId` (Title): Unique project identifier
  - `projectName` (Text): Project name
  - `currentPhase` (Text): Current phase description
  - `status` (Select): Planning, Active, On Hold, Completed, Cancelled
  - `owner` (Person): Project owner
  - `lastUpdated` (Date): Last update timestamp

### 3. drive-memory-anchors
- **Purpose**: Persistent memory anchors for cross-platform knowledge retention
- **Database ID**: 23de1901-e36e-81c2-90c7-d84e62ec12e3
- **URL**: https://www.notion.so/23de1901e36e81c290c7d84e62ec12e3
- **Schema**:
  - `anchorId` (Title): Unique anchor identifier
  - `memoryType` (Select): Technical, Business, Decision, Risk, Process
  - `content` (Text): Memory content
  - `sourceProject` (Relation → wt-project-tracker): Source project
  - `createdBy` (Select): Claude, Gizmo, Human
  - `timestamp` (Date): Creation timestamp

### 4. claude-gizmo-exchange
- **Purpose**: Inter-agent communication log between Claude and Gizmo
- **Database ID**: 23de1901-e36e-81fb-a99f-fd20e3ac3c63
- **URL**: https://www.notion.so/23de1901e36e81fba99ffd20e3ac3c63
- **Schema**:
  - `exchangeId` (Title): Unique exchange identifier
  - `fromAgent` (Select): Claude, Gizmo
  - `toAgent` (Select): Claude, Gizmo
  - `messageType` (Select): Query, Response, Update, Alert, Sync
  - `content` (Text): Message content
  - `projectContext` (Relation → wt-project-tracker): Related project
  - `timestamp` (Date): Exchange timestamp

### 5. memory-backlog
- **Purpose**: Queue for unprocessed memory items requiring classification
- **Database ID**: 23de1901-e36e-81b2-93f1-f5499f39fd2e
- **URL**: https://www.notion.so/23de1901e36e81b293f1f5499f39fd2e
- **Schema**:
  - `memoryId` (Title): Unique memory identifier
  - `memoryContent` (Text): Memory content to be processed
  - `priority` (Select): High, Medium, Low
  - `targetTable` (Select): wt-governance-memory, drive-memory-anchors, claude-gizmo-exchange, Other
  - `status` (Select): Pending, Processing, Archived
  - `createdDate` (Date): Creation date

## Table Relationships

```
wt-project-tracker (Primary)
    ├── wt-governance-memory (via projectId, phaseId)
    ├── drive-memory-anchors (via sourceProject)
    └── claude-gizmo-exchange (via projectContext)

memory-backlog (Standalone - feeds into other tables)
```

## Implementation Scripts

1. **Create/Update Tables**: `/scripts/implement-rag-memory-tables.ts`
2. **Verify Tables**: `/scripts/verify-rag-memory-tables.ts`

## Usage Notes

1. **Relations**: All relation fields link back to `wt-project-tracker` as the primary reference table
2. **RAG Status**: Red/Amber/Green indicators are used in `wt-governance-memory` for governance tracking
3. **Agent Types**: Claude, Gizmo, and Human are the three recognized agents across tables
4. **Memory Processing**: Items start in `memory-backlog` and are classified into appropriate tables

## Test Data

Each table has been populated with at least one test row to demonstrate functionality:
- Total test rows created: 6
- All relations have been properly configured
- Test data includes realistic examples for each table type