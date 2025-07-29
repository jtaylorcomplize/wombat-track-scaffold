# Matter Budget Variance

**Card ID:** act_019  
**Category:** financials  
**Version:** 2.2  

## Description
Budget vs actual costs for matters

## Data Source
- **Primary Table:** actionstep_financials
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Matter ID** (matter_id)
  - Type: string
- **Budget Status** (budget_status)
  - Type: string

### Metrics
- **Budgeted Amount** (budgeted_amount)
  - Type: decimal
  - Aggregation: sum
  - Format: $#,##0.00
- **Actual Amount** (actual_amount)
  - Type: decimal
  - Aggregation: sum
  - Format: $#,##0.00
- **Variance %** (variance_percentage)
  - Type: decimal
  - Aggregation: avg
  - Format: 0.00%

## Filters

### Default Filters
None

### Available Filters
- **Budget Status** (budget_status)
  - Type: dropdown
  - Options: "Under Budget

## Visualization
- **Chart Type:** bar_chart
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** partner, senior_associate
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.272Z
- **Tags:** financials, medium, financials
