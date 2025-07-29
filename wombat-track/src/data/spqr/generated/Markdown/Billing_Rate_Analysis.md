# Billing Rate Analysis

**Card ID:** act_012  
**Category:** financials  
**Version:** 2.2  

## Description
Analysis of billing rates by fee earner and matter type

## Data Source
- **Primary Table:** actionstep_financials
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Fee Earner ID** (fee_earner_id)
  - Type: string
- **Fee Earner Name** (fee_earner_name)
  - Type: string
- **Practice Area** (practice_area)
  - Type: string
- **Seniority Level** (seniority_level)
  - Type: string

### Metrics
- **Standard Rate** (standard_rate)
  - Type: decimal
  - Aggregation: sum
  - Format: $#,##0.00
- **Effective Rate** (effective_rate)
  - Type: decimal
  - Aggregation: sum
  - Format: $#,##0.00

## Filters

### Default Filters
None

### Available Filters
- **Practice Area** (practice_area)
  - Type: dropdown
  - Options: "Litigation
- **Seniority Level** (seniority_level)
  - Type: dropdown
  - Options: "Partner

## Visualization
- **Chart Type:** table
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** partner, senior_associate
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.244Z
- **Tags:** financials, medium, financials
