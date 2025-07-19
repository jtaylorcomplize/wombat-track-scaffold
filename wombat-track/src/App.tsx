// wombat-track/src/App.tsx
import React from 'react';
import { PhasePlan } from './pages/PhasePlan';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="app-header">
        <nav className="nav-container">
          <div className="nav-brand">
            <h1>🪃 Wombat Track</h1>
            <span className="nav-subtitle">Project Management Tool</span>
          </div>
          <div className="nav-links">
            <button className="nav-link active">Phase Plan</button>
            <button className="nav-link">Dashboard</button>
            <button className="nav-link">Settings</button>
          </div>
        </nav>
      </header>
      
      <main className="app-main">
        <PhasePlan />
      </main>
      
      <footer className="app-footer">
        <p>&copy; 2025 Wombat Track - Compliance Project Management</p>
      </footer>
    </div>
  );
}

export default App;
