/**
 * WT Database Audit - Comprehensive Project Completeness Analysis
 * 
 * This script analyzes all 92 projects in the WT database to create completeness scores
 * and identify the top 20-30 most canonical projects for ongoing development.
 */

import * as fs from 'fs';
import * as path from 'path';

interface Project {
  projectName: string;
  projectId: string;
  owner: string;
  status: string;
}

interface Phase {
  phasename: string;
  phaseid: string;
  wtProjects: string;
  status: string;
  notes: string;
  startDate: string;
  endDate: string;
  rag: string;
}

interface GovernanceEntry {
  timestamp: string;
  event_type: string;
  user_id: string;
  resource_type: string;
  resource_id: string;
  action: string;
  success: boolean;
  details: any;
}

interface ProjectCompleteness {
  project: Project;
  phases: Phase[];
  governanceEntries: GovernanceEntry[];
  completenessScore: number;
  rankings: {
    hasPhases: boolean;
    hasActivePhases: boolean;
    hasOwner: boolean;
    hasGovernanceLogs: boolean;
    hasCompletedStatus: boolean;
    hasPlanningEvidence: boolean;
    hasRAGStatus: boolean;
    dataQuality: number; // 0-1 score
    phaseChainIntegrity: number; // 0-1 score
    activityLevel: number; // 0-1 score
  };
  issues: string[];
  recommendations: string[];
}

interface AuditResults {
  totalProjects: number;
  scoredProjects: ProjectCompleteness[];
  canonicalProjects: ProjectCompleteness[];
  orphanedRecords: {
    orphanedPhases: Phase[];
    unreferencedProjects: Project[];
  };
  duplicateCandidates: Project[][];
  archiveCandidates: Project[];
  scoringMethodology: string;
}

class WTDatabaseAuditor {
  private projects: Project[] = [];
  private phases: Phase[] = [];
  private governanceEntries: GovernanceEntry[] = [];

  constructor() {}

  /**
   * Load data from CSV files and governance logs
   */
  async loadData(): Promise<void> {
    console.log('Loading WT database data...');
    
    // Load projects
    const projectsPath = path.join(process.cwd(), 'cleaned-projects-snapshot.csv');
    const projectsData = fs.readFileSync(projectsPath, 'utf-8');
    this.projects = this.parseProjectsCSV(projectsData);
    
    // Load phases
    const phasesPath = path.join(process.cwd(), 'cleaned-phases-snapshot.csv');
    const phasesData = fs.readFileSync(phasesPath, 'utf-8');
    this.phases = this.parsePhasesCSV(phasesData);
    
    // Load governance logs
    const governancePath = path.join(process.cwd(), 'logs', 'governance.jsonl');
    const governanceData = fs.readFileSync(governancePath, 'utf-8');
    this.governanceEntries = this.parseGovernanceJSONL(governanceData);
    
    console.log(`Loaded ${this.projects.length} projects, ${this.phases.length} phases, ${this.governanceEntries.length} governance entries`);
  }

  /**
   * Parse projects CSV data
   */
  private parseProjectsCSV(data: string): Project[] {
    const lines = data.split('\n').slice(1); // Skip header
    const projects: Project[] = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Handle CSV parsing with quoted fields containing commas
      const fields = this.parseCSVLine(line);
      if (fields.length >= 4) {
        projects.push({
          projectName: fields[0],
          projectId: fields[1],
          owner: fields[2],
          status: fields[3]
        });
      }
    }
    
