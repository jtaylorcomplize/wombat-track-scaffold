# Matter Type Distribution

**Card ID:** act_009  
**Category:** matter_management  
**Version:** 2.2  

## Description
Distribution of matters by practice area

## Data Source
- **Primary Table:** actionstep_matter_management
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Practice Area** (practice_area)
  - Type: string

### Metrics
- **Matter Count** (matter_count)
  - Type: integer
  - Aggregation: count
- **Total Revenue** (total_revenue)
  - Type: decimal
  - Aggregation: sum
  - Format: $#,##0.00
- **Average Matter Value** (avg_matter_value)
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

## Visualization
- **Chart Type:** pie_chart
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** partner, senior_associate
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.240Z
- **Tags:** matter management, medium, matter_management
