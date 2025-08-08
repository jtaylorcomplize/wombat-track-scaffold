# 📤 Data Exports

Structured data exports from integrated platforms including Notion, Bubble, and oApp systems.

## Export Categories

### Platform Exports
- **Notion Databases:** Project, phase, and sub-app data exports
- **Bubble Platform:** User data, workflow configurations, and system states
- **oApp Systems:** Local database dumps and canonical model exports

### Data Types
- **CSV Exports:** Structured tabular data with headers and metadata
- **JSON Exports:** Complex data structures, configurations, and snapshots
- **Schema Exports:** Database structures, field definitions, and relationships

## Naming Conventions
- `{platform}_{entity}_{timestamp}.{extension}` for timestamped exports
- `{entity}_canonical.{extension}` for standardized data models
- `{project}_{phase}_{export_type}.{extension}` for project-specific exports

## Integration Points
- **DriveMemory Ingestion:** Automated classification and memory anchor assignment
- **Canonical Model Updates:** Schema evolution tracking and validation
- **Agent Processing:** RAG classification and semantic analysis

## Retention Policy
- Active project exports: Keep indefinitely
- Historical snapshots: Archive after 6 months to `/data/backups/`
- Duplicate exports: Automated deduplication and consolidation