/**
 * Unit Tests for Link Integrity Service
 * OF-9.5.2: Link Integrity Detection and Repair
 */

import { linkIntegrityService, LinkIntegrityIssue, RepairRequest } from '../../src/services/automation/linkIntegrityService';
import { governanceLogsService, GovernanceLog } from '../../src/services/governanceLogsService';
import { semanticSearchService } from '../../src/services/automation/semanticSearchService';

// Mock dependencies
jest.mock('../../src/services/governanceLogsService');
jest.mock('../../src/services/automation/semanticSearchService');
jest.mock('../../src/services/automation/logClassifierService');

describe('LinkIntegrityService', () => {
  let service: typeof linkIntegrityService;
  
  const mockGovernanceLogs: GovernanceLog[] = [
    {
      id: 'log-1',
      ts: '2025-08-08T12:00:00Z',
      timestamp: '2025-08-08T12:00:00Z',
      actor: 'test-user',
      entryType: 'Decision',
      classification: 'governance',
      summary: 'Test governance decision',
      related_phase: 'OF-9.5',
      related_step: 'OF-9.5.2',
      linked_anchor: 'OF-GOVLOG-LINK-INTEGRITY',
      created_by: 'test-user',
      created_at: '2025-08-08T12:00:00Z',
      updated_at: '2025-08-08T12:00:00Z',
      is_archived: false
    },
    {
      id: 'log-2',
      ts: '2025-08-08T12:01:00Z',
      timestamp: '2025-08-08T12:01:00Z',
      actor: 'test-user',
      entryType: 'Change',
      classification: 'technical',
      summary: 'Invalid phase format test',
      related_phase: 'invalid-phase-123', // Invalid format
      related_step: 'OF-9.5.3', // Mismatched phase
      linked_anchor: 'invalid_anchor_format', // Invalid format
      links: [{ target_id: 'non-existent-log', description: 'Test link' }],
      created_by: 'test-user',
      created_at: '2025-08-08T12:01:00Z',
      updated_at: '2025-08-08T12:01:00Z',
      is_archived: false
    },
    {
      id: 'log-3',
      ts: '2025-08-08T12:02:00Z',
      timestamp: '2025-08-08T12:02:00Z',
      actor: 'test-user',
      entryType: 'Review',
      classification: 'process',
      summary: 'Orphaned phase test',
      related_phase: 'OF-1.0', // Potentially orphaned
      created_by: 'test-user',
      created_at: '2025-08-08T12:02:00Z',
      updated_at: '2025-08-08T12:02:00Z',
      is_archived: false
    }
  ];

  beforeEach(() => {
    service = linkIntegrityService;
    jest.clearAllMocks();
    
    // Mock governanceLogsService
    (governanceLogsService.listGovernanceLogs as jest.Mock).mockResolvedValue({
      data: mockGovernanceLogs,
      total: mockGovernanceLogs.length
    });
    
    (governanceLogsService.getGovernanceLog as jest.Mock).mockImplementation((id: string) => {
      return Promise.resolve(mockGovernanceLogs.find(log => log.id === id) || null);
    });
    
    (governanceLogsService.updateGovernanceLog as jest.Mock).mockImplementation((id: string, data: any) => {
      const log = mockGovernanceLogs.find(l => l.id === id);
      if (log) {
        return Promise.resolve({ ...log, ...data });
      }
      return Promise.resolve(null);
    });
    
    (governanceLogsService.createGovernanceLog as jest.Mock).mockResolvedValue({
      id: 'audit-log-1',
      ts: new Date().toISOString(),
      entryType: 'System',
      summary: 'Audit log'
    });
    
    // Mock semanticSearchService
    (semanticSearchService.searchLogs as jest.Mock).mockResolvedValue([
      {
        log: mockGovernanceLogs[0],
        relevanceScore: 0.85,
        context: 'Mock semantic search result'
      }
    ]);
  });

  describe('Integrity Scanning', () => {
    it('should perform complete integrity scan', async () => {
      const report = await service.performIntegrityScan();
      
      expect(report).toBeDefined();
      expect(report.totalIssues).toBeGreaterThan(0);
      expect(report.scannedLogs).toBe(3);
      expect(report.lastScan).toBeDefined();
      expect(report.scanDuration).toBeGreaterThan(0);
      
      // Verify issue categories
      expect(report.criticalIssues + report.warningIssues + report.infoIssues).toBe(report.totalIssues);
    });

    it('should detect invalid phase format', async () => {
      const report = await service.performIntegrityScan();
      
      const phaseIssue = report.issues.find(issue => 
        issue.issueType === 'phase' && issue.currentValue === 'invalid-phase-123'
      );
      
      expect(phaseIssue).toBeDefined();
      expect(phaseIssue?.severity).toBe('warning');
      expect(phaseIssue?.description).toContain('Invalid phase ID format');
    });

    it('should detect step-phase mismatch', async () => {
      const report = await service.performIntegrityScan();
      
      const stepIssue = report.issues.find(issue => 
        issue.issueType === 'step' && issue.field === 'related_step'
      );
      
      expect(stepIssue).toBeDefined();
      expect(stepIssue?.severity).toBe('critical');
      expect(stepIssue?.description).toContain('does not belong to phase');
    });

    it('should detect invalid anchor format', async () => {
      const report = await service.performIntegrityScan();
      
      const anchorIssue = report.issues.find(issue => 
        issue.issueType === 'anchor' && issue.currentValue === 'invalid_anchor_format'
      );
      
      expect(anchorIssue).toBeDefined();
      expect(anchorIssue?.severity).toBe('info');
      expect(anchorIssue?.description).toContain('Unusual anchor ID format');
    });

    it('should detect missing governance log links', async () => {
      // Mock getGovernanceLog to return null for non-existent log
      (governanceLogsService.getGovernanceLog as jest.Mock).mockImplementation((id: string) => {
        if (id === 'non-existent-log') return Promise.resolve(null);
        return Promise.resolve(mockGovernanceLogs.find(log => log.id === id) || null);
      });
      
      const report = await service.performIntegrityScan();
      
      const linkIssue = report.issues.find(issue => 
        issue.issueType === 'governance_log' && issue.currentValue === 'non-existent-log'
      );
      
      expect(linkIssue).toBeDefined();
      expect(linkIssue?.severity).toBe('critical');
      expect(linkIssue?.description).toContain('not found');
    });

    it('should generate repair suggestions', async () => {
      const report = await service.performIntegrityScan();
      
      const issuesWithSuggestions = report.issues.filter(issue => 
        issue.suggestions && issue.suggestions.length > 0
      );
      
      expect(issuesWithSuggestions.length).toBeGreaterThan(0);
      
      // Check suggestion structure
      const suggestion = issuesWithSuggestions[0].suggestions?.[0];
      expect(suggestion).toMatchObject({
        value: expect.any(String),
        confidence: expect.any(Number),
        reasoning: expect.any(String),
        source: expect.stringMatching(/^(exact_match|semantic_match|pattern_match|manual)$/)
      });
    });
  });

  describe('Repair Functionality', () => {
    let testReport: any;
    let testIssue: LinkIntegrityIssue;

    beforeEach(async () => {
      testReport = await service.performIntegrityScan();
      testIssue = testReport.issues.find((issue: LinkIntegrityIssue) => issue.field === 'related_phase') || testReport.issues[0];
    });

    it('should successfully apply phase repair', async () => {
      const repairRequest: RepairRequest = {
        issueId: testIssue.id,
        newValue: 'OF-9.5',
        repairSource: 'manual',
        userReason: 'Correcting phase format'
      };

      const result = await service.applyRepair(repairRequest);
      
      expect(result.success).toBe(true);
      expect(result.issueId).toBe(testIssue.id);
      expect(result.newValue).toBe('OF-9.5');
      expect(result.timestamp).toBeDefined();
      
      // Verify update was called
      expect(governanceLogsService.updateGovernanceLog).toHaveBeenCalledWith(
        testIssue.logId,
        { related_phase: 'OF-9.5' }
      );
      
      // Verify audit log was created
      expect(governanceLogsService.createGovernanceLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entryType: 'System',
          summary: expect.stringContaining('Link integrity repair'),
          linked_anchor: 'OF-GOVLOG-LINK-INTEGRITY'
        })
      );
    });

    it('should handle repair of non-existent issue', async () => {
      const repairRequest: RepairRequest = {
        issueId: 'non-existent-issue',
        newValue: 'OF-9.5',
        repairSource: 'manual'
      };

      const result = await service.applyRepair(repairRequest);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Issue not found');
    });

    it('should handle repair when log is not found', async () => {
      // Create a test issue for non-existent log
      testIssue.logId = 'non-existent-log';
      
      (governanceLogsService.getGovernanceLog as jest.Mock).mockImplementation((id: string) => {
        if (id === 'non-existent-log') return Promise.resolve(null);
        return Promise.resolve(mockGovernanceLogs.find(log => log.id === id));
      });

      const repairRequest: RepairRequest = {
        issueId: testIssue.id,
        newValue: 'OF-9.5',
        repairSource: 'auto'
      };

      const result = await service.applyRepair(repairRequest);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Governance log not found');
    });

    it('should handle different field types for repair', async () => {
      const fieldTests = [
        { field: 'related_step', value: 'OF-9.5.1' },
        { field: 'linked_anchor', value: 'OF-GOVLOG-TEST' },
        { field: 'memory_anchor_id', value: 'TEST-ANCHOR' }
      ];

      for (const test of fieldTests) {
        const testIssueForField = { 
          ...testIssue, 
          field: test.field as any,
          id: `test-${test.field}`
        };
        
        // Mock the report to include this issue
        service.getLastReport()?.issues.push(testIssueForField);

        const repairRequest: RepairRequest = {
          issueId: testIssueForField.id,
          newValue: test.value,
          repairSource: 'auto'
        };

        const result = await service.applyRepair(repairRequest);
        
        expect(result.success).toBe(true);
        expect(governanceLogsService.updateGovernanceLog).toHaveBeenCalledWith(
          testIssueForField.logId,
          { [test.field]: test.value }
        );
      }
    });

    it('should reject unsupported field types', async () => {
      const unsupportedIssue = {
        ...testIssue,
        field: 'unsupported_field' as any,
        id: 'unsupported-test'
      };
      
      service.getLastReport()?.issues.push(unsupportedIssue);

      const repairRequest: RepairRequest = {
        issueId: unsupportedIssue.id,
        newValue: 'test-value',
        repairSource: 'manual'
      };

      const result = await service.applyRepair(repairRequest);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unsupported field');
    });
  });

  describe('Log Integrity Summary', () => {
    it('should return integrity summary for specific log', async () => {
      await service.performIntegrityScan();
      
      const summary = await service.getLogIntegritySummary('log-2');
      
      expect(summary.issueCount).toBeGreaterThan(0);
      expect(['none', 'info', 'warning', 'critical']).toContain(summary.severity);
    });

    it('should return no issues for clean log', async () => {
      await service.performIntegrityScan();
      
      const summary = await service.getLogIntegritySummary('log-1');
      
      expect(summary.issueCount).toBe(0);
      expect(summary.severity).toBe('none');
    });

    it('should handle non-existent log ID', async () => {
      await service.performIntegrityScan();
      
      const summary = await service.getLogIntegritySummary('non-existent');
      
      expect(summary.issueCount).toBe(0);
      expect(summary.severity).toBe('none');
    });
  });

  describe('Validation Helpers', () => {
    it('should validate phase ID patterns', async () => {
      const report = await service.performIntegrityScan();
      
      // Valid phase should not create issues
      const validPhaseIssues = report.issues.filter(issue => 
        issue.issueType === 'phase' && issue.currentValue === 'OF-9.5'
      );
      expect(validPhaseIssues).toHaveLength(0);
      
      // Invalid phase should create issues
      const invalidPhaseIssues = report.issues.filter(issue => 
        issue.issueType === 'phase' && issue.currentValue === 'invalid-phase-123'
      );
      expect(invalidPhaseIssues.length).toBeGreaterThan(0);
    });

    it('should validate step ID patterns', async () => {
      const report = await service.performIntegrityScan();
      
      // Step without proper parent phase should create critical issue
      const stepIssues = report.issues.filter(issue => 
        issue.issueType === 'step' && issue.severity === 'critical'
      );
      expect(stepIssues.length).toBeGreaterThan(0);
    });

    it('should validate anchor ID patterns', async () => {
      const report = await service.performIntegrityScan();
      
      // Invalid anchor format should create info issue
      const anchorIssues = report.issues.filter(issue => 
        issue.issueType === 'anchor' && issue.currentValue === 'invalid_anchor_format'
      );
      expect(anchorIssues.length).toBeGreaterThan(0);
      expect(anchorIssues[0].severity).toBe('info');
    });
  });

  describe('Suggestion Generation', () => {
    it('should generate phase correction suggestions', async () => {
      const report = await service.performIntegrityScan();
      
      const phaseIssue = report.issues.find(issue => 
        issue.issueType === 'phase' && issue.currentValue.startsWith('of-')
      );
      
      if (phaseIssue?.suggestions) {
        const patternSuggestion = phaseIssue.suggestions.find(s => s.source === 'pattern_match');
        expect(patternSuggestion).toBeDefined();
        expect(patternSuggestion?.value.startsWith('OF-')).toBe(true);
      }
    });

    it('should generate semantic search suggestions', async () => {
      const report = await service.performIntegrityScan();
      
      const issuesWithSemanticSuggestions = report.issues.filter(issue => 
        issue.suggestions?.some(s => s.source === 'semantic_match')
      );
      
      expect(issuesWithSemanticSuggestions.length).toBeGreaterThan(0);
      
      // Verify semantic search was called
      expect(semanticSearchService.searchLogs).toHaveBeenCalled();
    });

    it('should limit suggestions to maximum of 5', async () => {
      const report = await service.performIntegrityScan();
      
      report.issues.forEach(issue => {
        if (issue.suggestions) {
          expect(issue.suggestions.length).toBeLessThanOrEqual(5);
        }
      });
    });

    it('should sort suggestions by confidence', async () => {
      const report = await service.performIntegrityScan();
      
      const issueWithSuggestions = report.issues.find(issue => 
        issue.suggestions && issue.suggestions.length > 1
      );
      
      if (issueWithSuggestions?.suggestions) {
        for (let i = 1; i < issueWithSuggestions.suggestions.length; i++) {
          expect(issueWithSuggestions.suggestions[i-1].confidence)
            .toBeGreaterThanOrEqual(issueWithSuggestions.suggestions[i].confidence);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization errors gracefully', async () => {
      (semanticSearchService.init as jest.Mock).mockRejectedValue(new Error('Init failed'));
      
      const newService = linkIntegrityService;
      await expect(newService.performIntegrityScan()).rejects.toThrow();
    });

    it('should handle governance logs service errors', async () => {
      (governanceLogsService.listGovernanceLogs as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(service.performIntegrityScan()).rejects.toThrow('Integrity scan failed');
    });

    it('should handle semantic search errors in suggestions', async () => {
      (semanticSearchService.searchLogs as jest.Mock).mockRejectedValue(new Error('Search failed'));
      
      // Should still complete scan but without semantic suggestions
      const report = await service.performIntegrityScan();
      expect(report).toBeDefined();
      expect(report.totalIssues).toBeGreaterThanOrEqual(0);
    });

    it('should handle repair errors gracefully', async () => {
      (governanceLogsService.updateGovernanceLog as jest.Mock).mockRejectedValue(new Error('Update failed'));
      
      await service.performIntegrityScan();
      const issue = service.getLastReport()?.issues[0];
      
      if (issue) {
        const repairRequest: RepairRequest = {
          issueId: issue.id,
          newValue: 'test-value',
          repairSource: 'manual'
        };

        const result = await service.applyRepair(repairRequest);
        
        expect(result.success).toBe(false);
        expect(result.message).toContain('Repair failed');
      }
    });
  });

  describe('Report Management', () => {
    it('should store and retrieve last report', async () => {
      const report1 = await service.performIntegrityScan();
      const storedReport = service.getLastReport();
      
      expect(storedReport).toEqual(report1);
      expect(storedReport?.lastScan).toBeDefined();
    });

    it('should return null when no report exists', () => {
      // Create fresh instance
      const freshService = linkIntegrityService;
      (freshService as any).lastReport = null;
      
      const report = freshService.getLastReport();
      expect(report).toBeNull();
    });

    it('should update report after new scan', async () => {
      const report1 = await service.performIntegrityScan();
      const timestamp1 = report1.lastScan;
      
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const report2 = await service.performIntegrityScan();
      const timestamp2 = report2.lastScan;
      
      expect(timestamp2).not.toBe(timestamp1);
      expect(service.getLastReport()?.lastScan).toBe(timestamp2);
    });
  });
});