 classDiagram
      %% PLAN SURFACE (Blue)
      class Project {
          +string id
          +string title
          +string description
          +string goals
          +string scopeNotes
          +List~string~ keyTasks
          +List~string~ aiPromptLog
      }

      class PhaseStep {
          +string id
          +number stepNumber
          +string stepInstruction
          +boolean isSideQuest
          +List~string~ aiSuggestedTemplates
      }

      class Phase {
          +string id
          +string name
          +string description
          +string startDate
          +string endDate
          +string status
      }

      %% EXECUTE SURFACE (Yellow)
      class StepProgress {
          +string id
          +string status
          +string notes
          +string assignedTo
          +string updatedOn
          +string blockerNotes
      }

      %% GOVERN SURFACE (Green)
      class GovernanceLog {
          +string id
          +string entryType
          +string summary
          +string gptDraftEntry
          +string createdBy
      }

      class CheckpointReview {
          +string id
          +string status
          +string aiRiskSummary
      }

      class MeetingLog {
          +string id
          +string summary
          +List~string~ decisionsMade
          +string gptDraftEntry
      }

      %% INTEGRATE SURFACE (Grey)
      class IntegrationCard {
          +string name
          +string status
          +string lastChecked
          +boolean isActive
          +string category
          +string logURL
      }

      class Agent {
          +string id
          +string name
          +string description
          +string icon
          +List~string~ capabilities
          +string currentStatus
          +string version
          +string endpoint
          +string createdAt
          +string lastActiveAt
          +boolean isLive
          +string dispatchMode
      }

      class ExternalService {
          +string id
          +string name
          +string type
          +string status
          +string docURL
          +string healthEndpoint
          +string version
          +string provider
          +string region
          +List~string~ dependencies
          +string createdAt
          +string lastStatusUpdate
          +string apiEndpoint
      }

      class DispatchLog {
          +string id
          +string timestamp
          +string prompt
          +string response
          +boolean isSuccess
          +string promptType
          +string projectId
          +string phaseStepId
          +string userId
          +string agentVersion
          +number responseTime
          +number tokensUsed
      }

      %% INTELLIGENCE SURFACE (Purple)
      class Template {
          +string id
          +string templateName
          +string usageType
          +string status
      }

      class MemoryAnchor {
          +string id
          +string sourceType
          +List~string~ tags
          +string timestamp
          +string content
          +string contextData
      }

      %% RELATIONSHIPS
      Project "1" --> "*" PhaseStep : has
      Phase "1" --> "*" PhaseStep : contains
      PhaseStep "1" --> "1" StepProgress : has
      PhaseStep "1" --> "*" GovernanceLog : has
      PhaseStep "1" --> "*" CheckpointReview : has
      PhaseStep "1" --> "*" MeetingLog : has
      GovernanceLog "1" --> "0..1" MeetingLog : related
      Agent "1" --> "*" DispatchLog : generates
      ExternalService "1" --> "*" DispatchLog : processes
      Agent "*" --> "*" ExternalService : uses
      PhaseStep "*" --> "*" Template : references
      Project "1" --> "*" DispatchLog : linked
      Project "1" --> "*" IntegrationCard : linked
      Project "1" --> "*" MemoryAnchor : linked
      PhaseStep "1" --> "*" DispatchLog : linked
      PhaseStep "1" --> "*" MemoryAnchor : linked
      GovernanceLog "1" --> "*" DispatchLog : triggers
      GovernanceLog "1" --> "*" MemoryAnchor : linked

      %% STYLING
      classDef planSurface fill:#e1f5fe,stroke:#01579b,stroke-width:2px
      classDef executeSurface fill:#fff8e1,stroke:#e65100,stroke-width:2px
      classDef governSurface fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
      classDef integrateSurface fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
      classDef intelligenceSurface fill:#fce4ec,stroke:#880e4f,stroke-width:2px

      class Project planSurface
      class PhaseStep planSurface
      class Phase planSurface
      class StepProgress executeSurface
      class GovernanceLog governSurface
      class CheckpointReview governSurface
      class MeetingLog governSurface
      class IntegrationCard integrateSurface
      class Agent integrateSurface
      class ExternalService integrateSurface
      class DispatchLog integrateSurface
      class Template intelligenceSurface
      class MemoryAnchor intelligenceSurface
```

## Key Relationships Summary

### 🔷 PLAN SURFACE (Blue)
- **Project** serves as the root entity with 1:N relationship to PhaseStep
- **Phase** organizes PhaseSteps logically (1:N)
- **PhaseStep** is the central planning unit

### 🟡 EXECUTE SURFACE (Yellow)  
- **StepProgress** has 1:1 relationship with PhaseStep
- Tracks execution status and blockers

### 🟩 GOVERN SURFACE (Green)
- **GovernanceLog**, **CheckpointReview**, **MeetingLog** all have N:1 relationships with PhaseStep
- **GovernanceLog** can optionally relate to **MeetingLog**

### 🔗 INTEGRATE SURFACE (Grey)
- **Agent** generates **DispatchLog** entries (1:N)
- **ExternalService** processes **DispatchLog** entries (1:N)
- **Agent** uses **ExternalService** (N:N)
- **IntegrationCard** tracks service health independently

### 🧠 INTELLIGENCE SURFACE (Purple)
- **Template** can be referenced by multiple **PhaseStep** entities
- **MemoryAnchor** can link to any major entity for context preservation

### Cross-Surface Integration
- **DispatchLog** optionally links to **Project** or **PhaseStep** for context
- **MemoryAnchor** optionally links to **Project**, **PhaseStep**, or **GovernanceLog**
- **IntegrationCard** optionally links to **Project** for service-specific contexts

This architecture supports the five-surface organization while maintaining clear separation of concerns and enabling rich cross-surface relationships for comprehensive project management and AI integration.