#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import { createNotionClient } from '../src/utils/notionClient.ts';

dotenv.config();

interface MergeResult {
  totalRecords: number;
  mergedRecords: number;
  archivedRecords: number;
  errors: string[];
}

class ClaudeGizmoMerger {
  private client: Client;
  private archiveDatabaseId?: string;
  
  constructor() {
    this.client = createNotionClient().client;
  }

  async findDatabase(name: string): Promise<any | null> {
    try {
      const response = await this.client.search({
        query: name,
        filter: {
          value: 'database',
          property: 'object'
        }
      });
      return response.results.length > 0 ? response.results[0] : null;
    } catch (error) {
      console.error(`Failed to find database ${name}:`, error);
      return null;
    }
  }

  async mergeClaudeGizmoDatabases(): Promise<MergeResult> {
    console.log('🔄 Starting Claude-Gizmo database merge...\n');
    
    const result: MergeResult = {
      totalRecords: 0,
      mergedRecords: 0,
      archivedRecords: 0,
      errors: []
    };

    try {
      // Find both databases
      const commDb = await this.findDatabase('Claude-Gizmo Communication');
      const exchangeDb = await this.findDatabase('Claude-Gizmo Exchange');
      
      if (!commDb) {
        throw new Error('Claude-Gizmo Communication database not found');
      }
      
      if (!exchangeDb) {
        console.log('⚠️  Claude-Gizmo Exchange database not found - may already be merged');
        return result;
      }

      // Find or create archive database
      const archiveDb = await this.findDatabase('wt-merged-data-archive');
      if (archiveDb) {
        this.archiveDatabaseId = archiveDb.id;
      }

      // Get all records from Exchange database
      console.log('📊 Reading records from Claude-Gizmo Exchange...');
      const exchangeRecords = await this.getAllRecords(exchangeDb.id);
      result.totalRecords = exchangeRecords.length;
      console.log(`Found ${result.totalRecords} records to merge`);

      // Get Communication database schema
      const commDbDetails = await this.client.databases.retrieve({ 
        database_id: commDb.id 
      });
      const commProperties = Object.keys(commDbDetails.properties);

      // Process each record
      for (const record of exchangeRecords) {
        try {
          if ('properties' in record) {
            // Map Exchange fields to Communication fields
            const mappedProperties = await this.mapProperties(
              record.properties, 
              commProperties,
              exchangeDb.id,
              record.id
            );

            // Create new record in Communication database
            await this.client.pages.create({
              parent: { database_id: commDb.id },
              properties: mappedProperties.properties
            });

            result.mergedRecords++;

            // Archive any dropped fields
            if (mappedProperties.droppedFields.length > 0 && this.archiveDatabaseId) {
              for (const dropped of mappedProperties.droppedFields) {
                await this.archiveDroppedField(
                  exchangeDb.id,
                  record.id,
                  dropped.fieldName,
                  dropped.value,
                  'Field not in target schema'
                );
                result.archivedRecords++;
              }
            }
          }
        } catch (error) {
          result.errors.push(`Failed to merge record ${record.id}: ${error}`);
        }
      }

      // Archive the Exchange database records
      console.log('\n📦 Archiving original Exchange database records...');
      if (this.archiveDatabaseId) {
        for (const record of exchangeRecords) {
          await this.archiveOriginalRecord(exchangeDb.id, record.id);
        }
      }

      // Rename Exchange database to indicate it's archived
      console.log('\n🏷️  Marking Exchange database as archived...');
      await this.client.databases.update({
        database_id: exchangeDb.id,
        title: [
          {
            text: {
              content: '[ARCHIVED] Claude-Gizmo Exchange'
            }
          }
        ],
        description: [
          {
            text: {
              content: `Archived on ${new Date().toISOString()}. Data merged into claude-gizmo-comm.`
            }
          }
        ]
      });

      console.log('\n✅ Merge completed successfully!');
      
    } catch (error) {
      console.error('❌ Merge failed:', error);
      result.errors.push(`Critical error: ${error}`);
    }

    return result;
  }

  private async getAllRecords(databaseId: string): Promise<any[]> {
    const records: any[] = [];
    let hasMore = true;
    let cursor: string | undefined;

    while (hasMore) {
      const response = await this.client.databases.query({
        database_id: databaseId,
        start_cursor: cursor
      });

      records.push(...response.results);
      hasMore = response.has_more;
      cursor = response.next_cursor || undefined;
    }

    return records;
  }

