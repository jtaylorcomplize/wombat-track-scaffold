# Wombat Track Sidebar Integration Guide

## Overview

This guide explains how to integrate the new Notion-style sidebar navigation into your Wombat Track application.

## What's New

### 1. **ProjectSidebar Component** (`src/components/project/ProjectSidebar.tsx`)
- Replaces dropdown-based project switcher with nested sidebar navigation
- Organizes projects by lifecycle: Current, Completed, Future
- Shows hierarchical structure: Project → Phase → Step
- Includes visual indicators for status, RAG status, and project health
- Search and filter capabilities
- Collapsible/expandable tree structure

### 2. **Harmonised Project Data** (`src/data/harmonisedProjects.ts`)
- Complete WT project structure from WT-1.x to WT-3.x
- Aligned with Phase 3.x governance model
- Includes metadata: phaseType, phaseOwner, ragStatus
- Flags unknown/legacy projects with `wtPhaseUnknown` tag

### 3. **WombatConsoleWithSidebar** (`src/pages/WombatConsoleWithSidebar.tsx`)
- Updated console layout with integrated sidebar
- Toggle-able sidebar visibility
- Maintains all existing functionality

## Integration Steps

### Option 1: Use the New Layout Directly

Replace your existing WombatConsole import:

```typescript
// Before
import { WombatConsole } from './pages/WombatConsole';

// After
import { WombatConsoleWithSidebar } from './pages/WombatConsoleWithSidebar';
```

### Option 2: Integrate Sidebar into Existing Layout

1. Import the sidebar component:
```typescript
import ProjectSidebar from './components/project/ProjectSidebar';
import { harmonisedProjects } from './data/harmonisedProjects';
```

2. Add sidebar to your layout:
```tsx
<div style={{ display: 'flex', height: '100vh' }}>
  <ProjectSidebar
    projects={harmonisedProjects}
    selectedProjectId={activeProjectId}
    onProjectSelect={setActiveProjectId}
    className="w-80" // optional width class
  />
  <div style={{ flex: 1 }}>
    {/* Your existing content */}
  </div>
</div>
```

## Features

### Visual Indicators
- ✅ Complete phases/projects
- 🟡 In Progress (with pulse animation)
- 🔵 Planned/Future work
- 🔴 Blocked/Failed
- ⚠️ Needs Review (for unknown/legacy projects)
- ⬆️ Pushed to GitHub
- ⚔️ Side Quests

### RAG Status Badges
- Red, Amber, Green, Blue indicators for governance status
- Filter to show only projects with RAG status

### Search & Filter
- Search across projects, phases, and steps
- Filter by lifecycle (Current/Completed/Future)
- Toggle RAG-only view

### Project Lifecycle Organization
- **Current Projects**: Active and Paused projects
- **Completed Projects**: Successfully finished work
- **Future Projects**: Planned initiatives

## Data Migration

To use your existing project data with the sidebar:

1. Ensure your projects follow the structure in `src/types/phase.ts`
2. Add governance metadata (phaseType, phaseOwner, ragStatus) where applicable
3. Flag unknown projects with `wtTag: 'wtPhaseUnknown'`

## Customization

The sidebar component accepts these props:
- `projects`: Array of Project objects
- `selectedProjectId`: Currently selected project ID
- `onProjectSelect`: Callback when project is selected
- `className`: Optional CSS class for styling

## Next Steps

1. Review flagged projects (marked with ⚠️) and update their metadata
2. Add remaining WT phases to reach the full 32 project scope
3. Implement "New Project" functionality for the + button
4. Connect to real-time execution status updates

## Testing

The sidebar is designed to handle:
- Large numbers of projects (32+)
- Deep nesting (Project → Phase → Step → Sub-step)
- Real-time status updates
- Search across all levels
- Performance with many expanded nodes