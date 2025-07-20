// wombat-track/src/App.tsx
import React, { useState } from 'react';
import { PhasePlan } from './pages/PhasePlan';
import { OrbisDashboard } from './components/orbis/OrbisDashboard';
import './App.css';
console.log("✅ App is being rendered");

type ActiveView = 'phase-plan' | 'dashboard' | 'settings';

function App() {
  const [activeView, setActiveView] = useState<ActiveView>('phase-plan');

  const runHealthCheck = () => {
    console.log('Health check triggered');
  };

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
              className={`nav-link ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveView('dashboard')}
            >
              Dashboard
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
        {activeView === 'dashboard' && <OrbisDashboard onHealthCheck={runHealthCheck} />}
        {activeView === 'settings' && <div>Settings coming soon...</div>}
      </main>
      
      <footer className="app-footer">
        <p>&copy; 2025 Wombat Track - Compliance Project Management</p>
      </footer>
    </div>
  );
}

export default App;