  private async mapProperties(
    sourceProperties: any, 
    targetFields: string[],
    sourceDatabaseId: string,
    recordId: string
  ): Promise<{ properties: any; droppedFields: any[] }> {
    const mappedProperties: any = {};
    const droppedFields: any[] = [];

    for (const [key, value] of Object.entries(sourceProperties)) {
      // Check if field exists in target
      if (targetFields.includes(key)) {
        mappedProperties[key] = value;
      } else {
        // Field doesn't exist in target - will be archived
        droppedFields.push({
          fieldName: key,
          value: this.extractFieldValue(value)
        });
      }
    }

    // Add merge metadata
    if (targetFields.includes('mergeSource')) {
      mappedProperties.mergeSource = {
        rich_text: [
          {
            text: {
              content: 'Claude-Gizmo Exchange'
            }
          }
        ]
      };
    }

    if (targetFields.includes('mergeDate')) {
      mappedProperties.mergeDate = {
        date: {
          start: new Date().toISOString()
        }
      };
    }

    return { properties: mappedProperties, droppedFields };
  }

  private extractFieldValue(property: any): string {
    // Extract readable value from different property types
    if ('title' in property && property.title.length > 0) {
      return property.title.map((t: any) => t.plain_text).join('');
    }
    if ('rich_text' in property && property.rich_text.length > 0) {
      return property.rich_text.map((t: any) => t.plain_text).join('');
    }
    if ('select' in property && property.select) {
      return property.select.name;
    }
    if ('multi_select' in property) {
      return property.multi_select.map((s: any) => s.name).join(', ');
    }
    if ('number' in property) {
      return String(property.number);
    }
    if ('checkbox' in property) {
      return property.checkbox ? 'Yes' : 'No';
    }
    if ('date' in property && property.date) {
      return property.date.start;
    }
    if ('url' in property) {
      return property.url;
    }
    return JSON.stringify(property);
  }

  private async archiveDroppedField(
    sourceDatabaseId: string,
    recordId: string,
    fieldName: string,
    value: string,
    reason: string
  ): Promise<void> {
    if (!this.archiveDatabaseId) return;

    await this.client.pages.create({
      parent: { database_id: this.archiveDatabaseId },
      properties: {
        recordId: {
          title: [{ text: { content: `${recordId}-${fieldName}` } }]
        },
        sourceDatabase: {
          rich_text: [{ text: { content: 'Claude-Gizmo Exchange' } }]
        },
        originalRecordTitle: {
          rich_text: [{ text: { content: recordId } }]
        },
        originalFieldName: {
          rich_text: [{ text: { content: fieldName } }]
        },
        originalValue: {
          rich_text: [{ text: { content: value.substring(0, 2000) } }]
        },
        reasonForMergeOrDrop: {
          select: { name: 'Schema migration' }
        },
        migrationBatch: {
          rich_text: [{ text: { content: `Claude-Gizmo Merge ${new Date().toISOString()}` } }]
        }
      }
    });
  }

  private async archiveOriginalRecord(
    sourceDatabaseId: string,
    recordId: string
  ): Promise<void> {
    if (!this.archiveDatabaseId) return;

    await this.client.pages.create({
      parent: { database_id: this.archiveDatabaseId },
      properties: {
        recordId: {
          title: [{ text: { content: `Exchange-${recordId}` } }]
        },
        sourceDatabase: {
          rich_text: [{ text: { content: 'Claude-Gizmo Exchange' } }]
        },
        originalRecordTitle: {
          rich_text: [{ text: { content: `Full record ${recordId}` } }]
        },
        originalFieldName: {
          rich_text: [{ text: { content: 'Complete Record' } }]
        },
        originalValue: {
          rich_text: [{ text: { content: 'Archived complete record from Exchange database' } }]
        },
        reasonForMergeOrDrop: {
          select: { name: 'Data consolidation' }
        },
        migrationBatch: {
          rich_text: [{ text: { content: `Claude-Gizmo Merge ${new Date().toISOString()}` } }]
        }
      }
    });
  }
}

// Run the merger
async function main() {
  console.log('🚀 Claude-Gizmo Database Merger\n');
  console.log('=' .repeat(60) + '\n');

  const merger = new ClaudeGizmoMerger();
  const result = await merger.mergeClaudeGizmoDatabases();

  console.log('\n' + '=' .repeat(60));
  console.log('\n📊 Merge Summary:');
  console.log(`- Total records processed: ${result.totalRecords}`);
  console.log(`- Records merged: ${result.mergedRecords}`);
  console.log(`- Fields archived: ${result.archivedRecords}`);
  
  if (result.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered: ${result.errors.length}`);
    result.errors.forEach(err => console.log(`   - ${err}`));
  }
  
  console.log('\n✅ Done!');
}

main().catch(console.error);