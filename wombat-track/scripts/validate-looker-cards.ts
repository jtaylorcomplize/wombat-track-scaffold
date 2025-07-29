#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CardField {
  field_name: string;
  display_name: string;
  data_type: string;
  format?: string;
}

interface CardFilters {
  default_filters?: Array<{
    field_name: string;
    operator: string;
    value: string;
  }>;
  available_filters?: Array<{
    field_name: string;
    display_name: string;
    filter_type: string;
    options?: string[];
  }>;
}

interface LookerCard {
  id: string;
  name: string;
  description: string;
  category: string;
  data_source: {
    primary_table: string;
    join_tables: string[];
    connection_type: string;
  };
  fields: {
    dimensions: CardField[];
    metrics: CardField[];
  };
  filters: CardFilters;
  validation?: {
    matched_view: string;
    missing_fields: string[];
    filter_issues: string[];
    notes: string[];
  };
}

interface ActionStepView {
  view_name: string;
  base_table: string;
  fields: Array<{
    field_name: string;
    sql_expression: string;
    data_type: string;
  }>;
}

interface ValidationResult {
  cardName: string;
  viewMatched: string;
  missingFields: string;
  filterIssues: string;
  notes: string;
}

class LookerCardValidator {
  private actionStepViews: ActionStepView[];
  private validationResults: ValidationResult[] = [];

  constructor() {
    this.loadActionStepViews();
  }

  private loadActionStepViews(): void {
    const viewsPath = '/home/jtaylor/wombat-track-scaffold/wombat-track/src/data/spqr/deployment/actionstep_sql_views.json';
    this.actionStepViews = JSON.parse(fs.readFileSync(viewsPath, 'utf-8'));
  }

  private findBestMatchingView(card: LookerCard): ActionStepView | null {
    const primaryTable = card.data_source.primary_table;
    
    // Direct match by table name
    for (const view of this.actionStepViews) {
      if (view.view_name.includes(primaryTable.replace('actionstep_', ''))) {
        return view;
      }
    }

    // Match by category
    const categoryToViewMap: Record<string, string> = {
      'matter_management': 'v_actionstep_matter_management',
      'financial': 'v_actionstep_financials',
      'workforce': 'v_actionstep_workforce',
      'performance': 'v_actionstep_performance'
    };

    const targetView = categoryToViewMap[card.category];
    if (targetView) {
      return this.actionStepViews.find(view => view.view_name === targetView) || null;
    }

    return null;
  }

  private validateFields(card: LookerCard, view: ActionStepView): string[] {
    const missingFields: string[] = [];
    const viewFieldNames = view.fields.map(f => f.field_name);

    // Check dimensions
    for (const dimension of card.fields.dimensions) {
      if (!viewFieldNames.includes(dimension.field_name)) {
        missingFields.push(`dimension: ${dimension.field_name}`);
      }
    }

    // Check metrics
    for (const metric of card.fields.metrics) {
      if (!viewFieldNames.includes(metric.field_name)) {
        missingFields.push(`metric: ${metric.field_name}`);
      }
    }

    return missingFields;
  }

  private validateFilters(card: LookerCard, view: ActionStepView): string[] {
    const filterIssues: string[] = [];
    const viewFieldNames = view.fields.map(f => f.field_name);

    // Check default filters
    if (card.filters.default_filters) {
      for (const filter of card.filters.default_filters) {
        if (!viewFieldNames.includes(filter.field_name)) {
          filterIssues.push(`default filter field not found: ${filter.field_name}`);
        }
      }
    }

    // Check available filters
    if (card.filters.available_filters) {
      for (const filter of card.filters.available_filters) {
        if (!viewFieldNames.includes(filter.field_name)) {
          filterIssues.push(`available filter field not found: ${filter.field_name}`);
        }
      }
    }

    return filterIssues;
  }

  public validateCard(cardPath: string): LookerCard {
    const cardContent = fs.readFileSync(cardPath, 'utf-8');
    const card: LookerCard = JSON.parse(cardContent);

    const matchingView = this.findBestMatchingView(card);
    
    if (!matchingView) {
      card.validation = {
        matched_view: 'NONE',
        missing_fields: ['Cannot validate - no matching view found'],
        filter_issues: ['Cannot validate - no matching view found'],
        notes: ['No matching ActionStep view found for this card category']
      };

      this.validationResults.push({
        cardName: card.name,
        viewMatched: 'NONE',
        missingFields: 'Cannot validate - no matching view found',
        filterIssues: 'Cannot validate - no matching view found',
        notes: 'No matching ActionStep view found'
      });

      return card;
    }

    const missingFields = this.validateFields(card, matchingView);
    const filterIssues = this.validateFilters(card, matchingView);
    
    const notes: string[] = [];
    if (missingFields.length === 0) {
      notes.push('All fields validated successfully');
    }
    if (filterIssues.length === 0) {
      notes.push('All filters validated successfully');
    }
    if (card.fields.metrics.length === 0) {
      notes.push('Card contains only dimensions, no metrics defined');
    }

    card.validation = {
      matched_view: matchingView.view_name,
      missing_fields: missingFields,
      filter_issues: filterIssues,
      notes: notes.length > 0 ? notes : ['Validation completed']
    };

    this.validationResults.push({
      cardName: card.name,
      viewMatched: matchingView.view_name,
      missingFields: missingFields.join('; ') || 'None',
      filterIssues: filterIssues.join('; ') || 'None',
      notes: notes.join('; ')
    });

    return card;
  }

