import React, { useState, useEffect } from 'react';

// --- IMPORTS (Connected to your files in src/) ---
import { Login } from './Login';
import { AdminDashboard } from './AdminDashboard';
import { PoliceDashboard } from './PoliceDashboard';
import { JudgeDashboard } from './JudgeDashboard';
import { JMODashboard } from './JMODashboard';
import { AttorneyDashboard } from './AttorneyDashboard';

function App() {
  // 1. STATE: Holds the full user object
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 2. CHECK SESSION: Keeps you logged in if you refresh
  useEffect(() => {
    const savedUser = sessionStorage.getItem('justiceflow_active_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // 3. LOGIN HANDLER
  const handleLogin = (user: any) => {
    setCurrentUser(user);
    sessionStorage.setItem('justiceflow_active_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('justiceflow_active_user');
  };

  // --- IF NOT LOGGED IN ---
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // --- ROUTING BASED ON ROLE ---
  // We use .toLowerCase() to ensure 'Admin' matches 'admin'
  const role = currentUser.role ? currentUser.role.toLowerCase() : '';

  if (role === 'admin') {
    return <AdminDashboard onLogout={handleLogout} currentUser={currentUser} />;
  }

  if (role === 'police') {
    return <PoliceDashboard onLogout={handleLogout} currentUser={currentUser} />; 
  }

  if (role === 'judge') {
    return <JudgeDashboard onLogout={handleLogout} currentUser={currentUser} />;
  }
  
  // Note: Ensure JMODashboard.tsx and AttorneyDashboard.tsx exist before uncommenting these fully if they cause errors
  if (role === 'jmo') {
     return <JMODashboard onLogout={handleLogout} currentUser={currentUser} />;
  }

  if (role === 'attorney') {
     return <AttorneyDashboard onLogout={handleLogout} currentUser={currentUser} />;
  }

  // --- FALLBACK (If role doesn't match) ---
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-center p-10">
      <h1 className="text-3xl font-bold text-red-600 mb-2">Access Error</h1>
      <p className="mb-6 text-slate-600">The role <strong>"{role}"</strong> is not recognized or the dashboard file is missing.</p>
      <button onClick={handleLogout} className="bg-slate-900 text-white px-6 py-3 rounded-lg">
        Back to Login
      </button>
    </div>
  );
}

export default App;