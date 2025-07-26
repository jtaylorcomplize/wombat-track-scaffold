# Wombat Track - Notion Integration Guide

## 🚀 Overview

This guide documents the complete Notion integration for Wombat Track, including database schemas, sync models, and governance templates.

## 📊 Database Schemas

### 1. **WT Projects** Database
Stores project-level metadata and configuration.

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | Title | Unique project identifier |
| `title` | Text | Project name |
| `description` | Text | Project description |
| `owner` | Text | Project owner |
| `aiPromptLog` | Rich text | AI interaction history |
| `status` | Select | Planning, Active, On Hold, Completed, Archived |
| `tags` | Multi-select | Project categorization |
| `createdAt` | Created time | Auto-generated |
| `updatedAt` | Last edited | Auto-generated |

### 2. **WT Phases** Database
Tracks project phases with RAG status indicators.

| Field | Type | Description |
|-------|------|-------------|
| `phaseId` | Title | Unique phase identifier |
| `projectId` | Relation → Project | Link to parent project |
| `title` | Text | Phase name |
| `description` | Text | Phase description |
| `status` | Select | Not Started, In Progress, Completed, Blocked, Review |
| `startDate` | Date | Phase start date |
| `endDate` | Date | Phase end date |
| `completionPercent` | Number (%) | Progress percentage |
| `ragStatus` | Select | Red, Amber, Green |
| `ownerId` | Text | Phase owner |
| `tags` | Multi-select | Phase categorization |

### 3. **WT Phase Steps** Database
Detailed step-by-step instructions for each phase.

| Field | Type | Description |
|-------|------|-------------|
| `phaseStepId` | Title | Unique step identifier |
| `projectId` | Relation → Project | Link to project |
| `stepNumber` | Number | Step sequence |
| `stepInstruction` | Rich text | Detailed instructions |
| `isSideQuest` | Checkbox | Optional step indicator |
| `aiSuggestedTemplates` | Rich text | AI-generated templates |

### 4. **WT Governance Log (Enhanced)** Database
Enhanced governance log with RAG status and semantic memory support.

| Field | Type | Description |
|-------|------|-------------|
| `Event ID` | Title | Unique event identifier |
| `Event Type` | Select | Decision, StepStatusUpdated, etc. |
| `RAG Status` | Select | Red, Amber, Green |
| `Summary` | Rich text | Event summary |
| `Linked PhaseStep` | Relation → PhaseStep | Related step |
| `AI Draft Entry` | Rich text | AI-generated content |
| `MemoryPlugin Tags` | Multi-select | Semantic tags |
| `Confidence` | Select | High, Medium, Low |
| `Timestamp` | Date | Event timestamp |
| `Author` | Text | Event author |
| `Source System` | Select | WT, Claude, Gizmo, GitHub, Manual |
| `Last Synced` | Date | Sync timestamp |

## 🔄 DriveMemory ↔ Notion Sync Model

### Sync Architecture
```typescript
interface DriveMemoryRecord {
  id: string;
  type: 'governance' | 'project' | 'phase' | 'step';
  content: any;
  metadata: {
    lastSynced: string;
    sourceSystem: 'Notion' | 'DriveMemory' | 'WombatTrack' | 'API';
    recordOrigin: string;
    syncDirection: 'notion-to-drive' | 'drive-to-notion' | 'bidirectional';
  };
  tags?: string[];
}
```

### Sync Features
- **Bidirectional sync** with conflict detection
- **Metadata tracking** for audit trail
- **Export to JSON** for backup/migration
- **Type-safe property mapping**
- **Batch operations** with error handling

## 🧪 Setup Instructions

### 1. Initial Setup
```bash
# Install dependencies
npm install

# Set up environment variables
echo "NOTION_TOKEN=your-token-here" >> .env

# Create databases
npx tsx scripts/setup-wt-databases.ts
```

### 2. Test Connection
```bash
# Test basic connection
npx tsx scripts/notion-examples.js test-connection

# Test governance sync
npx tsx scripts/test-governance-final.ts
```

### 3. Test Sync Model
```bash
# Test DriveMemory sync
npx tsx scripts/test-drivememory-sync.ts
```

## 🎯 RAG Governance Template

The Enhanced Governance Log includes RAG (Red, Amber, Green) status tracking:

- **Red**: Critical issues, blockers, or failures
- **Amber**: Warnings, partial completion, or needs attention
- **Green**: Success, completed, or functioning normally

### Template Fields
1. **RAG Status** - Visual indicator of health
2. **Summary** - Concise description
3. **Linked PhaseStep** - Traceability to steps
4. **AI Draft Entry** - AI-generated content
5. **MemoryPlugin Tags** - Semantic categorization
6. **Confidence** - Reliability indicator

## 📋 Usage Examples

### Creating a Governance Entry
```typescript
const entry = {
  'Event ID': { title: [{ text: { content: 'GOV-001' } }] },
  'Event Type': { select: { name: 'Decision' } },
  'RAG Status': { select: { name: 'Green' } },
  'Summary': { rich_text: [{ text: { content: 'Integration successful' } }] },
  'Confidence': { select: { name: 'High' } },
  'Source System': { select: { name: 'Claude' } }
};
```

### Syncing from DriveMemory
```typescript
const sync = new DriveMemorySync(config);
const results = await sync.importToNotion(driveMemoryRecords, databaseId);
```

### Exporting to JSON
```typescript
const exportData = await exportNotionToJSON(config);
fs.writeFileSync('backup.json', JSON.stringify(exportData));
```

## 🔐 Security Considerations

1. **Token Management**: Store NOTION_TOKEN securely
2. **Database Permissions**: Ensure integration has appropriate access
3. **Data Privacy**: Be mindful of sensitive information in logs
4. **Sync Conflicts**: Review conflicts before overwriting

## 🚀 Next Steps

1. **Automation**: Set up GitHub Actions for automated syncing
2. **Webhooks**: Implement real-time sync triggers
3. **Analytics**: Build dashboards from governance data
4. **AI Integration**: Connect to Claude/Gizmo for intelligent processing

## 📚 Resources

- [Notion API Documentation](https://developers.notion.com)
- [Wombat Track Repository](https://github.com/your-repo/wombat-track)
- Database IDs: Check `.env.wt-databases` after setup