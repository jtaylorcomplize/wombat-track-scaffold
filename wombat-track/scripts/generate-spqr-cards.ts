#!/usr/bin/env ts-node

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Types for SPQR data structures
interface CardField {
  card_id: string;
  card_name: string;
  field_name: string;
  field_display_name: string;
  field_type: 'dimension' | 'metric';
  data_type: string;
  card_tag: string;
  is_required: boolean;
  default_filter?: string;
  filter_options?: string;
}

interface FieldDefinition {
  field_name: string;
  display_name: string;
  data_type: string;
  description: string;
  validation_rules: string;
  business_definition: string;
  source_system: string;
  calculation_logic?: string;
}

interface ApprovedCard {
  card_id: string;
  card_name: string;
  category: string;
  description: string;
  priority: string;
  status: string;
  dashboard_group: string;
  visual_type: string;
  target_audience: string;
}

interface SpecCard {
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
    dimensions: CardFieldSpec[];
    metrics: CardFieldSpec[];
  };
  filters: {
    default_filters: FilterSpec[];
    available_filters: FilterSpec[];
  };
  visualization: {
    chart_type: string;
    color_scheme: string;
  };
  permissions: {
    view_roles: string[];
    edit_roles: string[];
  };
  metadata: {
    created_by: string;
    created_date: string;
    last_modified: string;
    version: string;
    tags: string[];
  };
}

interface CardFieldSpec {
  field_name: string;
  display_name: string;
  data_type: string;
  format?: string;
  aggregation?: string;
}

interface FilterSpec {
  field_name: string;
  display_name?: string;
  operator?: string;
  value?: string | string[];
  filter_type?: string;
  options?: string[];
}

interface ValidationIssue {
  card_id: string;
  issue_type: 'missing_field' | 'invalid_filter' | 'validation_error';
  description: string;
  severity: 'low' | 'medium' | 'high';
  field_name?: string;
}

// Utility functions
function parseCSV(csvContent: string): any[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    return obj;
  });
}

function loadSPQRData() {
  const dataPath = join(process.cwd(), 'src', 'data', 'spqr');
  
  // Load field mappings
  const fieldMappingContent = readFileSync(join(dataPath, 'SPQR_Field_Match_Table_with_Card_Tags.csv'), 'utf-8');
  const fieldMappings: CardField[] = parseCSV(fieldMappingContent);
  
  // Load field dictionary
  const fieldDictionaryContent = readFileSync(join(dataPath, 'SPQR_MVP_Field_Dictionary.csv'), 'utf-8');
  const fieldDictionary: FieldDefinition[] = parseCSV(fieldDictionaryContent);
  
  // Load master card library
  const masterCardContent = readFileSync(join(dataPath, 'SPQR_Master_Card_Library.csv'), 'utf-8');
  const approvedCards: ApprovedCard[] = parseCSV(masterCardContent);
  
  return { fieldMappings, fieldDictionary, approvedCards };
}

function generateVisualizationConfig(cardId: string, visualType: string, fields: CardFieldSpec[]): { chart_type: string; color_scheme: string } {
  const category = cardId.split('_')[0];
  
  // Use the visual_type from master card library, or default logic
  const chart_type = visualType || 'table';
  
  // Color scheme based on category
  const colorSchemes: Record<string, string> = {
    act: 'blue_actionstep_theme',
    fin: 'green_financial_theme',
    mat: 'purple_matter_theme',
    cli: 'orange_client_theme',
    tim: 'teal_time_theme'
  };
  
  return {
    chart_type,
    color_scheme: colorSchemes[category] || 'default_actionstep_theme'
  };
}

