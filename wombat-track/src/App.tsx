// wombat-track/src/App.tsx
import React, { useState } from 'react';
import { PhasePlan } from './pages/PhasePlan';
import { WombatConsole } from './pages/WombatConsole';
import './App.css';
console.log("🚀 WT Version 1.2.9 loaded");
console.log("✅ App is being rendered");

type ActiveView = 'phase-plan' | 'wombat-console' | 'settings';

function App() {
  const [activeView, setActiveView] = useState<ActiveView>('phase-plan');

  const runHealthCheck = async (integrationId: string) => {
    console.log(`Health check triggered for: ${integrationId}`);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Health check completed for: ${integrationId}`);
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
              className={`nav-link ${activeView === 'wombat-console' ? 'active' : ''}`}
              onClick={() => setActiveView('wombat-console')}
            >
              WombatConsole
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
        {activeView === 'wombat-console' && <WombatConsole onHealthCheck={runHealthCheck} />}
        {activeView === 'settings' && <div>Settings coming soon...</div>}
      </main>
      
      <footer className="app-footer">
        <p>&copy; 2025 Wombat Track - Compliance Project Management</p>
      </footer>
    </div>
  );
}

export default App;
