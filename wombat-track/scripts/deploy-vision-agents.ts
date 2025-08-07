#!/usr/bin/env npx tsx

/**
 * Vision Layer Agent Deployment Script - OF-8.8.1
 * Deploys and configures Vision Layer Agents on Azure runtime
 */

import { visionLayerAgentFramework } from '../src/services/visionLayerAgent';
import { agenticCloudOrchestrator } from '../src/services/agenticCloudOrchestrator';
import { enhancedGovernanceLogger } from '../src/services/enhancedGovernanceLogger';

interface DeploymentResult {
  success: boolean;
  agentsDeployed: number;
  tasksCreated: number;
  systemHealth: any;
  error?: string;
}

class VisionAgentDeployment {
  
  async deploy(): Promise<DeploymentResult> {
    console.log('🚀 Starting Vision Layer Agent Framework deployment...\n');

    try {
      // Step 1: Initialize Agentic Cloud Orchestrator
      console.log('1️⃣ Initializing Agentic Cloud Orchestrator...');
      await agenticCloudOrchestrator.initialize();
      console.log('✅ Agentic Cloud Orchestrator ready\n');

      // Step 2: Deploy Vision Layer Agents
      console.log('2️⃣ Deploying Vision Layer Agent Framework...');
      await visionLayerAgentFramework.initialize();
      const agents = visionLayerAgentFramework.getAgents();
      console.log(`✅ ${agents.length} Vision Layer Agents deployed\n`);

      // Step 3: Create initial assessment tasks
      console.log('3️⃣ Creating initial project assessment tasks...');
      const taskIds = await this.createInitialTasks();
      console.log(`✅ ${taskIds.length} assessment tasks created\n`);

      // Step 4: Execute priority tasks
      console.log('4️⃣ Executing high-priority tasks...');
      await this.executePriorityTasks(taskIds);
      console.log('✅ Priority tasks executed\n');

      // Step 5: System health check
      console.log('5️⃣ Performing system health check...');
      const systemHealth = await visionLayerAgentFramework.getSystemHealth();
      console.log(`✅ System status: ${systemHealth.status}\n`);

      // Step 6: Log deployment to governance
      console.log('6️⃣ Recording deployment in governance logs...');
      await this.logDeploymentGovernance(agents.length, taskIds.length);
      console.log('✅ Governance entries recorded\n');

      const result: DeploymentResult = {
        success: true,
        agentsDeployed: agents.length,
        tasksCreated: taskIds.length,
        systemHealth
      };

      this.printDeploymentSummary(result);
      return result;

    } catch (error: any) {
      console.error('❌ Deployment failed:', error.message);
      
      return {
        success: false,
        agentsDeployed: 0,
        tasksCreated: 0,
        systemHealth: null,
        error: error.message
      };
    }
  }

  private async createInitialTasks(): Promise<string[]> {
    const taskIds: string[] = [];

    // Project inspection task
    const inspectionTask = await visionLayerAgentFramework.createTask(
      'project-inspector-001',
      'analysis',
      'high',
      {
        scope: 'comprehensive',
        focus: ['dependencies', 'structure', 'quality'],
        project: 'wombat-track'
      },
      {
        projectId: 'OF-SDLC-IMP2',
        phaseId: 'OF-8.8',
        memoryAnchor: 'of-8.8.1-agent-framework'
      }
    );
    taskIds.push(inspectionTask);

    // Governance audit task
    const governanceTask = await visionLayerAgentFramework.createTask(
      'governance-auditor-001',
      'validation',
      'high',
      {
        scope: 'compliance',
        focus: ['memory_anchors', 'audit_trail', 'governance_gaps'],
        project: 'wombat-track'
      },
      {
        projectId: 'OF-SDLC-IMP2',
        phaseId: 'OF-8.8',
        memoryAnchor: 'of-8.8.1-agent-framework'
      }
    );
    taskIds.push(governanceTask);

    // Runtime monitoring setup
    const monitoringTask = await visionLayerAgentFramework.createTask(
      'runtime-monitor-001',
      'monitoring',
      'medium',
      {
        scope: 'baseline',
        metrics: ['performance', 'resources', 'errors'],
        interval: 60000
      },
      {
        projectId: 'OF-SDLC-IMP2',
        phaseId: 'OF-8.8'
      }
    );
    taskIds.push(monitoringTask);

    // Code quality assessment
    const codeTask = await visionLayerAgentFramework.createTask(
      'code-advisor-001',
      'analysis',
      'medium',
      {
        scope: 'quality_assessment',
        focus: ['patterns', 'best_practices', 'security'],
        codebase: 'src/'
      },
      {
        projectId: 'OF-SDLC-IMP2',
        phaseId: 'OF-8.8'
      }
    );
    taskIds.push(codeTask);

    // Risk assessment
    const riskTask = await visionLayerAgentFramework.createTask(
      'risk-assessor-001',
      'analysis',
      'medium',
      {
        scope: 'project_risks',
        focus: ['technical', 'governance', 'timeline'],
        project: 'wombat-track'
      },
      {
        projectId: 'OF-SDLC-IMP2',
        phaseId: 'OF-8.8'
      }
    );
    taskIds.push(riskTask);

    return taskIds;
  }

