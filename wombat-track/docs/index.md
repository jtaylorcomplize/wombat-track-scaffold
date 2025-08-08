# 🗂️ `docs/` Directory Index – Wombat Track Repository

This file provides an overview of the reorganized documentation folders. Each subfolder aligns with Wombat Track's SDLC and governance architecture, and supports modular AI agent access, Claude scaffolding, and runtime auditability.

---

## 📁 `/docs/releases/`

**Purpose:** Stores all Phase, Deployment, and Completion summaries. Enables historical tracking of major milestones.

**Contents:**
* WT-8.0.2-COMPLETION-SUMMARY.md → Phase 8.0.2 summary
* SPQR_DEPLOYMENT_PHASE_COMPLETE.md → Finalisation of SPQR runtime
* OF-BEV-Phase-3-COMPLETE.md → Business Enablement Phase completion

**Related Agent Use:** `Lifecycle Narrative Composer`, `Auto-Audit Trigger Agent`

---

## 📁 `/docs/implementation/`

**Purpose:** Documents implementation milestones, Claude integrations, dispatcher design, and technical scaffolding.

**Contents:**
* TECHNICAL_DESIGN_PROPOSAL.md → Design framework for WT-GitHub flow
* ADMIN-UI-INTEGRATION-FINAL.md → Integration strategy for sidebar system
* QA-FRAMEWORK-IMPLEMENTATION-SUMMARY.md → Puppeteer/MCP rollout summary

**Related Agent Use:** `Claude Prompt Dispatcher`, `AI Phase Plan Constructor`

---

## 📁 `/docs/troubleshooting/`

**Purpose:** Centralized logs of debugging, recursion issues, hook patching, and diagnostic artifacts.

**Contents:**
* REACT-VITE-HOOK-RECURSION-DEBUG.md
* API-ERROR-DIAGNOSTIC-REPORT.md

**Related Agent Use:** `Self-Healing Project Inspector`

---

## 📁 `/docs/database/`

**Purpose:** Tracks schema validation, sync diffs, and data audits across Bubble, Notion, and oApp.

**Contents:**
* WT-DATABASE-AUDIT-REPORT.md
* data-backfill-report.md

**Related Agent Use:** `Memory Anchor Resolver`, `GovernanceLog Summariser`

---

## 📁 `/docs/quality/`

**Purpose:** Houses all code quality reports, lint logs, and git hygiene checklists.

**Contents:**
* LINT_STATUS_REPORT.md
* GIT_HYGIENE_QA_CHECKLIST.md

**Related Agent Use:** `Auto-Audit Trigger Agent`, `Claude PR Validator`

---

## 📁 `/docs/design/`

**Purpose:** Wireframes, UI enhancements, and frontend logic artefacts.

**Contents:**
* corrected-sidebar-wireframe.md
* 2025-07-29-Orbis Forge Design Framework.txt

**Related Agent Use:** `Phase Constructor`, `Prompt Scaffolder`

---

## 📁 `/docs/deployment/`

**Purpose:** UAT plans, dev setup guides, and staging/deploy SOPs.

**Contents:**
* UAT-TEST-PLAN.md
* DEV-SETUP.md
* UAT-DEPLOYMENT-GUIDE.md

**Related Agent Use:** `Deployment Trigger Agent`, `GovernanceLog Validator`

---

## 📁 `/docs/development/`

**Purpose:** Guides for new contributors, local dev setup, and Claude CLI references.

**Contents:**
* CONTRIBUTING.md (recommended)
* SIMULATE-PHASE-TRIGGER.md (suggested)

**Related Agent Use:** `Memory Resolver`, `Prompt Generator`

---

## 📁 `/docs/governance/` *(newly created)*

**Purpose:** Canonical GovernanceLog formats, memory anchor schemas, GPT/Claude usage policies.

**Suggested Contents:**
* GOVERNANCELOG_SCHEMA.md
* MEMORYPLUGIN_ANCHORS.md
* GPT-USAGE-GUIDELINES.md

**Related Agent Use:** `GovernanceLog Summariser`, `RAG Classifier`, `Meeting → Decision Tracker`

---

**🧠 Memory Anchors to Push:**
* `docs/governance/` → MemoryPlugin: `WT-ANCHOR-GOVERNANCE`
* `docs/deployment/` → MemoryPlugin: `WT-ANCHOR-DEPLOYMENT`
* `docs/quality/` → MemoryPlugin: `WT-ANCHOR-QUALITY`

---

**🧪 Next Action: Dispatch PhaseStep to Claude**
* Task: File reorganization PR (phase = WT-8.9, step = File Cleanup + Reorg)
* Hook: Push GovernanceLog + MemoryPlugin anchors upon PR completion