import React, { useState } from 'react';
import { Download, Upload, FileText, Database, AlertCircle, CheckCircle } from 'lucide-react';

const TABLES = [
  { id: 'projects', name: 'Projects', description: 'Canonical projects (20 properties)' },
  { id: 'phases', name: 'Phases', description: 'Canonical phases (12 properties)' },
  { id: 'governance_logs', name: 'Governance Logs', description: 'Audit and governance entries' },
  { id: 'step_progress', name: 'Step Progress', description: 'Step tracking and progress' }
];

export default function ImportExport() {
  const [selectedTable, setSelectedTable] = useState<string>('projects');
  const [importing, setImporting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const handleCSVExport = async (tableName: string) => {
    try {
      const response = await fetch(`/api/admin/csv/export/${tableName}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tableName}_export_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setMessage(`✅ Successfully exported ${tableName} to CSV`);
        setMessageType('success');
        
        // Log to governance
        console.log('📝 CSV Export:', JSON.stringify({
          timestamp: new Date().toISOString(),
          event_type: 'csv_export',
          table: tableName,
          success: true
        }, null, 2));
      } else {
        // Try to get detailed error message from response
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
        
        if (response.status === 404) {
          throw new Error(`Table '${tableName}' not available for export. This table may not support CSV export or the data source may not be accessible.`);
        } else {
          throw new Error(`Export failed: ${errorMessage}`);
        }
      }
    } catch (error) {
      setMessage(`❌ Failed to export ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
      console.error('CSV Export Error:', error);
    }
  };

  const handleJSONTableExport = async (tableName: string) => {
    try {
      const response = await fetch(`/api/admin/csv/json/${tableName}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tableName}_export_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setMessage(`✅ Successfully exported ${tableName} to JSON`);
        setMessageType('success');
        
        // Log to governance
        console.log('📝 JSON Table Export:', JSON.stringify({
          timestamp: new Date().toISOString(),
          event_type: 'json_table_export',
          table: tableName,
          success: true
        }, null, 2));
      } else {
        // Try to get detailed error message from response
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
        
        if (response.status === 404) {
          throw new Error(`Table '${tableName}' not available for JSON export. This table may not support export or the data source may not be accessible.`);
        } else {
          throw new Error(`JSON export failed: ${errorMessage}`);
        }
      }
    } catch (error) {
      setMessage(`❌ Failed to export ${tableName} as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
      console.error('JSON Table Export Error:', error);
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/admin/csv/import/${selectedTable}`, {
        method: 'POST',
        body: formData,
        headers: {
          'x-user-id': 'admin'
        }
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ Successfully imported ${file.name} to ${selectedTable}. ${result.validation?.summary?.validRecords || 0} records processed.`);
        setMessageType('success');
        
        // Log to governance
        console.log('📝 CSV Import:', JSON.stringify({
          timestamp: new Date().toISOString(),
          event_type: 'csv_import',
          table: selectedTable,
          filename: file.name,
          success: true,
          validation: result.validation
        }, null, 2));
      } else {
        throw new Error(result.message || `Import failed: ${response.status}`);
      }
    } catch (error) {
      setMessage(`❌ Failed to import file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    } finally {
      setImporting(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  const handleJSONExport = async () => {
    try {
      const response = await fetch('/api/admin/json/export');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `database_export_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setMessage('✅ Successfully exported full database to JSON');
        setMessageType('success');
        
        // Log to governance
        console.log('📝 JSON Export:', JSON.stringify({
          timestamp: new Date().toISOString(),
          event_type: 'json_export',
          success: true
        }, null, 2));
      } else {
        throw new Error(`Export failed: ${response.status}`);
      }
    } catch (error) {
      setMessage(`❌ Failed to export database: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
  };

  const handleJSONImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/json/import', {
        method: 'POST',
        body: formData,
        headers: {
          'x-user-id': 'admin'
        }
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ Successfully imported ${file.name}. Database updated with ${result.recordsImported || 0} records.`);
        setMessageType('success');
        
        // Log to governance
        console.log('📝 JSON Import:', JSON.stringify({
          timestamp: new Date().toISOString(),
          event_type: 'json_import',
          filename: file.name,
          success: true,
          recordsImported: result.recordsImported
        }, null, 2));
      } else {
        throw new Error(result.message || `Import failed: ${response.status}`);
      }
    } catch (error) {
      setMessage(`❌ Failed to import file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    } finally {
      setImporting(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Import/Export Tools</h1>
          <p className="text-gray-600 mt-1">Data pipeline for CSV and JSON operations</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg">
          <span className="text-blue-700 font-medium">Phase 2: Data Pipeline</span>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center space-x-3 ${
          messageType === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {messageType === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{message}</span>
        </div>
      )}

      {/* CSV Import/Export */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <FileText className="text-blue-600" size={24} />
          <h2 className="text-xl font-semibold">CSV Operations</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Export */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Export to CSV</h3>
            <p className="text-gray-600">Export individual tables to CSV format</p>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Select Table</label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {TABLES.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name} - {table.description}
                  </option>
                ))}
              </select>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCSVExport(selectedTable)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                >
                  <Download size={16} />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => handleJSONTableExport(selectedTable)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2"
                >
                  <Download size={16} />
                  <span>JSON</span>
                </button>
              </div>
              <p className="text-sm text-gray-500 text-center">
                Export {TABLES.find(t => t.id === selectedTable)?.name} as CSV or JSON
              </p>
            </div>
          </div>

          {/* Import */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Import from CSV</h3>
            <p className="text-gray-600">Import CSV data to selected table</p>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Target Table</label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {TABLES.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name}
                  </option>
                ))}
              </select>
              
              <label className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 cursor-pointer">
                <Upload size={16} />
                <span>{importing ? 'Importing...' : 'Choose CSV File'}</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  disabled={importing}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* JSON Import/Export */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="text-purple-600" size={24} />
          <h2 className="text-xl font-semibold">JSON Operations</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Export */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Export Full Database</h3>
            <p className="text-gray-600">Export complete database schema and data to JSON</p>
            
            <button
              onClick={handleJSONExport}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2"
            >
              <Download size={16} />
              <span>Export Database JSON</span>
            </button>
          </div>

          {/* Import */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Import Database</h3>
            <p className="text-gray-600">Import complete database from JSON file</p>
            
            <label className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center justify-center space-x-2 cursor-pointer">
              <Upload size={16} />
              <span>{importing ? 'Importing...' : 'Choose JSON File'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleJSONImport}
                disabled={importing}
                className="hidden"
              />
            </label>
            
            <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
              <AlertCircle size={16} className="inline mr-2" />
              Warning: This will replace all existing data with backup creation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}