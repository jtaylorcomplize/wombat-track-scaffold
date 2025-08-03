#!/usr/bin/env python3
"""
Validate Canonical Migration Results
Part of oApp Canonical Migration 2025-08-02
"""

import sqlite3
import json
import sys
from datetime import datetime

def validate_migration():
    try:
        conn = sqlite3.connect("oapp_staging.db")
        cursor = conn.cursor()
        
        validation_results = {
            "timestamp": datetime.now().isoformat(),
            "migration_validation": "oapp-canonical-schema-migration-20250802",
            "phase": "staging",
            "results": {}
        }
        
        # Check table counts
        tables = ["projects_canonical", "phases_canonical", "steps_canonical", "comms_canonical"]
        
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            validation_results["results"][f"{table}_count"] = count
            print(f"✅ {table}: {count} records")
        
        # Check relationships
        cursor.execute("""
            SELECT COUNT(*) FROM phases_canonical p 
            LEFT JOIN projects_canonical pr ON p.project_ref = pr.projectId 
            WHERE pr.projectId IS NULL AND p.project_ref IS NOT NULL AND p.project_ref != ''
        """)
        orphaned_phases = cursor.fetchone()[0]
        validation_results["results"]["orphaned_phases"] = orphaned_phases
        
        cursor.execute("""
            SELECT COUNT(*) FROM steps_canonical s 
            LEFT JOIN phases_canonical p ON s.phase_ref = p.phaseId 
            WHERE p.phaseId IS NULL AND s.phase_ref IS NOT NULL AND s.phase_ref != ''
        """)
        orphaned_steps = cursor.fetchone()[0]
        validation_results["results"]["orphaned_steps"] = orphaned_steps
        
        # Check communication links
        cursor.execute("""
            SELECT COUNT(*) FROM comms_canonical c 
            LEFT JOIN projects_canonical p ON c.projectId = p.projectId 
            WHERE c.projectId IS NOT NULL AND p.projectId IS NULL
        """)
        orphaned_comms_projects = cursor.fetchone()[0]
        validation_results["results"]["orphaned_comms_projects"] = orphaned_comms_projects
        
        # Agent type distribution
        cursor.execute("SELECT agentType, COUNT(*) FROM comms_canonical GROUP BY agentType")
        agent_distribution = dict(cursor.fetchall())
        validation_results["results"]["agent_distribution"] = agent_distribution
        
        # Sample data validation
        cursor.execute("SELECT projectId, projectName FROM projects_canonical LIMIT 5")
        sample_projects = [{"projectId": row[0], "projectName": row[1]} for row in cursor.fetchall()]
        validation_results["results"]["sample_projects"] = sample_projects
        
        # Calculate completion status
        total_issues = orphaned_phases + orphaned_steps + orphaned_comms_projects
        validation_results["validation_status"] = "PASS" if total_issues == 0 else "WARNINGS"
        validation_results["total_issues"] = total_issues
        
        # Save validation report
        with open("validation_report.json", "w") as f:
            json.dump(validation_results, f, indent=2)
        
        print(f"\n📊 Migration Validation Summary:")
        print(f"   Status: {validation_results['validation_status']}")
        print(f"   Total Issues: {total_issues}")
        print(f"   Orphaned Phases: {orphaned_phases}")
        print(f"   Orphaned Steps: {orphaned_steps}")
        print(f"   Orphaned Comms: {orphaned_comms_projects}")
        print(f"   Agent Distribution: {agent_distribution}")
        print(f"\n📄 Full report: validation_report.json")
        
        if total_issues == 0:
            print("✅ Migration validation PASSED - Ready for production")
        else:
            print("⚠️  Migration validation has WARNINGS - Review before production")
        
        conn.close()
        return validation_results["validation_status"] == "PASS"
        
    except Exception as e:
        print(f"❌ Validation failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = validate_migration()
    sys.exit(0 if success else 1)