    return projects;
  }

  /**
   * Parse phases CSV data
   */
  private parsePhasesCSV(data: string): Phase[] {
    const lines = data.split('\n').slice(1); // Skip header
    const phases: Phase[] = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const fields = this.parseCSVLine(line);
      if (fields.length >= 8) {
        phases.push({
          phasename: fields[0],
          phaseid: fields[1],
          wtProjects: fields[2],
          status: fields[3],
          notes: fields[4],
          startDate: fields[5],
          endDate: fields[6],
          rag: fields[7]
        });
      }
    }
    
    return phases;
  }

  /**
   * Parse governance JSONL data
   */
  private parseGovernanceJSONL(data: string): GovernanceEntry[] {
    const lines = data.split('\n').filter(line => line.trim());
    const entries: GovernanceEntry[] = [];
    
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        entries.push(entry);
      } catch (error) {
        console.warn('Failed to parse governance entry:', line);
      }
    }
    
    return entries;
  }

  /**
   * Parse CSV line handling quoted fields with commas
   */
  private parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && (i === 0 || line[i-1] === ',')) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    fields.push(current.trim());
    return fields.map(field => field.replace(/^"|"$/g, '')); // Remove surrounding quotes
  }

  /**
   * Calculate completeness score for a project
   */
  private calculateCompleteness(project: Project): ProjectCompleteness {
    // Find related phases
    const relatedPhases = this.phases.filter(phase => 
      phase.wtProjects === project.projectId || 
      phase.wtProjects.includes(project.projectId)
    );

    // Find related governance entries
    const relatedGovernance = this.governanceEntries.filter(entry =>
      entry.resource_id === project.projectId ||
      entry.details?.projectId === project.projectId ||
      JSON.stringify(entry).includes(project.projectId)
    );

    // Calculate individual ranking criteria
    const rankings = {
      hasPhases: relatedPhases.length > 0,
      hasActivePhases: relatedPhases.some(p => p.status === 'Active' || p.status === 'In Progress' || p.status === 'Planned'),
      hasOwner: project.owner && project.owner.trim() !== '',
      hasGovernanceLogs: relatedGovernance.length > 0,
      hasCompletedStatus: project.status === 'Completed',
      hasPlanningEvidence: relatedPhases.some(p => p.notes && p.notes.length > 50),
      hasRAGStatus: relatedPhases.some(p => p.rag && p.rag !== ''),
      dataQuality: this.calculateDataQuality(project, relatedPhases),
      phaseChainIntegrity: this.calculatePhaseChainIntegrity(relatedPhases),
      activityLevel: this.calculateActivityLevel(project, relatedPhases, relatedGovernance)
    };

    // Calculate overall completeness score (0-100)
    const completenessScore = this.calculateOverallScore(rankings);

    // Identify issues and recommendations
    const issues = this.identifyIssues(project, relatedPhases, rankings);
    const recommendations = this.generateRecommendations(project, rankings, issues);

    return {
      project,
      phases: relatedPhases,
      governanceEntries: relatedGovernance,
      completenessScore,
      rankings,
      issues,
      recommendations
    };
  }

  /**
   * Calculate data quality score (0-1)
   */
  private calculateDataQuality(project: Project, phases: Phase[]): number {
    let score = 0;
    let maxScore = 0;

    // Project name quality
    maxScore += 1;
    if (project.projectName && project.projectName.length > 5 && !project.projectName.startsWith('RECON-')) {
      score += 1;
    }

    // Project ID format
    maxScore += 1;
    if (project.projectId && project.projectId.match(/^WT-/)) {
      score += 1;
    }

    // Phase data completeness
    if (phases.length > 0) {
      maxScore += 1;
      const completePhases = phases.filter(p => 
        p.phasename && p.status && (p.startDate || p.endDate)
      );
      score += completePhases.length / phases.length;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Calculate phase chain integrity (0-1)
   */
  private calculatePhaseChainIntegrity(phases: Phase[]): number {
    if (phases.length === 0) return 0;

    let integrityScore = 0;
    const maxScore = phases.length;

    for (const phase of phases) {
      // Check if phase has proper structure
      if (phase.phasename && phase.status) {
        integrityScore += 0.5;
      }
      
      // Check if phase has progression markers
      if (phase.startDate || phase.endDate || phase.rag) {
        integrityScore += 0.5;
      }
    }

    return maxScore > 0 ? integrityScore / maxScore : 0;
  }

  /**
   * Calculate activity level (0-1)
   */
  private calculateActivityLevel(project: Project, phases: Phase[], governance: GovernanceEntry[]): number {
    let activityScore = 0;

    // Recent governance activity
    const recentGovernance = governance.filter(g => {
      const entryDate = new Date(g.timestamp);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return entryDate > thirtyDaysAgo;
    });

    if (recentGovernance.length > 0) activityScore += 0.4;

    // Active or in-progress phases
    const activePhases = phases.filter(p => 
      p.status === 'Active' || p.status === 'In Progress' || p.status === 'Planned'
    );
    if (activePhases.length > 0) activityScore += 0.3;

    // Project has meaningful content (not just placeholder)
    if (project.projectName.length > 20 && !project.projectName.includes('RECON-')) {
      activityScore += 0.3;
    }

    return Math.min(activityScore, 1);
  }

  /**
   * Calculate overall completeness score
   */
  private calculateOverallScore(rankings: ProjectCompleteness['rankings']): number {
    const weights = {
      hasPhases: 15,
      hasActivePhases: 10,
      hasOwner: 10,
      hasGovernanceLogs: 15,
      hasCompletedStatus: 5,
      hasPlanningEvidence: 10,
      hasRAGStatus: 5,
      dataQuality: 20,
      phaseChainIntegrity: 15,
      activityLevel: 15
    };

    let weightedScore = 0;
    let totalWeight = 0;

    for (const [criterion, weight] of Object.entries(weights)) {
      const value = rankings[criterion as keyof typeof rankings];
      const score = typeof value === 'boolean' ? (value ? 1 : 0) : value;
      weightedScore += score * weight;
      totalWeight += weight;
    }

    return Math.round((weightedScore / totalWeight) * 100);
  }

  /**
   * Identify issues with a project
   */
  private identifyIssues(project: Project, phases: Phase[], rankings: ProjectCompleteness['rankings']): string[] {
    const issues: string[] = [];

    if (!rankings.hasPhases) {
      issues.push('No phases defined - project lacks execution structure');
    }

    if (!rankings.hasOwner) {
      issues.push('No owner assigned - unclear accountability');
    }

    if (!rankings.hasGovernanceLogs) {
      issues.push('No governance logs - lacks audit trail');
    }

    if (rankings.dataQuality < 0.5) {
      issues.push('Poor data quality - incomplete or malformed data');
    }

    if (project.projectId.startsWith('RECON-')) {
      issues.push('Legacy RECON ID - may be a migrated or temporary project');
    }

    if (phases.length > 0 && rankings.phaseChainIntegrity < 0.3) {
      issues.push('Broken phase chain - phases lack proper structure or linkage');
    }

    if (rankings.activityLevel < 0.2) {
      issues.push('Low activity - project appears dormant or abandoned');
    }

    return issues;
  }

  /**
   * Generate recommendations for a project
   */
  private generateRecommendations(project: Project, rankings: ProjectCompleteness['rankings'], issues: string[]): string[] {
    const recommendations: string[] = [];

    if (!rankings.hasPhases) {
      recommendations.push('Create phase structure with clear milestones');
    }

    if (!rankings.hasOwner) {
      recommendations.push('Assign project owner for accountability');
    }

    if (!rankings.hasGovernanceLogs) {
      recommendations.push('Establish governance logging for decisions and changes');
    }

    if (rankings.dataQuality < 0.7) {
      recommendations.push('Improve data quality - complete missing fields and standardize format');
    }

    if (project.projectId.startsWith('RECON-')) {
      recommendations.push('Consider migrating to WT- project ID format or archiving if obsolete');
    }

    if (issues.length > 3) {
      recommendations.push('Consider for archive review - high number of issues may indicate low value');
    }

    if (rankings.hasPhases && rankings.hasOwner && rankings.dataQuality > 0.7) {
      recommendations.push('Candidate for canonical project set - well-structured and maintained');
    }

    return recommendations;
  }

  /**
   * Identify orphaned records
   */
  private identifyOrphanedRecords(): AuditResults['orphanedRecords'] {
    const projectIds = new Set(this.projects.map(p => p.projectId));
    
    const orphanedPhases = this.phases.filter(phase => 
      phase.wtProjects && 
      !projectIds.has(phase.wtProjects) &&
      !this.projects.some(p => phase.wtProjects.includes(p.projectId))
    );

    const referencedProjectIds = new Set(this.phases.map(p => p.wtProjects));
    const unreferencedProjects = this.projects.filter(project =>
      !referencedProjectIds.has(project.projectId) &&
      !this.phases.some(p => p.wtProjects.includes(project.projectId))
    );

    return {
      orphanedPhases,
      unreferencedProjects
    };
  }

  /**
   * Identify potential duplicates
   */
  private identifyDuplicates(): Project[][] {
    const duplicates: Project[][] = [];
    const processedProjects = new Set<string>();

    for (const project of this.projects) {
      if (processedProjects.has(project.projectId)) continue;

      const similarProjects = this.projects.filter(p => 
        p.projectId !== project.projectId &&
        !processedProjects.has(p.projectId) &&
        (
          this.calculateSimilarity(p.projectName, project.projectName) > 0.8 ||
          (p.owner === project.owner && p.owner !== '' && 
           this.calculateSimilarity(p.projectName, project.projectName) > 0.6)
        )
      );

      if (similarProjects.length > 0) {
        const duplicateGroup = [project, ...similarProjects];
        duplicates.push(duplicateGroup);
        duplicateGroup.forEach(p => processedProjects.add(p.projectId));
      } else {
        processedProjects.add(project.projectId);
      }
    }

    return duplicates;
  }

  /**
   * Calculate string similarity
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Identify archive candidates
   */
  private identifyArchiveCandidates(scoredProjects: ProjectCompleteness[]): Project[] {
    return scoredProjects
      .filter(sp => 
        sp.completenessScore < 20 ||
        sp.issues.includes('Low activity - project appears dormant or abandoned') ||
        (sp.project.projectId.startsWith('RECON-') && sp.rankings.activityLevel < 0.1)
      )
      .map(sp => sp.project);
  }

  /**
   * Run the complete audit
   */
  async runAudit(): Promise<AuditResults> {
    await this.loadData();

    console.log('Calculating project completeness scores...');
    const scoredProjects = this.projects.map(project => this.calculateCompleteness(project));
    
    // Sort by completeness score (descending)
    scoredProjects.sort((a, b) => b.completenessScore - a.completenessScore);

    // Identify top 20-30 canonical projects
    const canonicalProjects = scoredProjects
      .filter(sp => sp.completenessScore >= 60)
      .slice(0, 30);

    // Identify orphaned records
    const orphanedRecords = this.identifyOrphanedRecords();

    // Identify duplicates
    const duplicateCandidates = this.identifyDuplicates();

    // Identify archive candidates
    const archiveCandidates = this.identifyArchiveCandidates(scoredProjects);

    const scoringMethodology = `
SCORING METHODOLOGY:
1. Phase Structure (15 pts): Has defined phases
2. Phase Activity (10 pts): Has active/in-progress phases  
3. Ownership (10 pts): Has assigned owner
4. Governance (15 pts): Has governance log entries
5. Completion (5 pts): Project marked as completed
6. Planning Evidence (10 pts): Has detailed phase notes
7. RAG Status (5 pts): Has RAG status indicators
8. Data Quality (20 pts): Complete, well-formatted data
9. Phase Chain Integrity (15 pts): Phases properly structured
10. Activity Level (15 pts): Recent activity and engagement

Total: 0-100 points
- 80-100: Excellent canonical candidates
- 60-79: Good candidates with minor issues
- 40-59: Moderate candidates needing improvement
- 20-39: Poor candidates for archive review
- 0-19: Archive candidates
    `.trim();

    return {
      totalProjects: this.projects.length,
      scoredProjects,
      canonicalProjects,
      orphanedRecords,
      duplicateCandidates,
      archiveCandidates,
      scoringMethodology
    };
  }

  /**
   * Generate detailed audit report
   */
  generateReport(results: AuditResults): string {
    const report = [];

    report.push('# WT Database Audit Report');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push(`Total Projects Analyzed: ${results.totalProjects}`);
    report.push('');

    report.push('## Executive Summary');
    report.push(`- **Total Projects**: ${results.totalProjects}`);
    report.push(`- **Canonical Candidates (Score ≥60)**: ${results.canonicalProjects.length}`);
    report.push(`- **Archive Candidates**: ${results.archiveCandidates.length}`);
    report.push(`- **Orphaned Phases**: ${results.orphanedRecords.orphanedPhases.length}`);
    report.push(`- **Unreferenced Projects**: ${results.orphanedRecords.unreferencedProjects.length}`);
    report.push(`- **Potential Duplicate Groups**: ${results.duplicateCandidates.length}`);
    report.push('');

    report.push('## Scoring Methodology');
    report.push(results.scoringMethodology);
    report.push('');

    report.push('## Top 30 Canonical Project Recommendations');
    report.push('These projects scored ≥60 and represent the most complete and viable candidates:');
    report.push('');
    report.push('| Rank | Score | Project ID | Project Name | Owner | Status | Issues | Key Strengths |');
    report.push('|------|-------|------------|-------------|-------|--------|--------|---------------|');
    
    results.canonicalProjects.forEach((project, index) => {
      const rank = index + 1;
      const strengths = [];
      if (project.rankings.hasPhases) strengths.push('Has Phases');
      if (project.rankings.hasOwner) strengths.push('Has Owner');
      if (project.rankings.hasGovernanceLogs) strengths.push('Has Governance');
      if (project.rankings.dataQuality > 0.7) strengths.push('Good Data Quality');
      
      report.push(`| ${rank} | ${project.completenessScore} | ${project.project.projectId} | ${project.project.projectName.substring(0, 50)}${project.project.projectName.length > 50 ? '...' : ''} | ${project.project.owner || 'None'} | ${project.project.status} | ${project.issues.length} | ${strengths.join(', ')} |`);
    });
    report.push('');

    report.push('## Complete Project Rankings');
    report.push('All projects sorted by completeness score:');
    report.push('');
    report.push('| Rank | Score | Project ID | Project Name | Owner | Status | Phases | Governance | Issues |');
    report.push('|------|-------|------------|-------------|-------|--------|--------|------------|--------|');
    
    results.scoredProjects.forEach((project, index) => {
      const rank = index + 1;
      report.push(`| ${rank} | ${project.completenessScore} | ${project.project.projectId} | ${project.project.projectName.substring(0, 40)}${project.project.projectName.length > 40 ? '...' : ''} | ${project.project.owner || 'None'} | ${project.project.status} | ${project.phases.length} | ${project.governanceEntries.length} | ${project.issues.length} |`);
    });
    report.push('');

    report.push('## Orphaned Records Analysis');
    report.push('### Phases Without Projects');
    if (results.orphanedRecords.orphanedPhases.length > 0) {
      report.push('| Phase ID | Phase Name | Referenced Project | Status | Notes |');
      report.push('|----------|------------|-------------------|--------|-------|');
      results.orphanedRecords.orphanedPhases.forEach(phase => {
        report.push(`| ${phase.phaseid} | ${phase.phasename.substring(0, 30)}${phase.phasename.length > 30 ? '...' : ''} | ${phase.wtProjects} | ${phase.status} | Orphaned - project not found |`);
      });
    } else {
      report.push('✅ No orphaned phases found.');
    }
    report.push('');

    report.push('### Projects Without Phases');
    if (results.orphanedRecords.unreferencedProjects.length > 0) {
      report.push('| Project ID | Project Name | Owner | Status | Notes |');
      report.push('|------------|-------------|-------|--------|-------|');
      results.orphanedRecords.unreferencedProjects.forEach(project => {
        report.push(`| ${project.projectId} | ${project.projectName.substring(0, 40)}${project.projectName.length > 40 ? '...' : ''} | ${project.owner || 'None'} | ${project.status} | No phases defined |`);
      });
    } else {
      report.push('✅ No unreferenced projects found.');
    }
    report.push('');

    report.push('## Potential Duplicates');
    if (results.duplicateCandidates.length > 0) {
      results.duplicateCandidates.forEach((group, index) => {
        report.push(`### Duplicate Group ${index + 1}`);
        report.push('| Project ID | Project Name | Owner | Status | Similarity Score |');
        report.push('|------------|-------------|-------|--------|------------------|');
        group.forEach((project, projIndex) => {
          const similarity = projIndex === 0 ? 'Original' : 
            this.calculateSimilarity(project.projectName, group[0].projectName).toFixed(2);
          report.push(`| ${project.projectId} | ${project.projectName.substring(0, 40)}${project.projectName.length > 40 ? '...' : ''} | ${project.owner || 'None'} | ${project.status} | ${similarity} |`);
        });
        report.push('');
      });
    } else {
      report.push('✅ No potential duplicates found.');
    }

    report.push('## Archive Candidates');
    report.push('Projects with scores <20 or dormant activity:');
    report.push('');
    if (results.archiveCandidates.length > 0) {
      report.push('| Project ID | Project Name | Owner | Status | Reason for Archive Consideration |');
      report.push('|------------|-------------|-------|--------|----------------------------------|');
      results.archiveCandidates.forEach(project => {
        const scoredProject = results.scoredProjects.find(sp => sp.project.projectId === project.projectId);
        const reasons = scoredProject?.issues.slice(0, 2).join('; ') || 'Low completeness score';
        report.push(`| ${project.projectId} | ${project.projectName.substring(0, 30)}${project.projectName.length > 30 ? '...' : ''} | ${project.owner || 'None'} | ${project.status} | ${reasons} |`);
      });
    } else {
      report.push('✅ No archive candidates identified.');
    }
    report.push('');

    report.push('## Recommendations');
    report.push('### Immediate Actions');
    report.push('1. **Canonical Set Adoption**: Focus development efforts on the top 20-30 projects (score ≥60)');
    report.push('2. **Orphan Resolution**: Link orphaned phases to correct projects or archive if obsolete');
    report.push('3. **Duplicate Consolidation**: Review potential duplicates and merge or differentiate as appropriate');
    report.push('4. **Archive Review**: Evaluate low-scoring projects for archival to reduce maintenance overhead');
    report.push('');
    
    report.push('### Data Quality Improvements');
    report.push('1. **Standardize Project IDs**: Migrate RECON-* projects to WT-* format or archive');
    report.push('2. **Assign Ownership**: Ensure all active projects have clear owners');
    report.push('3. **Enhance Governance**: Implement consistent governance logging for all active projects');
    report.push('4. **Phase Structure**: Establish phase definitions for projects lacking execution structure');
    report.push('');

    return report.join('\n');
  }
}

// Main execution
async function main() {
  const auditor = new WTDatabaseAuditor();
  
  try {
    console.log('Starting WT Database Audit...');
    const results = await auditor.runAudit();
    
    console.log('Generating audit report...');
    const report = auditor.generateReport(results);
    
    // Write report to file
    const reportPath = path.join(process.cwd(), 'WT-DATABASE-AUDIT-REPORT.md');
    fs.writeFileSync(reportPath, report);
    
    console.log(`✅ Audit complete! Report saved to: ${reportPath}`);
    console.log(`\nSummary:`);
    console.log(`- Total Projects: ${results.totalProjects}`);
    console.log(`- Canonical Candidates: ${results.canonicalProjects.length}`);
    console.log(`- Archive Candidates: ${results.archiveCandidates.length}`);
    console.log(`- Orphaned Records: ${results.orphanedRecords.orphanedPhases.length + results.orphanedRecords.unreferencedProjects.length}`);
    
    // Also save raw results as JSON for further analysis
    const rawResultsPath = path.join(process.cwd(), 'wt-audit-results.json');
    fs.writeFileSync(rawResultsPath, JSON.stringify(results, null, 2));
    console.log(`📊 Raw audit data saved to: ${rawResultsPath}`);
    
  } catch (error) {
    console.error('Audit failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { WTDatabaseAuditor, type AuditResults, type ProjectCompleteness };