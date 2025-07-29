# Matter Profitability Analysis

**Card ID:** act_004  
**Category:** financials  
**Version:** 2.2  

## Description
Profit margins and cost analysis per matter

## Data Source
- **Primary Table:** actionstep_financials
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Matter ID** (matter_id)
  - Type: string
- **Matter Name** (matter_name)
  - Type: string
- **Practice Area** (practice_area)
  - Type: string

### Metrics
- **Total Fees** (total_fees)
  - Type: decimal
  - Aggregation: sum
  - Format: $#,##0.00
- **Total Costs** (total_costs)
  - Type: decimal
  - Aggregation: sum
  - Format: $#,##0.00
- **Profit Margin** (profit_margin)
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
- **Chart Type:** table
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** partner, senior_associate
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.230Z
- **Tags:** financials, high, financials
