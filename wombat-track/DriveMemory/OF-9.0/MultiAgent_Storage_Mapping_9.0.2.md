# 🤖 Multi-Agent Orchestration Storage Mapping - Step 9.0.2

**Phase:** OF-9.0 Full Cloud Development & Multi-Agent Orchestration  
**Source Step:** 9.0.2 Multi-Agent Orchestration Dashboard  
**Target Steps:** 9.0.3-9.0.4 Native Storage Migration  
**Generated:** 2025-08-06 16:15 AEST  
**Memory Anchor:** of-9.0-init-20250806

---

## 🎯 Mapping Objective

Ensure all chat interactions and orchestration events generated in Step 9.0.2 Multi-Agent Orchestration Dashboard can be seamlessly migrated to oApp native database storage in Steps 9.0.3-9.0.4.

---

## 📊 Current Multi-Agent Event Structure

### 🗨️ Chat Interaction Events
**Source:** `multiAgentGovernance.logChatInteraction()`

```typescript
export interface ChatInteraction {
  userMessage: {
    content: string;
    timestamp: Date;
    context: {
      projectId: string;
      projectName: string;
      phaseId: string;
      phaseName: string;
      stepId: string;
      stepName: string;
    };
  };
  agentResponse: {
    agentId: string;
    agentName: string;
    content: string;
    timestamp: Date;
  };
  governanceMetadata: {
    projectId: string;
    phaseId: string;
    stepId: string;
    conversationId: string;
  };
}
```

### 🎛️ Orchestration Governance Events
**Source:** `multiAgentGovernance.logOrchestrationAction()`

```typescript
export interface OrchestrationGovernanceEvent {
  timestamp: string;
  phaseId: string;
  stepId: string;
  eventType: 'agent_chat' | 'agent_task_assigned' | 'agent_status_changed' | 'orchestration_action' | 'governance_logged';
  context: {
    projectId: string;
    projectName: string;
    phaseId: string;
    phaseName: string;
    stepId: string;
    stepName: string;
  };
  details: any;
  memoryAnchor: string;
  participants: string[];
  autoLogged: boolean;
}
```

### 🎯 Agent Task Assignments
**Source:** `multiAgentGovernance.logAgentTaskAssignment()`

```typescript
export interface AgentTask {
  id: string;
  agentId: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  assignedAt: Date;
  context: any;
}
```

---

## 🗄️ Target Database Schema Mapping

### 📝 Multi-Agent Chat Events Table
**Target:** New table extending governance_events schema

```sql
CREATE TABLE multi_agent_chat_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id VARCHAR(255) NOT NULL,
    user_message_content TEXT NOT NULL,
    user_message_timestamp TIMESTAMP NOT NULL,
    agent_id VARCHAR(100) NOT NULL,
    agent_name VARCHAR(255) NOT NULL,
    agent_response_content TEXT NOT NULL,
    agent_response_timestamp TIMESTAMP NOT NULL,
    project_id VARCHAR(50) NOT NULL,
    phase_id VARCHAR(50) NOT NULL,
    step_id VARCHAR(50) NOT NULL,
    memory_anchor VARCHAR(255),
    context_data JSONB,
    governance_logged BOOLEAN DEFAULT true,
    auto_tagged BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 🤖 Agent Task Assignments Table  
**Target:** New table for orchestration tasks

```sql
CREATE TABLE agent_task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id VARCHAR(255) UNIQUE NOT NULL,
    agent_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(50) CHECK (priority IN ('high', 'medium', 'low')),
    status VARCHAR(50) CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
    assigned_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    project_id VARCHAR(50) NOT NULL,
    phase_id VARCHAR(50) NOT NULL,
    step_id VARCHAR(50) NOT NULL,
    context_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 🔄 Agent Status Changes Table
**Target:** New table for agent status tracking

