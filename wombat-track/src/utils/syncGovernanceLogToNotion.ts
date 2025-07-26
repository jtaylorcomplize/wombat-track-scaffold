import { createNotionClient } from './notionClient';
import type { GovernanceEvent } from '../types/governance';

export interface NotionGovernanceLogConfig {
  databaseId: string;
  token?: string;
}

export interface SyncResult {
  success: boolean;
  pageId?: string;
  url?: string;
  error?: string;
}

export class GovernanceLogSyncer {
  private notionClient;
  private databaseId: string;

  constructor(config: NotionGovernanceLogConfig) {
    this.notionClient = createNotionClient(config.token);
    this.databaseId = config.databaseId;
  }

  async syncGovernanceEvent(event: GovernanceEvent): Promise<SyncResult> {
    try {
      const properties = this.mapGovernanceEventToNotionProperties(event);
      
      const response = await this.notionClient.writePage({
        parent: { database_id: this.databaseId },
        properties,
      });

      return {
        success: true,
        pageId: response.id,
        url: response.url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private mapGovernanceEventToNotionProperties(event: GovernanceEvent) {
    const timestamp = new Date(event.timestamp);
    
    return {
      'Event ID': {
        title: [
          {
            text: {
              content: event.id,
            },
          },
        ],
      },
      'Event Type': {
        select: {
          name: event.eventType,
        },
      },
      'Phase Step ID': {
        rich_text: [
          {
            text: {
              content: event.phaseStepId || '',
            },
          },
        ],
      },
      'Status': {
        rich_text: [
          {
            text: {
              content: event.newStatus || '',
            },
          },
        ],
      },
      'Triggered By': {
        rich_text: [
          {
            text: {
              content: event.triggeredBy,
            },
          },
        ],
      },
      'Timestamp': {
        date: {
          start: timestamp.toISOString(),
        },
      },
      'Linked Project': {
        rich_text: [
          {
            text: {
              content: event.linkedProject || '',
            },
          },
        ],
      },
      'Linked Phase': {
        rich_text: [
          {
            text: {
              content: event.linkedPhase || '',
            },
          },
        ],
      },
      'Severity': {
        select: {
          name: event.severity || 'low',
        },
      },
      'Agent ID': {
        rich_text: [
          {
            text: {
              content: event.agentId || '',
            },
          },
        ],
      },
      'System Component': {
        rich_text: [
          {
            text: {
              content: event.systemComponent || '',
            },
          },
        ],
      },
      'Details': {
        rich_text: [
          {
            text: {
              content: event.details ? JSON.stringify(event.details, null, 2) : '',
            },
          },
        ],
      },
      'Can Rollback': {
        checkbox: event.rollbackInfo?.canRollback || false,
      },
    };
  }

  async syncMultipleEvents(events: GovernanceEvent[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    
    for (const event of events) {
      const result = await this.syncGovernanceEvent(event);
      results.push(result);
      
      // Add small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }
}

// Convenience function for single event sync
export async function syncGovernanceLogToNotion(
  event: GovernanceEvent,
  config: NotionGovernanceLogConfig
): Promise<SyncResult> {
  const syncer = new GovernanceLogSyncer(config);
  return syncer.syncGovernanceEvent(event);
}

// Function to sync from governance log file
export async function syncGovernanceLogFileToNotion(
  logFilePath: string,
  config: NotionGovernanceLogConfig
): Promise<SyncResult[]> {
  try {
    const fs = await import('fs/promises');
    const logContent = await fs.readFile(logFilePath, 'utf-8');
    const events: GovernanceEvent[] = logContent
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    const syncer = new GovernanceLogSyncer(config);
    return syncer.syncMultipleEvents(events);
  } catch (error) {
    return [{
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read governance log file',
    }];
  }
}