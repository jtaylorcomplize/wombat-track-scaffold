import React, { useState, useEffect } from 'react';
import { Database, FileText, Search, Activity, Settings, Shield, Key, Edit3, GitBranch, BookOpen, Bot } from 'lucide-react';
import { useAdminMode } from '../../contexts/AdminModeContext';
import DataExplorer from '../../pages/admin/DataExplorer';
import ImportExport from '../../pages/admin/ImportExport';
import DataIntegrity from '../../pages/admin/DataIntegrity';
import RuntimeStatus from '../../pages/admin/RuntimeStatus';
import { SecretsManager } from './SecretsManager';
import EditableProjectsTable from './EditableProjectsTable';
import EditablePhasesTable from './EditablePhasesTable';
import EditableSubAppsTable from './EditableSubAppsTable';
import SDLCDashboard from './SDLCDashboard';
import AdminGovernancePolicies from './AdminGovernancePolicies';
import AdminPhaseView from './AdminPhaseView';
import AgentSelector from '../agents/AgentSelector';

type AdminView = 'overview' | 'data-explorer' | 'import-export' | 'orphan-inspector' | 'runtime-panel' | 'secrets-manager' | 'sdlc-dashboard' | 'editable-tables' | 'governance-index' | 'phase-view' | 'agent-communication';

interface AdminDashboardProps {
  initialView?: AdminView;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  initialView = 'overview' 
}) => {
  const [activeView, setActiveView] = useState<AdminView>(initialView);
  const { isAdminMode, environment } = useAdminMode();

  // Update activeView when initialView prop changes (for route navigation)
  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  // Redirect to overview if not in admin mode
  if (!isAdminMode) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You need to be in Admin Mode to access the admin dashboard.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const adminTabs = [
    {
      id: 'overview' as AdminView,
      label: 'Overview',
      icon: <Settings size={20} />,
      description: 'Admin dashboard overview'
    },
    {
      id: 'data-explorer' as AdminView,
      label: 'Data Explorer',
      icon: <Database size={20} />,
      description: 'Browse and manage database records'
    },
    {
      id: 'import-export' as AdminView,
      label: 'Import/Export',
      icon: <FileText size={20} />,
      description: 'CSV and JSON data operations'
    },
    {
      id: 'orphan-inspector' as AdminView,
      label: 'Orphan Inspector',
      icon: <Search size={20} />,
      description: 'Detect and fix orphaned records'
    },
    {
      id: 'runtime-panel' as AdminView,
      label: 'Runtime Panel',
      icon: <Activity size={20} />,
      description: 'System health and performance monitoring'
    },
    {
      id: 'secrets-manager' as AdminView,
      label: 'Secrets Manager',
      icon: <Key size={20} />,
      description: 'MCP GSuite credential management'
    },
    {
      id: 'sdlc-dashboard' as AdminView,
      label: 'SDLC Dashboard',
      icon: <GitBranch size={20} />,
      description: 'SDLC governance and workflow management'
    },
    {
      id: 'editable-tables' as AdminView,
      label: 'Editable Tables',
      icon: <Edit3 size={20} />,
      description: 'Edit projects and phases with draft/commit workflow'
    },
    {
      id: 'governance-index' as AdminView,
      label: 'Governance Index',
      icon: <BookOpen size={20} />,
      description: 'Policy documentation and memory anchor management'
    },
    {
      id: 'phase-view' as AdminView,
      label: 'Phase View',
      icon: <GitBranch size={20} />,
      description: 'Live governance data integration and phase visibility'
    },
    {
      id: 'agent-communication' as AdminView,
      label: 'Agent Communication',
      icon: <Bot size={20} />,
      description: 'Direct communication with autonomous agents like Zoi'
    }
  ];

  const renderActiveView = () => {
    switch (activeView) {
      case 'data-explorer':
        return <DataExplorer />;
      case 'import-export':
        return <ImportExport />;
      case 'orphan-inspector':
        return <DataIntegrity />;
      case 'runtime-panel':
        return <RuntimeStatus />;
      case 'secrets-manager':
        return <SecretsManager />;
      case 'sdlc-dashboard':
        return <SDLCDashboard />;
      case 'editable-tables':
        return (
          <div className="space-y-8">
            <EditableProjectsTable />
            <EditableSubAppsTable />
            <EditablePhasesTable />
          </div>
        );
      case 'governance-index':
        return <AdminGovernancePolicies />;
      case 'phase-view':
        return <AdminPhaseView />;
      case 'agent-communication':
        return (
          <div className="p-6">
            <AgentSelector />
          </div>
        );
      case 'overview':
      default:
        return (
          <div className="p-6 space-y-6">
            {/* Admin Overview Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-2">
                <Shield size={32} />
                <div>
                  <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                  <p className="text-blue-100">OF-BEV Phase 4.0 - Backend Visibility & Management</p>
                </div>
              </div>
              <div className="mt-4 flex items-center space-x-4 text-sm">
                <span className="bg-blue-500 bg-opacity-50 px-3 py-1 rounded-full">
                  Environment: {environment}
                </span>
                <span className="bg-green-500 bg-opacity-50 px-3 py-1 rounded-full">
                  Status: Active
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center space-x-3">
                  <Database className="text-blue-600" size={24} />
                  <div>
                    <p className="text-sm text-gray-600">Database Status</p>
                    <p className="text-lg font-semibold text-gray-900">Healthy</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center space-x-3">
                  <FileText className="text-green-600" size={24} />
                  <div>
                    <p className="text-sm text-gray-600">Data Records</p>
                    <p className="text-lg font-semibold text-gray-900">1,247</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center space-x-3">
                  <Search className="text-yellow-600" size={24} />
                  <div>
                    <p className="text-sm text-gray-600">Orphan Records</p>
                    <p className="text-lg font-semibold text-gray-900">23</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center space-x-3">
                  <Activity className="text-purple-600" size={24} />
                  <div>
                    <p className="text-sm text-gray-600">System Health</p>
                    <p className="text-lg font-semibold text-gray-900">Optimal</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Tools Grid */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Admin Tools</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {adminTabs.slice(1).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id)}
                    className="flex items-start space-x-4 p-4 rounded-lg border hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="text-blue-600 mt-1">
                      {tab.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{tab.label}</h3>
                      <p className="text-sm text-gray-600 mt-1">{tab.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Database backup completed</p>
                    <p className="text-xs text-gray-500">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Data export completed</p>
                    <p className="text-xs text-gray-500">15 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">23 orphan records detected</p>
                    <p className="text-xs text-gray-500">1 hour ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 admin-theme">
      {/* Admin Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className={activeView === 'overview' ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" : "w-full px-4 sm:px-6 lg:px-8"}>
          <nav className="flex space-x-8 overflow-x-auto py-4">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  activeView === tab.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.icon}
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className={activeView === 'overview' ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" : "w-full px-4 sm:px-6 lg:px-8 py-6"}>
        {renderActiveView()}
      </div>
    </div>
  );
};

export default AdminDashboard;