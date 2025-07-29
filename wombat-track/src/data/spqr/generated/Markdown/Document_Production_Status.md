# Document Production Status

**Card ID:** act_011  
**Category:** matter_management  
**Version:** 2.2  

## Description
Status of document reviews and productions

## Data Source
- **Primary Table:** actionstep_matter_management
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Matter ID** (matter_id)
  - Type: string
- **Production Status** (production_status)
  - Type: string
- **Due Date** (due_date)
  - Type: date
  - Format: YYYY-MM-DD

### Metrics
- **Document Count** (document_count)
  - Type: integer
  - Aggregation: count
- **Reviewed Count** (reviewed_count)
  - Type: integer
  - Aggregation: count

## Filters

### Default Filters
None

### Available Filters
- **Production Status** (production_status)
  - Type: dropdown
  - Options: "Not Started

## Visualization
- **Chart Type:** bar_chart
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** all_users
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.243Z
- **Tags:** matter management, medium, matter_management
