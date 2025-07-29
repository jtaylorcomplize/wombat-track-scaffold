# Conflict Check Dashboard

**Card ID:** act_014  
**Category:** matter_management  
**Version:** 2.2  

## Description
Conflict checking status and resolution

## Data Source
- **Primary Table:** actionstep_matter_management
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Matter ID** (matter_id)
  - Type: string
- **Client Name** (client_name)
  - Type: string
- **Conflict Status** (conflict_status)
  - Type: string
- **Check Date** (check_date)
  - Type: date
  - Format: YYYY-MM-DD
- **Checked By** (checked_by)
  - Type: string

### Metrics


## Filters

### Default Filters
None

### Available Filters
- **Conflict Status** (conflict_status)
  - Type: dropdown
  - Options: "Clear

## Visualization
- **Chart Type:** table
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** all_users
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.247Z
- **Tags:** matter management, medium, matter_management
