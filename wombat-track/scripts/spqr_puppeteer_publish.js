#!/usr/bin/env node

/**
 * SPQR Auto-Publish to Looker Studio
 * Phase 4 - Runtime Observability & Automation
 * 
 * This script uses Puppeteer to automatically publish validated SPQR cards
 * to an existing Looker Studio report and logs the process to GovernanceLog.
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

class SPQRLookerPublisher {
  constructor() {
    this.browser = null;
    this.page = null;
    this.startTime = performance.now();
    this.publishedCards = [];
    this.failedCards = [];
    this.governanceLogPath = path.join(__dirname, '../logs/governance.jsonl');
    this.cardValidationDir = path.join(__dirname, '../src/data/spqr/validation/');
  }

  /**
   * Initialize Puppeteer browser with appropriate settings
   */
  async initializeBrowser() {
    console.log('🚀 Initializing Puppeteer browser...');
    
    this.browser = await puppeteer.launch({
      headless: process.env.NODE_ENV === 'production' ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });

    this.page = await this.browser.newPage();
    
    // Set user agent to avoid detection
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Enable request interception for better performance
    await this.page.setRequestInterception(true);
    this.page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    console.log('✅ Browser initialized successfully');
  }

  /**
   * Authenticate with Google using environment variables
   */
  async authenticateGoogle() {
    console.log('🔐 Authenticating with Google...');
    
    const email = process.env.GOOGLE_EMAIL;
    const password = process.env.GOOGLE_PASSWORD;
    
    if (!email || !password) {
      throw new Error('GOOGLE_EMAIL and GOOGLE_PASSWORD environment variables are required');
    }

    try {
      // Navigate to Google sign-in
      await this.page.goto('https://accounts.google.com/signin', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Enter email
      await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await this.page.type('input[type="email"]', email, { delay: 100 });
      await this.page.click('#identifierNext');

      // Wait for password field and enter password
      await this.page.waitForSelector('input[type="password"]', { timeout: 10000 });
      await this.page.type('input[type="password"]', password, { delay: 100 });
      await this.page.click('#passwordNext');

      // Wait for authentication to complete
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      
      console.log('✅ Google authentication successful');
      
      await this.logGovernanceEntry({
        event_type: 'spqr_auto_publish_auth',
        action: 'authenticate',
        success: true,
        details: {
          authentication_method: 'google_oauth',
          user_email: email.replace(/(.{3})(.*)(@.*)/, '$1***$3')
        }
      });

    } catch (error) {
      console.error('❌ Google authentication failed:', error.message);
      
      await this.logGovernanceEntry({
        event_type: 'spqr_auto_publish_auth',
        action: 'authenticate',
        success: false,
        details: {
          error_message: error.message,
          authentication_method: 'google_oauth'
        }
      });
      
      throw error;
    }
  }

  /**
   * Navigate to the Looker Studio report
   */
  async navigateToLookerReport() {
    console.log('📊 Navigating to Looker Studio report...');
    
    const reportUrl = process.env.LOOKER_REPORT_URL;
    if (!reportUrl) {
      throw new Error('LOOKER_REPORT_URL environment variable is required');
    }

    try {
      await this.page.goto(reportUrl, { 
        waitUntil: 'networkidle2',
        timeout: 45000 
      });

      // Wait for Looker Studio interface to load
      await this.page.waitForSelector('[data-testid="report-canvas"]', { timeout: 30000 });
      
      console.log('✅ Successfully navigated to Looker Studio report');
      
      await this.logGovernanceEntry({
        event_type: 'spqr_auto_publish_navigation',
        action: 'navigate_to_report',
        success: true,
        details: {
          report_url: reportUrl,
          load_time_ms: Math.round(performance.now() - this.startTime)
        }
      });

    } catch (error) {
      console.error('❌ Failed to navigate to Looker Studio report:', error.message);
      
      await this.logGovernanceEntry({
        event_type: 'spqr_auto_publish_navigation',
        action: 'navigate_to_report',
        success: false,
        details: {
          error_message: error.message,
          report_url: reportUrl
        }
      });
      
      throw error;
    }
  }

  /**
   * Load and validate all SPQR cards from the validation directory
   */
  async loadSPQRCards() {
    console.log('📂 Loading SPQR cards from validation directory...');
    
    try {
      const files = await fs.readdir(this.cardValidationDir);
      const jsonFiles = files.filter(file => file.endsWith('.json') && file !== 'Looker_IntegrationReport.csv');
      
      const cards = [];
      
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.cardValidationDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const cardData = JSON.parse(content);
          
          // Validate card has required fields
          if (cardData.id && cardData.name && cardData.validation) {
            cards.push({
              ...cardData,
              filename: file
            });
          } else {
            console.warn(`⚠️ Skipping invalid card: ${file}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to load card ${file}:`, error.message);
        }
      }
      
      console.log(`✅ Loaded ${cards.length} valid SPQR cards`);
      
      await this.logGovernanceEntry({
        event_type: 'spqr_cards_loaded',
        action: 'load_cards',
        success: true,
        details: {
          total_files: jsonFiles.length,
          valid_cards: cards.length,
          card_ids: cards.map(c => c.id)
        }
      });
      
      return cards;
      
    } catch (error) {
      console.error('❌ Failed to load SPQR cards:', error.message);
      
      await this.logGovernanceEntry({
        event_type: 'spqr_cards_loaded',
        action: 'load_cards',
        success: false,
        details: {
          error_message: error.message
        }
      });
      
      throw error;
    }
  }

  /**
   * Add a single SPQR card to the Looker Studio report
   */
  async addCardToReport(card) {
    console.log(`📊 Adding card: ${card.name} (${card.id})`);
    
    const cardStartTime = performance.now();
    
    try {
      // Click on "Add a chart" button
      await this.page.waitForSelector('[data-testid="add-chart-button"]', { timeout: 10000 });
      await this.page.click('[data-testid="add-chart-button"]');
      
      // Wait for chart type selection
      await this.page.waitForSelector('[data-testid="chart-type-selector"]', { timeout: 10000 });
      
      // Select appropriate chart type based on card visualization
      const chartType = this.mapChartType(card.visualization?.chart_type || 'table');
      await this.page.click(`[data-testid="chart-type-${chartType}"]`);
      
      // Wait for data source configuration
      await this.page.waitForSelector('[data-testid="data-source-config"]', { timeout: 10000 });
      
      // Configure data source (assuming Actionstep connection exists)
      await this.page.click('[data-testid="actionstep-connector"]');
      
      // Add dimensions
      if (card.fields?.dimensions) {
        for (const dimension of card.fields.dimensions) {
          await this.addField(dimension, 'dimension');
        }
      }
      
      // Add metrics
      if (card.fields?.metrics) {
        for (const metric of card.fields.metrics) {
          await this.addField(metric, 'metric');
        }
      }
      
      // Apply filters if any
      if (card.filters?.default_filters) {
        for (const filter of card.filters.default_filters) {
          await this.applyFilter(filter);
        }
      }
      
      // Set chart title
      await this.page.waitForSelector('[data-testid="chart-title-input"]', { timeout: 5000 });
      await this.page.click('[data-testid="chart-title-input"]');
      await this.page.keyboard.selectAll();
      await this.page.type('[data-testid="chart-title-input"]', card.name);
      
      // Apply styling based on card visualization settings
      if (card.visualization?.color_scheme) {
        await this.applyColorScheme(card.visualization.color_scheme);
      }
      
      // Confirm chart creation
      await this.page.click('[data-testid="apply-chart"]');
      
      // Wait for chart to be added to report
      await this.page.waitForTimeout(2000);
      
      const cardEndTime = performance.now();
      const processingTime = Math.round(cardEndTime - cardStartTime);
      
      console.log(`✅ Successfully added card: ${card.name} (${processingTime}ms)`);
      
      this.publishedCards.push({
        id: card.id,
        name: card.name,
        filename: card.filename,
        processing_time_ms: processingTime,
        chart_type: chartType
      });
      
      await this.logGovernanceEntry({
        event_type: 'spqr_card_published',
        action: 'add_card',
        success: true,
        details: {
          card_id: card.id,
          card_name: card.name,
          chart_type: chartType,
          processing_time_ms: processingTime,
          dimensions_count: card.fields?.dimensions?.length || 0,
          metrics_count: card.fields?.metrics?.length || 0
        }
      });
      
    } catch (error) {
      console.error(`❌ Failed to add card ${card.name}:`, error.message);
      
      this.failedCards.push({
        id: card.id,
        name: card.name,
        filename: card.filename,
        error: error.message
      });
      
      await this.logGovernanceEntry({
        event_type: 'spqr_card_published',
        action: 'add_card',
        success: false,
        details: {
          card_id: card.id,
          card_name: card.name,
          error_message: error.message
        }
      });
      
      // Continue with next card rather than failing completely
    }
  }

  /**
   * Map SPQR chart types to Looker Studio chart types
   */
  mapChartType(spqrChartType) {
    const chartTypeMap = {
      'pie_chart': 'pie',
      'bar_chart': 'column',
      'line_chart': 'line',
      'table': 'table',
      'scorecard': 'scorecard',
      'geo_chart': 'geo',
      'scatter_plot': 'scatter'
    };
    
    return chartTypeMap[spqrChartType] || 'table';
  }

  /**
   * Add a field (dimension or metric) to the current chart configuration
   */
  async addField(field, fieldType) {
    try {
      const selector = fieldType === 'dimension' ? 
        '[data-testid="dimension-field-selector"]' : 
        '[data-testid="metric-field-selector"]';
      
      await this.page.waitForSelector(selector, { timeout: 5000 });
      await this.page.click(selector);
      
      // Search for the field
      await this.page.waitForSelector('[data-testid="field-search"]', { timeout: 5000 });
      await this.page.type('[data-testid="field-search"]', field.field_name);
      
      // Select the field from dropdown
      await this.page.waitForSelector(`[data-testid="field-option-${field.field_name}"]`, { timeout: 5000 });
      await this.page.click(`[data-testid="field-option-${field.field_name}"]`);
      
    } catch (error) {
      console.warn(`⚠️ Could not add field ${field.field_name}:`, error.message);
    }
  }

  /**
   * Apply a filter to the current chart
   */
  async applyFilter(filter) {
    try {
      await this.page.click('[data-testid="add-filter-button"]');
      await this.page.waitForSelector('[data-testid="filter-field-selector"]', { timeout: 5000 });
      await this.page.click('[data-testid="filter-field-selector"]');
      
      // Select filter field
      await this.page.type('[data-testid="filter-search"]', filter.field_name);
      await this.page.click(`[data-testid="filter-field-${filter.field_name}"]`);
      
      // Set filter value
      await this.page.waitForSelector('[data-testid="filter-value-input"]', { timeout: 5000 });
      await this.page.type('[data-testid="filter-value-input"]', filter.value);
      
      await this.page.click('[data-testid="apply-filter"]');
      
    } catch (error) {
      console.warn(`⚠️ Could not apply filter ${filter.field_name}:`, error.message);
    }
  }

  /**
   * Apply color scheme to the current chart
   */
  async applyColorScheme(colorScheme) {
    try {
      await this.page.click('[data-testid="style-tab"]');
      await this.page.waitForSelector('[data-testid="color-scheme-selector"]', { timeout: 5000 });
      
      const schemeMap = {
        'blue_actionstep_theme': 'blue',
        'green_theme': 'green',
        'red_theme': 'red',
        'purple_theme': 'purple'
      };
      
      const lookerScheme = schemeMap[colorScheme] || 'default';
      await this.page.click(`[data-testid="color-scheme-${lookerScheme}"]`);
      
    } catch (error) {
      console.warn(`⚠️ Could not apply color scheme ${colorScheme}:`, error.message);
    }
  }

  /**
   * Save the Looker Studio report after publishing all cards
   */
  async saveReport() {
    console.log('💾 Saving Looker Studio report...');
    
    try {
      // Use Ctrl+S to save
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyS');
      await this.page.keyboard.up('Control');
      
      // Wait for save confirmation
      await this.page.waitForSelector('[data-testid="save-confirmation"]', { timeout: 10000 });
      
      console.log('✅ Report saved successfully');
      
      await this.logGovernanceEntry({
        event_type: 'spqr_report_saved',
        action: 'save_report',
        success: true,
        details: {
          published_cards_count: this.publishedCards.length,
          failed_cards_count: this.failedCards.length
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to save report:', error.message);
      
      await this.logGovernanceEntry({
        event_type: 'spqr_report_saved',
        action: 'save_report',
        success: false,
        details: {
          error_message: error.message
        }
      });
      
      throw error;
    }
  }

  /**
   * Log entry to governance log file
   */
  async logGovernanceEntry(entry) {
    const governanceEntry = {
      timestamp: new Date().toISOString(),
      event_type: entry.event_type,
      user_id: 'system',
      user_role: 'automation',
      resource_type: 'dashboard',
      resource_id: 'looker_studio',
      action: entry.action,
      success: entry.success,
      details: {
        phase: 'Phase4–RuntimeObservability',
        subtask: 'SPQR Auto-Publish',
        ...entry.details
      },
      runtime_context: {
        phase: 'Phase4–RuntimeObservability',
        environment: process.env.NODE_ENV || 'production',
        automation_tool: 'puppeteer'
      }
    };

    try {
      const logLine = JSON.stringify(governanceEntry) + '\n';
      await fs.appendFile(this.governanceLogPath, logLine);
    } catch (error) {
      console.error('Failed to write to governance log:', error.message);
    }
  }

  /**
   * Generate final completion report
   */
  async generateCompletionReport() {
    const endTime = performance.now();
    const totalDuration = Math.round(endTime - this.startTime);
    
    const report = {
      timestamp: new Date().toISOString(),
      phase: 'Phase4–RuntimeObservability',
      subtask: 'SPQR Auto-Publish Complete',
      execution_summary: {
        total_duration_ms: totalDuration,
        total_cards_processed: this.publishedCards.length + this.failedCards.length,
        successful_publications: this.publishedCards.length,
        failed_publications: this.failedCards.length,
        success_rate: this.publishedCards.length / (this.publishedCards.length + this.failedCards.length)
      },
      published_cards: this.publishedCards,
      failed_cards: this.failedCards,
      performance_metrics: {
        avg_card_processing_time: Math.round(
          this.publishedCards.reduce((sum, card) => sum + card.processing_time_ms, 0) / 
          this.publishedCards.length
        ),
        total_automation_time_ms: totalDuration
      },
      next_steps: [
        'Verify published cards in Looker Studio report',
        'Review failed cards and resolve issues',
        'Schedule regular automated updates',
        'Monitor report performance and usage'
      ]
    };

    await this.logGovernanceEntry({
      event_type: 'spqr_auto_publish_complete',
      action: 'generate_completion_report',
      success: true,
      details: report
    });

    console.log('📊 SPQR Auto-Publish Completion Report:');
    console.log(`   ✅ Successfully published: ${this.publishedCards.length} cards`);
    console.log(`   ❌ Failed publications: ${this.failedCards.length} cards`);
    console.log(`   ⏱️  Total execution time: ${Math.round(totalDuration / 1000)}s`);
    console.log(`   📈 Success rate: ${Math.round(report.execution_summary.success_rate * 100)}%`);

    return report;
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed successfully');
    }
  }

  /**
   * Main execution method
   */
  async execute() {
    try {
      console.log('🚀 Starting SPQR Auto-Publish to Looker Studio...\n');
      
      await this.logGovernanceEntry({
        event_type: 'spqr_auto_publish_start',
        action: 'start_automation',
        success: true,
        details: {
          automation_trigger: 'manual_dispatch',
          expected_cards: 21
        }
      });

      await this.initializeBrowser();
      await this.authenticateGoogle();
      await this.navigateToLookerReport();
      
      const cards = await this.loadSPQRCards();
      
      console.log(`\n📊 Publishing ${cards.length} SPQR cards to Looker Studio...\n`);
      
      for (let i = 0; i < cards.length; i++) {
        console.log(`[${i + 1}/${cards.length}] Processing card...`);
        await this.addCardToReport(cards[i]);
        
        // Add delay between cards to avoid overwhelming the interface
        if (i < cards.length - 1) {
          await this.page.waitForTimeout(2000);
        }
      }
      
      await this.saveReport();
      const report = await this.generateCompletionReport();
      
      console.log('\n🎉 SPQR Auto-Publish completed successfully!');
      
      return report;
      
    } catch (error) {
      console.error('\n❌ SPQR Auto-Publish failed:', error.message);
      
      await this.logGovernanceEntry({
        event_type: 'spqr_auto_publish_failed',
        action: 'automation_error',
        success: false,
        details: {
          error_message: error.message,
          error_stack: error.stack,
          published_cards_before_failure: this.publishedCards.length
        }
      });
      
      throw error;
      
    } finally {
      await this.cleanup();
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const publisher = new SPQRLookerPublisher();
  
  publisher.execute()
    .then((report) => {
      console.log('✅ Automation completed with report:', report.execution_summary);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Automation failed:', error.message);
      process.exit(1);
    });
}

module.exports = SPQRLookerPublisher;