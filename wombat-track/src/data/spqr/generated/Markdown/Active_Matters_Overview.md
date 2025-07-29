# Active Matters Overview

**Card ID:** act_001  
**Category:** matter_management  
**Version:** 2.2  

## Description
Overview of all active legal matters with key metrics

## Data Source
- **Primary Table:** actionstep_matter_management
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Matter ID** (matter_id)
  - Type: string
- **Matter Name** (matter_name)
  - Type: string
- **Client Name** (client_name)
  - Type: string
- **Matter Status** (matter_status)
  - Type: string
- **Date Opened** (date_opened)
  - Type: date
  - Format: YYYY-MM-DD
- **Responsible Partner** (responsible_partner)
  - Type: string

### Metrics


## Filters

### Default Filters
- matter_status equals Active

### Available Filters
- **Matter Status** (matter_status)
  - Type: dropdown
  - Options: "Active

## Visualization
- **Chart Type:** table
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** partner, senior_associate
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.217Z
- **Tags:** matter management, high, matter_management
