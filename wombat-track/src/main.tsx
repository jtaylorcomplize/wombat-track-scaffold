import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
console.log("✅ main.tsx starting render");
console.log("🔎 Document root:", document.getElementById('root'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
