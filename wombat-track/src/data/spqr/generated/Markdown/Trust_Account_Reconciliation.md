# Trust Account Reconciliation

**Card ID:** act_007  
**Category:** financials  
**Version:** 2.2  

## Description
Trust account balances and reconciliation status

## Data Source
- **Primary Table:** actionstep_financials
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Trust Account ID** (trust_account_id)
  - Type: string
- **Last Reconciled** (last_reconciled)
  - Type: date
  - Format: YYYY-MM-DD
- **Reconciliation Status** (reconciliation_status)
  - Type: string
- **Client Name** (client_name)
  - Type: string

### Metrics
- **Account Balance** (account_balance)
  - Type: decimal
  - Aggregation: sum
  - Format: $#,##0.00

## Filters

### Default Filters
None

### Available Filters
- **Reconciliation Status** (reconciliation_status)
  - Type: dropdown
  - Options: "Reconciled

## Visualization
- **Chart Type:** kpi
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** analyst, admin
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.233Z
- **Tags:** financials, high, financials