function validateCard(cardId: string, fieldMappings: CardField[], fieldDictionary: FieldDefinition[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const cardFields = fieldMappings.filter(fm => fm.card_id === cardId);
  
  // Check if card has any fields
  if (cardFields.length === 0) {
    issues.push({
      card_id: cardId,
      issue_type: 'missing_field',
      description: `No fields defined for card ${cardId}`,
      severity: 'high'
    });
    return issues;
  }
  
  // Validate each field exists in dictionary
  for (const cardField of cardFields) {
    const dictEntry = fieldDictionary.find(fd => fd.field_name === cardField.field_name);
    if (!dictEntry) {
      issues.push({
        card_id: cardId,
        issue_type: 'missing_field',
        description: `Field ${cardField.field_name} not found in field dictionary`,
        severity: 'high',
        field_name: cardField.field_name
      });
    } else {
      // Validate data type consistency
      if (dictEntry.data_type !== cardField.data_type) {
        issues.push({
          card_id: cardId,
          issue_type: 'validation_error',
          description: `Data type mismatch for ${cardField.field_name}: mapping has ${cardField.data_type}, dictionary has ${dictEntry.data_type}`,
          severity: 'medium',
          field_name: cardField.field_name
        });
      }
    }
    
    // Validate filter options
    if (cardField.filter_options && cardField.filter_options.trim()) {
      const options = cardField.filter_options.split(',');
      if (options.length === 0) {
        issues.push({
          card_id: cardId,
          issue_type: 'invalid_filter',
          description: `Invalid filter options for ${cardField.field_name}`,
          severity: 'low',
          field_name: cardField.field_name
        });
      }
    }
  }
  
  return issues;
}

function generateSpecCard(
  approvedCard: ApprovedCard, 
  fieldMappings: CardField[], 
  fieldDictionary: FieldDefinition[]
): SpecCard {
  const cardFields = fieldMappings.filter(fm => fm.card_id === approvedCard.card_id);
  
  // Separate dimensions and metrics
  const dimensions: CardFieldSpec[] = cardFields
    .filter(cf => cf.field_type === 'dimension')
    .map(cf => {
      const dictEntry = fieldDictionary.find(fd => fd.field_name === cf.field_name);
      return {
        field_name: cf.field_name,
        display_name: cf.field_display_name,
        data_type: cf.data_type,
        format: dictEntry?.data_type === 'date' ? 'YYYY-MM-DD' : undefined
      };
    });
  
  const metrics: CardFieldSpec[] = cardFields
    .filter(cf => cf.field_type === 'metric')
    .map(cf => {
      return {
        field_name: cf.field_name,
        display_name: cf.field_display_name,
        data_type: cf.data_type,
        aggregation: cf.card_tag.includes('@financial_amount') ? 'sum' :
                    cf.card_tag.includes('@count_field') ? 'count' :
                    cf.card_tag.includes('@percentage_field') ? 'avg' : 'sum',
        format: cf.card_tag.includes('@financial_amount') ? '$#,##0.00' :
               cf.card_tag.includes('@percentage_field') ? '0.00%' : undefined
      };
    });
  
  // Generate filters
  const default_filters: FilterSpec[] = cardFields
    .filter(cf => cf.default_filter && cf.default_filter !== 'none')
    .map(cf => ({
      field_name: cf.field_name,
      operator: 'equals',
      value: cf.default_filter
    }));
  
  const available_filters: FilterSpec[] = cardFields
    .filter(cf => cf.filter_options && cf.filter_options.trim())
    .map(cf => ({
      field_name: cf.field_name,
      display_name: cf.field_display_name,
      filter_type: cf.data_type === 'date' ? 'date_range' : 'dropdown',
      options: cf.filter_options ? cf.filter_options.split(',') : undefined
    }));
  
  // Generate visualization config
  const allFields = [...dimensions, ...metrics];
  const visualization = generateVisualizationConfig(approvedCard.card_id, approvedCard.visual_type, allFields);
  
  // Generate spec card
  const specCard: SpecCard = {
    id: approvedCard.card_id,
    name: approvedCard.card_name,
    description: approvedCard.description,
    category: approvedCard.category.toLowerCase().replace(/\s+/g, '_'),
    data_source: {
      primary_table: `actionstep_${approvedCard.category.toLowerCase().replace(/\s+/g, '_')}`,
      join_tables: [],
      connection_type: 'actionstep_api'
    },
    fields: {
      dimensions,
      metrics
    },
    filters: {
      default_filters,
      available_filters
    },
    visualization,
    permissions: {
      view_roles: approvedCard.target_audience === 'Partners' ? ['partner', 'senior_associate'] : 
                 approvedCard.target_audience === 'All Users' ? ['all_users'] : 
                 ['analyst', 'admin'],
      edit_roles: ['admin', 'partner']
    },
    metadata: {
      created_by: 'Claude SPQR Generator',
      created_date: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      version: '2.2',
      tags: [approvedCard.category.toLowerCase(), approvedCard.priority, approvedCard.dashboard_group.toLowerCase().replace(/\s+/g, '_')]
    }
  };
  
  return specCard;
}

function createMCPIssueEntry(issue: ValidationIssue): any {
  return {
    id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    source: 'SPQR_Card_Generator',
    card_id: issue.card_id,
    issue_type: issue.issue_type,
    severity: issue.severity,
    description: issue.description,
    field_name: issue.field_name || null,
    status: 'open',
    assigned_to: null,
    resolution: null,
    tags: ['spqr', 'card_generation', issue.severity]
  };
}

function generateCardMarkdown(specCard: SpecCard): string {
  return `# ${specCard.name}

**Card ID:** ${specCard.id}  
**Category:** ${specCard.category}  
**Version:** ${specCard.metadata.version}  

## Description
${specCard.description}

## Data Source
- **Primary Table:** ${specCard.data_source.primary_table}
- **Connection Type:** ${specCard.data_source.connection_type}
- **Join Tables:** ${specCard.data_source.join_tables.length > 0 ? specCard.data_source.join_tables.join(', ') : 'None'}

## Fields

### Dimensions
${specCard.fields.dimensions.map(d => 
  `- **${d.display_name}** (${d.field_name})
  - Type: ${d.data_type}${d.format ? `\n  - Format: ${d.format}` : ''}`
).join('\n')}

### Metrics
${specCard.fields.metrics.map(m => 
  `- **${m.display_name}** (${m.field_name})
  - Type: ${m.data_type}
  - Aggregation: ${m.aggregation}${m.format ? `\n  - Format: ${m.format}` : ''}`
).join('\n')}

## Filters

### Default Filters
${specCard.filters.default_filters.length > 0 ? 
  specCard.filters.default_filters.map(f => `- ${f.field_name} ${f.operator} ${f.value}`).join('\n') : 
  'None'}

### Available Filters
${specCard.filters.available_filters.length > 0 ? 
  specCard.filters.available_filters.map(f => 
    `- **${f.display_name}** (${f.field_name})
  - Type: ${f.filter_type}${f.options ? `\n  - Options: ${f.options.join(', ')}` : ''}`
  ).join('\n') : 
  'None'}

## Visualization
- **Chart Type:** ${specCard.visualization.chart_type}
- **Color Scheme:** ${specCard.visualization.color_scheme}

## Permissions
- **View Roles:** ${specCard.permissions.view_roles.join(', ')}
- **Edit Roles:** ${specCard.permissions.edit_roles.join(', ')}

## Metadata
- **Created By:** ${specCard.metadata.created_by}
- **Created Date:** ${specCard.metadata.created_date}
- **Tags:** ${specCard.metadata.tags.join(', ')}
`;
}

// Main execution function
async function main() {
  console.log('🚀 Starting SPQR Card Generation...');
  
  // Load data
  const { fieldMappings, fieldDictionary, approvedCards } = loadSPQRData();
  console.log(`📊 Loaded ${approvedCards.length} approved cards`);
  
  // Create output directories
  const outputPath = join(process.cwd(), 'src', 'data', 'spqr', 'generated');
  const jsonPath = join(outputPath, 'JSON');
  const markdownPath = join(outputPath, 'Markdown');
  
  [outputPath, jsonPath, markdownPath].forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });
  
  const allIssues: any[] = [];
  const generatedCards: SpecCard[] = [];
  
  // Generate cards
  for (const approvedCard of approvedCards) {
    console.log(`📝 Generating card: ${approvedCard.card_name}`);
    
    // Validate card
    const issues = validateCard(approvedCard.card_id, fieldMappings, fieldDictionary);
    const mcpIssues = issues.map(createMCPIssueEntry);
    allIssues.push(...mcpIssues);
    
    if (issues.length > 0) {
      console.log(`⚠️  Found ${issues.length} validation issues for ${approvedCard.card_name}`);
    }
    
    // Generate spec card
    const specCard = generateSpecCard(approvedCard, fieldMappings, fieldDictionary);
    generatedCards.push(specCard);
    
    // Save JSON
    const jsonFilename = `${approvedCard.card_name.replace(/\s+/g, '_')}.json`;
    writeFileSync(join(jsonPath, jsonFilename), JSON.stringify(specCard, null, 2));
    
    // Save Markdown
    const markdownFilename = `${approvedCard.card_name.replace(/\s+/g, '_')}.md`;
    const markdownContent = generateCardMarkdown(specCard);
    writeFileSync(join(markdownPath, markdownFilename), markdownContent);
  }
  
  // Save MCP Issues Log
  const mcpIssuesLog = {
    timestamp: new Date().toISOString(),
    total_issues: allIssues.length,
    issues: allIssues,
    summary: {
      high_severity: allIssues.filter(i => i.severity === 'high').length,
      medium_severity: allIssues.filter(i => i.severity === 'medium').length,
      low_severity: allIssues.filter(i => i.severity === 'low').length
    }
  };
  
  writeFileSync(join(outputPath, 'MCP_Issues_Log.json'), JSON.stringify(mcpIssuesLog, null, 2));
  
  // Generate summary report
  const summaryReport = {
    generation_timestamp: new Date().toISOString(),
    total_cards_processed: approvedCards.length,
    successful_generations: generatedCards.length,
    total_validation_issues: allIssues.length,
    cards_by_category: generatedCards.reduce((acc: any, card) => {
      acc[card.category] = (acc[card.category] || 0) + 1;
      return acc;
    }, {}),
    cards_by_dashboard_group: approvedCards.reduce((acc: any, card) => {
      acc[card.dashboard_group] = (acc[card.dashboard_group] || 0) + 1;
      return acc;
    }, {}),
    issues_by_severity: mcpIssuesLog.summary
  };
  
  writeFileSync(join(outputPath, 'Generation_Summary.json'), JSON.stringify(summaryReport, null, 2));
  
  console.log('✅ SPQR Card Generation Complete!');
  console.log(`📁 Generated ${generatedCards.length} cards`);
  console.log(`⚠️  Total validation issues: ${allIssues.length}`);
  console.log(`📂 Output saved to: ${outputPath}`);
}

// Execute
main().catch(console.error);