```sql
CREATE TABLE agent_status_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(100) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    status_change_reason VARCHAR(255),
    project_id VARCHAR(50) NOT NULL,
    phase_id VARCHAR(50) NOT NULL,
    step_id VARCHAR(50) NOT NULL,
    memory_anchor VARCHAR(255),
    context_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔄 Data Transformation Mappings

### 💬 Chat Interaction → multi_agent_chat_events

| Source Field | Target Column | Transformation |
|-------------|---------------|----------------|
| `userMessage.content` | `user_message_content` | Direct mapping |
| `userMessage.timestamp` | `user_message_timestamp` | Date → TIMESTAMP |
| `agentResponse.agentId` | `agent_id` | Direct mapping |
| `agentResponse.agentName` | `agent_name` | Direct mapping |  
| `agentResponse.content` | `agent_response_content` | Direct mapping |
| `agentResponse.timestamp` | `agent_response_timestamp` | Date → TIMESTAMP |
| `governanceMetadata.conversationId` | `conversation_id` | Direct mapping |
| `userMessage.context` | `context_data` | Object → JSONB |
| `governanceMetadata.projectId` | `project_id` | Direct mapping |
| `governanceMetadata.phaseId` | `phase_id` | Direct mapping |
| `governanceMetadata.stepId` | `step_id` | Direct mapping |

### 📋 Agent Task → agent_task_assignments

| Source Field | Target Column | Transformation |
|-------------|---------------|----------------|
| `id` | `task_id` | Direct mapping |
| `agentId` | `agent_id` | Direct mapping |
| `title` | `title` | Direct mapping |
| `description` | `description` | Direct mapping |
| `priority` | `priority` | Direct mapping |
| `status` | `status` | Direct mapping |
| `assignedAt` | `assigned_at` | Date → TIMESTAMP |
| `context.projectId` | `project_id` | Extract from context |
| `context.phaseId` | `phase_id` | Extract from context |
| `context.stepId` | `step_id` | Extract from context |
| `context` | `context_data` | Object → JSONB |

### 🔄 Orchestration Event → governance_events (Enhanced)

| Source Field | Target Column | Transformation |
|-------------|---------------|----------------|
| `timestamp` | `timestamp` | String → TIMESTAMP |
| `eventType` | `entry_type` | Map: 'agent_chat' → 'multi_agent_chat' |
| `phaseId` | `phase_id` | Direct mapping |
| `stepId` | `step_id` | Direct mapping |
| `context.projectId` | `project_id` | Extract from context |
| `memoryAnchor` | `memory_anchor` | Direct mapping |
| `details` | `details` | Object → JSONB |
| `participants` | `tags` | Array → TEXT[] (prefix with 'agent:') |
| `autoLogged` | `audit_traceability` | Boolean mapping |

---

## 🚀 API Endpoints for Multi-Agent Events

### 💬 Chat Interaction Endpoints
```typescript
// Log chat interaction
POST /api/multi-agent/chat
Body: ChatInteraction

// Get chat history for conversation
GET /api/multi-agent/chat/:conversationId

// Get chat history for project/phase/step
GET /api/multi-agent/chat/history?projectId=&phaseId=&stepId=

// Get chat interactions by agent
GET /api/multi-agent/chat/agent/:agentId
```

### 📋 Task Assignment Endpoints  
```typescript
// Create task assignment
POST /api/multi-agent/tasks
Body: AgentTask

// Update task status
PUT /api/multi-agent/tasks/:taskId
Body: { status: 'in_progress' | 'completed' | 'failed' }

// Get tasks for agent
GET /api/multi-agent/tasks/agent/:agentId

// Get tasks for project/phase/step
GET /api/multi-agent/tasks?projectId=&phaseId=&stepId=
```

### 📊 Orchestration Dashboard Endpoints
```typescript
// Get orchestration summary
GET /api/multi-agent/dashboard/summary?projectId=&phaseId=

// Get agent status overview
GET /api/multi-agent/agents/status

