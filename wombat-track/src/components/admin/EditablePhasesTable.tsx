import React, { useState, useEffect, useCallback } from 'react';
import { Edit3, Save, GitCommit, RefreshCw, Filter, AlertTriangle, CheckCircle, Clock, Link } from 'lucide-react';

interface Phase {
  phaseid: string;
  phasename: string;
  project_ref: string;
  projectName?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  RAG?: string;
  notes?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  isDraft?: number;
  draftEditedBy?: string;
  draftEditedAt?: string;
  editStatus?: 'draft' | 'committed';
  createdAt?: string;
  updatedAt?: string;
}

interface EditableCell {
  phaseId: string;
  field: string;
  value: unknown;
}

export default function EditablePhasesTable() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [editingCells, setEditingCells] = useState<Map<string, EditableCell>>(new Map());
  const [filter, setFilter] = useState({
    status: '',
    rag: '',
    showDraftsOnly: false,
    showOrphans: false
  });
  const [savingStates, setSavingStates] = useState<Map<string, 'saving' | 'committing'>>(new Map());

  useEffect(() => {
    fetchPhases();
  }, []);

  const fetchPhases = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/admin/edit/phases');
      if (!response.ok) {
        throw new Error(`Failed to fetch phases: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setPhases(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch phases');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load phases');
      console.error('Error fetching phases:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCellEdit = useCallback((phaseId: string, field: string, value: unknown) => {
    const cellKey = `${phaseId}-${field}`;
    setEditingCells(prev => {
      const newMap = new Map(prev);
      newMap.set(cellKey, { phaseId, field, value });
      return newMap;
    });
  }, []);

  const saveDraft = async (phaseId: string) => {
    try {
      setSavingStates(prev => new Map(prev).set(phaseId, 'saving'));

      // Collect all edits for this phase
      const phaseEdits: Record<string, unknown> = {};
      editingCells.forEach((edit) => {
        if (edit.phaseId === phaseId) {
          phaseEdits[edit.field] = edit.value;
        }
      });

      if (Object.keys(phaseEdits).length === 0) {
        alert('No changes to save');
        return;
      }

      const response = await fetch(`/api/admin/edit/phases/${phaseId}/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'admin'
        },
        body: JSON.stringify(phaseEdits)
      });

      const result = await response.json();
      if (result.success) {
        // Clear editing cells for this phase
        setEditingCells(prev => {
          const newMap = new Map(prev);
          Array.from(newMap.keys()).forEach(key => {
            if (key.startsWith(`${phaseId}-`)) {
              newMap.delete(key);
            }
          });
          return newMap;
        });

        await fetchPhases();
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
        newMap.delete(phaseId);
        return newMap;
      });
    }
  };

  const commitPhase = async (phaseId: string) => {
    const commitMessage = prompt('Enter commit message (optional):') || 'Admin table commit';
    
    try {
      setSavingStates(prev => new Map(prev).set(phaseId, 'committing'));

      const response = await fetch(`/api/admin/edit/phases/${phaseId}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'admin'
        },
        body: JSON.stringify({ commitMessage })
      });

      const result = await response.json();
      if (result.success) {
        await fetchPhases();
        alert('Phase committed to canonical database!');
      } else {
        throw new Error(result.error || 'Failed to commit phase');
      }
    } catch (err) {
      console.error('Error committing phase:', err);
      alert(`Failed to commit phase: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSavingStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(phaseId);
        return newMap;
      });
    }
  };


  const filteredPhases = phases.filter(phase => {
    if (filter.status && phase.status !== filter.status) return false;
    if (filter.rag && phase.RAG !== filter.rag) return false;
    if (filter.showDraftsOnly && phase.isDraft !== 1) return false;
    if (filter.showOrphans && phase.projectName) return false; // Show only phases without projects
    return true;
  });

  const EditableCell: React.FC<{
    phase: Phase;
    field: keyof Phase;
    type?: 'text' | 'select' | 'number' | 'date' | 'textarea';
    options?: string[];
  }> = ({ phase, field, type = 'text', options = [] }) => {
    const cellKey = `${phase.phaseid}-${field}`;
    const currentEdit = editingCells.get(cellKey);
    const value = currentEdit?.value ?? phase[field] ?? '';
    const [isEditing, setIsEditing] = useState(false);

    const handleChange = (newValue: unknown) => {
      handleCellEdit(phase.phaseid, field as string, newValue);
    };

    const handleBlur = () => {
      setIsEditing(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && type !== 'textarea') {
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
            {options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      }

      if (type === 'textarea') {
        return (
          <textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            className="w-full p-1 border rounded text-sm resize-none"
            rows={3}
            autoFocus
          />
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

    return (
      <div
        onClick={() => setIsEditing(true)}
        className={`p-2 cursor-pointer hover:bg-gray-50 rounded min-h-[32px] ${
          currentEdit ? 'bg-yellow-50 border border-yellow-200' : ''
        } ${type === 'textarea' ? 'max-w-xs' : ''}`}
        title="Click to edit"
      >
        {type === 'textarea' ? (
          <div className="whitespace-pre-wrap text-sm max-h-16 overflow-hidden">
            {value || <span className="text-gray-400 italic">Click to add notes...</span>}
          </div>
        ) : (
          value || <span className="text-gray-400">-</span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin mr-2" size={20} />
        <span>Loading phases...</span>
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
          onClick={fetchPhases}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const orphanCount = phases.filter(p => !p.projectName).length;

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center space-x-2">
          <Edit3 size={20} />
          <span>Editable Phases ({filteredPhases.length})</span>
          {orphanCount > 0 && (
            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
              {orphanCount} orphans
            </span>
          )}
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
              <option value="Planned">Planned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Blocked">Blocked</option>
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
            
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={filter.showDraftsOnly}
                onChange={(e) => setFilter(prev => ({ ...prev, showDraftsOnly: e.target.checked }))}
              />
              <span className="text-sm">Drafts Only</span>
            </label>
            
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={filter.showOrphans}
                onChange={(e) => setFilter(prev => ({ ...prev, showOrphans: e.target.checked }))}
              />
              <span className="text-sm">Orphans Only</span>
            </label>
          </div>
          
          <button
            onClick={fetchPhases}
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phase Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">RAG</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration (days)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPhases.map((phase) => (
              <tr key={phase.phaseid} className={`hover:bg-gray-50 ${phase.isDraft === 1 ? 'bg-yellow-25' : ''}`}>
                <td className="px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <EditableCell phase={phase} field="phasename" />
                    {phase.isDraft === 1 && (
                      <div className="flex items-center space-x-1 text-amber-600" title="Draft changes">
                        <Clock size={14} />
                        <span className="text-xs">Draft</span>
                      </div>
                    )}
                  </div>
                </td>
                
                <td className="px-4 py-2">
                  <div className="flex items-center space-x-2">
                    {phase.projectName ? (
                      <span className="text-blue-600">{phase.projectName}</span>
                    ) : (
                      <div className="flex items-center space-x-1 text-red-600">
                        <AlertTriangle size={14} />
                        <span className="text-sm font-medium">ORPHAN</span>
                      </div>
                    )}
                    {phase.projectName && (
                      <Link size={14} className="text-gray-400" />
                    )}
                  </div>
                </td>
                
                <td className="px-4 py-2">
                  <EditableCell 
                    phase={phase} 
                    field="status" 
                    type="select"
                    options={['Planned', 'In Progress', 'Completed', 'Blocked', 'On Hold']}
                  />
                </td>
                
                <td className="px-4 py-2">
                  <EditableCell 
                    phase={phase} 
                    field="RAG" 
                    type="select"
                    options={['Green', 'Amber', 'Red']}
                  />
                </td>
                
                <td className="px-4 py-2">
                  <EditableCell phase={phase} field="startDate" type="date" />
                </td>
                
                <td className="px-4 py-2">
                  <EditableCell phase={phase} field="endDate" type="date" />
                </td>
                
                <td className="px-4 py-2">
                  <EditableCell phase={phase} field="estimatedDuration" type="number" />
                </td>
                
                <td className="px-4 py-2 max-w-xs">
                  <EditableCell phase={phase} field="notes" type="textarea" />
                </td>
                
                <td className="px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => saveDraft(phase.phaseid)}
                      disabled={savingStates.get(phase.phaseid) === 'saving'}
                      className="flex items-center space-x-1 px-2 py-1 text-sm bg-amber-100 text-amber-700 rounded hover:bg-amber-200 disabled:opacity-50"
                      title="Save as draft"
                    >
                      {savingStates.get(phase.phaseid) === 'saving' ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      <span>Draft</span>
                    </button>
                    
                    <button
                      onClick={() => commitPhase(phase.phaseid)}
                      disabled={savingStates.get(phase.phaseid) === 'committing'}
                      className="flex items-center space-x-1 px-2 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                      title="Commit to canonical database"
                    >
                      {savingStates.get(phase.phaseid) === 'committing' ? (
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
        
        {filteredPhases.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No phases found matching the current filters.
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center space-x-6 text-sm text-gray-600">
        <div className="flex items-center space-x-1">
          <CheckCircle size={16} className="text-green-600" />
          <span>Committed: {phases.filter(p => p.isDraft !== 1).length}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock size={16} className="text-amber-600" />
          <span>Drafts: {phases.filter(p => p.isDraft === 1).length}</span>
        </div>
        <div className="flex items-center space-x-1">
          <AlertTriangle size={16} className="text-red-600" />
          <span>Orphans: {orphanCount}</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          <span>Total: {phases.length}</span>
        </div>
      </div>
    </div>
  );
}