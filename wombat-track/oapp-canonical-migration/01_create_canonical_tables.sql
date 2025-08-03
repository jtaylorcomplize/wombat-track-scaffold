-- ===========================================
-- Canonical oApp Migration 2025-08-02
-- Phase: Projects / Phases / Steps / Comms
-- MemoryPlugin Anchor: oapp-canonical-schema-migration-20250802
-- ===========================================

-- Projects (canonical)
CREATE TABLE IF NOT EXISTS projects_canonical (
    projectId TEXT PRIMARY KEY,
    projectName TEXT NOT NULL,
    owner TEXT,
    status TEXT DEFAULT 'Planning',
    goals TEXT,
    description TEXT,
    aiPromptLog TEXT,
    keyTasks TEXT,
    tags TEXT,
    scopeNotes TEXT,
    govLog TEXT,
    checkpointReview TEXT,
    claudeGizmoExchange JSON,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Phases (canonical)
CREATE TABLE IF NOT EXISTS phases_canonical (
    phaseId TEXT PRIMARY KEY,
    phaseName TEXT NOT NULL,
    project_ref TEXT,
    status TEXT DEFAULT 'Planned',
    RAG TEXT,
    startDate DATE,
    endDate DATE,
    notes TEXT,
    FOREIGN KEY(project_ref) REFERENCES projects_canonical(projectId)
);

-- Steps (canonical)
CREATE TABLE IF NOT EXISTS steps_canonical (
    stepId TEXT PRIMARY KEY,
    stepName TEXT,
    phase_ref TEXT,
    project_ref TEXT,
    status TEXT,
    startDate DATE,
    endDate DATE,
    outputNotes TEXT,
    FOREIGN KEY(phase_ref) REFERENCES phases_canonical(phaseId),
    FOREIGN KEY(project_ref) REFERENCES projects_canonical(projectId)
);

-- Unified Communications (canonical)
CREATE TABLE IF NOT EXISTS comms_canonical (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projectId TEXT,
    phaseId TEXT,
    timestamp DATETIME,
    agentType TEXT,
    eventType TEXT,
    messagePayload JSON,
    FOREIGN KEY(projectId) REFERENCES projects_canonical(projectId),
    FOREIGN KEY(phaseId) REFERENCES phases_canonical(phaseId)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects_canonical(status);
CREATE INDEX IF NOT EXISTS idx_phases_project ON phases_canonical(project_ref);
CREATE INDEX IF NOT EXISTS idx_phases_rag ON phases_canonical(RAG);
CREATE INDEX IF NOT EXISTS idx_steps_phase ON steps_canonical(phase_ref);
CREATE INDEX IF NOT EXISTS idx_steps_status ON steps_canonical(status);
CREATE INDEX IF NOT EXISTS idx_comms_project ON comms_canonical(projectId);
CREATE INDEX IF NOT EXISTS idx_comms_timestamp ON comms_canonical(timestamp);
CREATE INDEX IF NOT EXISTS idx_comms_agent ON comms_canonical(agentType);