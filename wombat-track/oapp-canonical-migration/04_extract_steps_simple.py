#!/usr/bin/env python3
"""
Extract Steps from Phase Notes (No Pandas Version)
Part of oApp Canonical Migration 2025-08-02
"""

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
        phases_data = json.load(f)["data"]
    
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
    success_count = 0
    error_count = 0
    
    for phase in phases_data:
        notes = phase.get("notes", "")
        phase_id = phase.get("phaseid", "")
        project_ref = phase.get("WT Projects", "")
        
        if not notes or not phase_id:
            continue
            
        # Try each pattern
        for pattern in step_patterns:
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
                    try:
                        cursor.execute("""
                            INSERT OR REPLACE INTO steps_canonical 
                            (stepId, stepName, phase_ref, project_ref, status, outputNotes)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (
                            step_id,
                            step_name,
                            phase_id,
                            project_ref,
                            phase.get("status", "Planned"),
                            notes[:1000]  # Truncate for storage
                        ))
                        success_count += 1
                    except Exception as e:
                        print(f"Error inserting step {step_id}: {str(e)}")
                        error_count += 1
    
    conn.commit()
    
    print(f"Extracted {step_counter} potential steps")
    print(f"Successfully inserted: {success_count}")
    
    # Create governance log
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
            "total_extracted": step_counter,
            "success_count": success_count,
            "error_count": error_count,
            "extraction_patterns": len(step_patterns),
            "phase": "staging"
        }
    }
    
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