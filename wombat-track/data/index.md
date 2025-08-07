# 💾 Data Directory Index

Operational artifacts, exports, backups, and data snapshots supporting Wombat Track's multi-platform integration.

## Directory Structure

### 📤 `/data/exports/`
**Purpose:** CSV exports, data dumps, and structured exports from Bubble, Notion, and oApp platforms
- Notion database exports and CSV dumps
- Bubble platform data extractions
- oApp canonical data snapshots
- Phase and project structured exports

### 🔄 `/data/backups/`
**Purpose:** JSON snapshots, database backups, and historical data preservation
- Canonical database model snapshots
- oApp configuration and schema backups
- System state preservation points
- Historical milestone data archives

## Data Management Policies
- **Retention:** Active exports in `/exports/`, historical data in `/backups/`
- **Classification:** Structured data exports vs. system state snapshots
- **Integration:** DriveMemory ingestion points and canonical references
- **Versioning:** Timestamped snapshots with semantic versioning where applicable

## Agent Integration
- **Memory Anchor Service:** References canonical data models and snapshots
- **DriveMemory Sync:** Automated ingestion of classified exports and backups
- **Data Validation Agent:** Integrity checks and export validation
- **Canonical Model Updater:** Schema evolution and data model maintenance

## Memory Anchors
- **Data Exports:** `WT-ANCHOR-EXPORTS` - Export scheduling and validation
- **Data Backups:** `WT-ANCHOR-BACKUPS` - Backup integrity and restoration points