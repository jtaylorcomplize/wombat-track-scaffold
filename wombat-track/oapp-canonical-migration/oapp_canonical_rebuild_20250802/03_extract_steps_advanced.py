#!/usr/bin/env python3
"""
oApp Advanced Step Extraction Script
Governance Anchor: oapp-canonical-schema-rebuild-20250802
Date: 2025-08-02
Purpose: Extract steps from phase notes using enhanced regex patterns
"""

import pandas as pd
import sqlite3
import re
import sys
from datetime import datetime

def main():
    # Configuration
    DB_PATH = "oapp_staging.db"
    
    try:
        conn = sqlite3.connect(DB_PATH)
        print(f"✅ Connected to database: {DB_PATH}")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)
    
    try:
        # Load phases from canonical table
        print("📁 Loading phases from phases_canonical...")
        phases_df = pd.read_sql_query("SELECT * FROM phases_canonical", conn)
        print(f"   Loaded {len(phases_df)} phases for step extraction")
        
        # Enhanced regex patterns for step detection
        step_patterns = [
            r"(StepTaskOutput\s*\d+\.\d+[a-zA-Z]*)",  # StepTaskOutput 1.1, 1.1a, etc.
            r"(WT-\d+\.\d+[a-zA-Z]*\s*Step)",        # WT-1.1 Step, WT-1.1a Step
            r"(Step\s*\d+\.\d+[a-zA-Z]*)",           # Step 1.1, Step 1.1a
            r"(Task\s*\d+\.\d+[a-zA-Z]*)",           # Task 1.1, Task 1.1a
            r"(\d+\.\d+[a-zA-Z]*\s*-\s*[A-Za-z]+)", # 1.1 - Description
            r"(Milestone\s*\d+\.\d+[a-zA-Z]*)",      # Milestone 1.1
        ]
        
        steps = []
        step_counter = 1
        
        print("🔍 Extracting steps using enhanced regex patterns...")
        
        for _, phase_row in phases_df.iterrows():
            phase_id = phase_row.get('phaseId', '')
            project_ref = phase_row.get('project_ref', '')
            notes = phase_row.get('notes', '') or ""
            phase_status = phase_row.get('status', 'pending')
            
            if not notes.strip():
                continue
            
            # Apply all regex patterns
            found_steps = set()  # Use set to avoid duplicates
            
            for pattern in step_patterns:
                matches = re.findall(pattern, notes, re.IGNORECASE | re.MULTILINE)
                for match in matches:
                    if isinstance(match, tuple):
                        match = match[0]  # Extract from tuple if needed
                    found_steps.add(match.strip())
            
            # Create step records
            for step_match in found_steps:
                step_id = f"{phase_id}-S{step_counter:03d}"
                
                # Extract step name and clean it
                step_name = step_match
                if len(step_name) > 200:  # Truncate very long names
                    step_name = step_name[:197] + "..."
                
                # Determine step status based on context
                step_status = "pending"
                if "complete" in notes.lower() or "done" in notes.lower():
                    step_status = "completed"
                elif "progress" in notes.lower() or "working" in notes.lower():
                    step_status = "in_progress"
                
                steps.append({
                    "stepId": step_id,
                    "stepName": step_name,
                    "phase_ref": phase_id,
                    "project_ref": project_ref,
                    "status": step_status,
                    "outputNotes": notes[:1000],  # Truncate notes to avoid overflow
                    "createdAt": datetime.now().isoformat(),
                    "updatedAt": datetime.now().isoformat()
                })
                
                step_counter += 1
            
            if found_steps:
                print(f"   Phase {phase_id}: Found {len(found_steps)} steps")
        
        # Convert to DataFrame and insert into database
        if steps:
            print(f"\n📊 Preparing to insert {len(steps)} steps...")
            steps_df = pd.DataFrame(steps)
            
            # Insert steps into database
            cursor = conn.cursor()
            for _, step_row in steps_df.iterrows():
                cursor.execute("""
                    INSERT INTO steps_canonical
                    (stepId, stepName, phase_ref, project_ref, status, outputNotes, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    step_row['stepId'],
                    step_row['stepName'],
                    step_row['phase_ref'],
                    step_row['project_ref'],
                    step_row['status'],
                    step_row['outputNotes'],
                    step_row['createdAt'],
                    step_row['updatedAt']
                ))
            
            conn.commit()
            print(f"   ✅ Inserted {len(steps)} steps into steps_canonical")
            
            # Validation
            step_count = cursor.execute("SELECT COUNT(*) FROM steps_canonical").fetchone()[0]
            print(f"   📊 Total steps in database: {step_count}")
            
            # Show sample steps
            sample_steps = cursor.execute("""
                SELECT stepId, stepName, phase_ref 
                FROM steps_canonical 
                ORDER BY stepId 
                LIMIT 5
            """).fetchall()
            
            print("\n📋 Sample extracted steps:")
            for step in sample_steps:
                print(f"   {step[0]} | {step[1]} | Phase: {step[2]}")
        
        else:
            print("⚠️  No steps found in phase notes")
            print("   This may indicate that phases don't contain step information")
            print("   or the regex patterns need adjustment")
        
        print(f"\n✅ Step extraction complete")
        print(f"   Next step: Execute 04_validate_canonical_hierarchy.py")
        
    except Exception as e:
        print(f"❌ Step extraction failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    finally:
        conn.close()

if __name__ == "__main__":
    main()