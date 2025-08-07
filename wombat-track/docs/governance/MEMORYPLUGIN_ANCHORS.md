# MemoryPlugin Anchors Specification - Wombat Track

## Purpose
This document defines the MemoryPlugin anchor system for semantic classification, cross-system integration, and AI agent context awareness across the Wombat Track ecosystem.

## Anchor Architecture

### Core Anchor Structure
```json
{
  "anchor_id": "Unique identifier (e.g., WT-ANCHOR-GOVERNANCE)",
  "timestamp": "ISO 8601 creation timestamp",
  "classification": "Semantic category for AI processing",
  "location": "Physical or logical location reference",
  "purpose": "Human-readable purpose statement",
  "description": "Detailed description of anchor scope",
  "agent_integrations": ["Array of AI agents that use this anchor"],
  "memory_relevance": {
    "primary_topic": 1.0,
    "related_topics": [0.8, 0.6, 0.4]
  },
  "linked_anchors": ["Array of related anchor IDs"],
  "phase_association": "WT phase where anchor was created"
}
```

### Anchor Categories

#### System Architecture Anchors
- **WT-ANCHOR-GOVERNANCE**: Policy framework and compliance automation
- **WT-ANCHOR-DEPLOYMENT**: Environment lifecycle and deployment management
- **WT-ANCHOR-QUALITY**: Code standards and continuous improvement
- **WT-ANCHOR-IMPLEMENTATION**: Technical implementation patterns

#### Content Classification Anchors
- **WT-ANCHOR-RELEASES**: Phase completion and milestone tracking
- **WT-ANCHOR-TROUBLESHOOTING**: Debug patterns and issue resolution
- **WT-ANCHOR-DATABASE**: Schema evolution and data management
- **WT-ANCHOR-DESIGN**: UI/UX patterns and design system

## Usage Patterns

### AI Agent Integration
```typescript
interface AgentAnchorQuery {
  anchor_id: string;
  context_depth: number; // 1-10 scale
  relevance_threshold: number; // 0.0-1.0
  linked_traversal: boolean;
}

// Example: Claude Code querying governance context
const governanceContext = await memoryPlugin.query({
  anchor_id: 'WT-ANCHOR-GOVERNANCE',
  context_depth: 5,
  relevance_threshold: 0.7,
  linked_traversal: true
});
```

### Memory Relevance Scoring
Memory relevance uses weighted scoring:
- **1.0**: Primary/exact match for anchor purpose
- **0.8-0.9**: Highly relevant, direct relationship
- **0.6-0.7**: Moderately relevant, indirect relationship  
- **0.4-0.5**: Tangentially related, contextual value
- **0.0-0.3**: Low relevance, archival value only

### Cross-System Linking
```json
{
  "anchor_id": "WT-ANCHOR-GOVERNANCE",
  "linked_anchors": [
    "WT-ANCHOR-QUALITY",     // Quality standards governance
    "WT-ANCHOR-DEPLOYMENT",  // Deployment governance
    "WT-ANCHOR-IMPLEMENTATION" // Implementation governance
  ]
}
```

## Anchor Management

### Creation Guidelines
1. **Unique Identification**: Use `WT-ANCHOR-{CATEGORY}` format
2. **Semantic Clarity**: Classification must be AI-parseable
3. **Purpose Specification**: Clear statement of anchor scope
4. **Agent Integration**: List all AI systems that will use the anchor
5. **Relevance Mapping**: Define memory relevance scores

### Lifecycle Management
- **Creation**: New anchors require governance approval
- **Updates**: Anchor modifications logged in GovernanceLog
- **Deprecation**: Unused anchors archived with migration plan
- **Validation**: Periodic review of anchor effectiveness

## DriveMemory Integration

### Automatic Ingestion
```json
{
  "ingestion_rules": {
    "anchor_locations": [
      "docs/governance/",
      "docs/quality/", 
      "docs/deployment/"
    ],
    "file_patterns": ["*.md", "*.json"],
    "classification_depth": "directory_based",
    "relevance_inheritance": true
  }
}
```

### Memory Classification
- **governance_framework**: Policy and compliance documents
- **quality_assurance**: Code standards and audit results
- **deployment_lifecycle**: Environment and deployment procedures
- **implementation_patterns**: Technical implementation guidance

## Agent Interaction Patterns

### Context Retrieval
```typescript
// Claude Code requesting implementation context
const context = await memoryPlugin.getContext({
  anchor: 'WT-ANCHOR-IMPLEMENTATION',
  query: 'sidebar component patterns',
  depth: 3
});
```

### Memory Creation
```typescript
// Governance Log Summariser creating memory entry
await memoryPlugin.createMemory({
  content: 'Phase WT-8.9.2 completion with governance updates',
  anchors: ['WT-ANCHOR-GOVERNANCE', 'WT-ANCHOR-QUALITY'],
  relevance: { governance: 1.0, quality: 0.8 }
});
```

### Cross-Anchor Queries
```typescript
// Multi-anchor context for complex queries
const deploymentQualityContext = await memoryPlugin.queryMultiple({
  anchors: ['WT-ANCHOR-DEPLOYMENT', 'WT-ANCHOR-QUALITY'],
  intersection: true,
  relevance_min: 0.6
});
```

## Current Anchor Registry

### Active Anchors
- **WT-ANCHOR-GOVERNANCE** (Created: 2025-08-07)
  - Location: `docs/governance/`
  - Purpose: Policy framework and AI usage governance
  - Agents: GovernanceLog Summariser, Policy Validator

- **WT-ANCHOR-DEPLOYMENT** (Created: 2025-08-07)
  - Location: `docs/deployment/`
  - Purpose: Environment lifecycle and deployment automation
  - Agents: Deployment Trigger Agent, Environment Health Monitor

- **WT-ANCHOR-QUALITY** (Created: 2025-08-07)
  - Location: `docs/quality/`
  - Purpose: Code quality standards and continuous improvement
  - Agents: Auto-Audit Trigger Agent, Claude PR Validator

### Planned Anchors
- **WT-ANCHOR-SECURITY**: Security policies and vulnerability management
- **WT-ANCHOR-PERFORMANCE**: Performance optimization and monitoring
- **WT-ANCHOR-INTEGRATION**: External system integration patterns

## References

### Schema Integration
- `GOVERNANCELOG_SCHEMA.md` - Audit trail integration with anchors
- `GPT-USAGE-POLICY.md` - AI governance using anchor system
- `../development/CONTRIBUTING.md` - Developer anchor usage guidelines

### Memory Plugin Files
- `DriveMemory/MemoryPlugin/wt-anchor-governance-directory.json`
- `DriveMemory/MemoryPlugin/wt-anchor-deployment-directory.json`  
- `DriveMemory/MemoryPlugin/wt-anchor-quality-directory.json`
- `DriveMemory/MemoryPlugin/wt-directory-reorganization-complete.json`

### AI Agent Integration
- **Claude Code**: Primary development assistant with anchor-based context
- **Memory Anchor Service**: Semantic search and classification service
- **DriveMemory Sync**: Automated ingestion and memory classification

## Evolution and Scaling
As the system grows, anchors may be:
- **Subdivided**: Large anchors split into focused sub-anchors
- **Hierarchical**: Parent-child anchor relationships
- **Cross-Project**: Anchors shared across multiple repositories
- **Temporal**: Time-based anchor versioning and evolution

---
**Specification Version**: 1.0  
**Effective Date**: 2025-08-07  
**Last Updated**: 2025-08-07  
**Memory Anchor**: WT-ANCHOR-GOVERNANCE