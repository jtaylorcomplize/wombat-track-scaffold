import React, { useState } from 'react';
import type { Project } from '../../types/phase';

interface ProjectSwitcherProps {
  projects: Project[];
  activeProjectId?: string;
  onProjectSelect: (projectId: string) => void;
  showArchived?: boolean;
  onToggleArchived?: (show: boolean) => void;
}

export const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
  projects,
  activeProjectId,
  onProjectSelect,
  showArchived = false,
  onToggleArchived
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter projects based on archived status and search
  const filteredProjects = projects.filter(project => {
    const matchesArchived = showArchived || !project.archived;
    const matchesSearch = !searchQuery || 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.projectType.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesArchived && matchesSearch;
  });

  // Group projects by status for better organization
  const groupedProjects = filteredProjects.reduce((acc, project) => {
    const status = project.status || 'Active';
    if (!acc[status]) acc[status] = [];
    acc[status].push(project);
    return acc;
  }, {} as Record<string, Project[]>);

  const activeProject = projects.find(p => p.id === activeProjectId);

  const getProjectTypeIcon = (type: Project['projectType']) => {
    switch (type) {
      case 'Platform': return '🏗️';
      case 'Content': return '📝';
      case 'Migration': return '🔄';
      case 'R&D': return '🔬';
      default: return '📁';
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'Active': return '#10b981';
      case 'Planned': return '#6366f1';
      case 'Paused': return '#f59e0b';
      case 'Archived': return '#6b7280';
      case 'Complete': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getRecentProjects = () => {
    // In a real app, this would come from localStorage or user preferences
    const recentIds = ['proj-orb-2x-metaplatform']; // Mock recent project
    return projects.filter(p => recentIds.includes(p.id) && p.id !== activeProjectId);
  };

  return (
    <div style={{ position: 'relative', fontFamily: 'system-ui, sans-serif' }}>
      {/* Current Project Display */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          cursor: 'pointer',
          minWidth: '280px'
        }}
        data-testid="project-switcher-trigger"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          {activeProject ? (
            <>
              <span style={{ fontSize: '16px' }}>
                {getProjectTypeIcon(activeProject.projectType)}
              </span>
              <div>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {activeProject.name}
                  {activeProject.archived && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 4px',
                      backgroundColor: '#e5e7eb',
                      color: '#6b7280',
                      borderRadius: '3px'
                    }}>
                      ARCHIVED
                    </span>
                  )}
                  {activeProject.colorTag && (
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: activeProject.colorTag
                    }} />
                  )}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ 
                    color: getStatusColor(activeProject.status),
                    fontWeight: '500'
                  }}>
                    {activeProject.status}
                  </span>
                  <span>•</span>
                  <span>{activeProject.phases.length} phases</span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: '#6b7280' }}>Select a project...</div>
          )}
        </div>
        <div style={{ 
          fontSize: '14px', 
          color: '#6b7280',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>
          ⌄
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            maxHeight: '400px',
            overflow: 'hidden'
          }}
          data-testid="project-switcher-dropdown"
        >
          {/* Search Bar */}
          <div style={{ padding: '12px', borderBottom: '1px solid #f3f4f6' }}>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              data-testid="project-search"
            />
          </div>

          {/* Archive Toggle */}
          {onToggleArchived && (
            <div style={{ 
              padding: '8px 12px', 
              borderBottom: '1px solid #f3f4f6',
              backgroundColor: '#f9fafb'
            }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#6b7280'
              }}>
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => onToggleArchived(e.target.checked)}
                />
                Show archived projects
              </label>
            </div>
          )}

          <div style={{ maxHeight: '280px', overflow: 'auto' }}>
            {/* Recent Projects */}
            {!searchQuery && getRecentProjects().length > 0 && (
              <div>
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#f9fafb',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Recent
                </div>
                {getRecentProjects().map(project => (
                  <ProjectOption
                    key={`recent-${project.id}`}
                    project={project}
                    isActive={project.id === activeProjectId}
                    onClick={() => {
                      onProjectSelect(project.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    getProjectTypeIcon={getProjectTypeIcon}
                    getStatusColor={getStatusColor}
                  />
                ))}
                <div style={{ height: '1px', backgroundColor: '#f3f4f6', margin: '4px 0' }} />
              </div>
            )}

            {/* Grouped Projects */}
            {Object.entries(groupedProjects).map(([status, statusProjects]) => (
              <div key={status}>
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#f9fafb',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: getStatusColor(status as Project['status'])
                  }} />
                  {status} ({statusProjects.length})
                </div>
                {statusProjects.map(project => (
                  <ProjectOption
                    key={project.id}
                    project={project}
                    isActive={project.id === activeProjectId}
                    onClick={() => {
                      onProjectSelect(project.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    getProjectTypeIcon={getProjectTypeIcon}
                    getStatusColor={getStatusColor}
                  />
                ))}
              </div>
            ))}

            {/* No Results */}
            {filteredProjects.length === 0 && (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px'
              }}>
                {searchQuery ? 'No projects match your search' : 'No projects available'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => {
            setIsOpen(false);
            setSearchQuery('');
          }}
        />
      )}
    </div>
  );
};

// Project Option Component
const ProjectOption: React.FC<{
  project: Project;
  isActive: boolean;
  onClick: () => void;
  getProjectTypeIcon: (type: Project['projectType']) => string;
  getStatusColor: (status: Project['status']) => string;
}> = ({ project, isActive, onClick, getProjectTypeIcon, getStatusColor }) => {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 12px',
        cursor: 'pointer',
        backgroundColor: isActive ? '#eff6ff' : 'transparent',
        borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
      onMouseOver={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = '#f9fafb';
        }
      }}
      onMouseOut={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
      data-testid={`project-option-${project.id}`}
    >
      <span style={{ fontSize: '14px' }}>
        {getProjectTypeIcon(project.projectType)}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '14px',
          fontWeight: isActive ? '600' : '500',
          color: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {project.name}
          {project.archived && (
            <span style={{
              fontSize: '9px',
              padding: '1px 3px',
              backgroundColor: '#e5e7eb',
              color: '#6b7280',
              borderRadius: '2px'
            }}>
              ARCHIVED
            </span>
          )}
          {project.colorTag && (
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: project.colorTag
            }} />
          )}
        </div>
        <div style={{
          fontSize: '11px',
          color: '#6b7280',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{ color: getStatusColor(project.status) }}>
            {project.status}
          </span>
          <span>•</span>
          <span>{project.phases.length} phases</span>
          <span>•</span>
          <span>{project.projectOwner}</span>
        </div>
      </div>
    </div>
  );
};