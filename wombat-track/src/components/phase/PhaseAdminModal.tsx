import React, { useState } from 'react';
import type { Project, Phase, PhaseStep } from '../../types/phase';
import { PhasePlanDashboard } from '../project/PhasePlanDashboard';

interface PhaseAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onProjectsUpdate: (projects: Project[]) => void;
}

type TabType = 'projects' | 'phases' | 'steps' | 'phaseplan';

export const PhaseAdminModal: React.FC<PhaseAdminModalProps> = ({
  isOpen,
  onClose,
  projects,
  onProjectsUpdate
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');
  
  // Form states
  const [projectForm, setProjectForm] = useState<Partial<Project>>({});
  const [phaseForm, setPhaseForm] = useState<Partial<Phase>>({});
  const [stepForm, setStepForm] = useState<Partial<PhaseStep>>({});
  
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  if (!isOpen) return null;

  const generateId = () => {
    return crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Projects CRUD
  const handleCreateProject = () => {
    const newProject: Project = {
      id: generateId(),
      name: projectForm.name || 'New Project',
      description: projectForm.description || '',
      createdAt: new Date().toISOString(),
      phases: [],
      archived: false
    };
    
    console.log('Creating project:', newProject);
    onProjectsUpdate([...projects, newProject]);
    setProjectForm({});
  };

  const handleUpdateProject = (projectId: string) => {
    const updatedProjects = projects.map(p => 
      p.id === projectId 
        ? { ...p, ...projectForm, updatedAt: new Date().toISOString() }
        : p
    );
    
    console.log('Updating project:', projectId, projectForm);
    onProjectsUpdate(updatedProjects);
    setProjectForm({});
    setEditingItemId(null);
  };

  const handleDeleteProject = (projectId: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      console.log('Deleting project:', projectId);
      onProjectsUpdate(projects.filter(p => p.id !== projectId));
    }
  };

  const handleArchiveProject = (projectId: string) => {
    const updatedProjects = projects.map(p => 
      p.id === projectId 
        ? { ...p, archived: !p.archived, updatedAt: new Date().toISOString() }
        : p
    );
    
    console.log('Toggling archive for project:', projectId);
    onProjectsUpdate(updatedProjects);
  };

  // Phases CRUD
  const handleCreatePhase = () => {
    if (!selectedProjectId) {
      alert('Please select a project first');
      return;
    }

    const newPhase: Phase = {
      id: generateId(),
      projectId: selectedProjectId,
      name: phaseForm.name || 'New Phase',
      description: phaseForm.description || '',
      order: getNextPhaseOrder(selectedProjectId),
      steps: []
    };

    const updatedProjects = projects.map(p => 
      p.id === selectedProjectId 
        ? { ...p, phases: [...p.phases, newPhase], updatedAt: new Date().toISOString() }
        : p
    );

    console.log('Creating phase:', newPhase);
    onProjectsUpdate(updatedProjects);
    setPhaseForm({});
  };

  const handleUpdatePhase = (phaseId: string) => {
    const updatedProjects = projects.map(project => ({
      ...project,
      phases: project.phases.map(phase => 
        phase.id === phaseId 
          ? { ...phase, ...phaseForm }
          : phase
      ),
      updatedAt: project.phases.some(p => p.id === phaseId) 
        ? new Date().toISOString() 
        : project.updatedAt
    }));

    console.log('Updating phase:', phaseId, phaseForm);
    onProjectsUpdate(updatedProjects);
    setPhaseForm({});
    setEditingItemId(null);
  };

  const handleDeletePhase = (phaseId: string) => {
    if (confirm('Are you sure you want to delete this phase?')) {
      const updatedProjects = projects.map(project => ({
        ...project,
        phases: project.phases.filter(p => p.id !== phaseId),
        updatedAt: project.phases.some(p => p.id === phaseId) 
          ? new Date().toISOString() 
          : project.updatedAt
      }));

      console.log('Deleting phase:', phaseId);
      onProjectsUpdate(updatedProjects);
    }
  };

  // Steps CRUD
  const handleCreateStep = () => {
    if (!selectedPhaseId) {
      alert('Please select a phase first');
      return;
    }

    const newStep: PhaseStep = {
      id: generateId(),
      phaseId: selectedPhaseId,
      name: stepForm.name || 'New Step',
      status: stepForm.status || 'not_started',
      description: stepForm.description,
      templateId: stepForm.templateId,
      executionId: stepForm.executionId
    };

    const updatedProjects = projects.map(project => ({
      ...project,
      phases: project.phases.map(phase => 
        phase.id === selectedPhaseId 
          ? { ...phase, steps: [...phase.steps, newStep] }
          : phase
      ),
      updatedAt: project.phases.some(p => p.id === selectedPhaseId) 
        ? new Date().toISOString() 
        : project.updatedAt
    }));

    console.log('Creating step:', newStep);
    onProjectsUpdate(updatedProjects);
    setStepForm({});
  };

  const handleUpdateStep = (stepId: string) => {
    const updatedProjects = projects.map(project => ({
      ...project,
      phases: project.phases.map(phase => ({
        ...phase,
        steps: phase.steps.map(step => 
          step.id === stepId 
            ? { ...step, ...stepForm }
            : step
        )
      })),
      updatedAt: project.phases.some(p => p.steps.some(s => s.id === stepId))
        ? new Date().toISOString() 
        : project.updatedAt
    }));

    console.log('Updating step:', stepId, stepForm);
    onProjectsUpdate(updatedProjects);
    setStepForm({});
    setEditingItemId(null);
  };

  const handleDeleteStep = (stepId: string) => {
    if (confirm('Are you sure you want to delete this step?')) {
      const updatedProjects = projects.map(project => ({
        ...project,
        phases: project.phases.map(phase => ({
          ...phase,
          steps: phase.steps.filter(s => s.id !== stepId)
        })),
        updatedAt: project.phases.some(p => p.steps.some(s => s.id === stepId))
          ? new Date().toISOString() 
          : project.updatedAt
      }));

      console.log('Deleting step:', stepId);
      onProjectsUpdate(updatedProjects);
    }
  };

  // Reordering
  const movePhase = (projectId: string, phaseId: string, direction: 'up' | 'down') => {
    const updatedProjects = projects.map(project => {
      if (project.id !== projectId) return project;

      const phaseIndex = project.phases.findIndex(p => p.id === phaseId);
      if (phaseIndex === -1) return project;

      const newPhases = [...project.phases];
      const targetIndex = direction === 'up' ? phaseIndex - 1 : phaseIndex + 1;

      if (targetIndex < 0 || targetIndex >= newPhases.length) return project;

      // Swap positions
      [newPhases[phaseIndex], newPhases[targetIndex]] = [newPhases[targetIndex], newPhases[phaseIndex]];
      
      // Update order values
      newPhases.forEach((phase, index) => {
        phase.order = index + 1;
      });

      return {
        ...project,
        phases: newPhases,
        updatedAt: new Date().toISOString()
      };
    });

    console.log('Moving phase:', phaseId, direction);
    onProjectsUpdate(updatedProjects);
  };

  const moveStep = (phaseId: string, stepId: string, direction: 'up' | 'down') => {
    const updatedProjects = projects.map(project => ({
      ...project,
      phases: project.phases.map(phase => {
        if (phase.id !== phaseId) return phase;

        const stepIndex = phase.steps.findIndex(s => s.id === stepId);
        if (stepIndex === -1) return phase;

        const newSteps = [...phase.steps];
        const targetIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;

        if (targetIndex < 0 || targetIndex >= newSteps.length) return phase;

        // Swap positions
        [newSteps[stepIndex], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[stepIndex]];

        return {
          ...phase,
          steps: newSteps
        };
      }),
      updatedAt: project.phases.some(p => p.id === phaseId)
        ? new Date().toISOString() 
        : project.updatedAt
    }));

    console.log('Moving step:', stepId, direction);
    onProjectsUpdate(updatedProjects);
  };

  // Helpers
  const getNextPhaseOrder = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return 1;
    return Math.max(...project.phases.map(p => p.order || 0), 0) + 1;
  };

  const visibleProjects = showArchived 
    ? projects 
    : projects.filter(p => !p.archived);

  const getSelectedProject = () => projects.find(p => p.id === selectedProjectId);
  const getSelectedPhase = () => {
    for (const project of projects) {
      const phase = project.phases.find(p => p.id === selectedPhaseId);
      if (phase) return phase;
    }
    return null;
  };

  // Import/Export
  const handleExport = () => {
    const dataStr = JSON.stringify(projects, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `phase-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    console.log('Exported projects data');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedData)) {
          console.log('Importing projects:', importedData);
          onProjectsUpdate(importedData);
          alert('Projects imported successfully!');
        } else {
          alert('Invalid file format');
        }
      } catch (error) {
        console.error('Import error:', error);
        alert('Failed to import file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '900px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
            Phase Tracker Admin
          </h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#f3f4f6',
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              Import
              <input 
                type="file" 
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </label>
            <button
              onClick={handleExport}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Export
            </button>
            <button
              onClick={onClose}
              style={{
                fontSize: '24px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          {(['projects', 'phases', 'steps', 'phaseplan'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 24px',
                border: 'none',
                backgroundColor: activeTab === tab ? 'white' : 'transparent',
                borderBottom: activeTab === tab ? '2px solid #3b82f6' : 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab ? '600' : '400',
                color: activeTab === tab ? '#3b82f6' : '#6b7280',
                textTransform: 'capitalize'
              }}
            >
              {tab === 'projects' && '📁 '}
              {tab === 'phases' && '📦 '}
              {tab === 'steps' && '🧩 '}
              {tab === 'phaseplan' && '📑 '}
              {tab === 'phaseplan' ? 'Phase Plan' : tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px'
        }}>
          {activeTab === 'projects' && (
            <ProjectsTab
              projects={visibleProjects}
              projectForm={projectForm}
              setProjectForm={setProjectForm}
              editingItemId={editingItemId}
              setEditingItemId={setEditingItemId}
              showArchived={showArchived}
              setShowArchived={setShowArchived}
              onCreateProject={handleCreateProject}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onArchiveProject={handleArchiveProject}
              movePhase={movePhase}
            />
          )}

          {activeTab === 'phases' && (
            <PhasesTab
              projects={projects}
              selectedProjectId={selectedProjectId}
              setSelectedProjectId={setSelectedProjectId}
              phaseForm={phaseForm}
              setPhaseForm={setPhaseForm}
              editingItemId={editingItemId}
              setEditingItemId={setEditingItemId}
              onCreatePhase={handleCreatePhase}
              onUpdatePhase={handleUpdatePhase}
              onDeletePhase={handleDeletePhase}
              moveStep={moveStep}
            />
          )}

          {activeTab === 'steps' && (
            <StepsTab
              projects={projects}
              selectedPhaseId={selectedPhaseId}
              setSelectedPhaseId={setSelectedPhaseId}
              stepForm={stepForm}
              setStepForm={setStepForm}
              editingItemId={editingItemId}
              setEditingItemId={setEditingItemId}
              onCreateStep={handleCreateStep}
              onUpdateStep={handleUpdateStep}
              onDeleteStep={handleDeleteStep}
            />
          )}

          {activeTab === 'phaseplan' && (
            <PhasePlanTab
              projects={projects}
              selectedProjectId={selectedProjectId}
              setSelectedProjectId={setSelectedProjectId}
              onProjectsUpdate={onProjectsUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Project Tab Component
const ProjectsTab: React.FC<{
  projects: Project[];
  projectForm: Partial<Project>;
  setProjectForm: (form: Partial<Project>) => void;
  editingItemId: string | null;
  setEditingItemId: (id: string | null) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  onCreateProject: () => void;
  onUpdateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onArchiveProject: (id: string) => void;
  movePhase: (projectId: string, phaseId: string, direction: 'up' | 'down') => void;
}> = ({
  projects,
  projectForm,
  setProjectForm,
  editingItemId,
  setEditingItemId,
  showArchived,
  setShowArchived,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onArchiveProject,
  movePhase
}) => {
  return (
    <div>
      {/* Create/Edit Form */}
      <div style={{
        backgroundColor: '#f9fafb',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
          {editingItemId ? 'Edit Project' : 'Create New Project'}
        </h3>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Project name"
            value={projectForm.name || ''}
            onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px'
            }}
          />
          <input
            type="text"
            placeholder="Description"
            value={projectForm.description || ''}
            onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
            style={{
              flex: 2,
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              if (editingItemId) {
                onUpdateProject(editingItemId);
              } else {
                onCreateProject();
              }
            }}
            disabled={!projectForm.name}
            style={{
              padding: '8px 16px',
              backgroundColor: projectForm.name ? '#3b82f6' : '#e5e7eb',
              color: projectForm.name ? 'white' : '#9ca3af',
              border: 'none',
              borderRadius: '6px',
              cursor: projectForm.name ? 'pointer' : 'not-allowed'
            }}
          >
            {editingItemId ? 'Update' : 'Create'}
          </button>
          {editingItemId && (
            <button
              onClick={() => {
                setEditingItemId(null);
                setProjectForm({});
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Show Archived Toggle */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          <span style={{ fontSize: '14px', color: '#6b7280' }}>Show archived projects</span>
        </label>
      </div>

      {/* Projects List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {projects.map(project => (
          <div
            key={project.id}
            style={{
              backgroundColor: project.archived ? '#f9fafb' : 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              opacity: project.archived ? 0.7 : 1
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px'
            }}>
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                  {project.name}
                  {project.archived && (
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '12px',
                      padding: '2px 6px',
                      backgroundColor: '#e5e7eb',
                      color: '#6b7280',
                      borderRadius: '4px'
                    }}>
                      Archived
                    </span>
                  )}
                </h4>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>{project.description}</p>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                  {project.phases.length} phases • Created: {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setEditingItemId(project.id);
                    setProjectForm({
                      name: project.name,
                      description: project.description
                    });
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => onArchiveProject(project.id)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    backgroundColor: '#fef3c7',
                    color: '#d97706',
                    border: '1px solid #fcd34d',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {project.archived ? 'Unarchive' : 'Archive'}
                </button>
                <button
                  onClick={() => onDeleteProject(project.id)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Phases Preview */}
            {project.phases.length > 0 && (
              <div style={{
                borderTop: '1px solid #f3f4f6',
                paddingTop: '12px'
              }}>
                <h5 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Phases:
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {project.phases.map((phase, index) => (
                    <div
                      key={phase.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '4px',
                        fontSize: '13px'
                      }}
                    >
                      <span>
                        {phase.order}. {phase.name} ({phase.steps.length} steps)
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => movePhase(project.id, phase.id, 'up')}
                          disabled={index === 0}
                          style={{
                            padding: '2px 6px',
                            fontSize: '11px',
                            backgroundColor: index === 0 ? '#e5e7eb' : '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '3px',
                            cursor: index === 0 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => movePhase(project.id, phase.id, 'down')}
                          disabled={index === project.phases.length - 1}
                          style={{
                            padding: '2px 6px',
                            fontSize: '11px',
                            backgroundColor: index === project.phases.length - 1 ? '#e5e7eb' : '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '3px',
                            cursor: index === project.phases.length - 1 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Phases Tab Component
const PhasesTab: React.FC<{
  projects: Project[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  phaseForm: Partial<Phase>;
  setPhaseForm: (form: Partial<Phase>) => void;
  editingItemId: string | null;
  setEditingItemId: (id: string | null) => void;
  onCreatePhase: () => void;
  onUpdatePhase: (id: string) => void;
  onDeletePhase: (id: string) => void;
  moveStep: (phaseId: string, stepId: string, direction: 'up' | 'down') => void;
}> = ({
  projects,
  selectedProjectId,
  setSelectedProjectId,
  phaseForm,
  setPhaseForm,
  editingItemId,
  setEditingItemId,
  onCreatePhase,
  onUpdatePhase,
  onDeletePhase,
  moveStep
}) => {
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const activeProjects = projects.filter(p => !p.archived);

  return (
    <div>
      {/* Project Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
          Select Project:
        </label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px'
          }}
        >
          <option value="">Choose a project...</option>
          {activeProjects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {selectedProject && (
        <>
          {/* Create/Edit Form */}
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              {editingItemId ? 'Edit Phase' : 'Create New Phase'}
            </h3>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Phase name"
                value={phaseForm.name || ''}
                onChange={(e) => setPhaseForm({ ...phaseForm, name: e.target.value })}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              />
              <input
                type="text"
                placeholder="Description"
                value={phaseForm.description || ''}
                onChange={(e) => setPhaseForm({ ...phaseForm, description: e.target.value })}
                style={{
                  flex: 2,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  if (editingItemId) {
                    onUpdatePhase(editingItemId);
                  } else {
                    onCreatePhase();
                  }
                }}
                disabled={!phaseForm.name}
                style={{
                  padding: '8px 16px',
                  backgroundColor: phaseForm.name ? '#3b82f6' : '#e5e7eb',
                  color: phaseForm.name ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: phaseForm.name ? 'pointer' : 'not-allowed'
                }}
              >
                {editingItemId ? 'Update' : 'Create'}
              </button>
              {editingItemId && (
                <button
                  onClick={() => {
                    setEditingItemId(null);
                    setPhaseForm({});
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Phases List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selectedProject.phases.map(phase => (
              <div
                key={phase.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                      {phase.order}. {phase.name}
                    </h4>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>{phase.description}</p>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                      {phase.steps.length} steps
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setEditingItemId(phase.id);
                        setPhaseForm({
                          name: phase.name,
                          description: phase.description
                        });
                      }}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDeletePhase(phase.id)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fca5a5',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Steps Preview */}
                {phase.steps.length > 0 && (
                  <div style={{
                    borderTop: '1px solid #f3f4f6',
                    paddingTop: '12px'
                  }}>
                    <h5 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                      Steps:
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {phase.steps.map((step, index) => (
                        <div
                          key={step.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '4px',
                            fontSize: '13px'
                          }}
                        >
                          <span>
                            {step.name} ({step.status})
                          </span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => moveStep(phase.id, step.id, 'up')}
                              disabled={index === 0}
                              style={{
                                padding: '2px 6px',
                                fontSize: '11px',
                                backgroundColor: index === 0 ? '#e5e7eb' : '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '3px',
                                cursor: index === 0 ? 'not-allowed' : 'pointer'
                              }}
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveStep(phase.id, step.id, 'down')}
                              disabled={index === phase.steps.length - 1}
                              style={{
                                padding: '2px 6px',
                                fontSize: '11px',
                                backgroundColor: index === phase.steps.length - 1 ? '#e5e7eb' : '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '3px',
                                cursor: index === phase.steps.length - 1 ? 'not-allowed' : 'pointer'
                              }}
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Steps Tab Component
const StepsTab: React.FC<{
  projects: Project[];
  selectedPhaseId: string;
  setSelectedPhaseId: (id: string) => void;
  stepForm: Partial<PhaseStep>;
  setStepForm: (form: Partial<PhaseStep>) => void;
  editingItemId: string | null;
  setEditingItemId: (id: string | null) => void;
  onCreateStep: () => void;
  onUpdateStep: (id: string) => void;
  onDeleteStep: (id: string) => void;
}> = ({
  projects,
  selectedPhaseId,
  setSelectedPhaseId,
  stepForm,
  setStepForm,
  editingItemId,
  setEditingItemId,
  onCreateStep,
  onUpdateStep,
  onDeleteStep
}) => {
  // Get all phases from all projects
  const allPhases: Array<{ phase: Phase; project: Project }> = [];
  projects.forEach(project => {
    if (!project.archived) {
      project.phases.forEach(phase => {
        allPhases.push({ phase, project });
      });
    }
  });

  const selectedPhaseData = allPhases.find(p => p.phase.id === selectedPhaseId);

  return (
    <div>
      {/* Phase Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
          Select Phase:
        </label>
        <select
          value={selectedPhaseId}
          onChange={(e) => setSelectedPhaseId(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px'
          }}
        >
          <option value="">Choose a phase...</option>
          {allPhases.map(({ phase, project }) => (
            <option key={phase.id} value={phase.id}>
              {project.name} → {phase.name}
            </option>
          ))}
        </select>
      </div>

      {selectedPhaseData && (
        <>
          {/* Create/Edit Form */}
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              {editingItemId ? 'Edit Step' : 'Create New Step'}
            </h3>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Step name"
                value={stepForm.name || ''}
                onChange={(e) => setStepForm({ ...stepForm, name: e.target.value })}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              />
              <select
                value={stepForm.status || 'not_started'}
                onChange={(e) => setStepForm({ ...stepForm, status: e.target.value as PhaseStep['status'] })}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="complete">Complete</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Description (optional)"
                value={stepForm.description || ''}
                onChange={(e) => setStepForm({ ...stepForm, description: e.target.value })}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Template ID (optional)"
                value={stepForm.templateId || ''}
                onChange={(e) => setStepForm({ ...stepForm, templateId: e.target.value })}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              />
              <input
                type="text"
                placeholder="Execution ID (optional)"
                value={stepForm.executionId || ''}
                onChange={(e) => setStepForm({ ...stepForm, executionId: e.target.value })}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  if (editingItemId) {
                    onUpdateStep(editingItemId);
                  } else {
                    onCreateStep();
                  }
                }}
                disabled={!stepForm.name}
                style={{
                  padding: '8px 16px',
                  backgroundColor: stepForm.name ? '#3b82f6' : '#e5e7eb',
                  color: stepForm.name ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: stepForm.name ? 'pointer' : 'not-allowed'
                }}
              >
                {editingItemId ? 'Update' : 'Create'}
              </button>
              {editingItemId && (
                <button
                  onClick={() => {
                    setEditingItemId(null);
                    setStepForm({});
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Steps List */}
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Steps in "{selectedPhaseData.phase.name}"
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedPhaseData.phase.steps.map(step => (
                <div
                  key={step.id}
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h5 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                        {step.name}
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '12px',
                          padding: '2px 6px',
                          backgroundColor: 
                            step.status === 'complete' ? '#dcfce7' :
                            step.status === 'in_progress' ? '#fef3c7' : '#f3f4f6',
                          color: 
                            step.status === 'complete' ? '#15803d' :
                            step.status === 'in_progress' ? '#d97706' : '#6b7280',
                          borderRadius: '4px'
                        }}>
                          {step.status.replace('_', ' ')}
                        </span>
                      </h5>
                      {step.description && (
                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                          {step.description}
                        </p>
                      )}
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {step.templateId && <div>Template: {step.templateId}</div>}
                        {step.executionId && <div>Execution: {step.executionId}</div>}
                        {step.startedAt && <div>Started: {new Date(step.startedAt).toLocaleString()}</div>}
                        {step.completedAt && <div>Completed: {new Date(step.completedAt).toLocaleString()}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setEditingItemId(step.id);
                          setStepForm({
                            name: step.name,
                            status: step.status,
                            description: step.description,
                            templateId: step.templateId,
                            executionId: step.executionId
                          });
                        }}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteStep(step.id)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Phase Plan Tab Component
const PhasePlanTab: React.FC<{
  projects: Project[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  onProjectsUpdate: (projects: Project[]) => void;
}> = ({
  projects,
  selectedProjectId,
  setSelectedProjectId,
  onProjectsUpdate
}) => {
  const activeProjects = projects.filter(p => !p.archived);
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleStartStep = (stepId: string) => {
    console.log(`[WT] Starting step execution: ${stepId}`);
    // TODO: Implement step execution start logic
  };

  const handleViewLogs = (executionId: string) => {
    console.log(`[WT] Viewing logs for execution: ${executionId}`);
    // TODO: Implement log viewing logic
  };

  return (
    <div>
      {/* Project Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
          Select Project:
        </label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px'
          }}
        >
          <option value="">Choose a project...</option>
          {activeProjects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {selectedProject ? (
        <div>
          <PhasePlanDashboard
            project={selectedProject}
            onStartStep={handleStartStep}
            onViewLogs={handleViewLogs}
            readOnly={false}
          />
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#6b7280',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>📑</div>
          <div style={{ fontSize: '16px', marginBottom: '4px' }}>Select a project to view its phase plan dashboard</div>
          <div style={{ fontSize: '14px' }}>
            This dashboard combines strategic project planning with tactical execution tracking.
          </div>
        </div>
      )}
    </div>
  );
};