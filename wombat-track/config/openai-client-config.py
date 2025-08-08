#!/usr/bin/env python3
"""
OpenAI Client Configuration for oApp Integration
Direct integration with OF Integration Service
"""

import openai
import requests
from typing import Dict, Any, Optional
import json
import time

class OpenAIoAppClient:
    """
    OpenAI client configured for direct oApp integration
    Uses the OF Integration Service as the API gateway
    """
    
    def __init__(self, 
                 integration_service_url: str = "http://localhost:3001",
                 use_azure_auth: bool = False,
                 azure_token: Optional[str] = None):
        
        self.integration_service_url = integration_service_url
        self.use_azure_auth = use_azure_auth
        self.azure_token = azure_token
        
        # Configure OpenAI client to use our integration service
        if use_azure_auth and azure_token:
            openai.api_key = azure_token
            openai.api_base = integration_service_url
            openai.api_type = "azure"
        else:
            # Local testing mode - direct HTTP calls
            self.session = requests.Session()
            self.session.headers.update({
                'Content-Type': 'application/json',
                'User-Agent': 'OpenAI-oApp-Client/1.0'
            })
            
        print(f"✅ OpenAI oApp Client configured")
        print(f"   Integration Service: {integration_service_url}")
        print(f"   Azure Auth: {'Enabled' if use_azure_auth else 'Disabled (local testing)'}")
    
    def query_codebase(self, 
                      query_text: str, 
                      pattern: Optional[str] = None, 
                      directory: str = ".",
                      limit: int = 10) -> Dict[str, Any]:
        """
        Query the local codebase directly through the integration service
        
        Args:
            query_text: Natural language query about the codebase
            pattern: Optional search pattern for files
            directory: Directory to search in
            limit: Maximum number of results
            
        Returns:
            Query results with file paths and relevant information
        """
        
        # First get codebase files matching the pattern
        if pattern:
            codebase_response = self.session.get(
                f"{self.integration_service_url}/api/codebase/query",
                params={"pattern": pattern, "directory": directory, "limit": limit}
            )
            codebase_results = codebase_response.json() if codebase_response.status_code == 200 else {}
        else:
            codebase_results = {}
        
        # Then ask the knowledge system about it
        memory_response = self.session.post(
            f"{self.integration_service_url}/api/memory/query",
            json={
                "query": f"{query_text} {f'(related to: {pattern})' if pattern else ''}",
                "scope": "combined",
                "priority": "medium"
            }
        )
        
        memory_results = memory_response.json() if memory_response.status_code == 200 else {}
        
        return {
            "query": query_text,
            "pattern": pattern,
            "codebase_files": codebase_results.get("results", []),
            "knowledge_answer": memory_results.get("answer", ""),
            "timestamp": time.time(),
            "status": "success" if memory_response.status_code == 200 else "partial"
        }
    
    def analyze_project_status(self) -> Dict[str, Any]:
        """
        Get comprehensive project status from governance logs and codebase
        """
        
        # Query governance logs
        governance_response = self.session.get(
            f"{self.integration_service_url}/api/governance/query",
            params={"projectId": "OF-SDLC-IMP2", "limit": 10}
        )
        
        # Ask for project status summary
        memory_response = self.session.post(
            f"{self.integration_service_url}/api/memory/query",
            json={
                "query": "What is the current project status? What phases are complete and what's in progress?",
                "scope": "combined",
                "priority": "high"
            }
        )
        
        # Analyze codebase structure
        analysis_response = self.session.post(
            f"{self.integration_service_url}/api/codebase/analyze",
            json={
                "analysisType": "structure",
                "directory": "."
            }
        )
        
        governance_data = governance_response.json() if governance_response.status_code == 200 else {}
        memory_data = memory_response.json() if memory_response.status_code == 200 else {}
        analysis_data = analysis_response.json() if analysis_response.status_code == 200 else {}
        
        return {
            "project_status": {
                "governance_entries": governance_data.get("count", 0),
                "recent_activities": [
                    entry.get("summary", "") for entry in governance_data.get("data", [])[:5]
                ],
                "knowledge_summary": memory_data.get("answer", ""),
                "codebase_structure": {
                    "total_files": len(analysis_data.get("data", {}).get("files", [])),
                    "key_files": analysis_data.get("data", {}).get("files", [])[:10]
                }
            },
            "timestamp": time.time(),
            "status": "success"
        }
    
    def ask_question(self, question: str, context: Optional[str] = None) -> str:
        """
        Ask a natural language question about the codebase/project
        
        Args:
            question: The question to ask
            context: Optional context (project, phase, etc.)
            
        Returns:
            Answer based on codebase knowledge and governance data
        """
        
        # Enhance question with context if provided
        enhanced_question = f"{question}"
        if context:
            enhanced_question += f" (Context: {context})"
        
        response = self.session.post(
            f"{self.integration_service_url}/api/memory/query",
            json={
                "query": enhanced_question,
                "scope": "combined",
                "priority": "medium"
            }
        )
        
        if response.status_code == 200:
            return response.json().get("answer", "No answer available")
        else:
            return f"Error: {response.status_code} - {response.text}"
    
    def log_interaction(self, 
                       interaction_type: str, 
                       details: Dict[str, Any]) -> bool:
        """
        Log OpenAI interaction for governance tracking
        """
        
        response = self.session.post(
            f"{self.integration_service_url}/api/governance/append",
            json={
                "entryType": f"openai_{interaction_type}",
                "projectId": "OPENAI-INTEGRATION",
                "summary": f"OpenAI {interaction_type}: {details.get('summary', 'Interaction logged')}",
                "details": details
            }
        )
        
        return response.status_code == 200
    
    def health_check(self) -> Dict[str, Any]:
        """
        Check if the integration service is healthy
        """
        response = self.session.get(f"{self.integration_service_url}/health")
        return response.json() if response.status_code == 200 else {"status": "unhealthy"}

