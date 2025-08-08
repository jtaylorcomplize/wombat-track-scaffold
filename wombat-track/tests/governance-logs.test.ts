/**
 * Enhanced Governance Logs Service Tests
 * Unit tests for governance logs functionality
 */

import { governanceLogsService, GovernanceLog, CreateGovernanceLogRequest } from '../src/services/governanceLogsService';

describe('GovernanceLogsService', () => {
  beforeAll(async () => {
    await governanceLogsService.init();
  });

  beforeEach(async () => {
    // Clean up any existing test data
    const db = await governanceLogsService.init();
    await db.run("DELETE FROM enhanced_log_links WHERE source_log LIKE 'test-%'");
    await db.run("DELETE FROM enhanced_governance_logs WHERE id LIKE 'test-%'");
  });

  describe('createGovernanceLog', () => {
    it('should create a governance log successfully', async () => {
      const logData: CreateGovernanceLogRequest = {
        entryType: 'Decision',
        summary: 'Test decision governance log entry',
        gptDraftEntry: 'This is a test decision entry with detailed information',
        classification: 'architectural',
        related_phase: 'OF-9.2',
        created_by: 'test-user'
      };

      const createdLog = await governanceLogsService.createGovernanceLog(logData);

      expect(createdLog).toBeDefined();
      expect(createdLog.id).toMatch(/^govlog-/);
      expect(createdLog.entryType).toBe('Decision');
      expect(createdLog.summary).toBe('Test decision governance log entry');
      expect(createdLog.classification).toBe('architectural');
      expect(createdLog.related_phase).toBe('OF-9.2');
      expect(createdLog.created_by).toBe('test-user');
      expect(createdLog.timestamp).toBeDefined();
      expect(new Date(createdLog.timestamp)).toBeInstanceOf(Date);
    });

    it('should create a governance log with links', async () => {
      const logData: CreateGovernanceLogRequest = {
        entryType: 'Change',
        summary: 'Test change with links',
        created_by: 'test-user',
        links: [
          { target_id: 'test-target-1', link_type: 'reference' },
          { target_id: 'test-target-2', link_type: 'dependency' }
        ]
      };

      const createdLog = await governanceLogsService.createGovernanceLog(logData);

      expect(createdLog).toBeDefined();
      expect(createdLog.links).toHaveLength(2);
      expect(createdLog.links?.[0].target_id).toBe('test-target-1');
      expect(createdLog.links?.[0].link_type).toBe('reference');
      expect(createdLog.links?.[1].target_id).toBe('test-target-2');
      expect(createdLog.links?.[1].link_type).toBe('dependency');
    });

    it('should default created_by to system when not provided', async () => {
      const logData: CreateGovernanceLogRequest = {
        entryType: 'Review',
        summary: 'Test review entry'
      };

      const createdLog = await governanceLogsService.createGovernanceLog(logData);

      expect(createdLog.created_by).toBe('system');
    });
  });

  describe('getGovernanceLog', () => {
    it('should retrieve a governance log by id', async () => {
      const logData: CreateGovernanceLogRequest = {
        entryType: 'Architecture',
        summary: 'Test architecture decision',
        created_by: 'test-user'
      };

      const createdLog = await governanceLogsService.createGovernanceLog(logData);
      const retrievedLog = await governanceLogsService.getGovernanceLog(createdLog.id);

      expect(retrievedLog).toBeDefined();
      expect(retrievedLog?.id).toBe(createdLog.id);
      expect(retrievedLog?.entryType).toBe('Architecture');
      expect(retrievedLog?.summary).toBe('Test architecture decision');
    });

    it('should return null for non-existent id', async () => {
      const retrievedLog = await governanceLogsService.getGovernanceLog('non-existent-id');
      expect(retrievedLog).toBeNull();
    });
  });

  describe('updateGovernanceLog', () => {
    it('should update a governance log successfully', async () => {
      const logData: CreateGovernanceLogRequest = {
        entryType: 'Process',
        summary: 'Original summary',
        classification: 'operational',
        created_by: 'test-user'
      };

      const createdLog = await governanceLogsService.createGovernanceLog(logData);
      
      const updateData = {
        summary: 'Updated summary',
        classification: 'strategic',
        gptDraftEntry: 'Added detailed entry'
      };

      const updatedLog = await governanceLogsService.updateGovernanceLog(createdLog.id, updateData);

      expect(updatedLog).toBeDefined();
      expect(updatedLog?.summary).toBe('Updated summary');
      expect(updatedLog?.classification).toBe('strategic');
      expect(updatedLog?.gptDraftEntry).toBe('Added detailed entry');
      expect(updatedLog?.entryType).toBe('Process'); // Should remain unchanged
      expect(updatedLog?.updated_at).not.toBe(updatedLog?.timestamp); // Should be updated
    });

    it('should return null when updating non-existent log', async () => {
      const updateData = { summary: 'Updated summary' };
      const updatedLog = await governanceLogsService.updateGovernanceLog('non-existent-id', updateData);
      expect(updatedLog).toBeNull();
    });
  });

  describe('archiveGovernanceLog', () => {
    it('should archive a governance log successfully', async () => {
      const logData: CreateGovernanceLogRequest = {
        entryType: 'Risk',
        summary: 'Test risk entry',
        created_by: 'test-user'
      };

      const createdLog = await governanceLogsService.createGovernanceLog(logData);
      const archived = await governanceLogsService.archiveGovernanceLog(createdLog.id);

      expect(archived).toBe(true);

      // Verify it's marked as archived
      const archivedLog = await governanceLogsService.getGovernanceLog(createdLog.id);
      expect(archivedLog?.classification).toBe('archived');
    });

    it('should return false when archiving non-existent log', async () => {
      const archived = await governanceLogsService.archiveGovernanceLog('non-existent-id');
      expect(archived).toBe(false);
    });
  });

  describe('listGovernanceLogs', () => {
    beforeEach(async () => {
      // Create test data
      const testLogs = [
        {
          entryType: 'Decision' as const,
          summary: 'First decision',
          classification: 'architectural',
          related_phase: 'OF-9.2',
          created_by: 'user1'
        },
        {
          entryType: 'Change' as const,
          summary: 'Second change',
          classification: 'operational',
          related_phase: 'OF-9.3',
          created_by: 'user2'
        },
        {
          entryType: 'Review' as const,
          summary: 'Third review',
          classification: 'strategic',
          related_phase: 'OF-9.2',
          created_by: 'user1'
        }
      ];

      for (const logData of testLogs) {
        await governanceLogsService.createGovernanceLog(logData);
      }
    });

    it('should list all governance logs with pagination', async () => {
      const result = await governanceLogsService.listGovernanceLogs({
        page: 1,
        page_size: 10
      });

      expect(result.data).toHaveLength(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total_items).toBe(3);
      expect(result.pagination.total_pages).toBe(1);
      expect(result.pagination.has_next).toBe(false);
      expect(result.pagination.has_previous).toBe(false);
    });

    it('should filter by phase_id', async () => {
      const result = await governanceLogsService.listGovernanceLogs({
        phase_id: 'OF-9.2'
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.every(log => log.related_phase === 'OF-9.2')).toBe(true);
    });

    it('should filter by entryType', async () => {
      const result = await governanceLogsService.listGovernanceLogs({
        entryType: 'Decision'
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].entryType).toBe('Decision');
      expect(result.data[0].summary).toBe('First decision');
    });

    it('should perform text search', async () => {
      const result = await governanceLogsService.listGovernanceLogs({
        q: 'decision'
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].summary).toBe('First decision');
    });

    it('should handle pagination correctly', async () => {
      const page1 = await governanceLogsService.listGovernanceLogs({
        page: 1,
        page_size: 2
      });

      expect(page1.data).toHaveLength(2);
      expect(page1.pagination.has_next).toBe(true);
      expect(page1.pagination.has_previous).toBe(false);

      const page2 = await governanceLogsService.listGovernanceLogs({
        page: 2,
        page_size: 2
      });

      expect(page2.data).toHaveLength(1);
      expect(page2.pagination.has_next).toBe(false);
      expect(page2.pagination.has_previous).toBe(true);
    });
  });

  describe('searchGovernanceLogs', () => {
    beforeEach(async () => {
      const testLogs = [
        {
          entryType: 'Architecture' as const,
          summary: 'Database design decisions',
          gptDraftEntry: 'Detailed analysis of database schema choices',
          classification: 'technical',
          created_by: 'architect'
        },
        {
          entryType: 'Security' as const,
          summary: 'Authentication implementation',
          gptDraftEntry: 'Security measures for user authentication',
          classification: 'security',
          created_by: 'security-team'
        }
      ];

      for (const logData of testLogs) {
        await governanceLogsService.createGovernanceLog(logData);
      }
    });

    it('should search governance logs by summary', async () => {
      const results = await governanceLogsService.searchGovernanceLogs('database');
      
      expect(results).toHaveLength(1);
      expect(results[0].summary).toBe('Database design decisions');
    });

    it('should search governance logs by gptDraftEntry', async () => {
      const results = await governanceLogsService.searchGovernanceLogs('authentication');
      
      expect(results).toHaveLength(1);
      expect(results[0].summary).toBe('Authentication implementation');
    });

    it('should limit results correctly', async () => {
      const results = await governanceLogsService.searchGovernanceLogs('design', 1);
      expect(results).toHaveLength(1);
    });
  });

  describe('getLinkedLogs', () => {
    it('should retrieve logs linked to a specific target', async () => {
      const logData1: CreateGovernanceLogRequest = {
        entryType: 'Decision',
        summary: 'First linked log',
        created_by: 'test-user',
        links: [{ target_id: 'test-target', link_type: 'reference' }]
      };

      const logData2: CreateGovernanceLogRequest = {
        entryType: 'Change',
        summary: 'Second linked log',
        created_by: 'test-user',
        links: [{ target_id: 'test-target', link_type: 'impact' }]
      };

      await governanceLogsService.createGovernanceLog(logData1);
      await governanceLogsService.createGovernanceLog(logData2);

      const linkedLogs = await governanceLogsService.getLinkedLogs('test-target');

      expect(linkedLogs).toHaveLength(2);
      expect(linkedLogs.some(log => log.summary === 'First linked log')).toBe(true);
      expect(linkedLogs.some(log => log.summary === 'Second linked log')).toBe(true);
    });

    it('should return empty array when no logs are linked', async () => {
      const linkedLogs = await governanceLogsService.getLinkedLogs('non-existent-target');
      expect(linkedLogs).toHaveLength(0);
    });
  });
});

// Mock data cleanup
afterAll(async () => {
  const db = await governanceLogsService.init();
  await db.run("DELETE FROM enhanced_log_links WHERE source_log LIKE 'test-%'");
  await db.run("DELETE FROM enhanced_governance_logs WHERE id LIKE 'test-%'");
});