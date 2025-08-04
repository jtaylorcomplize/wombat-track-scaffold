# AI Agent Integration Guide

This guide provides comprehensive documentation for integrating and using the AI agents in the Wombat Track system.

## Overview

The Wombat Track AI Agent system provides three core agents that work together to automate governance, memory management, and side quest detection:

1. **Side Quest Detector Agent** - Automatically detects when project steps should be marked as side quests
2. **Auto-Audit Agent** - Performs compliance audits and governance checks with auto-remediation
3. **Memory Anchor Agent** - Creates memory anchors for significant project events

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Wombat Track System                      │
├─────────────────────────────────────────────────────────────┤
│  AI Agent Layer                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Side Quest  │  │ Auto-Audit  │  │ Memory Anchor       │  │
│  │ Detector    │  │ Agent       │  │ Agent               │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Services Layer                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Agent       │  │ Gizmo       │  │ SDLC                │  │
│  │ Monitoring  │  │ OAuth2      │  │ Orchestrator        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Integration Layer                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Gizmo API   │  │ DriveMemory │  │ Governance Logger   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Agent Implementations

### 1. Side Quest Detector Agent

**Purpose**: Automatically identifies when project steps should be classified as side quests based on scope changes, timeline extensions, and resource additions.

**Key Features**:
- Real-time step analysis with configurable detection rules
- Confidence scoring based on multiple detection criteria
- Automatic conversion or flagging recommendations
- Historical tracking of detection results

**Usage**:
```typescript
import { sideQuestDetector } from '../agents/SideQuestDetector';

// Start the agent
await sideQuestDetector.start();

// Analyze a step for side quest characteristics
const result = await sideQuestDetector.analyzeStep(step, phase, project, previousVersion);

console.log(`Confidence: ${result.confidence}, Recommendation: ${result.recommendation}`);
```

**Configuration**:
```typescript
const config = {
  rules: [
    {
      id: 'scope-expansion',
      trigger: 'scope_change',
      threshold: 0.3, // 30% scope increase
      weight: 0.8,
      enabled: true
    }
  ],
  autoConvert: false,
  requireApproval: true,
  confidenceThreshold: 0.7
};
```

### 2. Auto-Audit Agent

**Purpose**: Performs automated compliance audits and governance checks with configurable rules and auto-remediation capabilities.

**Key Features**:
- Real-time and scheduled audits
- Comprehensive compliance checking across projects, phases, and steps
- Automated remediation for common issues
- Performance monitoring and alerting

**Usage**:
```typescript
import { autoAuditAgent } from '../agents/AutoAuditAgent';

// Start the agent
await autoAuditAgent.start();

// Perform audit on specific context
const auditContext = {
  project: currentProject,
  phase: currentPhase,
  timestamp: new Date().toISOString(),
  metadata: { audit_type: 'manual' }
};

const report = await autoAuditAgent.performAudit(auditContext);
console.log(`Overall Score: ${report.overallScore}%, Findings: ${report.totalFindings}`);
```

**Audit Rules**:
- **Project Governance**: Ensures proper project documentation and tracking
- **Phase Documentation**: Validates phase planning and documentation
- **Step Completion**: Monitors completion patterns and bottlenecks
- **Security Compliance**: Checks security checklist completion
- **Quality Gates**: Validates quality gate configuration

### 3. Memory Anchor Agent

**Purpose**: Automatically creates memory anchors for significant project events and integrates with Gizmo memory system for permanent storage.

**Key Features**:
- Event-driven anchor creation with configurable triggers
- Integration with DriveMemory and Gizmo systems
- Automatic categorization (governance, technical, decision, milestone, learning)
- File-based storage with human-readable format

**Usage**:
```typescript
import { memoryAnchorAgent } from '../agents/MemoryAnchorAgent';

// Start the agent
await memoryAnchorAgent.start();

// Process a trigger event
const context = {
  projectId: 'proj-123',
  projectName: 'My Project',
  phaseId: 'phase-456',
  phaseName: 'Implementation',
  triggeredBy: 'phase-completion',
  triggerEvent: 'phase_complete',
  relatedArtifacts: ['src/component.tsx', 'docs/design.md']
};

const anchors = await memoryAnchorAgent.processTrigger('phase_complete', context, stepData);
```

**Anchor Types**:
- **Governance**: Compliance and audit milestones
- **Technical**: Implementation and deployment events
- **Decision**: Critical project decisions
- **Milestone**: Project and phase completions
- **Learning**: Lessons learned and best practices

