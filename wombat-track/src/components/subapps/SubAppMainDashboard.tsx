import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { mockPrograms } from '../../data/mockPrograms';

export const SubAppMainDashboard: React.FC = () => {
  const { subAppId } = useParams<{ subAppId: string }>();
  const subApp = mockPrograms.find(p => p.id === subAppId);
  
  useEffect(() => {
    console.log('✅ SubAppMainDashboard rendered with params:', { subAppId });
    console.log('✅ SubApp found:', !!subApp);
    if (subApp) console.log('✅ SubApp name:', subApp.name);
  }, [subAppId, subApp]);

  if (!subApp) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Sub-App Not Found</h2>
          <p className="text-gray-500">The requested sub-app could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{subApp.name} - Main Dashboard</h1>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 text-blue-600" />
            <span className="text-sm text-green-600 font-medium">+12%</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">87%</div>
          <div className="text-sm text-gray-500">System Health</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <span className="text-sm text-green-600 font-medium">+5%</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">142</div>
          <div className="text-sm text-gray-500">Active Processes</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-purple-600" />
            <span className="text-sm text-red-600 font-medium">-3%</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">28</div>
          <div className="text-sm text-gray-500">Active Users</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
            <span className="text-sm text-amber-600 font-medium">3 new</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">7</div>
          <div className="text-sm text-gray-500">Open Issues</div>
        </div>
      </div>

      {/* Activity Chart Placeholder */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Overview</h2>
        <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
          <p className="text-gray-500">Activity chart visualization would go here</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">New deployment completed successfully</p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">Configuration updated for production environment</p>
              <p className="text-xs text-gray-500">5 hours ago</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">Performance warning in data processing module</p>
              <p className="text-xs text-gray-500">1 day ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};