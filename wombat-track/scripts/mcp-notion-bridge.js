#!/usr/bin/env node

/**
 * MCP Server for Claude-Gizmo Communication via Notion
 * 
 * This MCP server allows Claude to write messages to Notion
 * that Gizmo can read and respond to.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createNotionClient } from '../src/utils/notionClient.ts';
import dotenv from 'dotenv';

dotenv.config();

// Communication database structure
const CLAUDE_GIZMO_DB_ID = process.env.NOTION_CLAUDE_GIZMO_DB_ID;

class ClaudeGizmoMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'claude-gizmo-bridge',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.notionClient = createNotionClient(process.env.NOTION_TOKEN);
    this.setupTools();
  }

  setupTools() {
    // Tool to send message to Gizmo
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'send_to_gizmo',
          description: 'Send a message to Gizmo via Notion',
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Message to send to Gizmo',
              },
              context: {
                type: 'string',
                description: 'Context or topic of the message',
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'urgent'],
                description: 'Message priority',
              },
              expectsResponse: {
                type: 'boolean',
                description: 'Whether a response is expected from Gizmo',
              },
            },
            required: ['message', 'context'],
          },
        },
        {
          name: 'check_gizmo_messages',
          description: 'Check for new messages from Gizmo',
          inputSchema: {
            type: 'object',
            properties: {
              since: {
                type: 'string',
                description: 'ISO timestamp to check messages since',
              },
              status: {
                type: 'string',
                enum: ['unread', 'all'],
                description: 'Filter by message status',
              },
            },
          },
        },
      ],
    }));

    // Handle tool execution
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'send_to_gizmo':
          return this.sendToGizmo(args);
        case 'check_gizmo_messages':
          return this.checkGizmoMessages(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async sendToGizmo(args) {
    try {
      const properties = {
        'Message': {
          title: [{ text: { content: args.message.substring(0, 100) } }],
        },
        'Full Content': {
          rich_text: [{ text: { content: args.message } }],
        },
        'Context': {
          rich_text: [{ text: { content: args.context } }],
        },
        'Sender': {
          select: { name: 'Claude' },
        },
        'Priority': {
          select: { name: args.priority || 'medium' },
        },
        'Status': {
          select: { name: 'unread' },
        },
        'Expects Response': {
          checkbox: args.expectsResponse || false,
        },
        'Timestamp': {
          date: { start: new Date().toISOString() },
        },
      };

      const result = await this.notionClient.writePage({
        parent: { database_id: CLAUDE_GIZMO_DB_ID },
        properties,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Message sent to Gizmo successfully!\nNotion Page ID: ${result.id}\nURL: ${result.url}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to send message to Gizmo: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async checkGizmoMessages(args) {
    try {
      const filter = {
        and: [
          {
            property: 'Sender',
            select: { equals: 'Gizmo' },
          },
        ],
      };

      if (args.status === 'unread') {
        filter.and.push({
          property: 'Status',
          select: { equals: 'unread' },
        });
      }

      if (args.since) {
        filter.and.push({
          property: 'Timestamp',
          date: { after: args.since },
        });
      }

      const response = await this.notionClient.queryDatabase({
        database_id: CLAUDE_GIZMO_DB_ID,
        filter,
        sorts: [{ property: 'Timestamp', direction: 'descending' }],
      });

      const messages = response.results.map(page => ({
        id: page.id,
        message: page.properties['Message']?.title?.[0]?.plain_text || '',
        content: page.properties['Full Content']?.rich_text?.[0]?.plain_text || '',
        context: page.properties['Context']?.rich_text?.[0]?.plain_text || '',
        priority: page.properties['Priority']?.select?.name || 'medium',
        timestamp: page.properties['Timestamp']?.date?.start || '',
      }));

      return {
        content: [
          {
            type: 'text',
            text: `Found ${messages.length} messages from Gizmo:\n${JSON.stringify(messages, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to check Gizmo messages: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Claude-Gizmo MCP Bridge running on stdio');
  }
}

const server = new ClaudeGizmoMCPServer();
server.run().catch(console.error);