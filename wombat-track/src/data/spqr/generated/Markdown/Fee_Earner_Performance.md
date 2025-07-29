# Fee Earner Performance

**Card ID:** act_018  
**Category:** performance  
**Version:** 2.2  

## Description
Individual fee earner productivity and billing metrics

## Data Source
- **Primary Table:** actionstep_performance
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Fee Earner ID** (fee_earner_id)
  - Type: string
- **Fee Earner Name** (fee_earner_name)
  - Type: string

### Metrics
- **Monthly Billings** (monthly_billings)
  - Type: decimal
  - Aggregation: sum
  - Format: $#,##0.00
- **Billable Hours** (billable_hours)
  - Type: decimal
  - Aggregation: count
- **Realization Rate** (realization_rate)
  - Type: decimal
  - Aggregation: avg
  - Format: 0.00%
- **Client Origination** (client_origination)
  - Type: integer
  - Aggregation: count

## Filters

### Default Filters
None

### Available Filters
None

## Visualization
- **Chart Type:** table
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** partner, senior_associate
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.271Z
- **Tags:** performance, medium, performance
