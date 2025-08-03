#!/usr/bin/env python3
"""
oApp Canonical Data Import Script
Governance Anchor: oapp-canonical-schema-rebuild-20250802
Date: 2025-08-02
Purpose: Import canonical Projects and Phases from Notion CSV/JSON sources
"""

import pandas as pd
import sqlite3
import json
import sys
import os
from datetime import datetime

def main():
    # Configuration
    DB_PATH = "oapp_staging.db"
    PROJECTS_CSV = "WT Projects canonical.csv"
    PHASES_CSV = "WT Phase Database canonical.csv"
    
    # Check if input files exist
    if not os.path.exists(PROJECTS_CSV):
        print(f"❌ Error: {PROJECTS_CSV} not found")
        print("   Please ensure Notion export files are in the current directory")
        sys.exit(1)
        
    if not os.path.exists(PHASES_CSV):
        print(f"❌ Error: {PHASES_CSV} not found")
        print("   Please ensure Notion export files are in the current directory")
        sys.exit(1)
    
    # Connect to database
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        print(f"✅ Connected to database: {DB_PATH}")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)
    
    try:
        # Load Notion canonical data
        print(f"📁 Loading {PROJECTS_CSV}...")
        projects_df = pd.read_csv(PROJECTS_CSV)
        print(f"   Loaded {len(projects_df)} projects")
        
        print(f"📁 Loading {PHASES_CSV}...")
        phases_df = pd.read_csv(PHASES_CSV)
        print(f"   Loaded {len(phases_df)} phases")
        
        # Import projects with proper field mapping
        print("🔄 Importing projects to projects_canonical...")
        projects_imported = 0
        
        for _, row in projects_df.iterrows():
            cursor.execute("""
                INSERT INTO projects_canonical
                (projectId, projectName, owner, status, goals, description, aiPromptLog, 
                 keyTasks, tags, scopeNotes, govLog, checkpointReview, claudeGizmoExchange, 
                 createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            """, (
                row.get('projectID', ''),
                row.get('Title', ''),
                row.get('owner', ''),
                row.get('status', ''),
                row.get('goals', ''),
                row.get('description', ''),
                row.get('aiPromptLog', ''),
                row.get('keyTasks', ''),
                row.get('tags', ''),
                row.get('scopeNotes', ''),
                row.get('GovLog', ''),
                row.get('CheckpointReview', ''),
                row.get('claude-gizmo-exchange', '')
            ))
            projects_imported += 1
        
        print(f"   ✅ Imported {projects_imported} projects")
        
        # Import phases with proper project mapping
        print("🔄 Importing phases to phases_canonical...")
        phases_imported = 0
        
        for _, row in phases_df.iterrows():
            cursor.execute("""
                INSERT INTO phases_canonical
                (phaseId, phaseName, project_ref, status, RAG, startDate, endDate, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                row.get('phaseid', ''),
                row.get('phasename', ''),
                row.get('WT Projects', ''),  # Foreign key to projects
                row.get('status', ''),
                row.get('RAG', ''),
                row.get('startDate', ''),
                row.get('endDate', ''),
                row.get('notes', '')
            ))
            phases_imported += 1
        
        print(f"   ✅ Imported {phases_imported} phases")
        
        # Commit transaction
        conn.commit()
        
        # Validation queries
        print("\n📊 Validation Results:")
        projects_count = cursor.execute("SELECT COUNT(*) FROM projects_canonical").fetchone()[0]
        phases_count = cursor.execute("SELECT COUNT(*) FROM phases_canonical").fetchone()[0]
        
        print(f"   Projects in DB: {projects_count}")
        print(f"   Phases in DB: {phases_count}")
        
        # Check for orphaned phases
        orphans = cursor.execute("""
            SELECT phaseId, project_ref 
            FROM phases_canonical 
            WHERE project_ref NOT IN (SELECT projectId FROM projects_canonical)
        """).fetchall()
        
        if orphans:
            print(f"   ⚠️  Found {len(orphans)} orphaned phases:")
            for orphan in orphans:
                print(f"      Phase {orphan[0]} references missing project {orphan[1]}")
        else:
            print("   ✅ No orphaned phases found")
        
        print(f"\n✅ Canonical data import complete")
        print(f"   Next step: Execute 03_extract_steps_advanced.py")
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        conn.rollback()
        sys.exit(1)
    
    finally:
        conn.close()

if __name__ == "__main__":
    main()