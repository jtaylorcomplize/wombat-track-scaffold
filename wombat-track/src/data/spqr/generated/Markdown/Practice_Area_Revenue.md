# Practice Area Revenue

**Card ID:** act_021  
**Category:** financials  
**Version:** 2.2  

## Description
Revenue breakdown by legal practice area

## Data Source
- **Primary Table:** actionstep_financials
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Practice Area** (practice_area)
  - Type: string

### Metrics
- **Revenue Amount** (revenue_amount)
  - Type: decimal
  - Aggregation: sum
  - Format: $#,##0.00
- **Matter Count** (matter_count)
  - Type: integer
  - Aggregation: count
- **Average Matter Value** (avg_matter_value)
  - Type: decimal
  - Aggregation: sum
  - Format: $#,##0.00
- **Growth Rate** (growth_rate)
  - Type: decimal
  - Aggregation: avg
  - Format: 0.00%

## Filters

### Default Filters
None

### Available Filters
- **Practice Area** (practice_area)
  - Type: dropdown
  - Options: "Litigation

## Visualization
- **Chart Type:** pie_chart
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** partner, senior_associate
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.274Z
- **Tags:** financials, medium, financials
