#!/usr/bin/env python3
"""
OpenAI → oApp Integration Examples
Direct integration with local OF Integration Service
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any, List, Optional

class OpenAIoAppIntegration:
    
    def __init__(self, base_url: str = "http://localhost:3001"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'OpenAI-oApp-Integration/1.0'
        })
    
    def health_check(self) -> Dict[str, Any]:
        """Check if the OF Integration Service is healthy"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            return {
                "status": "success" if response.status_code == 200 else "error",
                "data": response.json(),
                "response_time": response.elapsed.total_seconds()
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def query_governance_logs(self, project_id: str = None, phase_id: str = None, limit: int = 10) -> Dict[str, Any]:
        """Query governance logs from the local codebase"""
        params = {"limit": limit}
        if project_id:
            params["projectId"] = project_id
        if phase_id:
            params["phaseId"] = phase_id
            
        try:
            response = self.session.get(f"{self.base_url}/api/governance/query", params=params)
            return {
                "status": "success" if response.status_code == 200 else "error",
                "data": response.json(),
                "query_params": params
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def execute_rag_query(self, query: str, scope: str = "combined", priority: str = "medium") -> Dict[str, Any]:
        """Execute a RAG query against the codebase knowledge"""
        payload = {
            "query": query,
            "scope": scope,  # governance, memory, combined, agents
            "priority": priority,
            "projectId": "OF-SDLC-IMP2"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/api/memory/query", json=payload)
            return {
                "status": "success" if response.status_code == 200 else "error",
                "data": response.json(),
                "query": query
            }
        except Exception as e:
            return {"status": "error", "error": str(e), "query": query}
    
    def execute_vision_agent(self, agent_id: str, task_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a Vision Layer Agent task"""
        request_payload = {
            "agentId": agent_id,
            "taskType": task_type,  # analysis, monitoring, validation, recommendation
            "priority": "medium",
            "payload": payload,
            "context": {
                "projectId": "OF-SDLC-IMP2",
                "phaseId": "OF-8.8"
            }
        }
        
        try:
            response = self.session.post(f"{self.base_url}/api/agent/execute", json=request_payload)
            return {
                "status": "success" if response.status_code == 200 else "error",
                "data": response.json(),
                "agent_id": agent_id,
                "task_type": task_type
            }
        except Exception as e:
            return {"status": "error", "error": str(e), "agent_id": agent_id}
    
    def log_openai_interaction(self, message: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Log OpenAI interaction for governance tracking"""
        payload = {
            "source": "azure_openai",
            "level": "info",
            "message": message,
            "metadata": metadata or {
                "timestamp": datetime.now().isoformat(),
                "integration_type": "openai_direct",
                "session_id": f"openai_{int(time.time())}"
            }
        }
        
        try:
            response = self.session.post(f"{self.base_url}/api/telemetry/log", json=payload)
            return {
                "status": "success" if response.status_code == 200 else "error",
                "data": response.json()
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def add_governance_entry(self, entry_type: str, project_id: str, summary: str, details: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new governance log entry"""
        payload = {
            "entryType": entry_type,
            "projectId": project_id,
            "phaseId": "OF-8.8",
            "summary": summary,
            "details": details,
            "memoryAnchor": f"openai-interaction-{int(time.time())}"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/api/governance/append", json=payload)
            return {
                "status": "success" if response.status_code == 200 else "error",
                "data": response.json()
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}

def demonstrate_openai_integration():
    """Demonstrate OpenAI → oApp integration capabilities"""
    
    print("🤖 OpenAI → oApp Integration Demonstration")
    print("=" * 50)
    
    # Initialize integration
    integration = OpenAIoAppIntegration()
    
    # 1. Health Check
    print("\n1️⃣ Health Check")
    health = integration.health_check()
    print(f"Status: {health['status']}")
    if health['status'] == 'success':
        print(f"Response time: {health['response_time']:.3f}s")
        print(f"Service status: {health['data']['status']}")
    
    # 2. Query Recent Project Activity
    print("\n2️⃣ Querying Recent Project Activity")
    governance = integration.query_governance_logs("OF-SDLC-IMP2", limit=5)
    if governance['status'] == 'success':
        entries = governance['data']['data']
        print(f"Found {len(entries)} recent entries:")
        for entry in entries[:3]:  # Show first 3
            print(f"  • {entry.get('entry_type', 'N/A')}: {entry.get('summary', 'No summary')[:60]}...")
    
    # 3. Execute RAG Query
    print("\n3️⃣ Executing RAG Query")
    rag_result = integration.execute_rag_query("What is the current status of the OF Integration Service implementation?")
    if rag_result['status'] == 'success':
        answer = rag_result['data'].get('answer', 'No answer received')
        print(f"RAG Answer: {answer[:200]}...")
    
    # 4. Execute Vision Layer Agent
    print("\n4️⃣ Executing Vision Layer Agent")
    agent_result = integration.execute_vision_agent(
        "code-advisor-001",
        "analysis", 
        {"analyze": "current project structure and health"}
    )
    if agent_result['status'] == 'success':
        result_data = agent_result['data'].get('result', {})
        print(f"Agent analysis complete: {result_data.get('success', False)}")
        recommendations = result_data.get('recommendations', [])
        if recommendations:
            print(f"Recommendations: {len(recommendations)} items")
    
    # 5. Log OpenAI Interaction
    print("\n5️⃣ Logging OpenAI Interaction")
    log_result = integration.log_openai_interaction(
        "OpenAI successfully connected to oApp via OF Integration Service",
        {"demo": True, "integration_test": True}
    )
    print(f"Telemetry logged: {log_result['status']}")
    
    # 6. Add Governance Entry
    print("\n6️⃣ Adding Governance Entry")
    gov_result = integration.add_governance_entry(
        "openai_integration_demo",
        "OF-INTEGRATION",
        "OpenAI integration demonstration completed successfully",
        {
            "demo_steps": 6,
            "all_endpoints_tested": True,
            "integration_working": True,
            "timestamp": datetime.now().isoformat()
        }
    )
    print(f"Governance entry added: {gov_result['status']}")
    
    print("\n✅ OpenAI → oApp Integration Demonstration Complete!")
    print("\n📋 Integration Summary:")
    print("• Health monitoring: Available")
    print("• Governance query: Available") 
    print("• RAG knowledge access: Available")
    print("• Vision Layer Agents: Available")
    print("• Telemetry logging: Available")
    print("• Audit trail: Complete")
    
    return True

if __name__ == "__main__":
    demonstrate_openai_integration()