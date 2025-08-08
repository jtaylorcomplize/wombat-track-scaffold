import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProjectDashboard } from '../components/ProjectDashboard';
import { SubAppDashboard } from '../components/SubAppDashboard';
import { ProjectProvider } from '../contexts/ProjectContext';
import { mockPrograms } from '../data/mockPrograms';
import { logDebug } from '../utils/logger';

// Lazy load nested dashboards with structured logging
const PhaseDashboard = lazy(() => {
  logDebug('AppRouter', 'Loading PhaseDashboard component');
  return import('../components/projects/PhaseDashboard').then(module => ({ 
    default: module.PhaseDashboard 
  }));
});

const GovernanceLogsPage = lazy(() => {
  logDebug('AppRouter', 'Loading GovernanceLogsPage component');
  return import('../pages/GovernanceLogsPage');
});

const StepDashboard = lazy(() => {
  logDebug('AppRouter', 'Loading StepDashboard component');
  return import('../components/projects/StepDashboard').then(module => ({ 
    default: module.StepDashboard 
  }));
});

const SubAppMainDashboard = lazy(() => {
  logDebug('AppRouter', 'Loading SubAppMainDashboard component');
  return import('../components/subapps/SubAppMainDashboard').then(module => ({ 
    default: module.SubAppMainDashboard 
  }));
});

const SubAppAnalyticsDashboard = lazy(() => {
  logDebug('AppRouter', 'Loading SubAppAnalyticsDashboard component');
  return import('../components/subapps/SubAppAnalyticsDashboard').then(module => ({ 
    default: module.SubAppAnalyticsDashboard 
  }));
});

// Loading component
const DashboardLoading: React.FC = () => (
  <div className="flex items-center justify-center min-h-96 wt-animate-fade-in">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading dashboard...</p>
    </div>
  </div>
);

// Root layout wrapper with context providers
const RootLayout: React.FC = () => {
  return (
    <ProjectProvider>
      <Outlet />
    </ProjectProvider>
  );
};

// Main app wrapper that renders AppLayout
const MainAppWrapper: React.FC = () => {
  // Since AppLayout already handles the main UI, we just return it
  return <AppLayout />;
};

// SubApp wrapper that finds the correct sub-app and renders dashboard
const SubAppWrapper: React.FC = () => {
  const { subAppId } = useParams<{ subAppId: string }>();
  const subApp = mockPrograms.find(p => p.id === subAppId);
  
  if (!subApp) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Sub-App Not Found</h2>
          <p className="text-gray-500">The requested sub-app could not be found.</p>
        </div>
      </div>
    );
  }
  
  return <SubAppDashboard subApp={subApp} onWorkSurfaceSelect={() => {}} />;
};

// Create the router configuration
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <MainAppWrapper />,
        children: [
          {
            index: true,
            element: <Navigate to="/projects" replace />
          },
          {
            path: 'projects',
            children: [
              {
                index: true,
                element: <ProjectDashboard />
              },
              {
                path: ':projectId',
                element: <ProjectDashboard />,
                children: [
                  {
                    path: 'phases/:phaseId',
                    element: (
                      <Suspense fallback={<DashboardLoading />}>
                        <PhaseDashboard />
                      </Suspense>
                    ),
                    children: [
                      {
                        path: 'steps/:stepId',
                        element: (
                          <Suspense fallback={<DashboardLoading />}>
                            <StepDashboard />
                          </Suspense>
                        )
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            path: 'subapps/:subAppId',
            element: <SubAppWrapper />,
            children: [
              {
                index: true,
                element: <Navigate to="dashboard" replace />
              },
              {
                path: 'dashboard',
                element: (
                  <Suspense fallback={<DashboardLoading />}>
                    <SubAppMainDashboard />
                  </Suspense>
                )
              },
              {
                path: 'analytics',
                element: (
                  <Suspense fallback={<DashboardLoading />}>
                    <SubAppAnalyticsDashboard />
                  </Suspense>
                )
              }
            ]
          },
          {
            path: 'governance',
            element: (
              <Suspense fallback={<DashboardLoading />}>
                <GovernanceLogsPage />
              </Suspense>
            )
          }
        ]
      }
    ]
  }
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};