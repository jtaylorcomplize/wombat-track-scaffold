import { Client } from '@notionhq/client';
import type { CreateDatabaseParameters } from '@notionhq/client/build/src/api-endpoints';

export interface DatabaseSchema {
  name: string;
  description?: string;
  properties: Record<string, unknown>; // no-explicit-any fix
}

export class NotionDatabaseCreator {
  private client: Client;
  private parentPageId: string;

  constructor(token: string, parentPageId: string) {
    this.client = new Client({ auth: token });
    this.parentPageId = parentPageId;
  }

  async createDatabase(schema: DatabaseSchema) {
    try {
      const parameters: CreateDatabaseParameters = {
        parent: { page_id: this.parentPageId },
        title: [
          {
            text: {
              content: schema.name,
            },
          },
        ],
        properties: schema.properties,
      };

      if (schema.description) {
        parameters.description = [
          {
            text: {
              content: schema.description,
            },
          },
        ];
      }

      const response = await this.client.databases.create(parameters);
      return {
        success: true,
        databaseId: response.id,
        url: response.url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Project Database Schema
  static getProjectSchema(): DatabaseSchema {
    return {
      name: 'WT Projects',
      description: 'Wombat Track project registry and metadata',
      properties: {
        projectId: {
          title: {},
        },
        title: {
          rich_text: {},
        },
        description: {
          rich_text: {},
        },
        owner: {
          rich_text: {},
        },
        aiPromptLog: {
          rich_text: {},
        },
        status: {
          select: {
            options: [
              { name: 'Planning', color: 'gray' },
              { name: 'Active', color: 'green' },
              { name: 'On Hold', color: 'yellow' },
              { name: 'Completed', color: 'blue' },
              { name: 'Archived', color: 'red' },
            ],
          },
        },
        tags: {
          multi_select: {
            options: [
              { name: 'AI-Enhanced', color: 'purple' },
              { name: 'Governance', color: 'blue' },
              { name: 'Integration', color: 'green' },
              { name: 'Migration', color: 'orange' },
              { name: 'Testing', color: 'pink' },
            ],
          },
        },
        createdAt: {
          created_time: {},
        },
        updatedAt: {
          last_edited_time: {},
        },
      },
    };
  }

  // Phase Database Schema
  static getPhaseSchema(projectDbId?: string): DatabaseSchema {
    const schema: DatabaseSchema = {
      name: 'WT Phases',
      description: 'Wombat Track phase planning and tracking',
      properties: {
        phaseId: {
          title: {},
        },
        title: {
          rich_text: {},
        },
        description: {
          rich_text: {},
        },
        status: {
          select: {
            options: [
              { name: 'Not Started', color: 'gray' },
              { name: 'In Progress', color: 'yellow' },
              { name: 'Completed', color: 'green' },
              { name: 'Blocked', color: 'red' },
              { name: 'Review', color: 'purple' },
            ],
          },
        },
        startDate: {
          date: {},
        },
        endDate: {
          date: {},
        },
        completionPercent: {
          number: {
            format: 'percent',
          },
        },
        ragStatus: {
          select: {
            options: [
              { name: 'Red', color: 'red' },
              { name: 'Amber', color: 'yellow' },
              { name: 'Green', color: 'green' },
            ],
          },
        },
        ownerId: {
          rich_text: {},
        },
        tags: {
          multi_select: {
            options: [
              { name: 'Critical Path', color: 'red' },
              { name: 'Milestone', color: 'blue' },
              { name: 'Quick Win', color: 'green' },
              { name: 'Technical', color: 'purple' },
              { name: 'Business', color: 'orange' },
            ],
          },
        },
        createdAt: {
          created_time: {},
        },
        updatedAt: {
          last_edited_time: {},
        },
      },
    };

    // Add relation if projectDbId is provided
    if (projectDbId) {
      schema.properties.projectId = {
        relation: {
          database_id: projectDbId,
          type: 'single_select',
        },
      };
    } else {
      // Fallback to text field if no relation
      schema.properties.projectId = {
        rich_text: {},
      };
    }

    return schema;
  }

  // PhaseStep Database Schema
  static getPhaseStepSchema(projectDbId?: string): DatabaseSchema {
    const schema: DatabaseSchema = {
      name: 'WT Phase Steps',
      description: 'Detailed step-by-step instructions for each phase',
      properties: {
        phaseStepId: {
          title: {},
        },
        stepNumber: {
          number: {},
        },
        stepInstruction: {
          rich_text: {},
        },
        isSideQuest: {
          checkbox: {},
        },
        aiSuggestedTemplates: {
          rich_text: {},
        },
        createdAt: {
          created_time: {},
        },
        updatedAt: {
          last_edited_time: {},
        },
      },
    };

    // Add relation if projectDbId is provided
    if (projectDbId) {
      schema.properties.projectId = {
        relation: {
          database_id: projectDbId,
          type: 'single_select',
        },
      };
    } else {
      schema.properties.projectId = {
        rich_text: {},
      };
    }

    return schema;
  }

  // Enhanced Governance Log Schema with RAG support
  static getEnhancedGovernanceSchema(phaseStepDbId?: string): DatabaseSchema {
    const schema: DatabaseSchema = {
      name: 'WT Governance Log (Enhanced)',
      description: 'Enhanced governance log with RAG status and semantic memory support',
      properties: {
        'Event ID': {
          title: {},
        },
        'Event Type': {
          select: {
            options: [
              { name: 'Decision', color: 'blue' },
              { name: 'StepStatusUpdated', color: 'green' },
              { name: 'PhaseUpdated', color: 'purple' },
              { name: 'AgentAction', color: 'orange' },
              { name: 'SystemUpgrade', color: 'red' },
              { name: 'MeshChange', color: 'pink' },
            ],
          },
        },
        'RAG Status': {
          select: {
            options: [
              { name: 'Red', color: 'red' },
              { name: 'Amber', color: 'yellow' },
              { name: 'Green', color: 'green' },
            ],
          },
        },
        'Summary': {
          rich_text: {},
        },
        'AI Draft Entry': {
          rich_text: {},
        },
        'MemoryPlugin Tags': {
          multi_select: {
            options: [
              { name: 'decision', color: 'blue' },
              { name: 'technical', color: 'purple' },
              { name: 'governance', color: 'green' },
              { name: 'integration', color: 'orange' },
              { name: 'milestone', color: 'red' },
            ],
          },
        },
        'Confidence': {
          select: {
            options: [
              { name: 'High', color: 'green' },
              { name: 'Medium', color: 'yellow' },
              { name: 'Low', color: 'red' },
            ],
          },
        },
        'Timestamp': {
          date: {},
        },
        'Author': {
          rich_text: {},
        },
        'Source System': {
          select: {
            options: [
              { name: 'Wombat Track', color: 'blue' },
              { name: 'Claude', color: 'purple' },
              { name: 'Gizmo', color: 'green' },
              { name: 'GitHub', color: 'gray' },
              { name: 'Manual', color: 'orange' },
            ],
          },
        },
        'Last Synced': {
          date: {},
        },
      },
    };

    // Add relation if phaseStepDbId is provided
    if (phaseStepDbId) {
      schema.properties['Linked PhaseStep'] = {
        relation: {
          database_id: phaseStepDbId,
          type: 'single_select',
        },
      };
    }

    return schema;
  }

  // Backfill Task Tracker Database Schema
  static getBackfillTaskTrackerSchema(phaseDbId?: string): DatabaseSchema {
    const schema: DatabaseSchema = {
      name: 'wt-backfill-task-tracker',
      description: 'Track data reconciliation and governance backfill tasks for WT-8.0.3',
      properties: {
        taskTitle: {
          title: {},
        },
        databaseName: {
          select: {
            options: [
              { name: 'wt-project-tracker', color: 'blue' },
              { name: 'wt-claude-gizmo-comm', color: 'green' },
              { name: 'wt-tech-debt-register', color: 'orange' },
              { name: 'wt-schema-sync-report', color: 'purple' },
              { name: 'Multiple Databases', color: 'gray' },
            ],
          },
        },
        issueType: {
          select: {
            options: [
              { name: 'Missing Field', color: 'red' },
              { name: 'Orphaned Entry', color: 'yellow' },
              { name: 'Relationship Mismatch', color: 'orange' },
              { name: 'Invalid Value', color: 'pink' },
              { name: 'Data Quality', color: 'blue' },
            ],
          },
        },
        priority: {
          select: {
            options: [
              { name: 'High', color: 'red' },
              { name: 'Medium', color: 'yellow' },
              { name: 'Low', color: 'green' },
            ],
          },
        },
        category: {
          select: {
            options: [
              { name: 'Data Quality', color: 'blue' },
              { name: 'Relationships', color: 'green' },
              { name: 'Governance', color: 'purple' },
              { name: 'Migration', color: 'orange' },
            ],
          },
        },
        status: {
          select: {
            options: [
              { name: 'Open', color: 'red' },
              { name: 'In Progress', color: 'yellow' },
              { name: 'Resolved', color: 'green' },
              { name: 'Deferred', color: 'gray' },
              { name: 'Blocked', color: 'purple' },
            ],
          },
        },
        assignee: {
          rich_text: {},
        },
        estimatedEffort: {
          select: {
            options: [
              { name: '<30min', color: 'green' },
              { name: '1-2 hours', color: 'yellow' },
              { name: '1+ days', color: 'red' },
              { name: 'Automated', color: 'blue' },
            ],
          },
        },
        recordsAffected: {
          number: {},
        },
        suggestedFix: {
          rich_text: {},
        },
        notes: {
          rich_text: {},
        },
        createdAt: {
          created_time: {},
        },
        updatedAt: {
          last_edited_time: {},
        },
      },
    };

    // Add relation if phaseDbId is provided
    if (phaseDbId) {
      schema.properties.linkedPhase = {
        relation: {
          database_id: phaseDbId,
          type: 'single_select',
        },
      };
    } else {
      schema.properties.linkedPhase = {
        rich_text: {},
      };
    }

    return schema;
  }

  // Schema Sync Report Database Schema  
  static getSchemaSyncReportSchema(phaseDbId?: string): DatabaseSchema {
    const schema: DatabaseSchema = {
      name: 'wt-schema-sync-report',
      description: 'Schema synchronization tracking and issue management for oApp migration',
      properties: {
        tableName: {
          title: {},
        },
        fieldName: {
          rich_text: {},
        },
        issueType: {
          select: {
            options: [
              { name: 'Missing', color: 'red' },
              { name: 'Renamed', color: 'yellow' },
              { name: 'Deprecated', color: 'gray' },
              { name: 'Type Mismatch', color: 'orange' },
              { name: 'Extra Field', color: 'blue' },
            ],
          },
        },
        resolution: {
          select: {
            options: [
              { name: 'Map', color: 'blue' },
              { name: 'Add', color: 'green' },
              { name: 'Ignore', color: 'gray' },
              { name: 'Deprecate', color: 'red' },
            ],
          },
        },
        canonicalSource: {
          rich_text: {},
        },
        status: {
          select: {
            options: [
              { name: 'Open', color: 'red' },
              { name: 'In Progress', color: 'yellow' },
              { name: 'Resolved', color: 'green' },
              { name: 'Deferred', color: 'gray' },
            ],
          },
        },
        notes: {
          rich_text: {},
        },
        createdAt: {
          created_time: {},
        },
        updatedAt: {
          last_edited_time: {},
        },
      },
    };

    // Add relation if phaseDbId is provided
    if (phaseDbId) {
      schema.properties.linkedPhase = {
        relation: {
          database_id: phaseDbId,
          type: 'single_select',
        },
      };
    } else {
      // Fallback to text field
      schema.properties.linkedPhase = {
        rich_text: {},
      };
    }

    return schema;
  }

  // Tech Debt Register Database Schema
  static getTechDebtRegisterSchema(phaseDbId?: string): DatabaseSchema {
    const schema: DatabaseSchema = {
      name: 'wt-tech-debt-register',
      description: 'Central registry for active technical debt, lint violations, and code quality issues',
      properties: {
        title: {
          title: {},
        },
        category: {
          select: {
            options: [
              { name: 'Lint', color: 'yellow' },
              { name: 'Dead Code', color: 'red' },
              { name: 'Structural', color: 'blue' },
              { name: 'Design Debt', color: 'purple' },
              { name: 'Legacy', color: 'gray' },
            ],
          },
        },
        priority: {
          select: {
            options: [
              { name: 'High', color: 'red' },
              { name: 'Medium', color: 'yellow' },
              { name: 'Low', color: 'green' },
            ],
          },
        },
        originFile: {
          rich_text: {},
        },
        lineReference: {
          rich_text: {},
        },
        status: {
          select: {
            options: [
              { name: 'Open', color: 'red' },
              { name: 'Suppressed', color: 'yellow' },
              { name: 'Fixed', color: 'green' },
              { name: 'Deferred', color: 'gray' },
            ],
          },
        },
        effortEstimate: {
          rich_text: {},
        },
        linkedPR: {
          url: {},
        },
        notes: {
          rich_text: {},
        },
        canonicalUse: {
          checkbox: {},
        },
        createdAt: {
          created_time: {},
        },
        updatedAt: {
          last_edited_time: {},
        },
      },
    };

    // Add relation if phaseDbId is provided
    if (phaseDbId) {
      schema.properties.linkedPhase = {
        relation: {
          database_id: phaseDbId,
          type: 'single_select',
        },
      };
    } else {
      // Fallback to text field
      schema.properties.linkedPhase = {
        rich_text: {},
      };
    }

    return schema;
  }
}

// Utility function to create all databases
export async function createWombatTrackDatabases(
  token: string,
  parentPageId: string
): Promise<{
  projectDb?: { id: string; url: string };
  phaseDb?: { id: string; url: string };
  phaseStepDb?: { id: string; url: string };
  governanceDb?: { id: string; url: string };
  errors: string[];
}> {
  const creator = new NotionDatabaseCreator(token, parentPageId);
  const results: Record<string, unknown> = {}; // no-explicit-any fix
  const errors: string[] = [];

  // Create Project Database
  console.log('📊 Creating Project database...');
  const projectResult = await creator.createDatabase(
    NotionDatabaseCreator.getProjectSchema()
  );
  if (projectResult.success) {
    results.projectDb = {
      id: projectResult.databaseId!,
      url: projectResult.url!,
    };
    console.log(`✅ Project database created: ${projectResult.databaseId}`);
  } else {
    errors.push(`Project DB: ${projectResult.error}`);
  }

  // Create Phase Database (with relation to Project)
  if (results.projectDb) {
    console.log('📊 Creating Phase database...');
    const phaseResult = await creator.createDatabase(
      NotionDatabaseCreator.getPhaseSchema(results.projectDb.id)
    );
    if (phaseResult.success) {
      results.phaseDb = {
        id: phaseResult.databaseId!,
        url: phaseResult.url!,
      };
      console.log(`✅ Phase database created: ${phaseResult.databaseId}`);
    } else {
      errors.push(`Phase DB: ${phaseResult.error}`);
    }
  }

  // Create PhaseStep Database (with relation to Project)
  if (results.projectDb) {
    console.log('📊 Creating PhaseStep database...');
    const stepResult = await creator.createDatabase(
      NotionDatabaseCreator.getPhaseStepSchema(results.projectDb.id)
    );
    if (stepResult.success) {
      results.phaseStepDb = {
        id: stepResult.databaseId!,
        url: stepResult.url!,
      };
      console.log(`✅ PhaseStep database created: ${stepResult.databaseId}`);
    } else {
      errors.push(`PhaseStep DB: ${stepResult.error}`);
    }
  }

  // Create Enhanced Governance Database (with relation to PhaseStep)
  if (results.phaseStepDb) {
    console.log('📊 Creating Enhanced Governance database...');
    const govResult = await creator.createDatabase(
      NotionDatabaseCreator.getEnhancedGovernanceSchema(results.phaseStepDb.id)
    );
    if (govResult.success) {
      results.governanceDb = {
        id: govResult.databaseId!,
        url: govResult.url!,
      };
      console.log(`✅ Governance database created: ${govResult.databaseId}`);
    } else {
      errors.push(`Governance DB: ${govResult.error}`);
    }
  }

  results.errors = errors;
  return results;
}