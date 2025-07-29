# Task Completion Metrics

**Card ID:** act_016  
**Category:** performance  
**Version:** 2.2  

## Description
Task completion rates and efficiency metrics

## Data Source
- **Primary Table:** actionstep_performance
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Fee Earner ID** (fee_earner_id)
  - Type: string

### Metrics
- **Tasks Completed** (tasks_completed)
  - Type: integer
  - Aggregation: count
- **Tasks Pending** (tasks_pending)
  - Type: integer
  - Aggregation: count
- **Completion Rate** (completion_rate)
  - Type: decimal
  - Aggregation: avg
  - Format: 0.00%
- **Average Completion Time** (avg_completion_time)
  - Type: decimal
  - Aggregation: count

## Filters

### Default Filters
None

### Available Filters
None

## Visualization
- **Chart Type:** line_chart
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** partner, senior_associate
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.248Z
- **Tags:** performance, medium, performance