  public async validateAllCards(): Promise<void> {
    const cardsDir = '/home/jtaylor/wombat-track-scaffold/wombat-track/src/data/spqr/generated/JSON';
    const outputDir = '/home/jtaylor/wombat-track-scaffold/wombat-track/src/data/spqr/validation';
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const cardFiles = fs.readdirSync(cardsDir).filter(file => file.endsWith('.json'));
    
    console.log(`🔍 Starting validation of ${cardFiles.length} Looker cards...`);

    for (const cardFile of cardFiles) {
      const cardPath = path.join(cardsDir, cardFile);
      console.log(`   Validating: ${cardFile}`);
      
      const validatedCard = this.validateCard(cardPath);
      
      // Save validated card to output directory
      const outputPath = path.join(outputDir, cardFile);
      fs.writeFileSync(outputPath, JSON.stringify(validatedCard, null, 2));
    }

    // Generate CSV summary report
    await this.generateCsvReport(outputDir);
    
    console.log(`✅ Validation complete. Results saved to: ${outputDir}`);
    console.log(`📊 CSV report: ${path.join(outputDir, 'Looker_IntegrationReport.csv')}`);
  }

  private async generateCsvReport(outputDir: string): Promise<void> {
    const csvWriter = createObjectCsvWriter({
      path: path.join(outputDir, 'Looker_IntegrationReport.csv'),
      header: [
        { id: 'cardName', title: 'Card Name' },
        { id: 'viewMatched', title: 'View Matched' },
        { id: 'missingFields', title: 'Missing Fields' },
        { id: 'filterIssues', title: 'Filter Issues' },
        { id: 'notes', title: 'Notes' }
      ]
    });

    await csvWriter.writeRecords(this.validationResults);
  }

  public getValidationSummary(): {
    totalCards: number;
    successfullyValidated: number;
    cardsWithIssues: number;
    unmatched: number;
  } {
    const totalCards = this.validationResults.length;
    const successfullyValidated = this.validationResults.filter(
      r => r.viewMatched !== 'NONE' && r.missingFields === 'None' && r.filterIssues === 'None'
    ).length;
    const cardsWithIssues = this.validationResults.filter(
      r => r.viewMatched !== 'NONE' && (r.missingFields !== 'None' || r.filterIssues !== 'None')
    ).length;
    const unmatched = this.validationResults.filter(r => r.viewMatched === 'NONE').length;

    return { totalCards, successfullyValidated, cardsWithIssues, unmatched };
  }
}

// Execute validation
async function main() {
  const validator = new LookerCardValidator();
  
  try {
    await validator.validateAllCards();
    
    const summary = validator.getValidationSummary();
    console.log('\n📋 VALIDATION SUMMARY:');
    console.log(`   Total Cards: ${summary.totalCards}`);
    console.log(`   ✅ Successfully Validated: ${summary.successfullyValidated}`);
    console.log(`   ⚠️  Cards with Issues: ${summary.cardsWithIssues}`);
    console.log(`   ❌ Unmatched Cards: ${summary.unmatched}`);
    
    // Update governance log
    const governanceEntry = {
      timestamp: new Date().toISOString(),
      event: 'MCP–LookerValidationComplete',
      phase: '2.5',
      report_id: 'b13a3784-7e6d-4e6b-acb5-4dae3202fd74',
      summary: summary,
      output_location: '/home/jtaylor/wombat-track-scaffold/wombat-track/src/data/spqr/validation/',
      status: 'completed'
    };
    
    const govLogPath = '/home/jtaylor/wombat-track-scaffold/wombat-track/logs/governance.jsonl';
    fs.appendFileSync(govLogPath, JSON.stringify(governanceEntry) + '\n');
    
    console.log('\n🏁 Phase 2.5 validation complete. Ready for Phase 3: Runtime Enablement');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Execute if this file is run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}