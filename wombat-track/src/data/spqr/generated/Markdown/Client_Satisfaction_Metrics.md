# Client Satisfaction Metrics

**Card ID:** act_010  
**Category:** performance  
**Version:** 2.2  

## Description
Client feedback and satisfaction scores

## Data Source
- **Primary Table:** actionstep_performance
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Client ID** (client_id)
  - Type: string
- **Client Name** (client_name)
  - Type: string
- **Survey Date** (survey_date)
  - Type: date
  - Format: YYYY-MM-DD
- **Feedback Category** (feedback_category)
  - Type: string

### Metrics
- **Satisfaction Score** (satisfaction_score)
  - Type: decimal
  - Aggregation: avg
  - Format: 0.00%

## Filters

### Default Filters
None

### Available Filters
- **Feedback Category** (feedback_category)
  - Type: dropdown
  - Options: "Service Quality

## Visualization
- **Chart Type:** line_chart
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** partner, senior_associate
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.242Z
- **Tags:** performance, medium, performance
