import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { NavigationContextProvider } from '../contexts/NavigationContext';
import { AdminModeProvider } from '../contexts/AdminModeContext';

// Temporarily use direct imports to isolate the lazy loading issue
import PlanSurfaceComponent from '../components/surfaces/PlanSurface';
import ExecuteSurfaceComponent from '../components/surfaces/ExecuteSurface';
import DocumentSurfaceComponent from '../components/surfaces/DocumentSurface';
import GovernSurfaceComponent from '../components/surfaces/GovernSurface';
import IntegrateSurfaceComponent from '../components/surfaces/IntegrateSurface';

// Lazy load all route components
const OrbisLayout = lazy(() => import('../components/layout/OrbisLayout'));
const AllProjectsDashboard = lazy(() => import('../components/strategic/AllProjectsDashboard'));
const ProjectAnalyticsDashboard = lazy(() => import('../components/strategic/ProjectAnalyticsDashboard'));
const TeamOverview = lazy(() => import('../components/strategic/TeamOverview'));
const StrategicPlanning = lazy(() => import('../components/strategic/StrategicPlanning'));
// Temporarily use direct import to debug lazy loading issue
import SubAppOverviewComponent from '../components/operational/SubAppOverview';
const SubAppOverview = SubAppOverviewComponent;
// Temporarily use direct import to debug lazy loading issue
import SubAppProjectsListComponent from '../components/operational/SubAppProjectsList';
const SubAppProjectsList = SubAppProjectsListComponent;
// Temporarily use direct import to debug lazy loading issue
import { ProjectDashboard as ProjectDashboardComponent } from '../components/ProjectDashboard';
const ProjectDashboard = ProjectDashboardComponent;
const PlanSurface = PlanSurfaceComponent;
const ExecuteSurface = ExecuteSurfaceComponent;
const DocumentSurface = DocumentSurfaceComponent;
const GovernSurface = GovernSurfaceComponent;
const IntegrateSurface = IntegrateSurfaceComponent;
const SPQRRuntimeDashboard = lazy(() => import('../components/SPQR/SPQRRuntimeDashboard'));
const AdminDashboard = lazy(() => import('../components/admin/AdminDashboard'));
const AdminProjectView = lazy(() => import('../pages/admin/AdminProjectView'));
const AdminPhaseView = lazy(() => import('../pages/admin/AdminPhaseView'));
const ProjectAdminEdit = lazy(() => import('../pages/admin/ProjectAdminEdit'));

// Loading component
const RouteLoading: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Work surface wrapper to ensure proper context
const WorkSurfaceWrapper: React.FC = () => {
  return (
    <div className="flex-1 p-6">
      <Suspense fallback={<RouteLoading />}>
        <Outlet />
      </Suspense>
    </div>
  );
};

export const OrbisRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <NavigationContextProvider>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/orbis" replace />} />
            
            {/* Main Orbis layout with sidebar */}
            <Route path="/orbis" element={<OrbisLayout />}>
              {/* Default redirect to all projects */}
              <Route index element={<Navigate to="projects/all-projects" replace />} />
              
              {/* Strategic Level Routes - Project Surfaces */}
              <Route path="projects">
                <Route path="all-projects" element={<AllProjectsDashboard />} />
                <Route path="dashboard" element={<ProjectAnalyticsDashboard />} />
                <Route path="teams" element={<TeamOverview />} />
                <Route path="strategy" element={<StrategicPlanning />} />
                <Route index element={<Navigate to="all-projects" replace />} />
              </Route>
              
              {/* Operational Level Routes - Sub-Apps */}
              <Route path="sub-apps/:subAppId" element={<SubAppOverview />}>
                {/* Sub-app projects list */}
                <Route path="projects" element={<SubAppProjectsList />} />
                
                {/* Individual project with work surfaces */}
                <Route path="projects/:projectId" element={<ProjectDashboard />}>
                  <Route element={<WorkSurfaceWrapper />}>
                    <Route path="plan" element={<PlanSurface />} />
                    <Route path="execute" element={<ExecuteSurface />} />
                    <Route path="document" element={<DocumentSurface />} />
                    <Route path="govern" element={<GovernSurface />} />
                    <Route index element={<Navigate to="plan" replace />} />
                  </Route>
                </Route>
                
                {/* Default to projects list when accessing sub-app */}
                <Route index element={<Navigate to="projects" replace />} />
              </Route>

              {/* System Level Routes - Platform Surfaces */}
              <Route path="integrate" element={<IntegrateSurface currentProject={null} currentPhase={null} currentStep={null} onPhaseChange={() => {}} onStepChange={() => {}} />} />
              <Route path="spqr-runtime" element={<SPQRRuntimeDashboard />} />
              <Route path="admin" element={<AdminModeProvider><AdminDashboard initialView="overview" /></AdminModeProvider>} />
              <Route path="admin/data-explorer" element={<AdminModeProvider><AdminDashboard initialView="data-explorer" /></AdminModeProvider>} />
              <Route path="admin/import-export" element={<AdminModeProvider><AdminDashboard initialView="import-export" /></AdminModeProvider>} />
              <Route path="admin/orphan-inspector" element={<AdminModeProvider><AdminDashboard initialView="orphan-inspector" /></AdminModeProvider>} />
              <Route path="admin/runtime-panel" element={<AdminModeProvider><AdminDashboard initialView="runtime-panel" /></AdminModeProvider>} />
              <Route path="admin/secrets-manager" element={<AdminModeProvider><AdminDashboard initialView="secrets-manager" /></AdminModeProvider>} />
              <Route path="admin/editable-tables" element={<AdminModeProvider><AdminDashboard initialView="editable-tables" /></AdminModeProvider>} />
              
              {/* Admin Deep-Link Routes */}
              <Route path="admin/projects/:projectId" element={<AdminModeProvider><AdminProjectView /></AdminModeProvider>} />
              <Route path="admin/projects/:projectId/edit" element={<AdminModeProvider><ProjectAdminEdit /></AdminModeProvider>} />
              <Route path="admin/phases/:phaseId" element={<AdminModeProvider><AdminPhaseView /></AdminModeProvider>} />
            </Route>
            
            {/* Catch all - redirect to Orbis */}
            <Route path="*" element={<Navigate to="/orbis" replace />} />
          </Routes>
        </Suspense>
      </NavigationContextProvider>
    </BrowserRouter>
  );
};

export default OrbisRouter;