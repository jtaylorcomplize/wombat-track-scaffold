/**
 * MCP GSuite API Endpoints - WT-MCPGS-1.0
 * Phase 2: Map endpoints to oApp API (/api/mcp/gsuite/*)
 */

import express from 'express';
import axios from 'axios';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configuration
const MCP_GSUITE_URL = process.env.MCP_GSUITE_URL || 'http://localhost:8001';
const GOVERNANCE_LOG_PATH = path.join(__dirname, '../../../logs/governance.jsonl');
const DRIVEMEMORY_PATH = path.join(__dirname, '../../../DriveMemory/MCP-GSuite');

// Governance logging utility
async function logToGovernance(event: any, userId?: string) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        event: 'mcp-gsuite-api-call',
        phase: 'WT-MCPGS-1.0-Phase2',
        userId: userId || 'system',
        ...event
    };
    
    try {
        await fs.appendFile(GOVERNANCE_LOG_PATH, JSON.stringify(logEntry) + '\n');
        
        // Log to DriveMemory
        const driveMemoryFile = path.join(DRIVEMEMORY_PATH, `api-calls-${new Date().toISOString().split('T')[0]}.jsonl`);
        await fs.mkdir(DRIVEMEMORY_PATH, { recursive: true });
        await fs.appendFile(driveMemoryFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
        console.error('Failed to write governance log:', error);
    }
}

// Middleware for request logging and validation
router.use(async (req, res, next) => {
    const startTime = Date.now();
    
    // Log the incoming request
    await logToGovernance({
        action: 'api_request_received',
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        clientIP: req.ip
    }, req.headers['x-user-id'] as string);
    
    // Add response time logging
    res.on('finish', async () => {
        const duration = Date.now() - startTime;
        await logToGovernance({
            action: 'api_request_completed',
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: duration
        }, req.headers['x-user-id'] as string);
    });
    
    next();
});

// Helper function to call MCP GSuite service
async function callMCPService(toolName: string, toolArguments: any, userId?: string) {
    try {
        const response = await axios.post(`${MCP_GSUITE_URL}/mcp/call`, {
            method: 'tools/call',
            params: {
                name: toolName,
                arguments: toolArguments
            }
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'X-User-ID': userId || 'system'
            }
        });
        
        await logToGovernance({
            action: 'mcp_service_call',
            tool: toolName,
            arguments: toolArguments,
            status: 'success',
            response_size: JSON.stringify(response.data).length
        }, userId);
        
        return {
            success: true,
            data: response.data,
            status: response.status
        };
    } catch (error: any) {
        await logToGovernance({
            action: 'mcp_service_call',
            tool: toolName,
            arguments: toolArguments,
            status: 'error',
            error: error.message,
            error_code: error.response?.status
        }, userId);
        
        return {
            success: false,
            error: error.message,
            status: error.response?.status || 500
        };
    }
}

