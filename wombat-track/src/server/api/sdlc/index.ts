import { Router } from 'express';
import * as phaseSteps from './phase-steps.ts';
import * as governanceLog from './governance-log.ts';
import * as memoryAnchor from './memory-anchor.ts';
import * as ciStatus from './ci-status.ts';
import * as webhooks from './webhooks.ts';

const router = Router();

// Phase Steps routes
router.get('/phase-steps', phaseSteps.getPhaseSteps);
router.get('/phase-steps/:stepId', phaseSteps.getPhaseStep);
router.put('/phase-steps/:stepId', phaseSteps.updatePhaseStep);
router.post('/events', phaseSteps.triggerSDLCEvent);
router.get('/branches/:branch/validation', phaseSteps.validateMergeReadiness);
router.get('/branches/:branch/status', phaseSteps.getBranchStatus);

// Governance Log routes
router.post('/governance/entries', governanceLog.createGovernanceEntry);
router.get('/governance/entries', governanceLog.getGovernanceEntries);
router.get('/governance/entries/:entryId', governanceLog.getGovernanceEntry);
router.get('/governance/branches/:branch/validation', governanceLog.validateGovernanceComplete);
router.get('/governance/report', governanceLog.getSDLCGovernanceReport);

// Memory Anchor routes
router.post('/memory-anchors', memoryAnchor.createMemoryAnchor);
router.get('/memory-anchors', memoryAnchor.getMemoryAnchors);
router.get('/memory-anchors/:anchorId', memoryAnchor.getMemoryAnchor);
router.get('/memory-anchors/branches/:branch/validation', memoryAnchor.validateMemoryAnchorReadiness);
router.delete('/memory-anchors/:anchorId', memoryAnchor.deleteMemoryAnchor);
router.get('/memory-anchors-stats', memoryAnchor.getMemoryAnchorStats);

// CI Status routes
router.post('/ci/status', ciStatus.updateCIStatus);
router.get('/ci/status/:branch', ciStatus.getCIStatus);
router.get('/ci/status', ciStatus.getAllCIStatuses);
router.post('/ci/trigger', ciStatus.triggerCIBuild);
router.post('/ci/cancel/:branch', ciStatus.cancelCIBuild);
router.get('/ci/stats', ciStatus.getCIStats);

// Webhook and orchestration routes
router.post('/webhooks/github', webhooks.handleGitHubWebhook);
router.post('/webhooks/gitlab', webhooks.handleGitLabWebhook);
router.post('/webhooks/jenkins', webhooks.handleJenkinsWebhook);
router.post('/qa/results', webhooks.submitQAResults);
router.post('/ci/trigger-build', webhooks.triggerCIBuild);
router.get('/merge-readiness/:branch', webhooks.checkMergeReadiness);
router.get('/orchestrator/status', webhooks.getOrchestratorStatus);
router.post('/orchestrator/active', webhooks.setOrchestratorActive);

export default router;