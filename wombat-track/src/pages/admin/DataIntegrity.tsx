import React, { useState, useEffect } from 'react';
import { AlertTriangle, Link2, CheckCircle, XCircle, Database, RefreshCw, Wrench } from 'lucide-react';

interface OrphanedRecord {
  id: string;
  table: string;
  field: string;
  missingReference: string;
  currentValue: unknown;
  record: unknown;
}

interface IntegrityIssue {
  table: string;
  orphanedRecords: OrphanedRecord[];
  totalOrphans: number;
  severity: 'high' | 'medium' | 'low';
}

interface FixOption {
  value: string;
  label: string;
}

export default function DataIntegrity() {
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [integrityIssues, setIntegrityIssues] = useState<IntegrityIssue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fixing, setFixing] = useState<string | null>(null);
  const [fixOptions, setFixOptions] = useState<Record<string, FixOption[]>>({});
  const [selectedFixes, setSelectedFixes] = useState<Record<string, string>>({});

  // Fetch orphaned data
  const fetchOrphanedData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/orphans');
      if (response.ok) {
        const data = await response.json();
        setIntegrityIssues(data.issues || []);
        
        // Generate fix options for each orphan
        const options: Record<string, FixOption[]> = {};
        data.issues.forEach((issue: IntegrityIssue) => {
          issue.orphanedRecords.forEach((orphan: OrphanedRecord) => {
            // In production, this would fetch valid options from the referenced table
            options[orphan.id] = [
              { value: '', label: 'Select a valid reference...' },
              { value: 'WT-UX14', label: 'WT-UX14 - Integrate Surface' },
              { value: 'WT-UX9', label: 'WT-UX9 - Docs Module' },
              { value: 'WT-UX1', label: 'WT-UX1 - WT MemSync Implementation' },
              { value: 'DELETE', label: '🗑️ Delete this orphaned record' }
            ];
          });
        });
        setFixOptions(options);
      } else {
        console.error('Failed to fetch orphaned data');
        setIntegrityIssues([]);
      }
    } catch (error) {
      console.error('Error fetching orphaned data:', error);
      setIntegrityIssues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrphanedData();
  }, []);

  // Apply fix to orphaned record
  const applyFix = async (orphan: OrphanedRecord) => {
    const fixValue = selectedFixes[orphan.id];
    if (!fixValue) {
      alert('Please select a fix option');
      return;
    }

    setFixing(orphan.id);
    
    try {
      const response = await fetch(`/api/admin/fix/${orphan.table}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'admin'
        },
        body: JSON.stringify({
          recordId: orphan.record[orphan.id],
          field: orphan.field,
          value: fixValue === 'DELETE' ? null : fixValue,
          action: fixValue === 'DELETE' ? 'delete' : 'update'
        })
      });

      if (response.ok) {
        // Refresh data after fix
        await fetchOrphanedData();
        // Clear the selected fix
        setSelectedFixes(prev => {
          const newFixes = { ...prev };
          delete newFixes[orphan.id];
          return newFixes;
        });
        alert('Fix applied successfully');
      } else {
        alert('Failed to apply fix');
      }
    } catch (error) {
      console.error('Error applying fix:', error);
      alert('Error applying fix');
    } finally {
      setFixing(null);
    }
  };

  // Calculate total orphans
  const totalOrphans = integrityIssues.reduce((sum, issue) => sum + issue.totalOrphans, 0);

  // Filter issues by selected table
  const filteredIssues = selectedTable === 'all' 
    ? integrityIssues 
    : integrityIssues.filter(issue => issue.table === selectedTable);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <XCircle className="text-red-500" size={20} />;
      case 'medium':
        return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'low':
        return <CheckCircle className="text-green-500" size={20} />;
      default:
        return <AlertTriangle className="text-gray-500" size={20} />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Integrity</h1>
          <p className="text-gray-600 mt-1">Detect and fix orphaned records from migration</p>
        </div>
        <button
          onClick={fetchOrphanedData}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{totalOrphans}</div>
            <div className="text-sm text-gray-600">Total Orphaned Records</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {integrityIssues.filter(i => i.severity === 'high').reduce((sum, i) => sum + i.totalOrphans, 0)}
            </div>
            <div className="text-sm text-gray-600">High Severity</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {integrityIssues.filter(i => i.severity === 'medium').reduce((sum, i) => sum + i.totalOrphans, 0)}
            </div>
            <div className="text-sm text-gray-600">Medium Severity</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {integrityIssues.filter(i => i.severity === 'low').reduce((sum, i) => sum + i.totalOrphans, 0)}
            </div>
            <div className="text-sm text-gray-600">Low Severity</div>
          </div>
        </div>
      </div>

      {/* Table Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-4">
          <Database size={20} className="text-gray-500" />
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Tables</option>
            {integrityIssues.map(issue => (
              <option key={issue.table} value={issue.table}>
                {issue.table} ({issue.totalOrphans} orphans)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orphaned Records by Table */}
      {filteredIssues.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
          <p className="text-lg font-medium text-gray-900">No integrity issues found!</p>
          <p className="text-gray-600 mt-2">All records have valid references.</p>
        </div>
      ) : (
        filteredIssues.map((issue) => (
          <div key={issue.table} className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getSeverityIcon(issue.severity)}
                <h3 className="text-lg font-semibold capitalize">
                  {issue.table} Table
                </h3>
                <span className="text-sm text-gray-600">
                  ({issue.totalOrphans} orphaned records)
                </span>
              </div>
            </div>
            
            <div className="p-6">
              {issue.orphanedRecords.slice(0, 5).map((orphan) => (
                <div key={orphan.id} className="mb-6 last:mb-0 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Link2 className="text-gray-400" size={16} />
                        <span className="font-medium">Missing {orphan.field} reference</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        <p>Record ID: {orphan.record[orphan.id || 'id']}</p>
                        <p>Current Value: {orphan.currentValue || 'null'}</p>
                        <p>Expected Reference: {orphan.missingReference}</p>
                      </div>
                      
                      {/* Fix UI */}
                      <div className="flex items-center space-x-3">
                        <Wrench size={16} className="text-gray-400" />
                        <select
                          value={selectedFixes[orphan.id] || ''}
                          onChange={(e) => setSelectedFixes(prev => ({
                            ...prev,
                            [orphan.id]: e.target.value
                          }))}
                          className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                          disabled={fixing === orphan.id}
                        >
                          {fixOptions[orphan.id]?.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => applyFix(orphan)}
                          disabled={!selectedFixes[orphan.id] || fixing === orphan.id}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {fixing === orphan.id ? 'Applying...' : 'Apply Fix'}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Record Preview */}
                  <details className="mt-3">
                    <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                      View full record
                    </summary>
                    <pre className="mt-2 p-2 bg-white rounded text-xs overflow-x-auto">
                      {JSON.stringify(orphan.record, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
              
              {issue.totalOrphans > 5 && (
                <div className="mt-4 text-center text-sm text-gray-600">
                  Showing 5 of {issue.totalOrphans} orphaned records
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}