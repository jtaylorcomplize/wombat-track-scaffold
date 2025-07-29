# Deadline Tracker

**Card ID:** act_002  
**Category:** matter_management  
**Version:** 2.2  

## Description
Critical deadlines and upcoming due dates across all matters

## Data Source
- **Primary Table:** actionstep_matter_management
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Matter ID** (matter_id)
  - Type: string
- **Deadline Date** (deadline_date)
  - Type: date
  - Format: YYYY-MM-DD
- **Deadline Type** (deadline_type)
  - Type: string
- **Matter Name** (matter_name)
  - Type: string
- **Assigned Fee Earner** (assigned_fee_earner)
  - Type: string
- **Priority Level** (priority_level)
  - Type: string

### Metrics


## Filters

### Default Filters
- deadline_date equals next_30_days

### Available Filters
- **Deadline Date** (deadline_date)
  - Type: date_range
  - Options: "next_7_days
- **Deadline Type** (deadline_type)
  - Type: dropdown
  - Options: "Court Filing
- **Priority Level** (priority_level)
  - Type: dropdown
  - Options: "High

## Visualization
- **Chart Type:** bar_chart
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** all_users
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.227Z
- **Tags:** matter management, high, matter_management
