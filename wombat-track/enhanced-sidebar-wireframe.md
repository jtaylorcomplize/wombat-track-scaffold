# Enhanced Project Sidebar - Wireframe

## Overview
The EnhancedProjectSidebar is a 320px wide fixed sidebar that provides navigation and project management functionality.

## Layout Structure

```
┌─────────────────────────────────────┐ ← Fixed position, 320px wide, full height
│ ENHANCED PROJECT SIDEBAR            │
├─────────────────────────────────────┤
│ ┌─ Header Section ─────────────────┐ │
│ │ 🏢 Orbis Platform          ← [☰] │ │ ← Platform title + collapse button
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ┌─ Sub-App Selector ───────────────┐ │
│ │ 🎯 Current Sub-App               │ │ ← SubAppSelector component
│ │ ▼ [Dropdown with branding]      │ │ ← Shows available sub-apps
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ┌─ Project Selector ───────────────┐ │
│ │ 📁 [Sub-App Name] Projects  [+] │ │ ← Scoped to current sub-app
│ │ ┌─────────────────────────────┐   │ │
│ │ │ 📂 Current Project Name     │   │ │ ← Selected project display
│ │ │    Project Type          ▶  │   │ │ ← Click to expand dropdown
│ │ └─────────────────────────────┘   │ │
│ │                                   │ │
│ │ [When expanded: Dropdown List]    │ │
│ │ ┌─────────────────────────────┐   │ │
│ │ │ 📂 Project 1 Name      🟢   │   │ │ ← RAG status indicators
│ │ │ 📂 Project 2 Name      🟡   │   │ │ ← (Green/Amber/Red)
│ │ │ 📂 Project 3 Name      🔴   │   │ │
│ │ └─────────────────────────────┘   │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ┌─ Work Surfaces ──────────────────┐ │
│ │ Work Surfaces                    │ │
│ │ ┌─────────────────────────────┐   │ │
│ │ │ 📋 Plan                     │   │ │ ← Each surface has icon + label
│ │ │    Composer, phase setup... │   │ │ ← + description
│ │ └─────────────────────────────┘   │ │
│ │ ┌─────────────────────────────┐   │ │
│ │ │ ⚡ Execute                  │   │ │ ← Selected surface highlighted
│ │ │    Track phases, trigger... │   │ │ ← in blue
│ │ └─────────────────────────────┘   │ │
│ │ ┌─────────────────────────────┐   │ │
│ │ │ 📝 Document                 │   │ │
│ │ │    Rich-text SOP + AI       │   │ │
│ │ └─────────────────────────────┘   │ │
│ │ ┌─────────────────────────────┐   │ │
│ │ │ 🛡️ Govern                    │   │ │
│ │ │    Logs, reviews, AI audit  │   │ │
│ │ └─────────────────────────────┘   │ │
│ │ ┌─────────────────────────────┐   │ │
│ │ │ 🧬 Integrate                │   │ │
│ │ │    Integration health mon.  │   │ │
│ │ └─────────────────────────────┘   │ │
│ │ ┌─────────────────────────────┐   │ │
│ │ │ 📊 SPQR Runtime            │   │ │
│ │ │    Live SPQR dashboards    │   │ │
│ │ └─────────────────────────────┘   │ │
│ │ ┌─────────────────────────────┐   │ │
│ │ │ 🔧 Admin                   │   │ │
│ │ │    Data Explorer, Import   │   │ │
│ │ └─────────────────────────────┘   │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────┤
│ [Footer/Additional Controls]        │ │ ← Expandable area
└─────────────────────────────────────┘

```

## Collapsed State (64px wide)

```
┌──────┐ ← 64px wide when collapsed
│ [☰]  │ ← Expand button
├──────┤
│ 📋   │ ← Work surface icons only
│ ⚡   │ ← Selected highlighted
│ 📝   │ ← Hover shows tooltip
│ 🛡️   │
│ 🧬   │
│ 📊   │
│ 🔧   │
├──────┤
│      │
└──────┘
```

## Key Features

### Header Section
- **Platform branding**: "Orbis Platform" title
- **Collapse toggle**: ChevronLeft icon button
- **Fixed position**: Always visible at top

### Sub-App Selector
- **Current sub-app display**: Shows active sub-app with branding
- **Dropdown functionality**: Select between available sub-apps
- **Visual branding**: Each sub-app has distinct visual identity

### Project Selector
- **Scoped to sub-app**: Only shows projects for current sub-app
- **Current project display**: Shows selected project name and type
- **Expandable dropdown**: Click to see all available projects
- **RAG status indicators**: Green/Amber/Red status badges
- **Add button**: Plus icon for creating new projects

### Work Surfaces Navigation
- **7 main surfaces**: Plan, Execute, Document, Govern, Integrate, SPQR Runtime, Admin
- **Icon + label + description**: Each surface clearly identified
- **Selection highlighting**: Active surface highlighted in blue
- **Hover states**: Visual feedback on interaction

### Responsive Behavior
- **Collapsible**: Toggles between 320px (expanded) and 64px (collapsed)
- **Fixed positioning**: Stays in place during page scroll
- **Z-index management**: Overlays content when needed

### Interactive Elements
- **Project switching**: Click project selector to change active project
- **Surface navigation**: Click any work surface to switch context
- **Sub-app switching**: Dropdown to change organizational scope
- **Collapse/expand**: Toggle sidebar width for more workspace

## Technical Implementation
- **Width**: 320px expanded, 64px collapsed
- **Height**: 100vh (full screen height)
- **Position**: Fixed left positioning
- **Z-index**: 9999 (high priority overlay)
- **Styling**: White background, gray borders, shadow
- **Icons**: Lucide React icons + emoji for work surfaces
- **State management**: Handles project selection, surface switching, collapse state