// Gmail Endpoints
router.post('/gmail/send', async (req, res) => {
    const { to, subject, body, cc, bcc } = req.body;
    const userId = req.headers['x-user-id'] as string;
    
    if (!to || !subject || !body) {
        return res.status(400).json({
            error: 'Missing required fields: to, subject, body',
            timestamp: new Date().toISOString()
        });
    }
    
    const result = await callMCPService('gmail_send', {
        to,
        subject,
        body,
        cc,
        bcc
    }, userId);
    
    if (result.success) {
        res.json({
            success: true,
            message: 'Email sent successfully',
            data: result.data,
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(result.status).json({
            success: false,
            error: result.error,
            timestamp: new Date().toISOString()
        });
    }
});

router.get('/gmail/labels', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    
    const result = await callMCPService('gmail_labels', {}, userId);
    
    if (result.success) {
        res.json({
            success: true,
            data: result.data,
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(result.status).json({
            success: false,
            error: result.error,
            timestamp: new Date().toISOString()
        });
    }
});

router.get('/gmail/messages', async (req, res) => {
    const { query, max_results = 10 } = req.query;
    const userId = req.headers['x-user-id'] as string;
    
    const result = await callMCPService('gmail_search', {
        query: query as string,
        max_results: parseInt(max_results as string)
    }, userId);
    
    if (result.success) {
        res.json({
            success: true,
            data: result.data,
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(result.status).json({
            success: false,
            error: result.error,
            timestamp: new Date().toISOString()
        });
    }
});

// Google Drive Endpoints
router.get('/drive/list', async (req, res) => {
    const { max_results = 10, folder_id } = req.query;
    const userId = req.headers['x-user-id'] as string;
    
    const result = await callMCPService('drive_list', {
        max_results: parseInt(max_results as string),
        folder_id: folder_id as string
    }, userId);
    
    if (result.success) {
        res.json({
            success: true,
            data: result.data,
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(result.status).json({
            success: false,
            error: result.error,
            timestamp: new Date().toISOString()
        });
    }
});

router.get('/drive/read/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    
    const result = await callMCPService('drive_read', {
        file_id: fileId
    }, userId);
    
    if (result.success) {
        res.json({
            success: true,
            data: result.data,
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(result.status).json({
            success: false,
            error: result.error,
            timestamp: new Date().toISOString()
        });
    }
});

router.post('/drive/create', async (req, res) => {
    const { name, content, mime_type, parent_folder_id } = req.body;
    const userId = req.headers['x-user-id'] as string;
    
    if (!name || !content) {
        return res.status(400).json({
            error: 'Missing required fields: name, content',
            timestamp: new Date().toISOString()
        });
    }
    
    const result = await callMCPService('drive_create', {
        name,
        content,
        mime_type,
        parent_folder_id
    }, userId);
    
    if (result.success) {
        res.json({
            success: true,
            message: 'File created successfully',
            data: result.data,
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(result.status).json({
            success: false,
            error: result.error,
            timestamp: new Date().toISOString()
        });
    }
});

// Google Sheets Endpoints
router.get('/sheets/read/:spreadsheetId', async (req, res) => {
    const { spreadsheetId } = req.params;
    const { range = 'A1:Z1000' } = req.query;
    const userId = req.headers['x-user-id'] as string;
    
    const result = await callMCPService('sheets_read', {
        spreadsheet_id: spreadsheetId,
        range: range as string
    }, userId);
    
    if (result.success) {
        res.json({
            success: true,
            data: result.data,
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(result.status).json({
            success: false,
            error: result.error,
            timestamp: new Date().toISOString()
        });
    }
});

router.post('/sheets/update/:spreadsheetId', async (req, res) => {
    const { spreadsheetId } = req.params;
    const { range, values } = req.body;
    const userId = req.headers['x-user-id'] as string;
    
    if (!range || !values) {
        return res.status(400).json({
            error: 'Missing required fields: range, values',
            timestamp: new Date().toISOString()
        });
    }
    
    const result = await callMCPService('sheets_update', {
        spreadsheet_id: spreadsheetId,
        range,
        values
    }, userId);
    
    if (result.success) {
        res.json({
            success: true,
            message: 'Sheet updated successfully',
            data: result.data,
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(result.status).json({
            success: false,
            error: result.error,
            timestamp: new Date().toISOString()
        });
    }
});

// Google Calendar Endpoints
router.get('/calendar/events', async (req, res) => {
    const { calendar_id = 'primary', time_min, time_max, max_results = 10 } = req.query;
    const userId = req.headers['x-user-id'] as string;
    
    const result = await callMCPService('calendar_events', {
        calendar_id: calendar_id as string,
        time_min: time_min as string,
        time_max: time_max as string,
        max_results: parseInt(max_results as string)
    }, userId);
    
    if (result.success) {
        res.json({
            success: true,
            data: result.data,
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(result.status).json({
            success: false,
            error: result.error,
            timestamp: new Date().toISOString()
        });
    }
});

router.post('/calendar/events', async (req, res) => {
    const { calendar_id = 'primary', summary, description, start, end, attendees } = req.body;
    const userId = req.headers['x-user-id'] as string;
    
    if (!summary || !start || !end) {
        return res.status(400).json({
            error: 'Missing required fields: summary, start, end',
            timestamp: new Date().toISOString()
        });
    }
    
    const result = await callMCPService('calendar_create_event', {
        calendar_id,
        summary,
        description,
        start,
        end,
        attendees
    }, userId);
    
    if (result.success) {
        res.json({
            success: true,
            message: 'Calendar event created successfully',
            data: result.data,
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(result.status).json({
            success: false,
            error: result.error,
            timestamp: new Date().toISOString()
        });
    }
});

// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        const mcpHealth = await axios.get(`${MCP_GSUITE_URL}/health`, { timeout: 5000 });
        
        res.json({
            status: 'healthy',
            mcp_service: mcpHealth.data,
            api_version: 'WT-MCPGS-1.0-Phase2',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(503).json({
            status: 'unhealthy',
            error: 'MCP GSuite service unavailable',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;