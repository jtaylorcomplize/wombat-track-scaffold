#!/usr/bin/env node
/**
 * MCP GSuite Connectivity Validation Script
 * WT-MCPGS-1.0 Phase 1: Validate MCP connectivity (drive.list, gmail.labels)
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const MCP_BASE_URL = 'http://localhost:8001';
const GOVERNANCE_LOG_PATH = path.join(__dirname, '..', 'logs', 'governance.jsonl');
const DRIVEMEMORY_LOG_PATH = path.join(__dirname, '..', 'DriveMemory', 'MCP-GSuite', `validation-${new Date().toISOString().split('T')[0]}.jsonl`);

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function logToGovernance(event) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        event: 'mcp-gsuite-validation',
        phase: 'WT-MCPGS-1.0-Phase1',
        ...event
    };
    
    try {
        await fs.appendFile(GOVERNANCE_LOG_PATH, JSON.stringify(logEntry) + '\n');
        await fs.mkdir(path.dirname(DRIVEMEMORY_LOG_PATH), { recursive: true });
        await fs.appendFile(DRIVEMEMORY_LOG_PATH, JSON.stringify(logEntry) + '\n');
    } catch (error) {
        log('yellow', `⚠️  Warning: Could not write to governance logs: ${error.message}`);
    }
}

async function validateMCPHealth() {
    log('blue', '🏥 Checking MCP GSuite service health...');
    
    try {
        const response = await axios.get(`${MCP_BASE_URL}/health`, {
            timeout: 5000
        });
        
        if (response.status === 200) {
            log('green', '✅ MCP GSuite service is healthy');
            await logToGovernance({
                test: 'health_check',
                status: 'passed',
                response_code: response.status,
                service_info: response.data
            });
            return true;
        }
    } catch (error) {
        log('red', `❌ MCP GSuite health check failed: ${error.message}`);
        await logToGovernance({
            test: 'health_check',
            status: 'failed',
            error: error.message
        });
        return false;
    }
}

async function validateDriveList() {
    log('blue', '📁 Testing Google Drive connectivity (drive.list)...');
    
    try {
        // Test drive.list functionality
        const response = await axios.post(`${MCP_BASE_URL}/mcp/call`, {
            method: 'tools/call',
            params: {
                name: 'drive_list',
                arguments: {
                    max_results: 5
                }
            }
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data && response.data.content) {
            log('green', '✅ Google Drive connectivity validated');
            log('yellow', `📊 Retrieved ${JSON.parse(response.data.content[0].text).files?.length || 0} files`);
            
            await logToGovernance({
                test: 'drive_list',
                status: 'passed',
                files_retrieved: JSON.parse(response.data.content[0].text).files?.length || 0,
                response_time: response.headers['x-response-time'] || 'unknown'
            });
            return true;
        }
    } catch (error) {
        log('red', `❌ Google Drive connectivity failed: ${error.message}`);
        await logToGovernance({
            test: 'drive_list',
            status: 'failed',
            error: error.message,
            error_code: error.response?.status || 'unknown'
        });
        return false;
    }
}

async function validateGmailLabels() {
    log('blue', '📧 Testing Gmail connectivity (gmail.labels)...');
    
    try {
        // Test gmail.labels functionality
        const response = await axios.post(`${MCP_BASE_URL}/mcp/call`, {
            method: 'tools/call',
            params: {
                name: 'gmail_labels',
                arguments: {}
            }
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data && response.data.content) {
            log('green', '✅ Gmail connectivity validated');
            const labels = JSON.parse(response.data.content[0].text).labels || [];
            log('yellow', `📊 Retrieved ${labels.length} labels`);
            
            await logToGovernance({
                test: 'gmail_labels',
                status: 'passed',
                labels_retrieved: labels.length,
                response_time: response.headers['x-response-time'] || 'unknown'
            });
            return true;
        }
    } catch (error) {
        log('red', `❌ Gmail connectivity failed: ${error.message}`);
        await logToGovernance({
            test: 'gmail_labels',
            status: 'failed',
            error: error.message,
            error_code: error.response?.status || 'unknown'
        });
        return false;
    }
}

async function validateCalendarList() {
    log('blue', '📅 Testing Google Calendar connectivity...');
    
    try {
        const response = await axios.post(`${MCP_BASE_URL}/mcp/call`, {
            method: 'tools/call',
            params: {
                name: 'calendar_list',
                arguments: {}
            }
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data && response.data.content) {
            log('green', '✅ Google Calendar connectivity validated');
            const calendars = JSON.parse(response.data.content[0].text).calendars || [];
            log('yellow', `📊 Retrieved ${calendars.length} calendars`);
            
            await logToGovernance({
                test: 'calendar_list',
                status: 'passed',
                calendars_retrieved: calendars.length,
                response_time: response.headers['x-response-time'] || 'unknown'
            });
            return true;
        }
    } catch (error) {
        log('red', `❌ Google Calendar connectivity failed: ${error.message}`);
        await logToGovernance({
            test: 'calendar_list',
            status: 'failed',
            error: error.message,
            error_code: error.response?.status || 'unknown'
        });
        return false;
    }
}

async function main() {
    log('blue', '🚀 MCP GSuite Connectivity Validation - WT-MCPGS-1.0');
    log('blue', 'Phase 1: Validate MCP connectivity');
    console.log('');
    
    const startTime = Date.now();
    const results = {
        health: false,
        drive: false,
        gmail: false,
        calendar: false
    };
    
    // Run validation tests
    results.health = await validateMCPHealth();
    
    if (results.health) {
        results.drive = await validateDriveList();
        results.gmail = await validateGmailLabels();
        results.calendar = await validateCalendarList();
    } else {
        log('red', '❌ Skipping connectivity tests due to health check failure');
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Summary
    console.log('');
    log('blue', '📊 Validation Summary:');
    console.log(`  • Health Check: ${results.health ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  • Drive List: ${results.drive ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  • Gmail Labels: ${results.gmail ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  • Calendar List: ${results.calendar ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  • Duration: ${duration}ms`);
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    // Final log entry
    await logToGovernance({
        test: 'validation_summary',
        status: passedTests === totalTests ? 'all_passed' : 'partial_failure',
        passed_tests: passedTests,
        total_tests: totalTests,
        duration_ms: duration,
        results: results
    });
    
    if (passedTests === totalTests) {
        log('green', '🎉 All MCP GSuite connectivity tests passed!');
        log('yellow', '🔄 Ready for Phase 2: Endpoint Integration');
        process.exit(0);
    } else {
        log('red', `❌ ${totalTests - passedTests} test(s) failed. Please check configuration.`);
        process.exit(1);
    }
}

// Handle errors gracefully
process.on('unhandledRejection', async (error) => {
    log('red', `❌ Unhandled error: ${error.message}`);
    await logToGovernance({
        test: 'validation_error',
        status: 'failed',
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
});

if (require.main === module) {
    main();
}