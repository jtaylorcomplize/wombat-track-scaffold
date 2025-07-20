#!/usr/bin/env node

import express from 'express';
import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());

// Ensure tmp/mcp directory exists
const ensureTmpDir = async () => {
  const tmpDir = path.join(__dirname, '../../tmp/mcp');
  try {
    await mkdir(tmpDir, { recursive: true });
    return tmpDir;
  } catch (error) {
    console.error('Failed to create tmp directory:', error);
    throw error;
  }
};

// POST /run endpoint
app.post('/run', async (req, res) => {
  const { url } = req.body;
  
  // Validate URL
  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      status: 'error',
      error: 'Invalid or missing URL parameter'
    });
  }
  
  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      error: 'Invalid URL format'
    });
  }
  
  let browser;
  
  try {
    // Ensure tmp directory exists
    const tmpDir = await ensureTmpDir();
    
    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set viewport for consistent screenshots
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });
    
    // Navigate to URL with timeout
    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000 // 30 second timeout
      });
    } catch (navigationError) {
      if (navigationError.message.includes('timeout')) {
        throw new Error(`Navigation timeout: Page took too long to load (30s)`);
      }
      throw navigationError;
    }
    
    // Wait a bit for any dynamic content
    await page.waitForTimeout(2000);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `snap-${timestamp}.png`;
    const screenshotPath = path.join(tmpDir, filename);
    
    // Take full page screenshot
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    
    // Close browser
    await browser.close();
    browser = null;
    
    // Return success response
    res.json({
      status: 'success',
      screenshotPath: screenshotPath,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    // Ensure browser is closed on error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
    
    // Log error for debugging
    console.error('Screenshot error:', error);
    
    // Determine error type and response
    let statusCode = 500;
    let errorMessage = error.message || 'Unknown error occurred';
    
    if (error.message.includes('Failed to launch')) {
      errorMessage = 'Failed to launch browser. Ensure Puppeteer dependencies are installed.';
    } else if (error.message.includes('timeout')) {
      statusCode = 408;
      errorMessage = error.message;
    } else if (error.message.includes('net::ERR_')) {
      statusCode = 502;
      errorMessage = `Network error: Unable to reach ${url}`;
    }
    
    res.status(statusCode).json({
      status: 'error',
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mcp-server',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`MCP Server running on port ${PORT}`);
  console.log(`POST /run - Take screenshot of URL`);
  console.log(`GET  /health - Health check`);
});