// Log orchestration action
POST /api/multi-agent/orchestration/action
Body: OrchestrationGovernanceEvent
```

---

## 🔧 Migration Implementation

### 📁 Current File-Based Storage (Step 9.0.2)
**Console Logging Only:**
```typescript
// Current implementation logs to console and mock file operations
console.log('📝 Multi-Agent Chat Governance:', event);
await this.writeToGovernanceLog(event); // Mock file write
await this.updateMemoryPlugin(event);   // Mock JSON update
```

### 🗄️ Target Database Operations (Steps 9.0.3-9.0.4)
**Real Database Integration:**
```typescript
// Future implementation with database operations
await db.multiAgentChatEvents.create({
  conversation_id: interaction.governanceMetadata.conversationId,
  user_message_content: interaction.userMessage.content,
  user_message_timestamp: interaction.userMessage.timestamp,
  agent_id: interaction.agentResponse.agentId,
  agent_name: interaction.agentResponse.agentName,
  agent_response_content: interaction.agentResponse.content,
  agent_response_timestamp: interaction.agentResponse.timestamp,
  project_id: interaction.governanceMetadata.projectId,
  phase_id: interaction.governanceMetadata.phaseId,
  step_id: interaction.governanceMetadata.stepId,
  context_data: interaction.userMessage.context,
  memory_anchor: 'of-9.0-init-20250806'
});
```

---

## 📋 Service Update Requirements

### 🔄 multiAgentGovernance.ts Updates
**Required Changes for Native Storage:**

```typescript
class MultiAgentGovernanceService {
  private apiClient: MultiAgentAPIClient;
  
  async logChatInteraction(interaction: ChatInteraction): Promise<void> {
    // Replace console.log with API call
    try {
      await this.apiClient.post('/multi-agent/chat', interaction);
      console.log('✅ Chat interaction logged to database');
    } catch (error) {
      console.error('❌ Failed to log chat interaction:', error);
      // Fallback to file-based logging during transition
      await this.fallbackToFileLogging(interaction);
    }
  }
  
  async logAgentTaskAssignment(task: AgentTask): Promise<void> {
    try {
      await this.apiClient.post('/multi-agent/tasks', task);
      console.log('✅ Task assignment logged to database');
    } catch (error) {
      console.error('❌ Failed to log task assignment:', error);
      await this.fallbackToFileLogging(task);
    }
  }
  
