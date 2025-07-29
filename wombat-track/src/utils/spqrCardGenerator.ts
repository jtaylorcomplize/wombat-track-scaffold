import { readFileSync } from 'fs';
import { join } from 'path';

// Types for SPQR data structures
export interface CardField {
  field_name: string;
  field_display_name: string;
  field_type: 'dimension' | 'metric';
  data_type: string;
  card_tag: string;
  is_required: boolean;
  default_filter?: string;
  filter_options?: string;
}

export interface FieldDefinition {
  field_name: string;
  display_name: string;
  data_type: string;
  description: string;
  validation_rules: string;
  business_definition: string;
  source_system: string;
  calculation_logic?: string;
}

export interface ApprovedCard {
  id: string;
  name: string;
  category: string;
  priority: string;
  status: string;
}

export interface SpecCard {
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

export interface CardFieldSpec {
  field_name: string;
  display_name: string;
  data_type: string;
  format?: string;
  aggregation?: string;
}

export interface FilterSpec {
  field_name: string;
  display_name?: string;
  operator?: string;
  value?: string | string[];
  filter_type?: string;
  options?: string[];
}

export interface ValidationIssue {
  card_id: string;
  issue_type: 'missing_field' | 'invalid_filter' | 'validation_error';
  description: string;
  severity: 'low' | 'medium' | 'high';
  field_name?: string;
}

// Utility functions for parsing CSV data
export function parseCSV(csvContent: string): any[] {
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

// Load and parse SPQR data files
export function loadSPQRData() {
  const dataPath = join(process.cwd(), 'src', 'data', 'spqr');
  
  // Load field mappings
  const fieldMappingContent = readFileSync(join(dataPath, 'SPQR_Field_Match_Table_with_Card_Tags.csv'), 'utf-8');
  const fieldMappings: CardField[] = parseCSV(fieldMappingContent);
  
  // Load field dictionary
  const fieldDictionaryContent = readFileSync(join(dataPath, 'SPQR_MVP_Field_Dictionary.csv'), 'utf-8');
  const fieldDictionary: FieldDefinition[] = parseCSV(fieldDictionaryContent);
  
  // Load approved cards
  const approvedCardsContent = readFileSync(join(dataPath, '21_card_dashboard_list.json'), 'utf-8');
  const approvedCardsData = JSON.parse(approvedCardsContent);
  const approvedCards: ApprovedCard[] = approvedCardsData.approved_cards;
  
  return { fieldMappings, fieldDictionary, approvedCards };
}

// Generate visualization config based on card type and fields
export function generateVisualizationConfig(cardId: string, fields: CardFieldSpec[]): { chart_type: string; color_scheme: string } {
  const category = cardId.split('_')[0];
  const metricCount = fields.filter(f => f.data_type === 'decimal' || f.data_type === 'integer').length;
  const dimensionCount = fields.filter(f => f.data_type === 'string' || f.data_type === 'date').length;
  
  // Chart type logic
  let chart_type = 'table'; // default
  if (metricCount >= 2 && dimensionCount >= 1) {
    chart_type = 'bar_chart';
  } else if (cardId.includes('trend') || cardId.includes('time')) {
    chart_type = 'line_chart';
  } else if (metricCount === 1 && dimensionCount === 1) {
    chart_type = 'pie_chart';
  }
  
  // Color scheme based on category
  const colorSchemes: Record<string, string> = {
    fin: 'green_scheme',
    ops: 'blue_scheme',
    comp: 'orange_scheme',
    sales: 'purple_scheme',
    hr: 'teal_scheme',
    inv: 'brown_scheme',
    cust: 'pink_scheme',
    proj: 'gray_scheme',
    mkt: 'red_scheme',
    qual: 'yellow_scheme'
  };
  
  return {
    chart_type,
    color_scheme: colorSchemes[category] || 'default_scheme'
  };
}

// Validate card against field mappings and dictionary
export function validateCard(cardId: string, fieldMappings: CardField[], fieldDictionary: FieldDefinition[]): ValidationIssue[] {
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

// Generate Spec Card 2.2 for a single card
export function generateSpecCard(
  approvedCard: ApprovedCard, 
  fieldMappings: CardField[], 
  fieldDictionary: FieldDefinition[]
): SpecCard {
  const cardFields = fieldMappings.filter(fm => fm.card_id === approvedCard.id);
  
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
      const dictEntry = fieldDictionary.find(fd => fd.field_name === cf.field_name);
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
  const visualization = generateVisualizationConfig(approvedCard.id, allFields);
  
  // Generate spec card
  const specCard: SpecCard = {
    id: approvedCard.id,
    name: approvedCard.name,
    description: `${approvedCard.category} dashboard card for ${approvedCard.name.toLowerCase()}`,
    category: approvedCard.category.toLowerCase(),
    data_source: {
      primary_table: `${approvedCard.category.toLowerCase()}_data`,
      join_tables: [],
      connection_type: 'direct'
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
      view_roles: ['viewer', 'analyst', 'admin'],
      edit_roles: ['analyst', 'admin']
    },
    metadata: {
      created_by: 'Claude SPQR Generator',
      created_date: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      version: '2.2',
      tags: [approvedCard.category.toLowerCase(), approvedCard.priority]
    }
  };
  
  return specCard;
}

// Generate all spec cards with validation
export function generateAllSpecCards(): { specCards: SpecCard[]; issues: ValidationIssue[] } {
  const { fieldMappings, fieldDictionary, approvedCards } = loadSPQRData();
  
  const specCards: SpecCard[] = [];
  const allIssues: ValidationIssue[] = [];
  
  for (const approvedCard of approvedCards) {
    // Validate card first
    const issues = validateCard(approvedCard.id, fieldMappings, fieldDictionary);
    allIssues.push(...issues);
    
    // Generate spec card even if there are issues (for review)
    const specCard = generateSpecCard(approvedCard, fieldMappings, fieldDictionary);
    specCards.push(specCard);
  }
  
  return { specCards, issues: allIssues };
}

// Create MCP Issue Table entry
export function createMCPIssueEntry(issue: ValidationIssue): any {
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