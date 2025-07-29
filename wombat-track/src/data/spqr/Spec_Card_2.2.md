# Spec Card 2.2 Schema

## Card Configuration Schema

```yaml
card:
  id: string                      # Unique card identifier
  name: string                    # Display name for the card
  description: string             # Brief description of the card's purpose
  category: string                # Card category (financial, operational, compliance, etc.)
  
data_source:
  primary_table: string           # Main table/dataset name
  join_tables: array              # Additional tables if joins required
  connection_type: string         # Connection method (direct, api, import)
  
fields:
  dimensions: array               # Grouping/categorical fields
    - field_name: string
      display_name: string
      data_type: string
      format: string              # Optional formatting
      
  metrics: array                  # Numerical/measurable fields
    - field_name: string
      display_name: string
      data_type: string
      aggregation: string         # sum, avg, count, etc.
      format: string              # Optional formatting
      
filters:
  default_filters: array          # Filters applied by default
    - field_name: string
      operator: string            # equals, greater_than, contains, etc.
      value: string/array
      
  available_filters: array        # Filters available to users
    - field_name: string
      display_name: string
      filter_type: string         # dropdown, date_range, text_input
      options: array              # For dropdown types
      
visualization:
  chart_type: string              # table, bar_chart, line_chart, pie_chart, etc.
  color_scheme: string            # Color palette identifier
  
permissions:
  view_roles: array               # Roles that can view this card
  edit_roles: array               # Roles that can modify this card
  
metadata:
  created_by: string
  created_date: string
  last_modified: string
  version: string
  tags: array                     # For categorization and search
```

## Field Tag Mappings

Standard field tags for consistent mapping:
- `@financial_amount` - Monetary values
- `@date_field` - Date/time fields
- `@category_field` - Categorical groupings
- `@id_field` - Identifier fields
- `@status_field` - Status/state fields
- `@percentage_field` - Percentage values
- `@count_field` - Count/quantity values

## Validation Rules

1. All required fields must be present
2. Field names must match available fields in dictionary
3. Filter operators must be valid for data type
4. Chart type must be appropriate for data structure
5. All referenced tables must exist in data source