import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Database, FileText, Clock, Users, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TableData {
  [key: string]: unknown;
}

interface TableMetadata {
  name: string;
  icon: React.ReactNode;
  description: string;
  recordCount: number;
}

interface SortConfig {
  key: string | null;
  direction: 'asc' | 'desc';
}

const INITIAL_TABLES: TableMetadata[] = [
  { name: 'projects', icon: <FileText size={20} />, description: 'Project records (19 canonical properties)', recordCount: 0 },
  { name: 'phases', icon: <Clock size={20} />, description: 'Phase definitions (10 canonical properties)', recordCount: 0 },
  { name: 'governance_logs', icon: <Database size={20} />, description: 'Audit and governance entries', recordCount: 0 },
  { name: 'step_progress', icon: <Users size={20} />, description: 'Step progress tracking', recordCount: 0 }
];

export default function DataExplorer() {
  const [selectedTable, setSelectedTable] = useState<string>('projects');
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [showAllColumns, setShowAllColumns] = useState<boolean>(false);
  
  const itemsPerPage = 20;

  // Fetch all table counts on mount
  useEffect(() => {
    const fetchAllTableCounts = async () => {
      const counts: Record<string, number> = {};
      
      for (const table of INITIAL_TABLES) {
        try {
          const response = await fetch(`/api/admin/live/${table.name}`);
          if (response.ok) {
            const data = await response.json();
            const recordArray = Array.isArray(data) ? data : 
                              Array.isArray(data.data) ? data.data : 
                              Array.isArray(data.rows) ? data.rows : [];
            counts[table.name] = recordArray.length;
          }
        } catch (error) {
          console.error(`Error fetching count for ${table.name}:`, error);
          counts[table.name] = 0;
        }
      }
      
      setTableCounts(counts);
    };
    
    fetchAllTableCounts();
  }, []);

  // Fetch table data from API
  useEffect(() => {
    const fetchTableData = async () => {
      setLoading(true);
      try {
        // Use live database API for canonical property support
        const response = await fetch(`/api/admin/live/${selectedTable}`);
        if (response.ok) {
          const data = await response.json();
          
          // Enhanced data normalization - handle various API response formats
          let normalizedData: TableData[] = [];
          
          if (Array.isArray(data)) {
            normalizedData = data;
          } else if (data && Array.isArray(data.rows)) {
            normalizedData = data.rows;
          } else if (data && Array.isArray(data.data)) {
            normalizedData = data.data;
          } else if (data && typeof data === 'object') {
            // If it's an object with unknown structure, try to extract array properties
            const possibleArrays = Object.values(data).filter(Array.isArray);
            if (possibleArrays.length > 0) {
              normalizedData = possibleArrays[0] as TableData[];
            } else {
              console.warn(`DataExplorer: API returned object but no arrays found for ${selectedTable}`, data);
              normalizedData = [];
            }
          } else {
            console.warn(`DataExplorer: API returned unexpected data format for ${selectedTable}`, data);
            normalizedData = [];
          }
          
          setTableData(normalizedData);
          console.log(`✅ DataExplorer: Loaded ${normalizedData.length} records for ${selectedTable}`);
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

  // Filter and search data - normalize tableData to always be an array
  const safeTableData = Array.isArray(tableData) ? tableData : [];
  
  // Log warning if tableData is not an array
  if (!Array.isArray(tableData)) {
    console.warn("AdminDashboard: tableData was not an array", tableData);
  }
  
  const filteredData = safeTableData.filter(item => {
    // Enhanced null safety for search operations
    if (!item || typeof item !== 'object') return false;
    
    const matchesSearch = searchTerm ? 
      Object.values(item).some(value => {
        // Additional safety check for null/undefined values
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      }) : true;
    
    const matchesFilter = filterStatus === 'all' ? true :
      item.status?.toLowerCase() === filterStatus.toLowerCase();
    
    return matchesSearch && matchesFilter;
  });

  // Sorting logic
  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];
      
      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      // Compare values
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Get table columns dynamically with null safety
  const getTableColumns = (data: TableData[]) => {
    if (!Array.isArray(data) || data.length === 0) return [];
    
    const firstRow = data[0];
    if (!firstRow || typeof firstRow !== 'object') return [];
    
    return Object.keys(firstRow);
  };

  // Define key columns for each table to show by default
  const getKeyColumns = (tableName: string, allColumns: string[]) => {
    const keyColumnMaps: Record<string, string[]> = {
      'projects': ['projectId', 'name', 'status', 'projectOwner', 'projectType', 'currentPhase', 'completionPercentage', 'createdAt'],
      'phases': ['phaseid', 'name', 'status', 'projectId', 'order', 'completionPercentage', 'description'],
      'governance_logs': ['timestamp', 'event_type', 'user_id', 'action', 'resource_type', 'success'],
      'step_progress': ['stepId', 'phaseId', 'status', 'name', 'completionPercentage', 'updatedAt']
    };
    
    const keyColumns = keyColumnMaps[tableName] || allColumns.slice(0, 6);
    return keyColumns.filter(col => allColumns.includes(col));
  };

  const allColumns = getTableColumns(safeTableData);
  const columns = showAllColumns ? allColumns : getKeyColumns(selectedTable, allColumns);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Explorer</h1>
          <p className="text-gray-600 mt-1">Browse canonical database with 19+10 properties</p>
        </div>
        <div className="bg-green-50 px-4 py-2 rounded-lg">
          <span className="text-green-700 font-medium">WT-DBM-2.0: Canonical Schema Active</span>
        </div>
      </div>

      {/* Table Selection */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Select Table</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {INITIAL_TABLES.map((table) => (
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
                  <div className="text-sm text-gray-500">{tableCounts[table.name] || 0} records</div>
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
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedData.length)} of {sortedData.length} records
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold capitalize">
            {selectedTable.replace('_', ' ')} Data ({columns.length} of {allColumns.length} columns)
          </h3>
          {allColumns.length > 6 && (
            <button
              onClick={() => setShowAllColumns(!showAllColumns)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showAllColumns 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              {showAllColumns ? 'Show Key Columns' : 'Show All Columns'}
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading data...</p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Database size={48} className="mx-auto mb-3 text-gray-300" />
            {safeTableData.length === 0 ? (
              <div>
                <p className="text-lg font-medium mb-2">⚠️ No data available for this table</p>
                <p className="text-sm">The {selectedTable} table appears to be empty or the API returned no data.</p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">No matching records found</p>
                <p className="text-sm">Try adjusting your search terms or filter criteria.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full" style={{ width: 'max-content' }}>
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                      style={{ minWidth: '120px', maxWidth: '200px' }}
                      onClick={() => handleSort(column)}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{column.replace('_', ' ')}</span>
                        {sortConfig.key === column ? (
                          sortConfig.direction === 'asc' ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          )
                        ) : (
                          <ArrowUpDown size={14} className="text-gray-400" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((row, index) => {
                  // Enhanced null safety for row rendering
                  if (!row || typeof row !== 'object') {
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td colSpan={columns.length} className="px-6 py-4 text-center text-gray-500">
                          Invalid row data
                        </td>
                      </tr>
                    );
                  }
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      {columns.map((column) => {
                        const cellValue = row[column];
                        const displayValue = cellValue === null || cellValue === undefined ? '' : String(cellValue);
                        
                        // Add deep-link for project and phase IDs
                        if (selectedTable === 'projects' && column === 'projectId' && cellValue) {
                          return (
                            <td key={column} className="px-3 py-4 text-sm" style={{ minWidth: '120px', maxWidth: '200px' }}>
                              <Link 
                                to={`/orbis/admin/projects/${cellValue}`}
                                className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                              >
                                <span className="truncate" title={displayValue}>{displayValue}</span>
                                <ExternalLink size={14} className="flex-shrink-0" />
                              </Link>
                            </td>
                          );
                        }
                        
                        if (selectedTable === 'phases' && column === 'phaseid' && cellValue) {
                          return (
                            <td key={column} className="px-3 py-4 text-sm" style={{ minWidth: '120px', maxWidth: '200px' }}>
                              <Link 
                                to={`/orbis/admin/phases/${cellValue}`}
                                className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                              >
                                <span className="truncate" title={displayValue}>{displayValue}</span>
                                <ExternalLink size={14} className="flex-shrink-0" />
                              </Link>
                            </td>
                          );
                        }
                        
                        return (
                          <td key={column} className="px-3 py-4 text-sm text-gray-900" style={{ minWidth: '120px', maxWidth: '200px' }}>
                            <div className="truncate" title={displayValue}>
                              {displayValue}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
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