## Agent Monitoring

The Agent Monitoring Service provides centralized monitoring and health checks for all agents.

### Monitoring Dashboard

Access the monitoring dashboard at: **Admin** → **Agent Monitoring**

**Features**:
- Real-time agent status and health indicators
- Performance metrics (task completion, success rates, throughput)
- Error tracking and alerting
- System health overview

### Health Status Indicators

- 🟢 **Healthy**: Agent operating normally
- 🟡 **Warning**: Performance issues or recent errors
- 🔴 **Critical**: Multiple errors or critical failures
- ⚫ **Offline**: Agent not active

### Performance Metrics

```typescript
interface AgentPerformanceMetrics {
  tasksCompleted: number;
  averageTaskTime: number; // milliseconds
  successRate: number; // 0-1
  throughput: number; // tasks per minute
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
}
```

## Gizmo Integration

### OAuth2 Authentication Setup

1. **Configure Gizmo OAuth2 Client** (see [GIZMO_OAUTH2_SETUP.md](./GIZMO_OAUTH2_SETUP.md))
2. **Set Environment Variables**:
   ```bash
   GIZMO_CLIENT_ID=your_client_id
   GIZMO_CLIENT_SECRET=your_client_secret
   GIZMO_TOKEN_ENDPOINT=https://gizmo.example.com/oauth2/token
   GIZMO_MEMORY_ENDPOINT=https://gizmo.example.com/api/memory
   ```

3. **Initialize Authentication**:
   ```typescript
   import { gizmoAuthService } from '../config/gizmo-config';
   
   await gizmoAuthService.initialize();
   ```

### Memory Submission

Memory anchors are automatically submitted to Gizmo when configured:

```typescript
// Automatic submission (default)
const anchor = await memoryAnchorAgent.createMemoryAnchor(trigger, context, data);

// Manual submission
const result = await memoryAnchorAgent.submitToGizmo(anchor);
```

## API Endpoints

### Agent Management

- `GET /api/agents/status` - Get all agent statuses
- `POST /api/agents/{agentId}/start` - Start specific agent
- `POST /api/agents/{agentId}/stop` - Stop specific agent
- `GET /api/agents/{agentId}/performance` - Get performance metrics

### Side Quest Detection

- `POST /api/agents/side-quest/analyze` - Analyze step for side quest characteristics
- `GET /api/agents/side-quest/history/{stepId}` - Get detection history for step

### Audit Operations

- `POST /api/agents/audit/perform` - Perform manual audit
- `GET /api/agents/audit/reports` - Get audit reports
- `GET /api/agents/audit/history` - Get audit history

### Memory Anchors

- `POST /api/agents/memory/trigger` - Trigger anchor creation
- `GET /api/agents/memory/anchors` - Get all anchors
- `POST /api/agents/memory/submit/{anchorId}` - Submit anchor to Gizmo

## Event System

All agents emit events that can be listened to for integration and monitoring:

### Side Quest Detector Events

```typescript
sideQuestDetector.on('side-quest-detected', (result) => {
  console.log(`Side quest detected: ${result.stepId} (${result.confidence})`);
});

sideQuestDetector.on('agent-started', (data) => {
  console.log('Side Quest Detector started');
});
```

### Auto-Audit Agent Events

```typescript
autoAuditAgent.on('audit-completed', (report) => {
  console.log(`Audit completed: Score ${report.overallScore}%`);
});

autoAuditAgent.on('remediation-executed', (data) => {
  console.log(`Auto-remediation executed: ${data.type}`);
});
```

### Memory Anchor Agent Events

```typescript
memoryAnchorAgent.on('anchor-created', (anchor) => {
  console.log(`Memory anchor created: ${anchor.title}`);
});

memoryAnchorAgent.on('gizmo-submission-success', (data) => {
  console.log(`Gizmo submission successful: ${data.anchor_id}`);
});
```

## Configuration

### Environment Variables

```bash
# Agent Configuration
AGENT_MONITORING_ENABLED=true
AGENT_HEALTH_CHECK_INTERVAL=30000
SIDE_QUEST_AUTO_CONVERT=false
AUDIT_AUTO_REMEDIATION=true
MEMORY_ANCHOR_AUTO_SUBMIT=true

# DriveMemory Integration
DRIVE_MEMORY_PATH=./DriveMemory
MEMORY_PLUGIN_ENABLED=true

# Logging
AGENT_LOG_LEVEL=info
GOVERNANCE_LOG_ENABLED=true
```

