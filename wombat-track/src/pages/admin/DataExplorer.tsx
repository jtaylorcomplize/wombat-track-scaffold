import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Database, FileText, Clock, Users } from 'lucide-react';

interface TableData {
  [key: string]: any;
}

interface TableMetadata {
  name: string;
  icon: React.ReactNode;
  description: string;
  recordCount: number;
}

const TABLES: TableMetadata[] = [
  { name: 'projects', icon: <FileText size={20} />, description: 'Project records', recordCount: 92 },
  { name: 'phases', icon: <Clock size={20} />, description: 'Phase and step definitions', recordCount: 257 },
  { name: 'governance_logs', icon: <Database size={20} />, description: 'Audit and governance entries', recordCount: 60 },
  { name: 'sub_apps', icon: <Users size={20} />, description: 'Sub-application definitions', recordCount: 4 }
];

export default function DataExplorer() {
  const [selectedTable, setSelectedTable] = useState<string>('projects');
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const itemsPerPage = 20;

  // Fetch table data from API
  useEffect(() => {
    const fetchTableData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/${selectedTable}`);
        if (response.ok) {
          const data = await response.json();
          setTableData(data);
        } else {
          console.error(`Failed to fetch ${selectedTable} data`);
          setTableData([]);
        }
      } catch (error) {
        console.error(`Error fetching ${selectedTable}:`, error);
        setTableData([]);
      }
      setLoading(false);
    };

    fetchTableData();
  }, [selectedTable]);

  // Filter and search data
  const filteredData = tableData.filter(item => {
    const matchesSearch = searchTerm ? 
      Object.values(item).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      ) : true;
    
    const matchesFilter = filterStatus === 'all' ? true :
      item.status?.toLowerCase() === filterStatus.toLowerCase();
    
    return matchesSearch && matchesFilter;
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Get table columns dynamically
  const getTableColumns = (data: TableData[]) => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  };

  const columns = getTableColumns(tableData);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Explorer</h1>
          <p className="text-gray-600 mt-1">Browse and analyze oApp database tables</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg">
          <span className="text-blue-700 font-medium">Phase 1: Read-Only Mode</span>
        </div>
      </div>

      {/* Table Selection */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Select Table</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TABLES.map((table) => (
            <button
              key={table.name}
              onClick={() => {
                setSelectedTable(table.name);
                setCurrentPage(1);
                setSearchTerm('');
                setFilterStatus('all');
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedTable === table.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`${selectedTable === table.name ? 'text-blue-600' : 'text-gray-500'}`}>
                  {table.icon}
                </div>
                <div className="text-left">
                  <div className="font-medium capitalize">{table.name.replace('_', ' ')}</div>
                  <div className="text-sm text-gray-500">{table.recordCount} records</div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{table.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="active">Active</option>
                <option value="planned">Planned</option>
                <option value="planning">Planning</option>
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} records
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold capitalize">
            {selectedTable.replace('_', ' ')} Data
          </h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading data...</p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No records found for the current search and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column.replace('_', ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {columns.map((column) => (
                      <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={String(row[column])}>
                          {String(row[column])}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}