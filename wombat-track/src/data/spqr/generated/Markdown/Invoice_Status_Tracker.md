# Invoice Status Tracker

**Card ID:** act_008  
**Category:** financials  
**Version:** 2.2  

## Description
Outstanding invoices and payment tracking

## Data Source
- **Primary Table:** actionstep_financials
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Invoice ID** (invoice_id)
  - Type: string
- **Invoice Date** (invoice_date)
  - Type: date
  - Format: YYYY-MM-DD
- **Payment Status** (payment_status)
  - Type: string
- **Client Name** (client_name)
  - Type: string

### Metrics
- **Invoice Amount** (invoice_amount)
  - Type: decimal
  - Aggregation: sum
  - Format: $#,##0.00
- **Days Outstanding** (days_outstanding)
  - Type: integer
  - Aggregation: count

## Filters

### Default Filters
None

### Available Filters
- **Payment Status** (payment_status)
  - Type: dropdown
  - Options: "Paid

## Visualization
- **Chart Type:** table
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** analyst, admin
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.237Z
- **Tags:** financials, high, financials
