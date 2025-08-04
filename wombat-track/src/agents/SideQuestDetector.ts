/**
 * Side Quest Detector Agent
 * Automatically detects when project steps should be marked as side quests
 * Based on scope changes, timeline extensions, and resource additions
 */

import { EventEmitter } from 'events';
import type { PhaseStep, Phase, Project } from '../types/phase';
import { governanceLogger } from '../services/governanceLogger';

export interface SideQuestDetectionRule {
  id: string;
  name: string;
  trigger: 'scope_change' | 'timeline_extension' | 'resource_addition' | 'dependency_addition';
  threshold: number;
  weight: number;
  enabled: boolean;
}

export interface SideQuestDetectionConfig {
  rules: SideQuestDetectionRule[];
  autoConvert: boolean;
  requireApproval: boolean;
  notificationChannels: string[];
  confidenceThreshold: number; // 0-1, minimum confidence to flag as side quest
}

export interface SideQuestDetectionResult {
  stepId: string;
  confidence: number; // 0-1
  triggeredRules: string[];
  recommendation: 'convert' | 'flag' | 'ignore';
  reasoning: string;
  metadata: Record<string, unknown>;
}

export class SideQuestDetector extends EventEmitter {
  private config: SideQuestDetectionConfig;
  private detectionHistory: Map<string, SideQuestDetectionResult[]>;
  private isActive: boolean = false;

  constructor(config?: Partial<SideQuestDetectionConfig>) {
    super();
    
    this.config = {
      rules: [
        {
          id: 'scope-expansion',
          name: 'Scope Expansion Detection',
          trigger: 'scope_change',
          threshold: 0.3, // 30% scope increase
          weight: 0.8,
          enabled: true
        },
        {
          id: 'timeline-extension',
          name: 'Timeline Extension Detection', 
          trigger: 'timeline_extension',
          threshold: 0.5, // 50% timeline increase
          weight: 0.7,
          enabled: true
        },
        {
          id: 'resource-addition',
          name: 'Resource Addition Detection',
          trigger: 'resource_addition',
          threshold: 0.25, // 25% resource increase
          weight: 0.6,
          enabled: true
        },
        {
          id: 'dependency-addition',
          name: 'New Dependency Detection',
          trigger: 'dependency_addition',
          threshold: 2, // 2+ new dependencies
          weight: 0.5,
          enabled: true
        }
      ],
      autoConvert: false,
      requireApproval: true,
      notificationChannels: ['governance-log', 'ui-notification'],
      confidenceThreshold: 0.7,
      ...config
    };

    this.detectionHistory = new Map();
  }

  /**
   * Start the Side Quest Detector agent
   */
  async start(): Promise<void> {
    this.isActive = true;
    this.emit('agent-started', { agentId: 'side-quest-detector', timestamp: new Date().toISOString() });
    
    governanceLogger.logSidebarInteraction({
      action: 'sub_app_launch',
      target: 'SideQuestDetector',
      context: 'sidebar_navigation',
      metadata: {
        agent_status: 'started',
        config: this.config
      }
    });
  }

  /**
   * Stop the Side Quest Detector agent
   */
  async stop(): Promise<void> {
    this.isActive = false;
    this.emit('agent-stopped', { agentId: 'side-quest-detector', timestamp: new Date().toISOString() });
  }

