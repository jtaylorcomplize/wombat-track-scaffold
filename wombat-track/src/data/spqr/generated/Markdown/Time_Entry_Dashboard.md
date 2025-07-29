# Time Entry Dashboard

**Card ID:** act_005  
**Category:** workforce_planning  
**Version:** 2.2  

## Description
Time tracking and billable hours analysis

## Data Source
- **Primary Table:** actionstep_workforce_planning
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Fee Earner ID** (fee_earner_id)
  - Type: string
- **Fee Earner Name** (fee_earner_name)
  - Type: string
- **Entry Date** (entry_date)
  - Type: date
  - Format: YYYY-MM-DD

### Metrics
- **Billable Hours** (billable_hours)
  - Type: decimal
  - Aggregation: count
- **Non-Billable Hours** (non_billable_hours)
  - Type: decimal
  - Aggregation: count
- **Hourly Rate** (hourly_rate)
  - Type: decimal
  - Aggregation: sum
  - Format: $#,##0.00

## Filters

### Default Filters
- entry_date equals last_30_days

### Available Filters
- **Entry Date** (entry_date)
  - Type: date_range
  - Options: "today

## Visualization
- **Chart Type:** line_chart
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** analyst, admin
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.231Z
- **Tags:** workforce planning, medium, workforce_planning
