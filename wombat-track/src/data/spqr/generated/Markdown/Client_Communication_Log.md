# Client Communication Log

**Card ID:** act_017  
**Category:** performance  
**Version:** 2.2  

## Description
Client communication frequency and response times

## Data Source
- **Primary Table:** actionstep_performance
- **Connection Type:** actionstep_api
- **Join Tables:** None

## Fields

### Dimensions
- **Client ID** (client_id)
  - Type: string
- **Communication Date** (communication_date)
  - Type: date
  - Format: YYYY-MM-DD
- **Communication Type** (communication_type)
  - Type: string
- **Fee Earner Name** (fee_earner_name)
  - Type: string

### Metrics
- **Response Time (Hours)** (response_time_hours)
  - Type: decimal
  - Aggregation: count

## Filters

### Default Filters
None

### Available Filters
- **Communication Type** (communication_type)
  - Type: dropdown
  - Options: "Email

## Visualization
- **Chart Type:** table
- **Color Scheme:** blue_actionstep_theme

## Permissions
- **View Roles:** all_users
- **Edit Roles:** admin, partner

## Metadata
- **Created By:** Claude SPQR Generator
- **Created Date:** 2025-07-29T02:54:05.250Z
- **Tags:** performance, low, performance
