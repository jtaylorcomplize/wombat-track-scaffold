/**
 * Agent Communication Service
 * Handles direct communication with autonomous agents like Zoi
 * Supports multiple channels: Chat UI, oApp, GitHub Actions
 */

import agentRegistry from '../config/agentRegistry.json';

export interface AgentCommunicationRequest {
  targetAgent: string;
  message: string;
  context?: string;
  requestId?: string;
  channel?: 'chat-ui' | 'governance-log' | 'github-actions';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface AgentCommunicationResponse {
  success: boolean;
  agentId: string;
  responseChannel: string;
  responseId?: string;
  message?: string;
  error?: string;
  governanceLogEntry?: any;
}

export class AgentCommunicationService {
  private static instance: AgentCommunicationService;
  
  private constructor() {}
  
  public static getInstance(): AgentCommunicationService {
    if (!AgentCommunicationService.instance) {
      AgentCommunicationService.instance = new AgentCommunicationService();
    }
    return AgentCommunicationService.instance;
  }

  /**
   * Send message to agent via appropriate channel
   */
  async sendToAgent(request: AgentCommunicationRequest): Promise<AgentCommunicationResponse> {
    const agent = agentRegistry.agents.find(a => a.id === request.targetAgent);
    
    if (!agent) {
      return {
        success: false,
        agentId: request.targetAgent,
        responseChannel: 'error',
        error: `Agent ${request.targetAgent} not found in registry`
      };
    }

    if (agent.status !== 'active') {
      return {
        success: false,
        agentId: request.targetAgent,
        responseChannel: 'error',
        error: `Agent ${request.targetAgent} is not active (status: ${agent.status})`
      };
    }

    const requestId = request.requestId || this.generateRequestId();
    
    try {
      // Log communication attempt to governance
      const governanceEntry = await this.createGovernanceLogEntry({
        entryType: "AgentCommunication",
        targetAgent: request.targetAgent,
        requestId,
        message: request.message,
        context: request.context,
        channel: request.channel || 'chat-ui',
        timestamp: new Date().toISOString()
      });

      // Route to appropriate communication channel
      const response = await this.routeToChannel(agent, request, requestId);
      
      // Update governance with response
      if (response.success) {
        await this.updateGovernanceLogEntry(requestId, {
          status: 'delivered',
          responseChannel: response.responseChannel
        });
      }

      return response;

    } catch (error) {
      console.error('Agent communication error:', error);
      return {
        success: false,
        agentId: request.targetAgent,
        responseChannel: 'error',
        error: `Communication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Route message to appropriate communication channel
   */
  private async routeToChannel(
    agent: any, 
    request: AgentCommunicationRequest, 
    requestId: string
  ): Promise<AgentCommunicationResponse> {
    const channel = request.channel || 'chat-ui';
    
    switch (channel) {
      case 'chat-ui':
        return await this.sendViaMemoryPlugin(agent, request, requestId);
      
      case 'github-actions':
        return await this.sendViaGitHubDispatch(agent, request, requestId);
      
      case 'governance-log':
        return await this.sendViaGovernanceLog(agent, request, requestId);
      
      default:
        throw new Error(`Unsupported communication channel: ${channel}`);
    }
  }

  /**
   * Send message via Memory Plugin (fallback for Chat UI)
   */
  private async sendViaMemoryPlugin(
    agent: any, 
    request: AgentCommunicationRequest, 
    requestId: string
  ): Promise<AgentCommunicationResponse> {
    const memoryPluginEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      targetAgent: agent.id,
      trigger: "AgentCommRequest",
      message: request.message,
      context: request.context,
      responseExpected: true,
      responseChannel: "ChatGPT UI or oApp Logs"
    };

    // Write to memory plugin communication file
    const fs = await import('fs/promises');
    const path = 'logs/memoryplugin/agent_comm.jsonl';
    
    try {
      await fs.appendFile(path, JSON.stringify(memoryPluginEntry) + '\n');
      
      return {
        success: true,
        agentId: agent.id,
        responseChannel: 'memory-plugin',
        responseId: requestId,
        message: 'Message queued in memory plugin for agent pickup'
      };
    } catch (error) {
      throw new Error(`Failed to write to memory plugin: ${error}`);
    }
  }

  /**
   * Send message via GitHub Actions dispatch
   */
  private async sendViaGitHubDispatch(
    agent: any, 
    request: AgentCommunicationRequest, 
    requestId: string
  ): Promise<AgentCommunicationResponse> {
    // This would integrate with GitHub CLI or API
    // For now, create a trigger file that GitHub Actions can detect
    
    const triggerPayload = {
      timestamp: new Date().toISOString(),
      requestId,
      targetAgent: agent.id,
      action: "agent_communication",
      inputs: {
        task: request.message,
        context: request.context,
        requestId
      }
    };

    const fs = await import('fs/promises');
    const triggerPath = `DriveMemory/AgentTriggers/github-dispatch-${requestId}.json`;
    
    try {
      // Ensure directory exists
      await fs.mkdir('DriveMemory/AgentTriggers', { recursive: true });
      await fs.writeFile(triggerPath, JSON.stringify(triggerPayload, null, 2));
      
      return {
        success: true,
        agentId: agent.id,
        responseChannel: 'github-actions',
        responseId: requestId,
        message: 'GitHub Actions dispatch trigger created'
      };
    } catch (error) {
      throw new Error(`Failed to create GitHub dispatch trigger: ${error}`);
    }
  }

  /**
   * Send message via Governance Log
   */
  private async sendViaGovernanceLog(
    agent: any, 
    request: AgentCommunicationRequest, 
    requestId: string
  ): Promise<AgentCommunicationResponse> {
    const governanceEntry = {
      timestamp: new Date().toISOString(),
      entryType: "AgentDirectMessage",
      targetAgent: agent.id,
      requestId,
      summary: request.message,
      context: request.context,
      responseExpected: true,
      communicationMethod: "governance-log"
    };

    const fs = await import('fs/promises');
    
    try {
      await fs.appendFile('logs/governance.jsonl', JSON.stringify(governanceEntry) + '\n');
      
      return {
        success: true,
        agentId: agent.id,
        responseChannel: 'governance-log',
        responseId: requestId,
        message: 'Message logged to governance.jsonl for agent monitoring'
      };
    } catch (error) {
      throw new Error(`Failed to write to governance log: ${error}`);
    }
  }

  /**
   * Create governance log entry for communication attempt
   */
  private async createGovernanceLogEntry(data: any): Promise<any> {
    const entry = {
      ...data,
      timestamp: new Date().toISOString()
    };

    const fs = await import('fs/promises');
    
    try {
      await fs.appendFile('logs/governance.jsonl', JSON.stringify(entry) + '\n');
      return entry;
    } catch (error) {
      console.error('Failed to create governance log entry:', error);
      return null;
    }
  }

  /**
   * Update governance log entry with response info
   */
  private async updateGovernanceLogEntry(requestId: string, updates: any): Promise<void> {
    const updateEntry = {
      timestamp: new Date().toISOString(),
      entryType: "AgentCommunicationUpdate",
      requestId,
      ...updates
    };

    const fs = await import('fs/promises');
    
    try {
      await fs.appendFile('logs/governance.jsonl', JSON.stringify(updateEntry) + '\n');
    } catch (error) {
      console.error('Failed to update governance log entry:', error);
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `zoi-comm-${timestamp}-${random}`;
  }

  /**
   * Get available agents from registry
   */
  getAvailableAgents() {
    return agentRegistry.agents.filter(agent => agent.status === 'active');
  }

  /**
   * Check if agent communication is enabled
   */
  isAgentCommunicationEnabled(): boolean {
    return agentRegistry.agentRegistryConfig.allowAgentInjection;
  }
}

export default AgentCommunicationService;