import React, { useState, useEffect } from 'react';

// Debug component to isolate the object-to-primitive conversion error
export const DebugEnhancedSidebar = () => {
  const [debugData, setDebugData] = useState(null);

  useEffect(() => {
    // Log all data to see what's causing the issue
    console.log('🔍 Debug: Starting Enhanced Sidebar debug component');
    
    try {
      // Test the exact data structure from SubAppOverview
      const mockSubAppInfo = {
        projects: [
          {
            projectId: 'ORB-2025-001',
            projectName: 'Test Project',
            status: 'Active',
            RAG: 'Green',
            priority: 'High',
            owner: 'Test Owner',
            startDate: '2025-01-15',
            endDate: '2025-06-30',
            completionPercentage: 75,
            budget: 150000,
            actualCost: 95000,
            lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000),
            subAppContext: 'orbis-intelligence'
          }
        ]
      };

      console.log('🔍 Mock data created:', JSON.stringify(mockSubAppInfo, null, 2));
      setDebugData(mockSubAppInfo);
      
    } catch (error) {
      console.error('🔍 Error in debug setup:', error);
    }
  }, []);

  // Test the exact patterns that might cause issues
  const testRender = () => {
    if (!debugData?.projects) return <div>No projects data</div>;

    try {
      return debugData.projects.map((project, index) => {
        console.log('🔍 Rendering project:', project);
        
        // Test each property individually
        const projectId = project?.projectId || 'unknown';
        const projectName = project?.projectName || 'Unknown Project';
        const status = project?.status || 'Unknown';
        const RAG = project?.RAG || 'Unknown';
        const priority = project?.priority || 'Unknown';
        const owner = project?.owner || 'Unknown';
        const completionPercentage = project?.completionPercentage || 0;
        
        console.log('🔍 Extracted properties:', {
          projectId, projectName, status, RAG, priority, owner, completionPercentage
        });
        
        return (
          <div key={project?.projectId || index} className="border p-2 m-2">
            <h3>Project: {projectName}</h3>
            <p>ID: {projectId}</p>
            <p>Status: {status}</p>
            <p>RAG: {RAG}</p>
            <p>Priority: {priority}</p>
            <p>Owner: {owner}</p>
            <p>Progress: {completionPercentage}%</p>
          </div>
        );
      });
    } catch (error) {
      console.error('🔍 Error in testRender:', error);
      return <div>Error rendering projects: {error.message}</div>;
    }
  };

  return (
    <div className="p-4 border-2 border-red-500">
      <h2>🔍 Enhanced Sidebar Debug Component</h2>
      <p>Check console for detailed logs</p>
      
      <div className="mt-4">
        <h3>Test Project Rendering:</h3>
        {testRender()}
      </div>
      
      <div className="mt-4 text-xs">
        <h4>Raw Debug Data:</h4>
        <pre className="bg-gray-100 p-2 overflow-auto max-h-32">
          {JSON.stringify(debugData, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default DebugEnhancedSidebar;