  private async executePriorityTasks(taskIds: string[]): Promise<void> {
    const tasks = visionLayerAgentFramework.getTasks();
    const highPriorityTasks = tasks.filter(t => 
      taskIds.includes(t.id) && (t.priority === 'high' || t.priority === 'critical')
    );

    for (const task of highPriorityTasks) {
      try {
        console.log(`  ⚡ Executing: ${task.type} (${task.priority})`);
        const result = await visionLayerAgentFramework.executeTask(task.id);
        
        if (result.success) {
          console.log(`    ✅ Completed successfully`);
          if (result.recommendations.length > 0) {
            console.log(`    💡 Recommendations: ${result.recommendations.slice(0, 2).join(', ')}`);
          }
        } else {
          console.log(`    ❌ Task failed`);
        }
      } catch (error: any) {
        console.log(`    ⚠️  Error: ${error.message}`);
      }
    }
  }

  private async logDeploymentGovernance(agentsDeployed: number, tasksCreated: number): Promise<void> {
    // Create memory anchor for deployment
    enhancedGovernanceLogger.createPhaseAnchor('vision-agents-deployed', 'deployment');
    
    // Log governance event
    enhancedGovernanceLogger.logWorkSurfaceNav(
      'OF-SDLC-IMP2',
      'OF-8.8.1',
      'execute'
    );

    // Would integrate with actual governance logging service
    console.log(`    📝 Deployment logged: ${agentsDeployed} agents, ${tasksCreated} tasks`);
  }

  private printDeploymentSummary(result: DeploymentResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VISION LAYER AGENT DEPLOYMENT SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`🎯 Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`🤖 Agents Deployed: ${result.agentsDeployed}`);
    console.log(`📋 Tasks Created: ${result.tasksCreated}`);
    
    if (result.systemHealth) {
      console.log(`💚 System Health: ${result.systemHealth.status.toUpperCase()}`);
      console.log(`   Active Agents: ${result.systemHealth.agents.active}`);
      console.log(`   Completed Tasks: ${result.systemHealth.tasks.completed}`);
    }

    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    }

    console.log('\n🚀 Available Agents:');
    const agents = visionLayerAgentFramework.getAgents();
    agents.forEach(agent => {
      console.log(`   ${agent.status === 'active' ? '🟢' : '🟡'} ${agent.name} (${agent.type})`);
    });

    console.log('\n💡 Next Steps:');
    console.log('   - Monitor agent performance via system health endpoint');
    console.log('   - Review task results for actionable insights');
    console.log('   - Configure automated monitoring schedules');
    console.log('   - Integrate with CI/CD pipeline for continuous intelligence');
    
    console.log('\n' + '='.repeat(60));
  }

  async testAgentCommunication(): Promise<void> {
    console.log('\n🔧 Testing Agent Communication...');
    
    try {
      const testTask = await visionLayerAgentFramework.createTask(
        'project-inspector-001',
        'analysis',
        'low',
        { test: true, message: 'Communication test' },
        { projectId: 'test' }
      );

      const result = await visionLayerAgentFramework.executeTask(testTask);
      
      if (result.success) {
        console.log('✅ Agent communication working correctly');
      } else {
        console.log('❌ Agent communication failed');
      }
    } catch (error: any) {
      console.log(`⚠️ Communication test failed: ${error.message}`);
    }
  }

  async generateProjectIntelligence(projectId: string = 'OF-SDLC-IMP2'): Promise<void> {
    console.log(`\n🧠 Generating Project Intelligence for ${projectId}...`);
    
    try {
      const intelligence = await visionLayerAgentFramework.getProjectIntelligence(projectId);
      
      console.log('\n📊 Project Intelligence Report:');
      console.log(`   Health Score: ${(intelligence.health.score * 100).toFixed(1)}% (${intelligence.health.trend})`);
      console.log(`   Governance Compliance: ${(intelligence.governance.complianceScore * 100).toFixed(1)}%`);
      console.log(`   Code Quality: ${(intelligence.technical.codeQuality * 100).toFixed(1)}%`);
      console.log(`   Test Coverage: ${(intelligence.technical.testCoverage * 100).toFixed(1)}%`);
      
      if (intelligence.recommendations.immediate.length > 0) {
        console.log('\n⚡ Immediate Recommendations:');
        intelligence.recommendations.immediate.forEach(rec => console.log(`   • ${rec}`));
      }
      
    } catch (error: any) {
      console.log(`❌ Failed to generate project intelligence: ${error.message}`);
    }
  }
}

// Execute deployment if run directly
if (require.main === module) {
  const deployment = new VisionAgentDeployment();
  
  deployment.deploy()
    .then(async (result) => {
      if (result.success) {
        // Run additional tests
        await deployment.testAgentCommunication();
        await deployment.generateProjectIntelligence();
        
        console.log('\n🎉 Vision Layer Agent Framework deployment completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Deployment failed. Check logs for details.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error during deployment:', error);
      process.exit(1);
    });
}

export { VisionAgentDeployment };