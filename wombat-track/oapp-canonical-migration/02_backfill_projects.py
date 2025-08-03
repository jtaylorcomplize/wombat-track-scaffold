#!/usr/bin/env python3
"""
Backfill Projects into Canonical Table
Part of oApp Canonical Migration 2025-08-02
"""

import pandas as pd
import sqlite3
import json
import sys
from datetime import datetime

# Input files
projects_json = "oApp_Projects_Local_Schema_20250802.json"

try:
    # Connect to local oApp staging DB
    conn = sqlite3.connect("oapp_staging.db")
    cursor = conn.cursor()
    
    # Load JSON
    print(f"Loading projects from {projects_json}...")
    with open(projects_json, "r") as f:
        projects_data = json.load(f)["data"]
    
    print(f"Found {len(projects_data)} projects to migrate")
    
    df_projects = pd.DataFrame(projects_data)
    
    # Create GovernanceLog entry
    governance_entry = {
        "timestamp": datetime.now().isoformat(),
        "event_type": "canonical_migration",
        "user_id": "system",
        "user_role": "migration_script",
        "resource_type": "projects_canonical",
        "action": "backfill",
        "success": True,
        "details": {
            "source": "oApp_Projects_Local_Schema_20250802.json",
            "target": "projects_canonical",
            "record_count": len(df_projects),
            "phase": "staging"
        }
    }
    
    # Insert into canonical table
    success_count = 0
    error_count = 0
    
    for _, row in df_projects.iterrows():
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO projects_canonical 
                (projectId, projectName, owner, status, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
            """, (
                row.get("projectId"), 
                row.get("projectName"), 
                row.get("owner", ""), 
                row.get("status", "Planning")
            ))
            success_count += 1
        except Exception as e:
            print(f"Error inserting project {row.get('projectId')}: {str(e)}")
            error_count += 1
    
    conn.commit()
    
    # Log governance
    governance_entry["details"]["success_count"] = success_count
    governance_entry["details"]["error_count"] = error_count
    
    with open("governance_projects_backfill.json", "w") as f:
        json.dump(governance_entry, f, indent=2)
    
    print(f"✅ Projects canonical backfill complete.")
    print(f"   Successfully migrated: {success_count}")
    print(f"   Errors: {error_count}")
    print(f"   Governance log: governance_projects_backfill.json")
    
except Exception as e:
    print(f"❌ Migration failed: {str(e)}")
    sys.exit(1)
finally:
    if 'conn' in locals():
        conn.close()