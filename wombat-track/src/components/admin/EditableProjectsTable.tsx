import React, { useState, useEffect, useCallback } from 'react';
import { Edit3, Save, GitCommit, RefreshCw, Filter, AlertTriangle, CheckCircle, Clock, Loader, X } from 'lucide-react';

interface Project {
  projectId: string;
  projectName: string;
  owner?: string;
  status?: string;
  description?: string;
  goals?: string;
  scopeNotes?: string;
  RAG?: string;
  startDate?: string;
  endDate?: string;
  priority?: string;
  budget?: number;
  actualCost?: number;
  estimatedHours?: number;
  actualHours?: number;
  completionPercentage?: number;
  risk?: string;
  stakeholders?: string;
  tags?: string;
  category?: string;
  department?: string;
  subApp_ref?: string;
  editableByAdmin?: boolean;
  isDraft?: number;
  draftEditedBy?: string;
  draftEditedAt?: string;
  editStatus?: 'draft' | 'committed';
  createdAt?: string;
  updatedAt?: string;
}

interface SubApp {
  subAppId: string;
  subAppName: string;
  owner?: string;
  purpose?: string;
}

interface EditableCell {
  projectId: string;
  field: string;
  value: unknown;
}

export default function EditableProjectsTable() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [subApps, setSubApps] = useState<SubApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [editingCells, setEditingCells] = useState<Map<string, EditableCell>>(new Map());
  const [filter, setFilter] = useState({
    status: '',
    rag: '',
    subApp: '',
    showDraftsOnly: false
  });
  const [savingStates, setSavingStates] = useState<Map<string, 'saving' | 'committing'>>(new Map());
  const [subAppSaveStates, setSubAppSaveStates] = useState<Map<string, 'saving' | 'success' | 'error'>>(new Map());

  useEffect(() => {
    fetchProjects();
    fetchSubApps();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/admin/edit/projects');
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setProjects(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch projects');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubApps = async () => {
    try {
      // First try the canonical Orbis API
      const response = await fetch('/api/orbis/sub-apps');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Transform API response to expected format
          const transformedSubApps = result.data.map((subApp: any) => ({
            subAppId: subApp.id,
            subAppName: subApp.name,
            purpose: subApp.description
          }));
          setSubApps(transformedSubApps);
          return;
        }
      }
      
      // Fallback to admin API
      const adminResponse = await fetch('/api/admin/subapps');
      if (adminResponse.ok) {
        const adminResult = await adminResponse.json();
        if (adminResult.success) {
          setSubApps(adminResult.data);
          return;
        }
      }
      
      // Final fallback to hardcoded canonical SubApps
      console.warn('Both APIs failed, using canonical SubApps fallback');
      setSubApps([
        { subAppId: 'MetaPlatform', subAppName: 'MetaPlatform', purpose: 'Universal platform integration' },
        { subAppId: 'Complize', subAppName: 'Complize', purpose: 'Immigration compliance platform' },
        { subAppId: 'Orbis', subAppName: 'Orbis', purpose: 'Core governance platform' },
        { subAppId: 'Roam', subAppName: 'Roam', purpose: 'Knowledge management' }
      ]);
      
    } catch (err) {
      console.warn('Error fetching SubApps, using canonical fallback:', err);
      // Fallback to production SubApps data  
      setSubApps([
        { subAppId: 'MetaPlatform', subAppName: 'MetaPlatform', purpose: 'Universal platform integration' },
        { subAppId: 'Complize', subAppName: 'Complize', purpose: 'Immigration compliance platform' },
        { subAppId: 'Orbis', subAppName: 'Orbis', purpose: 'Core governance platform' },
        { subAppId: 'Roam', subAppName: 'Roam', purpose: 'Knowledge management' }
      ]);
    }
  };

  const saveSubAppImmediately = async (projectId: string, subApp_ref: string) => {
    try {
      setSubAppSaveStates(prev => new Map(prev).set(projectId, 'saving'));
      
      const response = await fetch(`/api/admin/edit/projects/${projectId}/link-subapp`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subApp_ref })
      });

      if (!response.ok) {
        throw new Error(`Failed to save SubApp: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        // Update the project in our local state to reflect the change
        setProjects(prev => prev.map(p => 
          p.projectId === projectId 
            ? { ...p, subApp_ref: subApp_ref, updatedAt: new Date().toISOString() }
            : p
        ));
        
        setSubAppSaveStates(prev => new Map(prev).set(projectId, 'success'));
        
        // Clear success state after 3 seconds
        setTimeout(() => {
          setSubAppSaveStates(prev => {
            const newMap = new Map(prev);
            newMap.delete(projectId);
            return newMap;
          });
        }, 3000);
      } else {
        throw new Error(result.error || 'Failed to save SubApp');
      }
    } catch (error) {
      console.error('Error saving SubApp:', error);
      setSubAppSaveStates(prev => new Map(prev).set(projectId, 'error'));
      
      // Clear error state after 5 seconds
      setTimeout(() => {
        setSubAppSaveStates(prev => {
          const newMap = new Map(prev);
          newMap.delete(projectId);
          return newMap;
        });
      }, 5000);
    }
  };

  const handleCellEdit = useCallback((projectId: string, field: string, value: unknown) => {
    const cellKey = `${projectId}-${field}`;
    setEditingCells(prev => {
      const newMap = new Map(prev);
      newMap.set(cellKey, { projectId, field, value });
      return newMap;
    });

    // Trigger immediate save for SubApp_ref changes
    if (field === 'subApp_ref') {
      saveSubAppImmediately(projectId, value as string);
    }
  }, []);

  const saveDraft = async (projectId: string) => {
    try {
      setSavingStates(prev => new Map(prev).set(projectId, 'saving'));

      // Collect all edits for this project
      const projectEdits: Record<string, unknown> = {};
      editingCells.forEach((edit) => {
        if (edit.projectId === projectId) {
          projectEdits[edit.field] = edit.value;
        }
      });

      if (Object.keys(projectEdits).length === 0) {
        alert('No changes to save');
        return;
      }

      const response = await fetch(`/api/admin/edit/projects/${projectId}/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'admin'
        },
        body: JSON.stringify(projectEdits)
      });

      const result = await response.json();
      if (result.success) {
        // Clear editing cells for this project
        setEditingCells(prev => {
          const newMap = new Map(prev);
          Array.from(newMap.keys()).forEach(key => {
            if (key.startsWith(`${projectId}-`)) {
              newMap.delete(key);
            }
          });
          return newMap;
        });

        // Refresh projects to show updated data
        await fetchProjects();
        
        alert('Draft saved successfully!');
      } else {
        throw new Error(result.error || 'Failed to save draft');
      }
    } catch (err) {
      console.error('Error saving draft:', err);
      alert(`Failed to save draft: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSavingStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(projectId);
        return newMap;
      });
    }
  };

  const commitProject = async (projectId: string) => {
    const commitMessage = prompt('Enter commit message (optional):') || 'Admin table commit';
    
    try {
      setSavingStates(prev => new Map(prev).set(projectId, 'committing'));

      // Get the current project data and any pending edits to check for subApp_ref changes
      const currentProject = projects.find(p => p.projectId === projectId);
      const projectEdits: Record<string, unknown> = {};
      editingCells.forEach((edit) => {
        if (edit.projectId === projectId) {
          projectEdits[edit.field] = edit.value;
        }
      });

      // Check if subApp_ref is being changed
      const oldSubApp = currentProject?.subApp_ref;
      const newSubApp = projectEdits.subApp_ref !== undefined ? projectEdits.subApp_ref as string : oldSubApp;
      const subAppChanged = oldSubApp !== newSubApp;

      const response = await fetch(`/api/admin/edit/projects/${projectId}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'admin'
        },
        body: JSON.stringify({ 
          commitMessage,
          governanceLog: subAppChanged ? {
            event: 'ProjectSubAppLinkUpdated',
            projectId: projectId,
            projectName: currentProject?.projectName || 'Unknown',
            oldSubApp: oldSubApp || null,
            newSubApp: newSubApp || null,
            timestamp: new Date().toISOString(),
            memoryAnchor: 'project-link-update-20250805'
          } : null
        })
      });

      const result = await response.json();
      if (result.success) {
        await fetchProjects();
        if (subAppChanged) {
          const oldSubAppName = subApps.find(sa => sa.subAppId === oldSubApp)?.subAppName || oldSubApp || 'None';
          const newSubAppName = subApps.find(sa => sa.subAppId === newSubApp)?.subAppName || newSubApp || 'None';
          alert(`Project committed successfully!\nSub-App assignment changed: ${oldSubAppName} → ${newSubAppName}`);
        } else {
          alert('Project committed to canonical database!');
        }
      } else {
        throw new Error(result.error || 'Failed to commit project');
      }
    } catch (err) {
      console.error('Error committing project:', err);
      alert(`Failed to commit project: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSavingStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(projectId);
        return newMap;
      });
    }
  };


  const filteredProjects = projects.filter(project => {
    if (filter.status && project.status !== filter.status) return false;
    if (filter.rag && project.RAG !== filter.rag) return false;
    if (filter.subApp && project.subApp_ref !== filter.subApp) return false;
    if (filter.showDraftsOnly && project.isDraft !== 1) return false;
    return true;
  });

  const EditableCell: React.FC<{
    project: Project;
    field: keyof Project;
    type?: 'text' | 'select' | 'number' | 'date';
    options?: string[];
  }> = ({ project, field, type = 'text', options = [] }) => {
    const cellKey = `${project.projectId}-${field}`;
    const currentEdit = editingCells.get(cellKey);
    const value = currentEdit?.value ?? project[field] ?? '';
    const [isEditing, setIsEditing] = useState(false);

    const handleChange = (newValue: unknown) => {
      handleCellEdit(project.projectId, field as string, newValue);
    };

    const handleBlur = () => {
      setIsEditing(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      if (type === 'select') {
        return (
          <select
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            className="w-full p-1 border rounded text-sm"
            autoFocus
          >
            <option value="">Select...</option>
            {options.map(option => {
              if (field === 'subApp_ref' && option) {
                const subApp = subApps.find(sa => sa.subAppId === option);
                return (
                  <option key={option} value={option}>
                    {subApp ? subApp.subAppName : option}
                  </option>
                );
              }
              return (
                <option key={option} value={option}>{option}</option>
              );
            })}
          </select>
        );
      }

      return (
        <input
          type={type}
          value={value}
          onChange={(e) => handleChange(type === 'number' ? Number(e.target.value) : e.target.value)}
          onBlur={handleBlur}
          onKeyPress={handleKeyPress}
          className="w-full p-1 border rounded text-sm"
          autoFocus
        />
      );
    }

    // For display, show SubApp name instead of ID
    let displayValue = value;
    if (field === 'subApp_ref' && value) {
      const subApp = subApps.find(sa => sa.subAppId === value);
      displayValue = subApp ? subApp.subAppName : value;
    }

    return (
      <div
        onClick={() => setIsEditing(true)}
        className={`p-2 cursor-pointer hover:bg-gray-50 rounded min-h-[32px] ${
          currentEdit ? 'bg-yellow-50 border border-yellow-200' : ''
        }`}
        title="Click to edit"
      >
        {displayValue || <span className="text-gray-400">-</span>}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin mr-2" size={20} />
        <span>Loading projects...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
        <div className="flex items-center space-x-2 text-red-600">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchProjects}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center space-x-2">
          <Edit3 size={20} />
          <span>Editable Projects ({filteredProjects.length})</span>
        </h2>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter size={16} />
            <select
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Planning">Planning</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
            </select>
            
            <select
              value={filter.rag}
              onChange={(e) => setFilter(prev => ({ ...prev, rag: e.target.value }))}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">All RAG</option>
              <option value="Green">Green</option>
              <option value="Amber">Amber</option>
              <option value="Red">Red</option>
            </select>
            
            <select
              value={filter.subApp}
              onChange={(e) => setFilter(prev => ({ ...prev, subApp: e.target.value }))}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">All Sub-Apps</option>
              {subApps.map(subApp => (
                <option key={subApp.subAppId} value={subApp.subAppId}>
                  {subApp.subAppName}
                </option>
              ))}
            </select>
            
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={filter.showDraftsOnly}
                onChange={(e) => setFilter(prev => ({ ...prev, showDraftsOnly: e.target.checked }))}
              />
              <span className="text-sm">Drafts Only</span>
            </label>
          </div>
          
          <button
            onClick={fetchProjects}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sub-App</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">RAG</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress %</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProjects.map((project) => (
              <tr key={project.projectId} className={`hover:bg-gray-50 ${project.isDraft === 1 ? 'bg-yellow-25' : ''}`}>
                <td className="px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <EditableCell project={project} field="projectName" />
                    {project.isDraft === 1 && (
                      <div className="flex items-center space-x-1 text-amber-600" title="Draft changes">
                        <Clock size={14} />
                        <span className="text-xs">Draft</span>
                      </div>
                    )}
                  </div>
                </td>
                
                <td className="px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <EditableCell 
                      project={project} 
                      field="subApp_ref" 
                      type="select"
                      options={['', ...subApps.map(sa => sa.subAppId)]}
                    />
                    {(() => {
                      const saveState = subAppSaveStates.get(project.projectId);
                      if (saveState === 'saving') {
                        return (
                          <Loader size={14} className="text-blue-500 animate-spin" title="Saving SubApp..." />
                        );
                      } else if (saveState === 'success') {
                        return (
                          <CheckCircle size={14} className="text-green-500" title="SubApp saved successfully" />
                        );
                      } else if (saveState === 'error') {
                        return (
                          <X size={14} className="text-red-500" title="Failed to save SubApp" />
                        );
                      }
                      return null;
                    })()}
                  </div>
                </td>
                
                <td className="px-4 py-2">
                  <EditableCell project={project} field="owner" />
                </td>
                
                <td className="px-4 py-2">
                  <EditableCell 
                    project={project} 
                    field="status" 
                    type="select"
                    options={['Active', 'Planning', 'Completed', 'On Hold', 'Cancelled']}
                  />
                </td>
                
                <td className="px-4 py-2">
                  <EditableCell 
                    project={project} 
                    field="RAG" 
                    type="select"
                    options={['Green', 'Amber', 'Red']}
                  />
                </td>
                
                <td className="px-4 py-2">
                  <EditableCell 
                    project={project} 
                    field="priority" 
                    type="select"
                    options={['High', 'Medium', 'Low']}
                  />
                </td>
                
                <td className="px-4 py-2">
                  <EditableCell project={project} field="startDate" type="date" />
                </td>
                
                <td className="px-4 py-2">
                  <EditableCell project={project} field="endDate" type="date" />
                </td>
                
                <td className="px-4 py-2">
                  <EditableCell project={project} field="completionPercentage" type="number" />
                </td>
                
                <td className="px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => saveDraft(project.projectId)}
                      disabled={savingStates.get(project.projectId) === 'saving'}
                      className="flex items-center space-x-1 px-2 py-1 text-sm bg-amber-100 text-amber-700 rounded hover:bg-amber-200 disabled:opacity-50"
                      title="Save as draft"
                    >
                      {savingStates.get(project.projectId) === 'saving' ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      <span>Draft</span>
                    </button>
                    
                    <button
                      onClick={() => commitProject(project.projectId)}
                      disabled={savingStates.get(project.projectId) === 'committing'}
                      className="flex items-center space-x-1 px-2 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                      title="Commit to canonical database"
                    >
                      {savingStates.get(project.projectId) === 'committing' ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <GitCommit size={14} />
                      )}
                      <span>Commit</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredProjects.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No projects found matching the current filters.
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center space-x-6 text-sm text-gray-600">
        <div className="flex items-center space-x-1">
          <CheckCircle size={16} className="text-green-600" />
          <span>Committed: {projects.filter(p => p.isDraft !== 1).length}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock size={16} className="text-amber-600" />
          <span>Drafts: {projects.filter(p => p.isDraft === 1).length}</span>
        </div>
        <div className="flex items-center space-x-1">
          <AlertTriangle size={16} className="text-red-600" />
          <span>Total: {projects.length}</span>
        </div>
      </div>
    </div>
  );
}