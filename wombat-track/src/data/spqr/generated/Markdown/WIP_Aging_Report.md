# WIP Aging Report

**Card ID:** act_015  
**Category:** financials  
**Version:** 2.2  

## Description
Work in progress aging and realization tracking

## Data Source
- **Primary Table:** actionstep_financials
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Matter ID** (matter_id)
  - Type: string
- **Aging Bucket** (aging_bucket)
  - Type: string
- **Matter Name** (matter_name)
  - Type: string
- **Responsible Partner** (responsible_partner)
  - Type: string

### Metrics
- **WIP Amount** (wip_amount)
  - Type: decimal
  - Aggregation: sum
  - Format: $#,##0.00

## Filters

### Default Filters
None

### Available Filters
- **Aging Bucket** (aging_bucket)
  - Type: dropdown
  - Options: "0-30 days

## Visualization
- **Chart Type:** bar_chart
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** analyst, admin
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.248Z
- **Tags:** financials, high, financials