  private async fallbackToFileLogging(data: any): Promise<void> {
    // Maintain current file-based logging as fallback
    console.log('🔄 Falling back to file-based governance logging');
    // Current implementation continues to work
  }
}
```

### 🖥️ ContextAwareSidebarChat.tsx Updates
**Required Changes for Real-time Database Integration:**

```typescript
// Replace mock message simulation with real API integration
const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!inputText.trim() || isProcessing) return;

  const userMessage: ChatMessage = { /* ... */ };
  setMessages(prev => [...prev, userMessage]);
  setIsProcessing(true);

  try {
    // Real agent API integration instead of setTimeout simulation
    const agentResponse = await agentAPIClient.processMessage({
      message: userMessage.content,
      agentId: activeTab === 'all' ? 'cc' : activeTab,
      context: getCurrentContext()
    });
    
    const agentMessage: ChatMessage = {
      id: `${agentResponse.agentId}-${Date.now()}`,
      agentId: agentResponse.agentId,
      agentName: agentResponse.agentName,
      content: agentResponse.content,
      timestamp: new Date(),
      context: getCurrentContext(),
      isUser: false,
      governanceLogged: true
    };
    
    setMessages(prev => [...prev, agentMessage]);
    
    // Real governance logging via API
    await multiAgentGovernance.logChatInteraction({
      userMessage: { content: userMessage.content, timestamp: userMessage.timestamp, context: userMessage.context },
      agentResponse: { agentId: agentMessage.agentId, agentName: agentMessage.agentName, content: agentMessage.content, timestamp: agentMessage.timestamp },
      governanceMetadata: { projectId: getCurrentContext().projectId, phaseId: getCurrentContext().phaseId, stepId: getCurrentContext().stepId, conversationId: multiAgentGovernance.generateConversationId() }
    });
    
  } catch (error) {
    console.error('❌ Agent processing error:', error);
    // Handle error state
  } finally {
    setIsProcessing(false);
  }
};
```

---

## 📊 Governance Transition Strategy

### 🔄 Phase 1: Dual Logging (Step 9.0.3)
- **Current:** Console logging + mock file operations  
- **Added:** Database logging via API calls
- **Fallback:** File-based logging on API failure
- **Validation:** Compare file vs. database entries daily

### 🗄️ Phase 2: Database Primary (Step 9.0.4)
- **Primary:** All events logged to database
- **Fallback:** Emergency file logging for critical failures
- **Archive:** Move DriveMemory files to archive directory
- **Monitoring:** Real-time dashboard for governance events

### ✅ Phase 3: Full Native Storage
- **Complete:** Database-only governance logging
- **Archived:** DriveMemory files moved to `/Archive/`  
- **Performance:** <200ms API response times
- **Reliability:** 99.9% uptime with automated failover

---

## 🧪 Testing & Validation Plan

### 🔍 Data Integrity Testing
```typescript
// Validate chat interaction migration
const validateChatMigration = async (conversationId: string) => {
  const fileEvents = await readChatEventsFromFiles(conversationId);
  const dbEvents = await db.multiAgentChatEvents.findByConversationId(conversationId);
  
  assert(fileEvents.length === dbEvents.length, 'Event count mismatch');
  
  for (let i = 0; i < fileEvents.length; i++) {
    assert(fileEvents[i].userMessage === dbEvents[i].user_message_content, 'User message mismatch');
    assert(fileEvents[i].agentResponse === dbEvents[i].agent_response_content, 'Agent response mismatch');
    // Additional field validations...
  }
};
```

### 📈 Performance Testing
```typescript
// Load test multi-agent chat API
const loadTestChatAPI = async () => {
  const concurrentChats = 50;
  const messagesPerChat = 100;
  
  const startTime = Date.now();
  
  await Promise.all(Array(concurrentChats).fill(0).map(async (_, i) => {
    for (let j = 0; j < messagesPerChat; j++) {
      await apiClient.post('/multi-agent/chat', generateMockChatInteraction());
    }
  }));
  
  const duration = Date.now() - startTime;
  const totalMessages = concurrentChats * messagesPerChat;
  const messagesPerSecond = totalMessages / (duration / 1000);
  
  console.log(`📊 Performance: ${messagesPerSecond} messages/second`);
  assert(messagesPerSecond > 100, 'Performance below threshold');
};
```

---

## 🚨 Critical Success Factors

### ✅ Must-Have Features
- [ ] **Real-time Chat Logging:** All sidebar chat interactions logged to database instantly
- [ ] **Agent Task Tracking:** Full lifecycle tracking from assignment to completion  
- [ ] **Context Preservation:** ProjectID/PhaseID/StepID maintained across all events
- [ ] **Conversation Threading:** Related chat messages grouped by conversation ID
- [ ] **Fallback Resilience:** Graceful degradation to file-based logging on API failures

### 📊 Success Metrics
- **Data Completeness:** 100% of Step 9.0.2 events migrated successfully
- **API Performance:** <200ms response time for 95th percentile requests
- **Chat Responsiveness:** Real-time chat with <1s agent response time
- **Database Efficiency:** Query optimization for conversation history retrieval
- **Zero Downtime Migration:** No interruption to orchestration dashboard functionality

---

## 🔗 Integration Dependencies

### 🤖 Multi-Agent Dashboard Dependencies
- **Database Schema:** Tables created and indexed properly
- **API Endpoints:** All multi-agent endpoints operational
- **Authentication:** Service-to-service auth configured
- **Monitoring:** Application Insights configured for API calls

### 🧬 Cross-System Integration
- **Cloud IDE:** Updated to use multi-agent task assignment API
- **GitHub Integration:** Orchestration events logged via API
- **Azure Runtime:** All services deployed with proper networking
- **Admin Dashboard:** Real-time visibility into orchestration events

---

**Storage Migration Lead:** Claude Code (CC)  
**Integration Validation:** Multi-Agent Orchestration Dashboard  
**Target Completion:** Step 9.0.4 Azure Runtime deployment  
**Memory Anchor:** of-9.0-init-20250806  
**Governance Tracking:** All chat and orchestration events → oApp native storage