# Court Appearance Calendar

**Card ID:** act_013  
**Category:** matter_management  
**Version:** 2.2  

## Description
Upcoming court dates and hearing schedules

## Data Source
- **Primary Table:** actionstep_matter_management
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Matter ID** (matter_id)
  - Type: string
- **Court Date** (court_date)
  - Type: date
  - Format: YYYY-MM-DD
- **Court Name** (court_name)
  - Type: string
- **Hearing Type** (hearing_type)
  - Type: string
- **Attending Counsel** (attending_counsel)
  - Type: string

### Metrics


## Filters

### Default Filters
- court_date equals next_30_days

### Available Filters
- **Court Date** (court_date)
  - Type: date_range
  - Options: "today
- **Hearing Type** (hearing_type)
  - Type: dropdown
  - Options: "Directions

## Visualization
- **Chart Type:** table
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** all_users
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.245Z
- **Tags:** matter management, high, matter_management
