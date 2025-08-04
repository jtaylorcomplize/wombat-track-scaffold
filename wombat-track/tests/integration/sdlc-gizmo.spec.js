const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');

describe('SDLC Gizmo Integration Tests', () => {
  let server;
  let gizmoAgent;
  let baseURL;

  beforeAll(async () => {
    // Start test server
    baseURL = process.env.BASE_URL || 'http://localhost:3001';
    
    // Initialize Gizmo agent for testing
    const { getGizmoAgent } = await import('../../src/server/agents/gizmo.ts');
    gizmoAgent = getGizmoAgent();
    
    console.log('🚀 SDLC Gizmo Integration Tests: Starting...');
  });

  afterAll(async () => {
    // Cleanup
    if (gizmoAgent) {
      gizmoAgent.cleanup();
    }
    console.log('🧹 SDLC Gizmo Integration Tests: Cleanup complete');
  });

  beforeEach(async () => {
    // Reset Gizmo agent state before each test
    const { resetGizmoAgent } = await import('../../src/server/agents/gizmo.ts');
    resetGizmoAgent();
    gizmoAgent = (await import('../../src/server/agents/gizmo.ts')).getGizmoAgent();
  });

  describe('Gizmo Agent Core Functionality', () => {
    test('should initialize Gizmo agent successfully', () => {
      expect(gizmoAgent).toBeDefined();
      expect(gizmoAgent.id).toBe('gizmo-sdlc-agent');
      expect(gizmoAgent.name).toBe('Gizmo SDLC Agent');
      expect(gizmoAgent.currentStatus).toBe('active');
    });

    test('should handle branch creation event', async () => {
      const branch = 'feature/test-branch-creation';
      const event = {
        type: 'branch_created',
        branch: branch,
        timestamp: new Date().toISOString(),
        metadata: {
          user_id: 'test_user',
          commit_sha: 'abc123'
        }
      };

      gizmoAgent.emit(event);
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const steps = gizmoAgent.getPhaseSteps(branch);
      expect(steps).toHaveLength(1);
      expect(steps[0].step).toBe('Debug');
      expect(steps[0].status).toBe('in_progress');
      expect(steps[0].branch).toBe(branch);
    });

    test('should handle build completion event - success', async () => {
      const branch = 'feature/test-build-success';
      
      // First create branch
      gizmoAgent.emit({
        type: 'branch_created',
        branch: branch,
        timestamp: new Date().toISOString(),
        metadata: { user_id: 'test_user' }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Then complete build
      gizmoAgent.emit({
        type: 'build_completed',
        branch: branch,
        timestamp: new Date().toISOString(),
        metadata: { build_id: 'build_123' },
        ci_status: 'success'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const steps = gizmoAgent.getPhaseSteps(branch);
      const debugStep = steps.find(s => s.step === 'Debug');
      const qaStep = steps.find(s => s.step === 'QA');

      expect(debugStep.status).toBe('completed');
      expect(debugStep.ci_status).toBe('success');
      expect(qaStep).toBeDefined();
      expect(qaStep.status).toBe('pending');
    });

    test('should handle build completion event - failure', async () => {
      const branch = 'feature/test-build-failure';
      
      // First create branch
      gizmoAgent.emit({
        type: 'branch_created',
        branch: branch,
        timestamp: new Date().toISOString(),
        metadata: { user_id: 'test_user' }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Then fail build
      gizmoAgent.emit({
        type: 'build_completed',
        branch: branch,
        timestamp: new Date().toISOString(),
        metadata: { build_id: 'build_456' },
        ci_status: 'failure'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const steps = gizmoAgent.getPhaseSteps(branch);
      const debugStep = steps.find(s => s.step === 'Debug');
      const qaSteps = steps.filter(s => s.step === 'QA');

      expect(debugStep.status).toBe('failed');
      expect(debugStep.ci_status).toBe('failure');
      expect(qaSteps).toHaveLength(0); // No QA step created on build failure
    });

    test('should handle QA completion event - pass', async () => {
      const branch = 'feature/test-qa-pass';
      
      // Complete build first
      await simulateSuccessfulBuild(branch);

      // Complete QA
      gizmoAgent.emit({
        type: 'qa_completed',
        branch: branch,
        timestamp: new Date().toISOString(),
        metadata: {
          user_id: 'qa_user',
          screenshots: ['screenshot1.png'],
          test_results: { passed: 10, failed: 0 }
        },
        qa_result: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const steps = gizmoAgent.getPhaseSteps(branch);
      const qaStep = steps.find(s => s.step === 'QA');
      const govStep = steps.find(s => s.step === 'Governance');

      expect(qaStep.status).toBe('completed');
      expect(qaStep.qa_evidence.manual_qa_passed).toBe(true);
      expect(qaStep.qa_evidence.screenshots_attached).toBe(true);
      expect(govStep).toBeDefined();
      expect(govStep.status).toBe('pending');
    });

    test('should handle QA completion event - fail', async () => {
      const branch = 'feature/test-qa-fail';
      
      // Complete build first
      await simulateSuccessfulBuild(branch);

      // Fail QA
      gizmoAgent.emit({
        type: 'qa_completed',
        branch: branch,
        timestamp: new Date().toISOString(),
        metadata: {
          user_id: 'qa_user',
          test_results: { passed: 5, failed: 5 }
        },
        qa_result: false
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const steps = gizmoAgent.getPhaseSteps(branch);
      const qaStep = steps.find(s => s.step === 'QA');
      const govSteps = steps.filter(s => s.step === 'Governance');

      expect(qaStep.status).toBe('failed');
      expect(qaStep.qa_evidence.manual_qa_passed).toBe(false);
      expect(govSteps).toHaveLength(0); // No governance step created on QA failure
    });

    test('should validate merge readiness correctly', async () => {
      const branch = 'feature/test-merge-validation';
      
      // Complete full workflow
      await simulateFullWorkflow(branch);

      const validation = await gizmoAgent.validateMergeReadiness(branch);
      
      expect(validation.allowed).toBe(true);
      expect(validation.blocking_reasons).toHaveLength(0);
      expect(validation.completed_steps).toContain('Debug');
      expect(validation.completed_steps).toContain('QA');
      expect(validation.completed_steps).toContain('Governance');
    });

    test('should block merge when workflow incomplete', async () => {
      const branch = 'feature/test-merge-blocked';
      
      // Only complete debug phase
      gizmoAgent.emit({
        type: 'branch_created',
        branch: branch,
        timestamp: new Date().toISOString(),
        metadata: { user_id: 'test_user' }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const validation = await gizmoAgent.validateMergeReadiness(branch);
      
      expect(validation.allowed).toBe(false);
      expect(validation.blocking_reasons.length).toBeGreaterThan(0);
      expect(validation.blocking_reasons).toContain('QA step not completed');
      expect(validation.blocking_reasons).toContain('Governance step not completed');
    });
  });

  describe('SDLC API Endpoints', () => {
    test('should fetch phase steps via API', async () => {
      const branch = 'feature/test-api-steps';
      await simulateSuccessfulBuild(branch);

      const response = await fetch(`${baseURL}/api/sdlc/phase-steps?branch=${branch}`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.data[0].branch).toBe(branch);
    });

    test('should trigger SDLC event via API', async () => {
      const branch = 'feature/test-api-trigger';
      
      const response = await fetch(`${baseURL}/api/sdlc/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'branch_created',
          branch: branch,
          metadata: { user_id: 'api_user' }
        })
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);

      // Verify event was processed
      await new Promise(resolve => setTimeout(resolve, 100));
      const steps = gizmoAgent.getPhaseSteps(branch);
      expect(steps).toHaveLength(1);
      expect(steps[0].step).toBe('Debug');
    });

    test('should validate merge readiness via API', async () => {
      const branch = 'feature/test-api-merge';
      await simulateFullWorkflow(branch);

      const response = await fetch(`${baseURL}/api/sdlc/branches/${branch}/validation`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.merge_ready).toBe(true);
    });

    test('should submit QA results via API', async () => {
      const branch = 'feature/test-api-qa';
      await simulateSuccessfulBuild(branch);

      const response = await fetch(`${baseURL}/api/sdlc/qa/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: branch,
          passed: true,
          tester: 'api_tester',
          notes: 'All tests passed via API',
          screenshots: ['api_screenshot.png']
        })
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);

      // Verify QA step was updated
      await new Promise(resolve => setTimeout(resolve, 100));
      const steps = gizmoAgent.getPhaseSteps(branch);
      const qaStep = steps.find(s => s.step === 'QA');
      expect(qaStep?.status).toBe('completed');
    });

    test('should get orchestrator status via API', async () => {
      const response = await fetch(`${baseURL}/api/sdlc/orchestrator/status`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('active');
      expect(data.data).toHaveProperty('gizmo_status');
    });
  });

  describe('Memory Plugin Integration', () => {
    test('should create memory anchor after successful QA', async () => {
      const branch = 'feature/test-memory-anchor';
      
      // Complete full workflow
      await simulateFullWorkflow(branch);

      // Wait for memory anchor creation
      await new Promise(resolve => setTimeout(resolve, 500));

      const steps = gizmoAgent.getPhaseSteps(branch);
      const memoryStep = steps.find(s => s.step === 'Memory');

      expect(memoryStep).toBeDefined();
      expect(memoryStep.status).toBe('completed');
      expect(memoryStep.memory_anchor).toBeDefined();
      expect(memoryStep.memory_anchor.status).toBe('created');
    });

    test('should not create memory anchor on QA failure', async () => {
      const branch = 'feature/test-no-memory-anchor';
      
      // Complete build but fail QA
      await simulateSuccessfulBuild(branch);
      
      gizmoAgent.emit({
        type: 'qa_completed',
        branch: branch,
        timestamp: new Date().toISOString(),
        metadata: { user_id: 'qa_user' },
        qa_result: false
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const steps = gizmoAgent.getPhaseSteps(branch);
      const memorySteps = steps.filter(s => s.step === 'Memory');

      expect(memorySteps).toHaveLength(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid branch names gracefully', async () => {
      const invalidBranch = '';
      
      const validation = await gizmoAgent.validateMergeReadiness(invalidBranch);
      expect(validation.allowed).toBe(false);
      expect(validation.blocking_reasons).toContain('Debug step not completed');
    });

    test('should handle duplicate events gracefully', async () => {
      const branch = 'feature/test-duplicate-events';
      const event = {
        type: 'branch_created',
        branch: branch,
        timestamp: new Date().toISOString(),
        metadata: { user_id: 'test_user' }
      };

      // Emit same event twice
      gizmoAgent.emit(event);
      gizmoAgent.emit(event);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should only have one debug step
      const steps = gizmoAgent.getPhaseSteps(branch);
      const debugSteps = steps.filter(s => s.step === 'Debug');
      expect(debugSteps).toHaveLength(1);
    });

    test('should handle missing metadata gracefully', async () => {
      const branch = 'feature/test-missing-metadata';
      const event = {
        type: 'branch_created',
        branch: branch,
        timestamp: new Date().toISOString(),
        metadata: {} // Empty metadata
      };

      expect(() => gizmoAgent.emit(event)).not.toThrow();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const steps = gizmoAgent.getPhaseSteps(branch);
      expect(steps).toHaveLength(1);
    });
  });

  // Helper functions
  async function simulateSuccessfulBuild(branch) {
    gizmoAgent.emit({
      type: 'branch_created',
      branch: branch,
      timestamp: new Date().toISOString(),
      metadata: { user_id: 'test_user' }
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    gizmoAgent.emit({
      type: 'build_completed',
      branch: branch,
      timestamp: new Date().toISOString(),
      metadata: { build_id: 'build_test' },
      ci_status: 'success'
    });

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async function simulateFullWorkflow(branch) {
    // Create branch and complete build
    await simulateSuccessfulBuild(branch);

    // Complete QA
    gizmoAgent.emit({
      type: 'qa_completed',
      branch: branch,
      timestamp: new Date().toISOString(),
      metadata: {
        user_id: 'qa_user',
        screenshots: ['test_screenshot.png'],
        test_results: { passed: 10, failed: 0 }
      },
      qa_result: true
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    // Add governance entry manually (simulating governance step completion)
    const steps = gizmoAgent.getPhaseSteps(branch);
    const govStep = steps.find(s => s.step === 'Governance');
    if (govStep) {
      await gizmoAgent.updatePhaseStep(govStep.id, {
        status: 'completed',
        governance_entry: {
          log_id: 'gov_test_123',
          entry_timestamp: new Date().toISOString(),
          summary: 'Test governance entry'
        }
      });
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }
});