import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart3, PieChart, TrendingUp, Calendar } from 'lucide-react';
import { mockPrograms } from '../../data/mockPrograms';

export const SubAppAnalyticsDashboard: React.FC = () => {
  const { subAppId } = useParams<{ subAppId: string }>();
  const subApp = mockPrograms.find(p => p.id === subAppId);
  
  useEffect(() => {
    console.log('✅ SubAppAnalyticsDashboard rendered with params:', { subAppId });
    console.log('✅ SubApp found:', !!subApp);
    if (subApp) console.log('✅ SubApp name:', subApp.name);
  }, [subAppId, subApp]);

  if (!subApp) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Sub-App Not Found</h2>
          <p className="text-gray-500">The requested sub-app could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{subApp.name} - Analytics Dashboard</h1>
      
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span className="text-xs text-gray-500">Last 30 days</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">1,234</div>
          <div className="text-sm text-gray-500">Total Events</div>
          <div className="mt-2 text-xs text-green-600">↑ 12% from last period</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <PieChart className="w-6 h-6 text-purple-600" />
            <span className="text-xs text-gray-500">Distribution</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">68%</div>
          <div className="text-sm text-gray-500">Success Rate</div>
          <div className="mt-2 text-xs text-amber-600">↓ 3% from last period</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <span className="text-xs text-gray-500">Trend</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">+24%</div>
          <div className="text-sm text-gray-500">Growth Rate</div>
          <div className="mt-2 text-xs text-green-600">Positive trend</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Calendar className="w-6 h-6 text-amber-600" />
            <span className="text-xs text-gray-500">Average</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">4.2d</div>
          <div className="text-sm text-gray-500">Cycle Time</div>
          <div className="mt-2 text-xs text-green-600">↓ 0.5d improvement</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h2>
          <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
            <p className="text-gray-500">Performance chart would go here</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage Patterns</h2>
          <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
            <p className="text-gray-500">Usage pattern chart would go here</p>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analytics</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previous</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Daily Active Users</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">156</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">142</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">+9.9%</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Avg Session Duration</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">12m 34s</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">11m 45s</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">+7.0%</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Error Rate</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2.3%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">3.1%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">-25.8%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};