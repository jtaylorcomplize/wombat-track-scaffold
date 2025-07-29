import { Client } from '@notionhq/client';
import type { CreateDatabaseParameters } from '@notionhq/client/build/src/api-endpoints';

export interface DatabaseSchema {
  name: string;
  description?: string;
  properties: Record<string, unknown>;
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

  // Project Database Schema - Updated for canonical format
  static getProjectSchema(): DatabaseSchema {
    return {
      name: 'wt-project-tracker', // Canonical name
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
        // New field: Goals (was 'Goals' in old schema)
        goals: {
          rich_text: {},
        },
        owner: {
          rich_text: {},
        },
        // Enhanced AI fields
        aiPromptLog: {
          rich_text: {},
        },
        // New fields for WT-7.2 requirements
        tooling: {
          rich_text: {},
        },
        knownIssues: {
          rich_text: {},
        },
        forwardGuidance: {
          rich_text: {},
        },
        openQuestions: {
          rich_text: {},
        },
        // Temporary field for phase links (will be relation later)
        linkedPhaseIds: {
          rich_text: {},
        },
        status: {
          select: {
            options: [
              { name: 'Planning', color: 'gray' },
              { name: 'Active', color: 'green' },
              { name: 'On Hold', color: 'yellow' },
              { name: 'Completed', color: 'blue' },
              { name: 'Complete', color: 'blue' }, // Support both variants
              { name: 'Archived', color: 'red' },
              { name: 'Blocked', color: 'red' },
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
              { name: 'MemSync', color: 'purple' },
              { name: 'Schema', color: 'gray' },
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

  // Phase Database Schema - Updated for canonical format
  static getPhaseSchema(projectDbId?: string): DatabaseSchema {
    const schema: DatabaseSchema = {
      name: 'wt-phase-tracker', // Canonical name
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
        // New fields for WT-7.2 requirements
        goals: {
          rich_text: {},
        },
        purpose: {
          rich_text: {},
        },
        expectedOutcome: {
          rich_text: {},
        },
        status: {
          select: {
            options: [
              { name: 'Not Started', color: 'gray' },
              { name: 'In Progress', color: 'yellow' },
              { name: 'Completed', color: 'green' },
              { name: 'Complete', color: 'green' }, // Support both variants
              { name: 'Blocked', color: 'red' },
              { name: 'On Hold', color: 'orange' },
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
      name: 'wt-phase-steps', // Canonical name
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
      name: 'wt-governance-log', // Canonical name
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

  // Recovery Log Database Schema - New for WT-7.2
  static getRecoveryLogSchema(): DatabaseSchema {
    return {
      name: 'wt-recovery-log', // Canonical name
      description: 'Recovery log for incomplete or dropped artefacts from Wombat Tracks chat archive',
      properties: {
        title: {
          title: {},
        },
        chatTimestamp: {
          date: {},
        },
        chatTitle: {
          rich_text: {},
        },
        artefactType: {
          select: {
            options: [
              { name: 'Project', color: 'blue' },
              { name: 'Phase', color: 'green' },
              { name: 'Feature', color: 'purple' },
              { name: 'SideQuest', color: 'pink' },
              { name: 'Document', color: 'gray' },
              { name: 'Configuration', color: 'orange' },
              { name: 'Other', color: 'default' },
            ],
          },
        },
        summary: {
          rich_text: {},
        },
        status: {
          select: {
            options: [
              { name: 'Cancelled', color: 'red' },
              { name: 'Missing', color: 'orange' },
              { name: 'Incomplete', color: 'yellow' },
              { name: 'Unlogged', color: 'gray' },
              { name: 'Complete', color: 'green' },
              { name: 'Pending Validation', color: 'purple' },
            ],
          },
        },
        suggestedName: {
          rich_text: {},
        },
        recoveryAction: {
          select: {
            options: [
              { name: 'Log', color: 'blue' },
              { name: 'Ignore', color: 'gray' },
              { name: 'Rebuild', color: 'orange' },
              { name: 'Archive', color: 'red' },
            ],
          },
        },
        notes: {
          rich_text: {},
        },
        linkedCanonicalEntry: {
          rich_text: {}, // Will store reference to existing entries
        },
        validationRequired: {
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
  recoveryLogDb?: { id: string; url: string };
  errors: string[];
}> {
  const creator = new NotionDatabaseCreator(token, parentPageId);
  const results: Record<string, unknown> = {};
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

  // Create Recovery Log Database (new for WT-7.2)
  console.log('📊 Creating Recovery Log database...');
  const recoveryResult = await creator.createDatabase(
    NotionDatabaseCreator.getRecoveryLogSchema()
  );
  if (recoveryResult.success) {
    results.recoveryLogDb = {
      id: recoveryResult.databaseId!,
      url: recoveryResult.url!,
    };
    console.log(`✅ Recovery Log database created: ${recoveryResult.databaseId}`);
  } else {
    errors.push(`Recovery Log DB: ${recoveryResult.error}`);
  }

  results.errors = errors;
  return results;
}