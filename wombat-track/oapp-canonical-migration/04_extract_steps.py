#!/usr/bin/env python3
"""
Extract Steps from Phase Notes and Create Canonical Steps Table
Part of oApp Canonical Migration 2025-08-02
"""

import pandas as pd
import sqlite3
import json
import re
import sys
from datetime import datetime

phases_json = "oApp_Phases_Export_20250802.json"

try:
    conn = sqlite3.connect("oapp_staging.db")
    cursor = conn.cursor()
    
    # Load phases
    print(f"Loading phases from {phases_json}...")
    with open(phases_json, "r") as f:
        phases_data = pd.DataFrame(json.load(f)["data"])
    
    print(f"Analyzing {len(phases_data)} phases for step extraction...")
    
    # Enhanced step extraction patterns
    step_patterns = [
        re.compile(r"StepTaskOutput(\d+\.\d+)[^\n]*([^\n]*)", re.IGNORECASE),
        re.compile(r"(\d+\.\d+)\s*([A-Za-z][^\n]*)", re.IGNORECASE),
        re.compile(r"Step\s*(\d+\.\d+)[:\s]*([^\n]*)", re.IGNORECASE),
        re.compile(r"✅\s*([^\n]+)", re.IGNORECASE),  # Completed tasks
        re.compile(r"🔲\s*([^\n]+)", re.IGNORECASE),  # Planned tasks
        re.compile(r"🔄\s*([^\n]+)", re.IGNORECASE),  # In progress tasks
    ]
    
    steps = []
    step_counter = 0
    
    for _, row in phases_data.iterrows():
        notes = row.get("notes", "")
        phase_id = row.get("phaseid", "")
        project_ref = row.get("WT Projects", "")
        
        if not notes or not phase_id:
            continue
            
        # Try each pattern
        for i, pattern in enumerate(step_patterns):
            matches = pattern.findall(notes)
            for match in matches:
                step_counter += 1
                
                if isinstance(match, tuple):
                    step_name = " ".join(str(m) for m in match if m).strip()
                    step_id = f"{phase_id}-{step_counter}"
                else:
                    step_name = str(match).strip()
                    step_id = f"{phase_id}-{step_counter}"
                
                # Clean step name
                step_name = re.sub(r'[^\w\s\-\(\)\[\]\.,:;]', '', step_name)[:200]
                
                if len(step_name) > 10:  # Only include meaningful steps
                    steps.append({
                        "stepId": step_id,
                        "stepName": step_name,
                        "phase_ref": phase_id,
                        "project_ref": project_ref,
                        "status": row.get("status", "Planned"),
                        "outputNotes": notes[:1000]  # Truncate for storage
                    })
    
    print(f"Extracted {len(steps)} potential steps")
    
    # Remove duplicates based on stepName and phase_ref
    steps_df = pd.DataFrame(steps)
    if not steps_df.empty:
        steps_df = steps_df.drop_duplicates(subset=['stepName', 'phase_ref'])
        print(f"After deduplication: {len(steps_df)} unique steps")
    
    # Create GovernanceLog entry
    governance_entry = {
        "timestamp": datetime.now().isoformat(),
        "event_type": "canonical_migration",
        "user_id": "system",
        "user_role": "migration_script",
        "resource_type": "steps_canonical",
        "action": "extract_and_backfill",
        "success": True,
        "details": {
            "source": "oApp_Phases_Export_20250802.json",
            "target": "steps_canonical",
            "total_extracted": len(steps),
            "unique_steps": len(steps_df) if not steps_df.empty else 0,
            "extraction_patterns": len(step_patterns),
            "phase": "staging"
        }
    }
    
    # Insert into canonical table
    success_count = 0
    error_count = 0
    
    if not steps_df.empty:
        for _, row in steps_df.iterrows():
            try:
                cursor.execute("""
                    INSERT OR REPLACE INTO steps_canonical 
                    (stepId, stepName, phase_ref, project_ref, status, outputNotes)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    row.get("stepId"),
                    row.get("stepName"),
                    row.get("phase_ref"),
                    row.get("project_ref"),
                    row.get("status"),
                    row.get("outputNotes")
                ))
                success_count += 1
            except Exception as e:
                print(f"Error inserting step {row.get('stepId')}: {str(e)}")
                error_count += 1
    
    conn.commit()
    
    # Log governance
    governance_entry["details"]["success_count"] = success_count
    governance_entry["details"]["error_count"] = error_count
    
    with open("governance_steps_extraction.json", "w") as f:
        json.dump(governance_entry, f, indent=2)
    
    print(f"✅ Steps extraction and backfill complete.")
    print(f"   Successfully migrated: {success_count}")
    print(f"   Errors: {error_count}")
    print(f"   Governance log: governance_steps_extraction.json")
    
except Exception as e:
    print(f"❌ Migration failed: {str(e)}")
    sys.exit(1)
finally:
    if 'conn' in locals():
        conn.close()