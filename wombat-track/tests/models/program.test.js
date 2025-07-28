import { describe, it, expect } from '@jest/globals';
import { mockPrograms } from '../../src/data/mockPrograms.js';
import { mockProjects } from '../../src/data/mockProjects.js';

describe('Program Model Tests', () => {
  describe('Program Schema Validation', () => {
    it('should have all required Program fields', () => {
      const program = mockPrograms[0]; // Orbis
      
      expect(program).toHaveProperty('id');
      expect(program).toHaveProperty('name');
      expect(program).toHaveProperty('description');
      expect(program).toHaveProperty('status');
      expect(program).toHaveProperty('programType');
      expect(program).toHaveProperty('usesOrbisEngine');
      expect(program).toHaveProperty('orbisDependencyLevel');
      expect(program).toHaveProperty('platformIntegration');
      
      expect(typeof program.id).toBe('string');
      expect(typeof program.name).toBe('string');
      expect(typeof program.description).toBe('string');
      expect(typeof program.usesOrbisEngine).toBe('boolean');
      expect(Array.isArray(program.platformIntegration)).toBe(true);
    });

    it('should validate status enum values', () => {
      const validStatuses = ['Planning', 'Active', 'Paused', 'Retired'];
      
      mockPrograms.forEach(program => {
        expect(validStatuses).toContain(program.status);
      });
    });

    it('should validate programType enum values', () => {
      const validTypes = ['Core', 'Sub-App', 'External', 'White Label'];
      
      mockPrograms.forEach(program => {
        expect(validTypes).toContain(program.programType);
      });
    });

    it('should validate orbisDependencyLevel enum values', () => {
      const validLevels = ['None', 'Partial', 'Full'];
      
      mockPrograms.forEach(program => {
        expect(validLevels).toContain(program.orbisDependencyLevel);
      });
    });
  });

  describe('Program-Project Relationships', () => {
    it('should have valid project linkages', () => {
      const orbisProgram = mockPrograms.find(p => p.name === 'Orbis');
      const complizeProgram = mockPrograms.find(p => p.name === 'Complize');
      
      expect(orbisProgram.linkedProjects).toContain('proj-001');
      expect(orbisProgram.linkedProjects).toContain('proj-002');
      expect(complizeProgram.linkedProjects).toContain('proj-003');
    });

    it('should have projects correctly linked to programs', () => {
      const orbisProjects = mockProjects.filter(p => p.linkedProgramId === 'prog-orbis-001');
      const complizeProjects = mockProjects.filter(p => p.linkedProgramId === 'prog-complize-001');
      
      expect(orbisProjects).toHaveLength(2);
      expect(complizeProjects).toHaveLength(1);
      
      expect(orbisProjects[0].title).toBe('Orbis Core Infrastructure');
      expect(complizeProjects[0].title).toBe('Complize Case Management');
    });
  });

  describe('Mock Data Integrity', () => {
    it('should have exactly 3 sample programs', () => {
      expect(mockPrograms).toHaveLength(3);
    });

    it('should include Orbis, Complize, and MetaPlatform', () => {
      const programNames = mockPrograms.map(p => p.name);
      
      expect(programNames).toContain('Orbis');
      expect(programNames).toContain('Complize');
      expect(programNames).toContain('MetaPlatform');
    });

    it('should have Orbis as Core program type', () => {
      const orbis = mockPrograms.find(p => p.name === 'Orbis');
      
      expect(orbis.programType).toBe('Core');
      expect(orbis.status).toBe('Active');
      expect(orbis.usesOrbisEngine).toBe(true);
      expect(orbis.orbisDependencyLevel).toBe('Full');
    });

    it('should have Sub-Apps correctly configured', () => {
      const subApps = mockPrograms.filter(p => p.programType === 'Sub-App');
      
      expect(subApps).toHaveLength(2);
      
      subApps.forEach(subApp => {
        expect(subApp.usesOrbisEngine).toBe(true);
        expect(subApp.orbisDependencyLevel).toBe('Full');
        expect(subApp.platformIntegration).toContain('Claude');
      });
    });
  });
});