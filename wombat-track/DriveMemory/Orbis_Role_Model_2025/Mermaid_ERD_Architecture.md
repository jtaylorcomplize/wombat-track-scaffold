# 🏗️ Orbis SDLC Architecture - Mermaid ERD & Flow Diagrams

**Architecture:** Azure + GitHub Hybrid Cloud-Native SDLC  
**Framework:** Role-Based Orchestration with DriveMemory + MemoryPlugin Integration  
**Version:** 2025.1.0  
**Memory Anchor:** orbis-role-model-2025

---

## 1️⃣ Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    JACKSON ||--o{ STRATEGIC_PHASES : approves
    JACKSON ||--o{ EXECUTIVE_DECISIONS : makes
    JACKSON ||--o{ QUARTERLY_REVIEWS : conducts
    
    GIZMO ||--o{ PRODUCT_FEATURES : defines
    GIZMO ||--o{ PHASE_STEPS : structures
    GIZMO ||--o{ MEMORY_ANCHORS : maintains
    GIZMO ||--o{ RAG_TAGS : manages
    
    AZUREOPENAI ||--o{ CODE_COMMITS : creates
    AZUREOPENAI ||--o{ AZURE_DEPLOYMENTS : executes
    AZUREOPENAI ||--o{ RUNTIME_METRICS : monitors
    AZUREOPENAI ||--o{ INFRASTRUCTURE_CODE : maintains
    
    CLAUDECODE ||--o{ PR_REVIEWS : conducts
    CLAUDECODE ||--o{ ARCHITECTURE_DECISIONS : defines
    CLAUDECODE ||--o{ GOVERNANCE_LOGS : updates
    CLAUDECODE ||--o{ MERGE_APPROVALS : grants
    
    GITHUB_COPILOT ||--o{ TEST_EXECUTIONS : runs
    GITHUB_COPILOT ||--o{ SECURITY_SCANS : performs
    GITHUB_COPILOT ||--o{ VULNERABILITY_REPORTS : generates
    GITHUB_COPILOT ||--o{ CI_CD_VALIDATIONS : executes
    
    STRATEGIC_PHASES ||--o{ PHASE_STEPS : contains
    PHASE_STEPS ||--o{ CODE_COMMITS : implements
    PHASE_STEPS ||--o{ TEST_EXECUTIONS : validates
    
    CODE_COMMITS ||--o{ PR_REVIEWS : triggers
    PR_REVIEWS ||--o{ MERGE_APPROVALS : requires
    MERGE_APPROVALS ||--o{ AZURE_DEPLOYMENTS : enables
    
    AZURE_DEPLOYMENTS ||--o{ RUNTIME_METRICS : generates
    RUNTIME_METRICS ||--o{ GOVERNANCE_LOGS : feeds
    
    MEMORY_ANCHORS ||--o{ GOVERNANCE_LOGS : links
    MEMORY_ANCHORS ||--o{ DRIVE_MEMORY_ARTIFACTS : references
    
    SECURITY_SCANS ||--o{ VULNERABILITY_REPORTS : produces
    VULNERABILITY_REPORTS ||--o{ PR_REVIEWS : informs
    
    JACKSON {
        string role "Visionary CEO"
        string primary_system "oApp Governance Interface"
        array responsibilities "Strategic direction, Phase approval, Commercial oversight"
        string security_clearance "Executive Full Access"
    }
    
    GIZMO {
        string role "Product Manager"
        string primary_system "oApp UI/UX + MemoryPlugin"
        array responsibilities "Product vision, Phase structuring, Memory management"
        string security_clearance "Product Data Full Access"
    }
    
    AZUREOPENAI {
        string role "Senior Software Developer"
        string primary_system "Azure Cloud + Container Apps"
        array responsibilities "Backend implementation, CI/CD execution, Runtime management"
        string security_clearance "Azure Resource Contributor"
    }
    
    CLAUDECODE {
        string role "Systems Architect"
        string primary_system "GitHub Repository + Actions"
        array responsibilities "Architecture definition, PR review, Governance enforcement"
        string security_clearance "Repository Admin + Merge Authority"
    }
    
    GITHUB_COPILOT {
        string role "Tester & Security Engineer"
        string primary_system "GitHub Actions + Security Tools"
        array responsibilities "Automated testing, Security scanning, Compliance reporting"
        string security_clearance "Security Scanner Full Access"
    }
    
    STRATEGIC_PHASES {
        string phase_id PK
        string phase_name
        string description
        date start_date
        date end_date
        string status
        string jackson_approval
        string business_justification
    }
    
    PHASE_STEPS {
        string step_id PK
        string phase_id FK
        string step_name
        string description
        string owner_role
        string status
        json deliverables
        date completion_date
    }
    
    CODE_COMMITS {
        string commit_hash PK
        string step_id FK
        string author "AzureOpenAI"
        timestamp commit_time
        string commit_message
        json governance_metadata
        string branch_name
    }
    
    PR_REVIEWS {
        string pr_id PK
        string commit_hash FK
        string reviewer "ClaudeCode"
        string status
        timestamp review_time
        json architectural_validation
        array review_comments
    }
    
    MERGE_APPROVALS {
        string approval_id PK
        string pr_id FK
        string approver "ClaudeCode"
        timestamp approval_time
        json compliance_validation
        string merge_strategy
    }
    
    AZURE_DEPLOYMENTS {
        string deployment_id PK
        string approval_id FK
        string deployer "AzureOpenAI"
        timestamp deployment_time
        string environment
        string status
        json resource_configuration
    }
    
    RUNTIME_METRICS {
        string metric_id PK
        string deployment_id FK
        timestamp collection_time
        float response_time
        int throughput
        float error_rate
        float availability
        json performance_data
    }
    
    TEST_EXECUTIONS {
        string test_id PK
        string step_id FK
        string executor "GitHub Co-Pilot"
        timestamp execution_time
        string test_suite
        string status
        json test_results
        float coverage_percentage
    }
    
    SECURITY_SCANS {
        string scan_id PK
        string commit_hash FK
        string scanner "GitHub Co-Pilot"
        timestamp scan_time
        string scan_type
        json scan_results
        int vulnerability_count
    }
    
    VULNERABILITY_REPORTS {
        string report_id PK
        string scan_id FK
        string severity
        string description
        string status
        timestamp detection_time
        timestamp resolution_time
    }
    
    MEMORY_ANCHORS {
        string anchor_id PK
        string phase_id FK
        string anchor_type
        string description
        timestamp creation_time
        string creator "Gizmo"
        json linked_artifacts
        boolean audit_traceability
    }
    
    GOVERNANCE_LOGS {
        string log_id PK
        string anchor_id FK
        timestamp log_time
        string event_type
        string summary
        json metadata
        string compliance_status
    }
    
    DRIVE_MEMORY_ARTIFACTS {
        string artifact_id PK
        string anchor_id FK
        string file_path
        string file_type
        timestamp creation_time
        string creator_role
        json content_metadata
        string retention_period
    }
    
    RAG_TAGS {
        string tag_id PK
        string artifact_id FK
        string tag_name
        string tag_category
        string creator "Gizmo"
        timestamp creation_time
        json semantic_metadata
    }
    
    EXECUTIVE_DECISIONS {
        string decision_id PK
        string phase_id FK
        string decision_maker "Jackson"
        timestamp decision_time
        string decision_type
        string rationale
        json business_impact
    }
    
    QUARTERLY_REVIEWS {
        string review_id PK
        string reviewer "Jackson"
        date review_period_start
        date review_period_end
        json okr_assessment
        json market_analysis
        string strategic_adjustments
    }
```

---

## 2️⃣ SDLC Workflow Diagram

```mermaid
graph TD
    A[Jackson: Strategic Planning] --> B[Gizmo: Product Design]
    B --> C[AzureOpenAI: Development]
    C --> D[GitHub Co-Pilot: Testing & Security]
    D --> E[ClaudeCode: Review & Architecture]
    E --> F[AzureOpenAI: Deployment]
    F --> G[Orbis Forge: Runtime Operations]
    G --> H[Gizmo: Governance & Audit]
    H --> I[MemoryPlugin: Compliance Validation]
    
    %% Feedback Loops
    G --> C
    D --> B
    E --> A
    I --> A
    I --> B
    I --> C
    I --> D
    I --> E
    
    %% Governance Integration
    B --> J[DriveMemory: Artifacts]
    C --> J
    D --> J
    E --> J
    F --> J
    G --> J
    H --> J
    J --> K[Memory Anchors]
    K --> L[Audit Trail]
    
    %% System Integration
    C --> M[Azure Cloud]
    D --> N[GitHub Actions]
    E --> O[GitHub Repository]
    F --> M
    G --> P[Application Insights]
    H --> Q[MemoryPlugin]
    
    style A fill:#e1f5fe
    style B fill:#e8f5e8
    style C fill:#fff3e0
    style D fill:#f3e5f5
    style E fill:#ffebee
    style F fill:#fff3e0
    style G fill:#e0f2f1
    style H fill:#e8f5e8
    style I fill:#fce4ec
```

---

## 3️⃣ Data Flow Architecture

```mermaid
flowchart TB
    subgraph "Strategic Layer"
        JS[Jackson<br/>CEO]
        GZ[Gizmo<br/>Product Manager]
    end
    
    subgraph "Implementation Layer"
        AO[AzureOpenAI<br/>Senior Developer]
        GC[GitHub Co-Pilot<br/>Tester & Security]
        CC[ClaudeCode<br/>Systems Architect]
    end
    
    subgraph "Platform Layer"
        AC[Azure Cloud]
        GH[GitHub Actions]
        OA[Orbis oApp]
    end
    
    subgraph "Governance Layer"
        DM[DriveMemory]
        MP[MemoryPlugin]
        GL[GovernanceLog]
    end
    
    %% Strategic Flow
    JS -->|Strategic Direction| GZ
    GZ -->|Product Requirements| AO
    
    %% Implementation Flow
    AO -->|Code Commits| GC
    GC -->|Test Results| CC
    CC -->|Review Approval| AO
    AO -->|Deployment| AC
    
    %% Platform Integration
    AO <--> AC
    GC <--> GH
    CC <--> GH
    GZ <--> OA
    JS <--> OA
    
    %% Governance Integration
    GZ --> DM
    AO --> DM
    GC --> DM
    CC --> DM
    DM --> MP
    MP --> GL
    
    %% Feedback Loops
    AC -->|Runtime Metrics| AO
    GH -->|CI/CD Results| CC
    OA -->|User Feedback| GZ
    GL -->|Compliance Status| JS
    
    %% Audit Trail
    GL -->|Audit Data| DM
    DM -->|Historical Data| MP
    MP -->|Compliance Reports| JS
    
    style JS fill:#bbdefb
    style GZ fill:#c8e6c9
    style AO fill:#ffe0b2
    style GC fill:#e1bee7
    style CC fill:#ffcdd2
    style AC fill:#b2dfdb
    style GH fill:#d7ccc8
    style OA fill:#f8bbd9
    style DM fill:#dcedc8
    style MP fill:#ffccbc
    style GL fill:#e8eaf6
```

---

## 4️⃣ Security & Compliance Flow

```mermaid
sequenceDiagram
    participant J as Jackson<br/>(CEO)
    participant G as Gizmo<br/>(Product Manager)
    participant A as AzureOpenAI<br/>(Developer)
    participant GC as GitHub Co-Pilot<br/>(Security)
    participant C as ClaudeCode<br/>(Architect)
    participant MP as MemoryPlugin
    participant DM as DriveMemory
    
    Note over J,DM: Strategic Planning Phase
    J->>G: Strategic direction & phase approval
    G->>DM: Create phase brief with memory anchor
    
    Note over J,DM: Development Phase
    G->>A: Product requirements & phase steps
    A->>GC: Code commit triggers automated testing
    GC->>GC: Execute SAST/DAST security scans
    GC->>C: Security validation results
    
    Note over J,DM: Review & Approval Phase
    C->>C: Architectural review & compliance check
    C->>G: Review approval with governance validation
    G->>MP: Update memory anchors with compliance status
    
    Note over J,DM: Deployment Phase
    C->>A: Deployment approval granted
    A->>A: Deploy to Azure with audit logging
    A->>DM: Store deployment artifacts & metrics
    
    Note over J,DM: Governance & Audit Phase
    DM->>MP: Aggregate all governance artifacts
    MP->>MP: Validate audit trail completeness
    MP->>G: Generate compliance report
    G->>J: Executive governance dashboard update
    
    Note over J,DM: Continuous Monitoring
    A->>GC: Runtime metrics & security events
    GC->>C: Security incident alerts (if any)
    C->>G: Technical risk assessment
    G->>J: Executive risk notification (if required)
```

---

## 5️⃣ Integration Points Matrix

```mermaid
graph LR
    subgraph "Role Integration Matrix"
        J[Jackson] <--> G[Gizmo]
        G <--> A[AzureOpenAI]
        A <--> GC[GitHub Co-Pilot]
        GC <--> C[ClaudeCode]
        C <--> G
        C <--> J
        
        J <--> OGI[oApp Governance Interface]
        G <--> OUI[oApp UI/UX Interface]
        A <--> AC[Azure Cloud Platform]
        GC <--> GHA[GitHub Actions]
        C <--> GHR[GitHub Repository]
        
        G <--> MP[MemoryPlugin]
        MP <--> DM[DriveMemory]
        DM <--> GL[GovernanceLog]
        
        AC <--> AI[Application Insights]
        GHA <--> GST[Security Tools]
        
        GL <--> CT[Compliance Tracking]
        CT <--> AR[Audit Reports]
    end
    
    style J fill:#e3f2fd
    style G fill:#e8f5e8
    style A fill:#fff8e1
    style GC fill:#fce4ec
    style C fill:#ffebee
    style MP fill:#f3e5f5
    style DM fill:#e0f2f1
    style GL fill:#e8eaf6
```

---

## 6️⃣ Compliance Validation Flow

```mermaid
stateDiagram-v2
    [*] --> PlanningPhase
    
    PlanningPhase --> DesignPhase : Jackson Approval
    DesignPhase --> DevelopmentPhase : Gizmo Specification
    DevelopmentPhase --> TestingPhase : Code Commit
    TestingPhase --> ReviewPhase : Security Validation
    ReviewPhase --> DeploymentPhase : Architecture Approval
    DeploymentPhase --> OperationsPhase : Deployment Success
    OperationsPhase --> GovernancePhase : Runtime Metrics
    GovernancePhase --> ComplianceValidation : Artifact Collection
    
    ComplianceValidation --> [*] : Audit Complete
    
    TestingPhase --> DevelopmentPhase : Security Issues Found
    ReviewPhase --> DevelopmentPhase : Architecture Issues
    DeploymentPhase --> DevelopmentPhase : Deployment Failed
    OperationsPhase --> DeploymentPhase : Runtime Issues
    
    state PlanningPhase {
        [*] --> StrategicReview
        StrategicReview --> PhaseApproval
        PhaseApproval --> [*]
    }
    
    state TestingPhase {
        [*] --> AutomatedTests
        AutomatedTests --> SecurityScans
        SecurityScans --> VulnerabilityAssessment
        VulnerabilityAssessment --> [*]
    }
    
    state ComplianceValidation {
        [*] --> AuditTrailValidation
        AuditTrailValidation --> ComplianceFrameworkCheck
        ComplianceFrameworkCheck --> GovernanceReport
        GovernanceReport --> [*]
    }
```

---

## 7️⃣ Technology Stack Architecture

```mermaid
C4Context
    title Orbis SDLC Technology Stack Architecture
    
    Person(jackson, "Jackson", "Visionary CEO")
    Person(gizmo, "Gizmo", "Product Manager") 
    Person(azure_ai, "AzureOpenAI", "Senior Developer")
    Person(copilot, "GitHub Co-Pilot", "Tester & Security")
    Person(claude, "ClaudeCode", "Systems Architect")
    
    System_Boundary(orbis_platform, "Orbis Platform") {
        System(oapp, "Orbis oApp", "Role-based interfaces and workflow management")
        System(memory_plugin, "MemoryPlugin", "Semantic memory and governance tracking")
        System(drive_memory, "DriveMemory", "Artifact storage and audit trail")
    }
    
    System_Boundary(azure_cloud, "Azure Cloud Platform") {
        System(container_apps, "Container Apps", "Scalable application hosting")
        System(functions, "Azure Functions", "Serverless compute")
        System(app_insights, "Application Insights", "Monitoring and analytics")
        System(key_vault, "Key Vault", "Secrets and certificate management")
    }
    
    System_Boundary(github_platform, "GitHub Platform") {
        System(repository, "GitHub Repository", "Source code management")
        System(actions, "GitHub Actions", "CI/CD automation")
        System(security_tools, "Advanced Security", "Vulnerability scanning")
    }
    
    Rel(jackson, oapp, "Strategic oversight")
    Rel(gizmo, oapp, "Product management")
    Rel(gizmo, memory_plugin, "Governance management")
    Rel(azure_ai, container_apps, "Application deployment")
    Rel(azure_ai, functions, "Serverless execution")
    Rel(copilot, actions, "Automated testing")
    Rel(copilot, security_tools, "Security scanning")
    Rel(claude, repository, "Code review")
    Rel(claude, actions, "Pipeline management")
    
    Rel(oapp, drive_memory, "Artifact storage")
    Rel(memory_plugin, drive_memory, "Data persistence")
    Rel(container_apps, app_insights, "Telemetry data")
    Rel(actions, container_apps, "Deployment")
    Rel(repository, actions, "Trigger workflows")
```

---

**Architecture Authority:** ClaudeCode (Systems Architect) + Jackson (CEO)  
**Technical Review:** AzureOpenAI (Senior Developer) + GitHub Co-Pilot (Security Engineer)  
**Product Alignment:** Gizmo (Product Manager)  
**Memory Anchor:** orbis-role-model-2025  
**Last Updated:** 2025-08-06