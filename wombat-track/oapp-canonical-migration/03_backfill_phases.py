#!/usr/bin/env python3
"""
Backfill Phases into Canonical Table
Part of oApp Canonical Migration 2025-08-02
"""

import pandas as pd
import sqlite3
import json
import sys
from datetime import datetime

# Input files
phases_json = "oApp_Phases_Export_20250802.json"

try:
    # Connect to local oApp staging DB
    conn = sqlite3.connect("oapp_staging.db")
    cursor = conn.cursor()
    
    # Load JSON
    print(f"Loading phases from {phases_json}...")
    with open(phases_json, "r") as f:
        phases_data = json.load(f)["data"]
    
    print(f"Found {len(phases_data)} phases to migrate")
    
    df_phases = pd.DataFrame(phases_data)
    
    # Create GovernanceLog entry
    governance_entry = {
        "timestamp": datetime.now().isoformat(),
        "event_type": "canonical_migration",
        "user_id": "system",
        "user_role": "migration_script",
        "resource_type": "phases_canonical",
        "action": "backfill",
        "success": True,
        "details": {
            "source": "oApp_Phases_Export_20250802.json",
            "target": "phases_canonical",
            "record_count": len(df_phases),
            "phase": "staging"
        }
    }
    
    # Insert into canonical table
    success_count = 0
    error_count = 0
    
    for _, row in df_phases.iterrows():
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO phases_canonical 
                (phaseId, phaseName, project_ref, status, RAG, startDate, endDate, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                row.get("phaseid"), 
                row.get("phasename"), 
                row.get("WT Projects", ""),
                row.get("status", "Planned"),
                row.get("RAG", ""),
                row.get("startDate", ""),
                row.get("endDate", ""),
                row.get("notes", "")
            ))
            success_count += 1
        except Exception as e:
            print(f"Error inserting phase {row.get('phaseid')}: {str(e)}")
            error_count += 1
    
    conn.commit()
    
    # Log governance
    governance_entry["details"]["success_count"] = success_count
    governance_entry["details"]["error_count"] = error_count
    
    with open("governance_phases_backfill.json", "w") as f:
        json.dump(governance_entry, f, indent=2)
    
    print(f"✅ Phases canonical backfill complete.")
    print(f"   Successfully migrated: {success_count}")
    print(f"   Errors: {error_count}")
    print(f"   Governance log: governance_phases_backfill.json")
    
except Exception as e:
    print(f"❌ Migration failed: {str(e)}")
    sys.exit(1)
finally:
    if 'conn' in locals():
        conn.close()