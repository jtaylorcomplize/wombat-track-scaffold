import { Client } from '@notionhq/client';
import type { 
  QueryDatabaseResponse,
  GetPageResponse,
  CreatePageResponse,
  AppendBlockChildrenResponse
} from '@notionhq/client/build/src/api-endpoints';

export interface NotionClientConfig {
  auth: string;
}

export interface DatabaseQueryParams {
  database_id: string;
  filter?: any;
  sorts?: any[];
  start_cursor?: string;
  page_size?: number;
}

export interface WritePageParams {
  parent: { database_id: string } | { page_id: string };
  properties: Record<string, any>;
  children?: any[];
}

export interface AppendPageParams {
  page_id: string;
  children: any[];
}

export interface UpdatePageParams {
  page_id: string;
  properties?: Record<string, any>;
  children?: any[];
  replace_content?: boolean;
}

export class NotionClient {
  client: Client;

  constructor(config: NotionClientConfig) {
    this.client = new Client({
      auth: config.auth,
    });
  }

  async getPage(page_id: string): Promise<GetPageResponse> {
    try {
      const response = await this.client.pages.retrieve({ page_id });
      return response;
    } catch (error) {
      throw new Error(`Failed to get page ${page_id}: ${error}`);
    }
  }

  async queryDatabase(params: DatabaseQueryParams): Promise<QueryDatabaseResponse> {
    try {
      const response = await this.client.databases.query(params);
      return response;
    } catch (error) {
      throw new Error(`Failed to query database ${params.database_id}: ${error}`);
    }
  }

  async writePage(params: WritePageParams): Promise<CreatePageResponse> {
    try {
      const response = await this.client.pages.create(params);
      return response;
    } catch (error) {
      throw new Error(`Failed to create page: ${error}`);
    }
  }

  async appendToPage(params: AppendPageParams): Promise<AppendBlockChildrenResponse> {
    try {
      const response = await this.client.blocks.children.append({
        block_id: params.page_id,
        children: params.children,
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to append to page ${params.page_id}: ${error}`);
    }
  }

  async listDatabases(): Promise<any> {
    try {
      const response = await this.client.search({
        filter: {
          value: 'database',
          property: 'object',
        },
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to list databases: ${error}`);
    }
  }

  async updatePage(params: UpdatePageParams): Promise<any> {
    try {
      // Update page properties if provided
      let updateResponse = null;
      if (params.properties) {
        updateResponse = await this.client.pages.update({
          page_id: params.page_id,
          properties: params.properties,
        });
      }

      // Handle content updates
      if (params.children) {
        if (params.replace_content) {
          // Get existing blocks and delete them
          const existingBlocks = await this.client.blocks.children.list({
            block_id: params.page_id,
          });
          
          // Delete existing blocks
          for (const block of existingBlocks.results) {
            await this.client.blocks.delete({
              block_id: block.id,
            });
          }
        }
        
        // Add new content
        await this.client.blocks.children.append({
          block_id: params.page_id,
          children: params.children,
        });
      }

      return updateResponse;
    } catch (error) {
      throw new Error(`Failed to update page ${params.page_id}: ${error}`);
    }
  }

  async getUser(): Promise<any> {
    try {
      const response = await this.client.users.me({});
      return response;
    } catch (error) {
      throw new Error(`Failed to get user info: ${error}`);
    }
  }
}

export function createNotionClient(token?: string): NotionClient {
  const notionToken = token || process.env.NOTION_TOKEN;
  
  if (!notionToken) {
    throw new Error('NOTION_TOKEN is required. Set it as an environment variable or pass it directly.');
  }

  return new NotionClient({ auth: notionToken });
}