  /**
   * Analyze a phase step for side quest characteristics
   */
  async analyzeStep(
    step: PhaseStep, 
    phase: Phase, 
    project: Project,
    previousVersion?: PhaseStep
  ): Promise<SideQuestDetectionResult> {
    if (!this.isActive) {
      throw new Error('Side Quest Detector is not active');
    }

    const triggeredRules: string[] = [];
    let totalConfidence = 0;
    let totalWeight = 0;

    // Analyze against each enabled rule
    for (const rule of this.config.rules.filter(r => r.enabled)) {
      const ruleResult = await this.evaluateRule(rule, step, phase, project, previousVersion);
      
      if (ruleResult.triggered) {
        triggeredRules.push(rule.id);
        totalConfidence += ruleResult.confidence * rule.weight;
      }
      totalWeight += rule.weight;
    }

    // Calculate final confidence score
    const confidence = totalWeight > 0 ? totalConfidence / totalWeight : 0;
    
    // Determine recommendation
    let recommendation: 'convert' | 'flag' | 'ignore';
    if (confidence >= this.config.confidenceThreshold) {
      recommendation = this.config.autoConvert ? 'convert' : 'flag';
    } else if (confidence >= 0.5) {
      recommendation = 'flag';
    } else {
      recommendation = 'ignore';
    }

    const result: SideQuestDetectionResult = {
      stepId: step.id,
      confidence,
      triggeredRules,
      recommendation,
      reasoning: this.generateReasoning(triggeredRules, confidence),
      metadata: {
        phase_id: phase.id,
        project_id: project.id,
        analysis_timestamp: new Date().toISOString(),
        rules_evaluated: this.config.rules.length,
        rules_triggered: triggeredRules.length
      }
    };

    // Store in history
    const stepHistory = this.detectionHistory.get(step.id) || [];
    stepHistory.push(result);
    this.detectionHistory.set(step.id, stepHistory);

    // Emit detection event
    this.emit('side-quest-detected', result);

    // Log governance event
    governanceLogger.logSidebarInteraction({
      action: 'sub_app_launch',
      target: 'SideQuestDetection',
      context: 'sidebar_navigation',
      metadata: {
        step_id: step.id,
        confidence,
        recommendation,
        triggered_rules: triggeredRules
      }
    });

    return result;
  }

  /**
   * Evaluate a specific detection rule
   */
  private async evaluateRule(
    rule: SideQuestDetectionRule,
    step: PhaseStep,
    phase: Phase,
    project: Project,
    previousVersion?: PhaseStep
  ): Promise<{ triggered: boolean; confidence: number; details: Record<string, unknown> }> {
    
    switch (rule.trigger) {
      case 'scope_change':
        return this.evaluateScopeChange(rule, step, previousVersion);
      
      case 'timeline_extension':
        return this.evaluateTimelineExtension(rule, step, previousVersion);
      
      case 'resource_addition':
        return this.evaluateResourceAddition(rule, step, phase, previousVersion);
      
      case 'dependency_addition':
        return this.evaluateDependencyAddition(rule, step, previousVersion);
      
      default:
        return { triggered: false, confidence: 0, details: {} };
    }
  }

  /**
   * Evaluate scope change rule
   */
  private async evaluateScopeChange(
    rule: SideQuestDetectionRule,
    step: PhaseStep,
    previousVersion?: PhaseStep
  ): Promise<{ triggered: boolean; confidence: number; details: Record<string, unknown> }> {
    
    if (!previousVersion) {
      return { triggered: false, confidence: 0, details: { reason: 'no_previous_version' } };
    }

    // Compare step descriptions for scope changes
    const currentScope = step.description?.length || 0;
    const previousScope = previousVersion.description?.length || 0;
    
    const scopeIncrease = currentScope > 0 ? (currentScope - previousScope) / previousScope : 0;
    
    const triggered = scopeIncrease >= rule.threshold;
    const confidence = triggered ? Math.min(scopeIncrease / rule.threshold, 1) : 0;

    return {
      triggered,
      confidence,
      details: {
        current_scope_length: currentScope,
        previous_scope_length: previousScope,
        scope_increase_ratio: scopeIncrease,
        threshold: rule.threshold
      }
    };
  }

