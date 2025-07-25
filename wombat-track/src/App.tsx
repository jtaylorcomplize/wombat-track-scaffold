// wombat-track/src/App.tsx
import React, { useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { PhasePlan } from './pages/PhasePlan';
import { OrbisDashboard } from './pages/OrbisDashboard';
import { ProjectComposerView } from './components/ProjectComposerView';
import { DocsPage } from './pages/DocsPage';
console.log("✅ App is being rendered");

// Toggle between old tabbed interface and new Work Surfaces layout
const USE_NEW_LAYOUT = true;

type ActiveView = 'phase-plan' | 'project-composer' | 'orbis-dashboard' | 'docs' | 'settings';

function App() {
  const [activeView, setActiveView] = useState<ActiveView>('phase-plan');

  const runHealthCheck = async (integrationId: string) => {
    console.log(`Health check triggered for: ${integrationId}`);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Health check completed for: ${integrationId}`);
  };

  // Use new Work Surfaces layout
  if (USE_NEW_LAYOUT) {
    return <AppLayout />;
  }

  // Keep original tabbed layout as fallback
  return (
    <div className="App">
      <header className="app-header" data-testid="dashboard-header">
        <nav className="nav-container">
          <div className="nav-brand">
            <h1 data-testid="dashboard-title">🪃 Wombat Track</h1>
            <span className="nav-subtitle">Project Management Tool</span>
          </div>
          <div className="nav-links">
            <button 
              className={`nav-link ${activeView === 'phase-plan' ? 'active' : ''}`}
              onClick={() => setActiveView('phase-plan')}
            >
              Phase Plan
            </button>
            <button 
              className={`nav-link ${activeView === 'project-composer' ? 'active' : ''}`}
              onClick={() => setActiveView('project-composer')}
            >
              🚀 Project Composer
            </button>
            <button 
              className={`nav-link ${activeView === 'orbis-dashboard' ? 'active' : ''}`}
              onClick={() => setActiveView('orbis-dashboard')}
            >
              Orbis Dashboard
            </button>
            <button 
              className={`nav-link ${activeView === 'docs' ? 'active' : ''}`}
              onClick={() => setActiveView('docs')}
            >
              📝 Docs
            </button>
            <button 
              className={`nav-link ${activeView === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveView('settings')}
            >
              Settings
            </button>
          </div>
        </nav>
      </header>
      
      <main className="app-main">
        {activeView === 'phase-plan' && <PhasePlan />}
        {activeView === 'project-composer' && <ProjectComposerView />}
        {activeView === 'orbis-dashboard' && <OrbisDashboard onHealthCheck={runHealthCheck} />}
        {activeView === 'docs' && <DocsPage />}
        {activeView === 'settings' && <div>Settings coming soon...</div>}
      </main>
      
      <footer className="app-footer">
        <p>&copy; 2025 Wombat Track - Compliance Project Management</p>
      </footer>
    </div>
  );
}

export default App;
