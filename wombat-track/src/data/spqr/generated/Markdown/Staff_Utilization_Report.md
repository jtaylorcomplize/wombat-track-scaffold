# Staff Utilization Report

**Card ID:** act_006  
**Category:** workforce_planning  
**Version:** 2.2  

## Description
Resource allocation and capacity planning

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
- **Department** (department)
  - Type: string

### Metrics
- **Utilization Rate** (utilization_rate)
  - Type: decimal
  - Aggregation: avg
  - Format: 0.00%
- **Target Hours** (target_hours)
  - Type: decimal
  - Aggregation: count
- **Actual Hours** (actual_hours)
  - Type: decimal
  - Aggregation: count

## Filters

### Default Filters
None

### Available Filters
- **Department** (department)
  - Type: dropdown
  - Options: "Litigation

## Visualization
- **Chart Type:** bar_chart
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** partner, senior_associate
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.232Z
- **Tags:** workforce planning, medium, workforce_planning
