import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { governanceLogger } from '../../services/governanceLogger';

interface SubApp {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'warning' | 'error';
  version: string;
  launchUrl: string;
  lastUpdated?: string;
  createdAt?: string;
  updatedAt?: string;
  owner?: string;
  linkedProjectsCount?: number;
  governanceLogCount?: number;
}

interface EditableSubAppsTableProps {}

const EditableSubAppsTable: React.FC<EditableSubAppsTableProps> = () => {
  const [subApps, setSubApps] = useState<SubApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<Partial<SubApp>>({});
  const [sortBy, setSortBy] = useState<keyof SubApp>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterOwner, setFilterOwner] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | SubApp['status']>('all');

  // Fetch SubApps from canonical API
  useEffect(() => {
    fetchSubApps();
  }, []);
  
  // Re-fetch when filters or sorting change
  useEffect(() => {
    fetchSubApps();
  }, [sortBy, sortOrder, filterOwner, filterStatus]);
  
  const handleSort = (column: keyof SubApp) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };
  
  const getSortIcon = (column: keyof SubApp) => {
    if (sortBy !== column) {
      return <ArrowUpDown size={14} className="text-gray-400" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp size={14} className="text-blue-600" />
      : <ArrowDown size={14} className="text-blue-600" />;
  };

  const fetchSubApps = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/orbis/sub-apps');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch SubApps');
      }
      
      let subAppsData = result.data || [];
      
      // Apply filters
      if (filterOwner) {
        subAppsData = subAppsData.filter(subApp => 
          (subApp.owner || '').toLowerCase().includes(filterOwner.toLowerCase())
        );
      }
      
      if (filterStatus !== 'all') {
        subAppsData = subAppsData.filter(subApp => subApp.status === filterStatus);
      }
      
      // Apply sorting
      subAppsData.sort((a, b) => {
        const aValue = a[sortBy] || '';
        const bValue = b[sortBy] || '';
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        
        if (sortOrder === 'asc') {
          return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
        } else {
          return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
        }
      });
      
      setSubApps(subAppsData);
      
      // Log governance event
      governanceLogger.logSidebarInteraction({
        action: 'data_fetch',
        target: 'editable_subapps_table',
        context: 'admin_dashboard',
        metadata: {
          subapps_count: (result.data || []).length,
          data_source: result.dataSource || 'canonical_database'
        }
      });
      
    } catch (err) {
      console.error('Error fetching SubApps:', err);
      setError(err instanceof Error ? err.message : 'Failed to load SubApps');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (subApp: SubApp) => {
    setEditingId(subApp.id);
    setEditForm(subApp);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditForm({
      name: '',
      description: '',
      status: 'active',
      version: '1.0.0',
      launchUrl: '',
      owner: ''
    });
  };

  const handleSave = async () => {
    if (!editForm.name || !editForm.description || !editForm.owner) {
      setError('Name, description, and owner are required');
      return;
    }

    try {
      const isEdit = editingId !== null;
      const url = isEdit ? `/api/admin/edit/subapps/${editingId}` : '/api/admin/edit/subapps';
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save SubApp');
      }

      // Log governance event
      governanceLogger.logSidebarInteraction({
        action: isEdit ? 'subapp_update' : 'subapp_create',
        target: editForm.name || 'unknown',
        context: 'admin_editable_table',
        metadata: {
          subapp_id: isEdit ? editingId : result.data?.id,
          operation: isEdit ? 'update' : 'create'
        }
      });

      // Refresh the data
      await fetchSubApps();
      
      // Reset form state
      setEditingId(null);
      setIsCreating(false);
      setEditForm({});
      setError('');
      
    } catch (err) {
      console.error('Error saving SubApp:', err);
      setError(err instanceof Error ? err.message : 'Failed to save SubApp');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete SubApp "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/edit/subapps/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete SubApp');
      }

      // Log governance event
      governanceLogger.logSidebarInteraction({
        action: 'subapp_delete',
        target: name,
        context: 'admin_editable_table',
        metadata: {
          subapp_id: id,
          operation: 'delete'
        }
      });

      // Refresh the data
      await fetchSubApps();
      
    } catch (err) {
      console.error('Error deleting SubApp:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete SubApp');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setEditForm({});
    setError('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-amber-100 text-amber-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">SubApps</h3>
            <p className="text-sm text-gray-600">
              Manage sub-applications and their configurations
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={isCreating || editingId !== null}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={16} />
            <span>Add SubApp</span>
          </button>
        </div>
        
        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-gray-400" />
            <span className="text-sm text-gray-600">Filters:</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Owner:</label>
            <input
              type="text"
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
              placeholder="Filter by owner"
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | SubApp['status'])}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
          
          {(filterOwner || filterStatus !== 'all') && (
            <button
              onClick={() => {
                setFilterOwner('');
                setFilterStatus('all');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Name</span>
                  {getSortIcon('name')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('owner')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Owner</span>
                  {getSortIcon('owner')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Status</span>
                  {getSortIcon('status')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('linkedProjectsCount')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Projects</span>
                  {getSortIcon('linkedProjectsCount')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('governanceLogCount')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Governance</span>
                  {getSortIcon('governanceLogCount')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Created</span>
                  {getSortIcon('createdAt')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('updatedAt')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Last Updated</span>
                  {getSortIcon('updatedAt')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Create new row */}
            {isCreating && (
              <tr className="bg-blue-50">
                <td className="px-6 py-4">
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="SubApp name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    value={editForm.owner || ''}
                    onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
                    placeholder="Owner name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <select
                    value={editForm.status || 'active'}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as SubApp['status'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <span className="text-gray-400 text-sm">0</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-gray-400 text-sm">0</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-gray-400 text-sm">Now</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-gray-400 text-sm">Now</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSave}
                      className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                      title="Save"
                    >
                      <Save size={16} />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Existing SubApps */}
            {subApps.map((subApp) => (
              <tr key={subApp.id} className={editingId === subApp.id ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                <td className="px-6 py-4">
                  {editingId === subApp.id ? (
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div>
                      <span className="font-medium text-gray-900">{subApp.name}</span>
                      <div className="text-xs text-gray-500 mt-1">{subApp.description}</div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === subApp.id ? (
                    <input
                      type="text"
                      value={editForm.owner || ''}
                      onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="text-gray-900">{subApp.owner || 'Unassigned'}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === subApp.id ? (
                    <select
                      value={editForm.status || subApp.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as SubApp['status'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(subApp.status)}`}>
                      {subApp.status}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-center">
                    <span className="text-lg font-semibold text-blue-600">
                      {subApp.linkedProjectsCount || 0}
                    </span>
                    <div className="text-xs text-gray-500">projects</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-center">
                    <span className="text-lg font-semibold text-purple-600">
                      {subApp.governanceLogCount || 0}
                    </span>
                    <div className="text-xs text-gray-500">logs</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600">
                    {subApp.createdAt ? new Date(subApp.createdAt).toLocaleDateString() : 'Unknown'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600">
                    {subApp.updatedAt ? new Date(subApp.updatedAt).toLocaleDateString() : 'Unknown'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {editingId === subApp.id ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSave}
                        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                        title="Save"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(subApp)}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(subApp.id, subApp.name)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}

            {/* Empty state */}
            {!isCreating && subApps.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <p className="text-lg font-medium mb-2">No SubApps found</p>
                    <p className="text-sm">Click "Add SubApp" to create your first sub-application.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EditableSubAppsTable;