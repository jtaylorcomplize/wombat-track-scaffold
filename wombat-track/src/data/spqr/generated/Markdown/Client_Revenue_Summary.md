# Client Revenue Summary

**Card ID:** act_003  
**Category:** financials  
**Version:** 2.2  

## Description
Revenue breakdown by client with billing summaries

## Data Source
- **Primary Table:** actionstep_financials
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Client ID** (client_id)
  - Type: string
- **Client Name** (client_name)
  - Type: string
- **Billing Period** (billing_period)
  - Type: string

### Metrics
- **Total Revenue** (total_revenue)
  - Type: decimal
  - Aggregation: sum
  - Format: $#,##0.00
- **Matter Count** (matter_count)
  - Type: integer
  - Aggregation: count
- **Outstanding Balance** (outstanding_balance)
  - Type: decimal
  - Aggregation: sum
  - Format: $#,##0.00

## Filters

### Default Filters
- billing_period equals current_month

### Available Filters
- **Billing Period** (billing_period)
  - Type: dropdown
  - Options: "current_month

## Visualization
- **Chart Type:** bar_chart
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** partner, senior_associate
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.228Z
- **Tags:** financials, high, financials
