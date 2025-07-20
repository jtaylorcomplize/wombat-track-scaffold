#!/usr/bin/env node

import http from 'http';

// Get phase_id from command line argument
const phase_id = process.argv[2];

if (!phase_id) {
  console.error('Error: phase_id is required');
  console.error('Usage: node simulate-phase-trigger.js <phase_id>');
  process.exit(1);
}

// Prepare request data
const data = JSON.stringify({ phase_id });

// Request options
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/github/trigger',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log(`Sending phase_id ${phase_id} to http://localhost:3001/api/github/trigger...`);

// Make the request
const req = http.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`✓ Success (HTTP ${res.statusCode})`);
      
      try {
        const response = JSON.parse(responseData);
        if (response.message) {
          console.log(`  Message: ${response.message}`);
        }
        if (response.output) {
          console.log(`  Output: ${response.output.trim()}`);
        }
      } catch (e) {
        // If response is not JSON, just show it
        if (responseData) {
          console.log(`  Response: ${responseData}`);
        }
      }
      
      process.exit(0);
    } else {
      console.error(`✗ Error (HTTP ${res.statusCode})`);
      
      try {
        const errorResponse = JSON.parse(responseData);
        if (errorResponse.error) {
          console.error(`  Error: ${errorResponse.error}`);
        }
        if (errorResponse.details) {
          console.error(`  Details: ${errorResponse.details}`);
        }
      } catch (e) {
        // If response is not JSON, just show it
        if (responseData) {
          console.error(`  Response: ${responseData}`);
        }
      }
      
      process.exit(1);
    }
  });
});

// Handle request errors
req.on('error', (error) => {
  console.error(`✗ Request failed: ${error.message}`);
  
  if (error.code === 'ECONNREFUSED') {
    console.error('  Make sure the server is running on http://localhost:3001');
    console.error('  You may need to update the port in this script if your server uses a different port');
  }
  
  process.exit(1);
});

// Set timeout
req.setTimeout(10000, () => {
  console.error('✗ Request timeout (10 seconds)');
  req.destroy();
  process.exit(1);
});

// Send the request
req.write(data);
req.end();