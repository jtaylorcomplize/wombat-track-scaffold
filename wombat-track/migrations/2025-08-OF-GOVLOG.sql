-- migrations/2025-08-OF-GOVLOG.sql
-- Enhanced Governance Log DB Schema (Operational → Active)
-- Creates first-class backend storage for governance logs with cross-linking

CREATE TABLE IF NOT EXISTS enhanced_governance_logs (
  id VARCHAR(64) PRIMARY KEY,
  timestamp DATETIME NOT NULL,
  entryType VARCHAR(64) NOT NULL,
  summary TEXT NOT NULL,
  gptDraftEntry TEXT,
  classification VARCHAR(64),
  related_phase VARCHAR(32),
  related_step VARCHAR(32),
  linked_anchor VARCHAR(128),
  created_by VARCHAR(64) DEFAULT 'system',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (related_phase) REFERENCES phases(id),
  FOREIGN KEY (related_step) REFERENCES phase_steps(id)
);

CREATE INDEX IF NOT EXISTS idx_enhanced_govlogs_ts ON enhanced_governance_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_enhanced_govlogs_entryType ON enhanced_governance_logs(entryType);
CREATE INDEX IF NOT EXISTS idx_enhanced_govlogs_class ON enhanced_governance_logs(classification);

CREATE TABLE IF NOT EXISTS enhanced_log_links (
  source_log VARCHAR(64) NOT NULL,
  target_id VARCHAR(128) NOT NULL,
  link_type VARCHAR(64) DEFAULT 'reference',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (source_log, target_id),
  FOREIGN KEY (source_log) REFERENCES enhanced_governance_logs(id)
);

CREATE INDEX IF NOT EXISTS idx_enhanced_log_links_source ON enhanced_log_links(source_log);
CREATE INDEX IF NOT EXISTS idx_enhanced_log_links_target ON enhanced_log_links(target_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_log_links_type ON enhanced_log_links(link_type);