### Agent-Specific Configuration

Each agent can be configured through their respective configuration files:

- `src/agents/SideQuestDetector.ts` - Detection rules and thresholds
- `src/agents/AutoAuditAgent.ts` - Audit rules and remediation settings
- `src/agents/MemoryAnchorAgent.ts` - Anchor triggers and Gizmo integration

## Troubleshooting

### Common Issues

1. **Agent Not Starting**
   - Check environment variables are set correctly
   - Verify Gizmo OAuth2 configuration
   - Review application logs for initialization errors

2. **OAuth2 Authentication Failures**
   - Verify client credentials in Gizmo
   - Check network connectivity to Gizmo endpoints
   - Review token expiration and refresh settings

3. **Memory Anchor Submission Failures**
   - Check Gizmo memory endpoint availability
   - Verify OAuth2 scopes include `memory:write`
   - Review anchor format and content validation

4. **Performance Issues**
   - Monitor agent performance metrics
   - Check system resource usage
   - Review agent configuration for optimization opportunities

### Debug Mode

Enable debug logging:

```bash
AGENT_DEBUG=true
LOG_LEVEL=debug
GIZMO_DEBUG=true
```

### Health Checks

Use the monitoring API to check agent health:

```bash
curl http://localhost:3000/api/agents/status
curl http://localhost:3000/api/system/health
```

## Best Practices

### 1. Agent Configuration

- Start with conservative detection thresholds and adjust based on results
- Enable auto-remediation only for low-risk compliance issues
- Configure appropriate OAuth2 scopes for least privilege access

### 2. Monitoring and Alerting

- Set up alerts for agent health issues and authentication failures
- Monitor performance metrics to identify optimization opportunities
- Review audit reports regularly for compliance trends

### 3. Memory Management

- Configure appropriate anchor triggers to avoid information overload
- Use meaningful anchor titles and descriptions
- Regularly review and clean up old anchors

### 4. Security

- Store OAuth2 credentials securely using oApp Secrets Manager
- Use HTTPS for all Gizmo communications
- Regularly rotate OAuth2 client secrets
- Monitor authentication logs for suspicious activity

## Integration Examples

### React Component Integration

```typescript
import React, { useEffect, useState } from 'react';
import { agentMonitoringService } from '../services/AgentMonitoringService';

const AgentStatusWidget: React.FC = () => {
  const [agents, setAgents] = useState<AgentStatus[]>([]);

  useEffect(() => {
    const updateAgents = () => {
      setAgents(agentMonitoringService.getAllAgentStatuses());
    };

    agentMonitoringService.on('agent-status-changed', updateAgents);
    updateAgents();

    return () => {
      agentMonitoringService.off('agent-status-changed', updateAgents);
    };
  }, []);

  return (
    <div className="agent-status-widget">
      {agents.map(agent => (
        <div key={agent.id} className={`agent-card ${agent.health}`}>
          <h3>{agent.name}</h3>
          <p>Status: {agent.active ? 'Active' : 'Inactive'}</p>
          <p>Health: {agent.health}</p>
        </div>
      ))}
    </div>
  );
};
```

### Express.js API Integration

```typescript
import express from 'express';
import { sideQuestDetector } from '../agents/SideQuestDetector';

const router = express.Router();

router.post('/side-quest/analyze', async (req, res) => {
  try {
    const { step, phase, project, previousVersion } = req.body;
    
    const result = await sideQuestDetector.analyzeStep(
      step, phase, project, previousVersion
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**:
   - Review agent performance metrics
   - Check for unacknowledged alerts
   - Verify Gizmo integration status

2. **Monthly**:
   - Review and update detection rules based on results
   - Analyze audit trends and adjust compliance rules
   - Clean up old memory anchors and audit reports

3. **Quarterly**:
   - Update OAuth2 client credentials
   - Review and optimize agent configurations
   - Conduct security audit of agent integrations

### Getting Help

- **Documentation**: Check this guide and the Gizmo OAuth2 setup guide
- **Monitoring**: Use the Agent Monitoring dashboard for real-time status
- **Logs**: Review application logs for detailed error information
- **Support**: Contact your system administrator for configuration issues

---

This integration guide provides comprehensive coverage of the AI agent system. For specific implementation details, refer to the individual agent source files and the Gizmo OAuth2 setup documentation.