  /**
   * Evaluate timeline extension rule
   */
  private async evaluateTimelineExtension(
    rule: SideQuestDetectionRule,
    step: PhaseStep,
    previousVersion?: PhaseStep
  ): Promise<{ triggered: boolean; confidence: number; details: Record<string, unknown> }> {
    
    // For now, use simple heuristics based on step name changes indicating timeline extension
    const timelineKeywords = ['extend', 'additional', 'extra', 'bonus', 'enhancement', 'improvement'];
    const stepName = step.name.toLowerCase();
    
    const hasTimelineKeywords = timelineKeywords.some(keyword => stepName.includes(keyword));
    const triggered = hasTimelineKeywords;
    const confidence = triggered ? 0.6 : 0; // Medium confidence for keyword detection

    return {
      triggered,
      confidence,
      details: {
        timeline_keywords_found: timelineKeywords.filter(keyword => stepName.includes(keyword)),
        step_name: step.name
      }
    };
  }

  /**
   * Evaluate resource addition rule
   */
  private async evaluateResourceAddition(
    rule: SideQuestDetectionRule,
    step: PhaseStep,
    phase: Phase,
    previousVersion?: PhaseStep
  ): Promise<{ triggered: boolean; confidence: number; details: Record<string, unknown> }> {
    
    // Check if step has completion checklist (indicates additional resources/tasks)
    const hasChecklist = step.completionChecklist && step.completionChecklist.length > 0;
    const checklistSize = step.completionChecklist?.length || 0;
    
    // More checklist items suggest more resources needed
    const resourceScore = checklistSize > 3 ? checklistSize / 10 : 0;
    
    const triggered = resourceScore >= rule.threshold;
    const confidence = triggered ? Math.min(resourceScore / rule.threshold, 1) : 0;

    return {
      triggered,
      confidence,
      details: {
        has_checklist: hasChecklist,
        checklist_size: checklistSize,
        resource_score: resourceScore,
        threshold: rule.threshold
      }
    };
  }

  /**
   * Evaluate dependency addition rule
   */
  private async evaluateDependencyAddition(
    rule: SideQuestDetectionRule,
    step: PhaseStep,
    previousVersion?: PhaseStep
  ): Promise<{ triggered: boolean; confidence: number; details: Record<string, unknown> }> {
    
    // Check CI workflow references as proxy for dependencies
    const currentDependencies = step.ciWorkflowRefs?.length || 0;
    const previousDependencies = previousVersion?.ciWorkflowRefs?.length || 0;
    
    const newDependencies = Math.max(0, currentDependencies - previousDependencies);
    
    const triggered = newDependencies >= rule.threshold;
    const confidence = triggered ? Math.min(newDependencies / rule.threshold, 1) : 0;

    return {
      triggered,
      confidence,
      details: {
        current_dependencies: currentDependencies,
        previous_dependencies: previousDependencies,
        new_dependencies: newDependencies,
        threshold: rule.threshold
      }
    };
  }

  /**
   * Generate human-readable reasoning for detection result
   */
  private generateReasoning(triggeredRules: string[], confidence: number): string {
    if (triggeredRules.length === 0) {
      return 'No side quest indicators detected. Step appears to be within original scope.';
    }

    const ruleNames = triggeredRules.map(ruleId => 
      this.config.rules.find(r => r.id === ruleId)?.name || ruleId
    );

    const confidenceDescription = confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'medium' : 'low';

    return `Detected ${confidenceDescription} confidence (${Math.round(confidence * 100)}%) side quest indicators: ${ruleNames.join(', ')}. Consider marking as side quest for better project tracking.`;
  }

  /**
   * Get detection history for a step
   */
  getStepHistory(stepId: string): SideQuestDetectionResult[] {
    return this.detectionHistory.get(stepId) || [];
  }

  /**
   * Update detection configuration
   */
  updateConfig(newConfig: Partial<SideQuestDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', { agentId: 'side-quest-detector', config: this.config });
  }

  /**
   * Get current agent status
   */
  getStatus(): { active: boolean; config: SideQuestDetectionConfig; historySize: number } {
    return {
      active: this.isActive,
      config: this.config,
      historySize: this.detectionHistory.size
    };
  }
}

// Export singleton instance
export const sideQuestDetector = new SideQuestDetector();