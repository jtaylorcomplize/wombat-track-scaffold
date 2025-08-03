# Corrected Enhanced Project Sidebar - Information Architecture Fix

## Overview
The Enhanced Project Sidebar should follow proper information architecture with nested project surfaces and separate system-level access.

## Corrected Layout Structure

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
│ ┌─ Live Sub-Apps Access ───────────┐ │ ← 🆕 MISSING: Access to live operating sub-apps
│ │ 🚀 Operating Sub-Apps            │ │
│ │ ┌─────────────────────────────┐   │ │
│ │ │ 🟢 Orbis Intelligence      │   │ │ ← Live status indicators
│ │ │ 🟡 Complize Platform       │   │ │ ← Click to access live systems
│ │ │ 🔴 Meta Analytics          │   │ │ ← Health/status colors
│ │ │ 🟢 SPQR Runtime           │   │ │
│ │ └─────────────────────────────┘   │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ┌─ PROJECT WORK SURFACES ──────────┐ │ ← 🔧 FIXED: Nested by project
│ │ 📁 [Current Project Name]        │ │
│ │ ┌─ Project Surfaces ─────────┐     │ │
│ │ │ 📋 Plan                    │     │ │ ← 🆕 GROUPED TOGETHER
│ │ │    Composer, AI scaffold   │     │ │ ← All nested under current project
│ │ │ ⚡ Execute                 │     │ │
│ │ │    Track phases, trigger   │     │ │
│ │ │ 📝 Document                │     │ │
│ │ │    Rich-text SOP + AI      │     │ │
│ │ │ 🛡️ Govern                   │     │ │
│ │ │    Logs, reviews, audit    │     │ │
│ │ └───────────────────────────┘     │ │
│ │                                   │ │
│ │ [Switch Project Button]           │ │ ← Quick project switching
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ┌─ SYSTEM SURFACES ─────────────────┐ │ ← 🔧 FIXED: Separate header for system tools
│ │ System & Admin Tools              │ │
│ │ ┌─────────────────────────────┐   │ │
│ │ │ 🧬 Integrate                │   │ │ ← 🆕 MOVED: Now in separate section
│ │ │    Integration health mon.  │   │ │
│ │ │ 📊 SPQR Runtime            │   │ │
│ │ │    Live dashboards         │   │ │
│ │ │ 🔧 Admin                   │   │ │
│ │ │    Data Explorer, Import   │   │ │
│ │ └─────────────────────────────┘   │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────┤
│ [Footer/Settings]                   │ │
└─────────────────────────────────────┘

```

## Key Information Architecture Fixes

### 1. 🚀 **Live Sub-Apps Access** (Previously Missing)
```
🚀 Operating Sub-Apps
┌─────────────────────────────┐
│ 🟢 Orbis Intelligence      │ ← Live system access
│ 🟡 Complize Platform       │ ← Real-time status
│ 🔴 Meta Analytics          │ ← Health indicators
│ 🟢 SPQR Runtime           │ ← Direct links to live systems
└─────────────────────────────┘
```

**Purpose**: 
- Access **operating sub-apps live** (not just project contexts)
- Real-time status indicators (Green/Amber/Red)
- Direct navigation to running systems
- System health monitoring

### 2. 📁 **Project-Nested Work Surfaces** (Core Fix)
```
📁 [Current Project Name]
┌─ Project Surfaces ─────────┐
│ 📋 Plan                    │ ← 🔧 GROUPED TOGETHER
│ ⚡ Execute                 │ ← All scoped to current project
│ 📝 Document                │ ← Navigate within project context
│ 🛡️ Govern                   │ ← Project-specific governance
└───────────────────────────┘
```

**Purpose**:
- **Plan → Execute → Document → Govern** are **project-scoped**
- All surfaces operate within the **current project context**
- Maintains project context across surface navigation
- Clear project ownership of work activities

### 3. 🔧 **Separate System Header** (Architectural Fix)
```
┌─ SYSTEM SURFACES ─────────────────┐
│ System & Admin Tools              │
│ ┌─────────────────────────────┐   │
│ │ 🧬 Integrate                │   │ ← Cross-system integration
│ │ 📊 SPQR Runtime            │   │ ← System-wide dashboards
│ │ 🔧 Admin                   │   │ ← Platform administration
│ └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Purpose**:
- **Integrate** and **Admin** are **system-level** tools
- Not tied to specific projects
- Cross-cutting concerns and platform management
- Separate information hierarchy

## Information Architecture Benefits

### **Project-Centric Design**
- **Plan, Execute, Document, Govern** stay within project scope
- Context preservation across surface navigation
- Project-specific governance and documentation
- Clear ownership and responsibility

### **System-Level Access**
- **Live sub-app access** for operational monitoring
- **System surfaces** for cross-cutting concerns
- **Administrative tools** separated from project work
- **Integration monitoring** across all projects

### **Clear Hierarchy**
```
Platform Level: Orbis Platform
├─ Live Systems: Operating Sub-Apps (🟢🟡🔴)
├─ Project Level: Plan → Execute → Document → Govern
└─ System Level: Integrate, SPQR Runtime, Admin
```

### **User Experience Benefits**
1. **Context Preservation**: Stay in project mode while working
2. **System Visibility**: Quick access to live operational status
3. **Clear Separation**: Project work vs. system administration
4. **Operational Awareness**: Live sub-app status at a glance

## Implementation Requirements

### 1. **Live Sub-App Component**
- Real-time status fetching
- Direct links to operating systems
- Health status indicators
- Quick system switching

### 2. **Project Context Wrapper**
- All project surfaces maintain project scope
- Project switching preserves surface context
- Project-specific data filtering

### 3. **System Surface Isolation**
- Integrate/Admin operate at platform level
- Cross-project data access
- System-wide monitoring and control

This corrected structure addresses the **missing live sub-app access** and **proper surface grouping** that the current implementation lacks!