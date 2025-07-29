# Disbursement Tracking

**Card ID:** act_020  
**Category:** financials  
**Version:** 2.2  

## Description
Disbursement requests and reimbursement status

## Data Source
- **Primary Table:** actionstep_financials
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Disbursement ID** (disbursement_id)
  - Type: string
- **Disbursement Type** (disbursement_type)
  - Type: string
- **Reimbursement Status** (reimbursement_status)
  - Type: string
- **Matter Name** (matter_name)
  - Type: string

### Metrics
- **Disbursement Amount** (disbursement_amount)
  - Type: decimal
  - Aggregation: sum
  - Format: $#,##0.00

## Filters

### Default Filters
None

### Available Filters
- **Disbursement Type** (disbursement_type)
  - Type: dropdown
  - Options: "Court Fees
- **Reimbursement Status** (reimbursement_status)
  - Type: dropdown
  - Options: "Pending

## Visualization
- **Chart Type:** table
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** analyst, admin
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.273Z
- **Tags:** financials, medium, financials