# Example usage and demonstration
def demonstrate_openai_oapp_integration():
    """
    Demonstrate OpenAI → oApp integration capabilities
    """
    
    print("🚀 OpenAI → oApp Integration Demonstration")
    print("=" * 50)
    
    # Initialize client
    client = OpenAIoAppClient()
    
    # 1. Health check
    print("\n1️⃣ Health Check")
    health = client.health_check()
    print(f"Service status: {health.get('status', 'unknown')}")
    
    # 2. Query codebase
    print("\n2️⃣ Codebase Query")
    codebase_info = client.query_codebase(
        "What integration services are available?", 
        pattern="integration"
    )
    print(f"Found {len(codebase_info['codebase_files'])} integration files")
    print(f"Knowledge answer: {codebase_info['knowledge_answer'][:100]}...")
    
    # 3. Project status
    print("\n3️⃣ Project Status Analysis")
    project_status = client.analyze_project_status()
    status_data = project_status["project_status"]
    print(f"Governance entries: {status_data['governance_entries']}")
    print(f"Total files: {status_data['codebase_structure']['total_files']}")
    
    # 4. Ask questions
    print("\n4️⃣ Natural Language Questions")
    questions = [
        "What is the OF Integration Service?",
        "What phases of the project are complete?",
        "How do I use the OpenAI integration?"
    ]
    
    for question in questions:
        answer = client.ask_question(question)
        print(f"Q: {question}")
        print(f"A: {answer[:150]}...")
        print()
    
    # 5. Log the demonstration
    print("5️⃣ Logging Demonstration")
    logged = client.log_interaction("demonstration", {
        "demo_completed": True,
        "questions_asked": len(questions),
        "timestamp": time.time(),
        "summary": "OpenAI integration demonstration completed successfully"
    })
    print(f"Demonstration logged: {'✅' if logged else '❌'}")
    
    print("\n✅ OpenAI → oApp Integration Demonstration Complete!")
    
    return True

if __name__ == "__main__":
    demonstrate_openai_oapp_integration()