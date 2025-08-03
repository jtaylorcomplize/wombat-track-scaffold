#!/usr/bin/env python3
"""
oApp Canonical Hierarchy Validation Script
Governance Anchor: oapp-canonical-schema-rebuild-20250802
Date: 2025-08-02
Purpose: Comprehensive validation of canonical Projects/Phases/Steps hierarchy
"""

import sqlite3
import pandas as pd
import sys
from datetime import datetime

def main():
    # Configuration
    DB_PATH = "oapp_staging.db"
    EXPECTED_PROJECTS = 18
    EXPECTED_PHASES = 38
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        print(f"✅ Connected to database: {DB_PATH}")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)
    
    validation_passed = True
    validation_report = []
    
    try:
        print("🔍 Starting comprehensive canonical hierarchy validation...\n")
        
        # 1. Row Count Validation
        print("📊 1. ROW COUNT VALIDATION")
        print("=" * 50)
        
        tables = ['projects_canonical', 'phases_canonical', 'steps_canonical']
        counts = {}
        
        for table in tables:
            count = cursor.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            counts[table] = count
            print(f"   {table:<20}: {count:>6} rows")
        
        # Check expected counts
        if counts['projects_canonical'] != EXPECTED_PROJECTS:
            validation_passed = False
            validation_report.append(f"❌ Projects count mismatch: Expected {EXPECTED_PROJECTS}, got {counts['projects_canonical']}")
        else:
            validation_report.append(f"✅ Projects count correct: {counts['projects_canonical']}")
        
        if counts['phases_canonical'] != EXPECTED_PHASES:
            validation_passed = False
            validation_report.append(f"❌ Phases count mismatch: Expected {EXPECTED_PHASES}, got {counts['phases_canonical']}")
        else:
            validation_report.append(f"✅ Phases count correct: {counts['phases_canonical']}")
        
        validation_report.append(f"ℹ️  Steps extracted: {counts['steps_canonical']}")
        
        # 2. Orphan Detection
        print(f"\n📋 2. ORPHAN DETECTION")
        print("=" * 50)
        
        # Orphaned phases (phases without valid project references)
        orphaned_phases = pd.read_sql_query("""
            SELECT phaseId, phaseName, project_ref 
            FROM phases_canonical 
            WHERE project_ref NOT IN (SELECT projectId FROM projects_canonical)
               OR project_ref IS NULL 
               OR project_ref = ''
        """, conn)
        
        if not orphaned_phases.empty:
            validation_passed = False
            validation_report.append(f"❌ Found {len(orphaned_phases)} orphaned phases")
            print(f"   ❌ Found {len(orphaned_phases)} orphaned phases:")
            for _, phase in orphaned_phases.iterrows():
                print(f"      Phase {phase['phaseId']} ('{phase['phaseName']}') references missing project '{phase['project_ref']}'")
        else:
            validation_report.append("✅ No orphaned phases found")
            print("   ✅ No orphaned phases found")
        
        # Orphaned steps (steps without valid phase references)
        orphaned_steps = pd.read_sql_query("""
            SELECT stepId, stepName, phase_ref, project_ref
            FROM steps_canonical 
            WHERE phase_ref NOT IN (SELECT phaseId FROM phases_canonical)
               OR phase_ref IS NULL 
               OR phase_ref = ''
        """, conn)
        
        if not orphaned_steps.empty:
            validation_passed = False
            validation_report.append(f"❌ Found {len(orphaned_steps)} orphaned steps")
            print(f"   ❌ Found {len(orphaned_steps)} orphaned steps:")
            for _, step in orphaned_steps.iterrows():
                print(f"      Step {step['stepId']} ('{step['stepName']}') references missing phase '{step['phase_ref']}'")
        else:
            validation_report.append("✅ No orphaned steps found")
            print("   ✅ No orphaned steps found")
        
        # 3. Data Quality Checks
        print(f"\n🔍 3. DATA QUALITY CHECKS")
        print("=" * 50)
        
        # Check for empty/null required fields in projects
        empty_project_fields = cursor.execute("""
            SELECT COUNT(*) FROM projects_canonical 
            WHERE projectId IS NULL OR projectId = '' 
               OR projectName IS NULL OR projectName = ''
        """).fetchone()[0]
        
        if empty_project_fields > 0:
            validation_passed = False
            validation_report.append(f"❌ Found {empty_project_fields} projects with empty required fields")
            print(f"   ❌ Found {empty_project_fields} projects with empty required fields")
        else:
            validation_report.append("✅ All projects have required fields")
            print("   ✅ All projects have required fields")
        
        # Check for duplicate project IDs
        duplicate_projects = cursor.execute("""
            SELECT projectId, COUNT(*) as count
            FROM projects_canonical 
            GROUP BY projectId 
            HAVING COUNT(*) > 1
        """).fetchall()
        
        if duplicate_projects:
            validation_passed = False
            validation_report.append(f"❌ Found {len(duplicate_projects)} duplicate project IDs")
            print(f"   ❌ Found {len(duplicate_projects)} duplicate project IDs:")
            for dup in duplicate_projects:
                print(f"      Project ID '{dup[0]}' appears {dup[1]} times")
        else:
            validation_report.append("✅ No duplicate project IDs")
            print("   ✅ No duplicate project IDs")
        
        # Check for duplicate phase IDs
        duplicate_phases = cursor.execute("""
            SELECT phaseId, COUNT(*) as count
            FROM phases_canonical 
            GROUP BY phaseId 
            HAVING COUNT(*) > 1
        """).fetchall()
        
        if duplicate_phases:
            validation_passed = False
            validation_report.append(f"❌ Found {len(duplicate_phases)} duplicate phase IDs")
            print(f"   ❌ Found {len(duplicate_phases)} duplicate phase IDs:")
            for dup in duplicate_phases:
                print(f"      Phase ID '{dup[0]}' appears {dup[1]} times")
        else:
            validation_report.append("✅ No duplicate phase IDs")
            print("   ✅ No duplicate phase IDs")
        
        # 4. Hierarchy Integrity
        print(f"\n🏗️  4. HIERARCHY INTEGRITY")
        print("=" * 50)
        
        # Projects with phases
        projects_with_phases = cursor.execute("""
            SELECT COUNT(DISTINCT p.projectId)
            FROM projects_canonical p
            INNER JOIN phases_canonical ph ON p.projectId = ph.project_ref
        """).fetchone()[0]
        
        projects_without_phases = counts['projects_canonical'] - projects_with_phases
        if projects_without_phases > 0:
            validation_report.append(f"⚠️  {projects_without_phases} projects have no phases")
            print(f"   ⚠️  {projects_without_phases} projects have no phases")
        else:
            validation_report.append("✅ All projects have phases")
            print("   ✅ All projects have phases")
        
        # Phases with steps
        phases_with_steps = cursor.execute("""
            SELECT COUNT(DISTINCT ph.phaseId)
            FROM phases_canonical ph
            INNER JOIN steps_canonical s ON ph.phaseId = s.phase_ref
        """).fetchone()[0]
        
        phases_without_steps = counts['phases_canonical'] - phases_with_steps
        validation_report.append(f"ℹ️  {phases_without_steps} phases have no steps")
        print(f"   ℹ️  {phases_without_steps} phases have no steps")
        
        # 5. Summary Statistics
        print(f"\n📈 5. SUMMARY STATISTICS")
        print("=" * 50)
        
        # Project distribution
        project_phase_stats = pd.read_sql_query("""
            SELECT 
                p.projectId,
                p.projectName,
                COUNT(ph.phaseId) as phase_count,
                COUNT(s.stepId) as step_count
            FROM projects_canonical p
            LEFT JOIN phases_canonical ph ON p.projectId = ph.project_ref
            LEFT JOIN steps_canonical s ON ph.phaseId = s.phase_ref
            GROUP BY p.projectId, p.projectName
            ORDER BY phase_count DESC
        """, conn)
        
        print(f"   Total Projects: {len(project_phase_stats)}")
        print(f"   Avg Phases per Project: {project_phase_stats['phase_count'].mean():.1f}")
        print(f"   Avg Steps per Project: {project_phase_stats['step_count'].mean():.1f}")
        
        # Show top projects by phase count
        print(f"\n   Top 5 Projects by Phase Count:")
        for _, row in project_phase_stats.head().iterrows():
            print(f"      {row['projectId']:>15} | {row['phase_count']:>3} phases | {row['step_count']:>3} steps")
        
        # Final Validation Report
        print(f"\n" + "=" * 60)
        print("🎯 FINAL VALIDATION REPORT")
        print("=" * 60)
        
        for report_item in validation_report:
            print(f"   {report_item}")
        
        if validation_passed:
            print(f"\n🎉 VALIDATION PASSED - Canonical hierarchy is ready for production")
            print(f"   ✅ {counts['projects_canonical']} projects")
            print(f"   ✅ {counts['phases_canonical']} phases")  
            print(f"   ✅ {counts['steps_canonical']} steps")
            print(f"   ✅ No orphaned records")
            print(f"   ✅ Data quality checks passed")
            
            # Generate governance timestamp
            timestamp = datetime.now().isoformat()
            print(f"\n📋 Governance Record:")
            print(f"   Validation completed: {timestamp}")
            print(f"   Status: READY_FOR_PRODUCTION")
            print(f"   Anchor: oapp-canonical-schema-rebuild-20250802")
            
        else:
            print(f"\n❌ VALIDATION FAILED - Issues must be resolved before production")
            print(f"   Review the validation report above and fix identified issues")
            sys.exit(1)
        
    except Exception as e:
        print(f"❌ Validation failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    finally:
        conn.close()

if __name__ == "__main__":
    main()