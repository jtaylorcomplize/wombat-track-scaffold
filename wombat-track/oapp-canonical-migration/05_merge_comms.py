#!/usr/bin/env python3
"""
Merge Agent Exchange + Claude-Gizmo Communications into Canonical Table
Part of oApp Canonical Migration 2025-08-02
"""

import pandas as pd
import sqlite3
import json
import sys
from datetime import datetime

logs_json = "oApp_AgentLogs_20250802.json"

try:
    conn = sqlite3.connect("oapp_staging.db")
    cursor = conn.cursor()
    
    # Load communication logs
    print(f"Loading communication logs from {logs_json}...")
    with open(logs_json, "r") as f:
        logs_data = json.load(f)["data"]
    
    print(f"Found {len(logs_data)} communication entries to migrate")
    
    # Create GovernanceLog entry
    governance_entry = {
        "timestamp": datetime.now().isoformat(),
        "event_type": "canonical_migration",
        "user_id": "system",
        "user_role": "migration_script",
        "resource_type": "comms_canonical",
        "action": "merge_communications",
        "success": True,
        "details": {
            "source": "oApp_AgentLogs_20250802.json",
            "target": "comms_canonical",
            "record_count": len(logs_data),
            "phase": "staging"
        }
    }
    
    rows = []
    success_count = 0
    error_count = 0
    
    for entry in logs_data:
        try:
            # Extract project and phase IDs from details
            details = entry.get("details", {})
            runtime_context = entry.get("runtime_context", {})
            
            # Try to extract projectId from multiple sources
            project_id = None
            if isinstance(details, dict):
                project_id = details.get("projectId") or details.get("resource_id") or runtime_context.get("projectId")
            
            # Try to extract phaseId from details or runtime_context
            phase_id = None
            if isinstance(details, dict):
                phase_id = details.get("phase") or details.get("phaseId") or runtime_context.get("phase")
            
            # Map user_role to agentType
            agent_type = entry.get("user_role", "unknown")
            if agent_type == "developer":
                agent_type = "Claude"
            elif agent_type == "architect":
                agent_type = "Gizmo"
            elif agent_type == "system":
                agent_type = "System"
            elif agent_type == "assistant":
                agent_type = "Claude"
            
            row_data = {
                "timestamp": entry.get("timestamp"),
                "agentType": agent_type,
                "eventType": entry.get("event_type"),
                "projectId": project_id,
                "phaseId": phase_id,
                "messagePayload": json.dumps(details) if isinstance(details, dict) else str(details)
            }
            
            cursor.execute("""
                INSERT INTO comms_canonical 
                (timestamp, agentType, eventType, projectId, phaseId, messagePayload)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                row_data["timestamp"],
                row_data["agentType"],
                row_data["eventType"],
                row_data["projectId"],
                row_data["phaseId"],
                row_data["messagePayload"]
            ))
            
            success_count += 1
            
        except Exception as e:
            print(f"Error processing communication entry: {str(e)}")
            error_count += 1
    
    conn.commit()
    
    # Log governance
    governance_entry["details"]["success_count"] = success_count
    governance_entry["details"]["error_count"] = error_count
    governance_entry["details"]["agent_types"] = {
        "Claude": len([r for r in logs_data if r.get("user_role") in ["developer", "assistant"]]),
        "Gizmo": len([r for r in logs_data if r.get("user_role") == "architect"]),
        "System": len([r for r in logs_data if r.get("user_role") == "system"])
    }
    
    with open("governance_comms_merge.json", "w") as f:
        json.dump(governance_entry, f, indent=2)
    
    print(f"✅ Communications merge complete.")
    print(f"   Successfully migrated: {success_count}")
    print(f"   Errors: {error_count}")
    print(f"   Governance log: governance_comms_merge.json")
    
except Exception as e:
    print(f"❌ Migration failed: {str(e)}")
    sys.exit(1)
finally:
    if 'conn' in locals():
        conn.close()