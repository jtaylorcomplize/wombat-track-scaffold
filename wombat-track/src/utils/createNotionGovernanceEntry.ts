import { createNotionClient } from './notionClient';
import type { GovernanceEvent } from '../types/governance';

export interface NotionGovernanceEntry {
  title: string;
  content: string;
  project?: string;
  phase?: string;
  status?: string;
  tags?: string[];
  author?: string;
  timestamp?: string;
}

export interface GovernanceEntryConfig {
  databaseId: string;
  token?: string;
}

export class NotionGovernanceHelper {
  private notionClient;
  private databaseId: string;

  constructor(config: GovernanceEntryConfig) {
    this.notionClient = createNotionClient(config.token);
    this.databaseId = config.databaseId;
  }

  async getDatabaseSchema() {
    try {
      const database = await this.notionClient.queryDatabase({
        database_id: this.databaseId,
        page_size: 1,
      });
      
      return database;
    } catch (error) {
      throw new Error(`Failed to get database schema: ${error}`);
    }
  }

  async createGovernanceEntry(entry: NotionGovernanceEntry): Promise<any> {
    try {
      // Get database info to understand the schema
      const response = await this.notionClient.queryDatabase({
        database_id: this.databaseId,
        page_size: 1,
      });

      console.log('Database properties available:', Object.keys(response.results[0]?.properties || {}));

      // Create a flexible property mapping based on common Notion property names
      const properties: any = {};

      // Title property (required for all Notion pages)
      properties['Name'] = {
        title: [{ text: { content: entry.title } }]
      };

      // Try alternative title properties
      if (!properties['Name']) {
        properties['Title'] = {
          title: [{ text: { content: entry.title } }]
        };
      }

      // Add content as rich text
      if (entry.content) {
        properties['Content'] = {
          rich_text: [{ text: { content: entry.content.substring(0, 2000) } }] // Notion has limits
        };
      }

      // Add project if available
      if (entry.project) {
        properties['Project'] = {
          rich_text: [{ text: { content: entry.project } }]
        };
      }

      // Add phase if available
      if (entry.phase) {
        properties['Phase'] = {
          rich_text: [{ text: { content: entry.phase } }]
        };
      }

      // Add status if available
      if (entry.status) {
        properties['Status'] = {
          rich_text: [{ text: { content: entry.status } }]
        };
      }

      // Add timestamp if available
      if (entry.timestamp) {
        properties['Date'] = {
          date: { start: entry.timestamp }
        };
      }

      // Add author if available
      if (entry.author) {
        properties['Author'] = {
          rich_text: [{ text: { content: entry.author } }]
        };
      }

      // Add tags if available
      if (entry.tags && entry.tags.length > 0) {
        properties['Tags'] = {
          rich_text: [{ text: { content: entry.tags.join(', ') } }]
        };
      }

      const result = await this.notionClient.writePage({
        parent: { database_id: this.databaseId },
        properties
      });

      return {
        success: true,
        pageId: result.id,
        url: result.url,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async createFromGovernanceEvent(event: GovernanceEvent): Promise<any> {
    const entry: NotionGovernanceEntry = {
      title: `${event.eventType}: ${event.id}`,
      content: `Event: ${event.eventType}
Triggered by: ${event.triggeredBy}
Phase Step: ${event.phaseStepId}
Status: ${event.newStatus || 'N/A'}
Timestamp: ${event.timestamp}

Details: ${JSON.stringify(event.details, null, 2)}

Rollback Info: ${event.rollbackInfo ? JSON.stringify(event.rollbackInfo, null, 2) : 'N/A'}`,
      project: event.linkedProject,
      phase: event.linkedPhase,
      status: event.newStatus,
      author: event.agentId || event.triggeredBy,
      timestamp: event.timestamp,
      tags: event.severity ? [event.severity, event.eventType] : [event.eventType]
    };

    return this.createGovernanceEntry(entry);
  }
}

// Convenience function
export async function createNotionGovernanceEntry(
  entry: NotionGovernanceEntry,
  config: GovernanceEntryConfig
): Promise<any> {
  const helper = new NotionGovernanceHelper(config);
  return helper.createGovernanceEntry(entry);
}

// Function to create from governance event
export async function createGovernanceEntryFromEvent(
  event: GovernanceEvent,
  config: GovernanceEntryConfig
): Promise<any> {
  const helper = new NotionGovernanceHelper(config);
  return helper.createFromGovernanceEvent(event);
}