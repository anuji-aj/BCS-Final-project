import React, { useState, useEffect } from 'react';
import { Shield, Gavel, Stethoscope, User, ArrowLeft, Settings, Lock, Eye, EyeOff } from 'lucide-react';

// --- 1. HARDCODED SYSTEM ACCOUNTS (For Initial Access Only) ---
const SYSTEM_ACCOUNTS = [
  { email: 'admin@justiceflow.gov.lk', password: 'admin', role: 'admin', name: 'System Admin' },
  { email: 'police@justiceflow.gov.lk', password: '123', role: 'police', name: 'OIC Perera' },
  { email: 'jmo@justiceflow.gov.lk', password: '123', role: 'jmo', name: 'Dr. Silva' },
  { email: 'judge@justiceflow.gov.lk', password: '123', role: 'judge', name: 'Hon. Magistrate' },
  { email: 'attorney@justiceflow.gov.lk', password: '123', role: 'attorney', name: 'Counsel Dias' }
];

// --- 2. LOCAL STORAGE LOADER ---
const loadUsers = () => {
  try {
    const saved = localStorage.getItem('justiceflow_users_final');
    if (!saved) return [];
    return JSON.parse(saved);
  } catch (error) {
    console.error("Local Storage Data Corrupted, resetting...", error);
    localStorage.removeItem('justiceflow_users_final'); 
    return [];
  }
};

export function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [view, setView] = useState<'role-select' | 'login'>('role-select');
  const [selectedRole, setSelectedRole] = useState('');
  
  // Login Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Users loaded from Local Storage
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    setUsers(loadUsers());
  }, []);

  // --- HANDLERS ---
  const handleRoleClick = (role: string) => {
    setSelectedRole(role);
    setEmail(`${role}@justiceflow.gov.lk`); 
    setPassword(''); // Clear password so you have to type the new one
    setView('login');
  };

  // *** THIS IS THE FIXED LOGIN LOGIC ***
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. PRIORITY CHECK: LOCAL STORAGE (The "Real" Database)
    // We check if this email exists in our saved data FIRST.
    const dbUser = users.find(u => u.email === email);

    if (dbUser) {
        // If the user exists in the DB, we MUST check against the DB password (the updated one).
        if (dbUser.password === password) {
            onLogin(dbUser);
        } else {
            // User found, but password wrong. 
            // DO NOT fallback to SYSTEM_ACCOUNTS, or the old password would work!
            alert("Incorrect Password. (Please use your Updated Password)");
        }
        return; 
    }

    // 2. FALLBACK CHECK: HARDCODED ACCOUNTS
    // This only runs if the user was NOT found in Local Storage.
    const systemUser = SYSTEM_ACCOUNTS.find(u => u.email === email && u.password === password);
    
    if (systemUser) {
      // AUTO-FIX: If logging in via hardcoded account, save them to LocalStorage now.
      // This ensures that when they update their password later, it has a record to update.
      const updatedUsers = [...users, systemUser];
      localStorage.setItem('justiceflow_users_final', JSON.stringify(updatedUsers));
      
      onLogin(systemUser); 
      return;
    }

    alert("ERROR: Invalid Credentials.\n\nPlease check your email/password.");
  };

  const handleForgotPassword = () => {
    alert("Please contact the System Administrator to update your password.");
  };

  // --- VIEWS ---
  if (view === 'role-select') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
             <Gavel className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">JusticeFlow</h1>
          <p className="text-slate-500 font-medium">Secure Digital Evidence Management System</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {/* POLICE */}
          <button onClick={() => handleRoleClick('police')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-600 flex items-center gap-4 hover:shadow-xl hover:scale-[1.02] transition-all group">
            <div className="bg-blue-50 p-4 rounded-full group-hover:bg-blue-100 transition-colors"><Shield className="text-blue-600" size={28} /></div>
            <div className="text-left">
                <h3 className="text-lg font-bold text-slate-800">Police Portal</h3>
                <p className="text-slate-400 text-sm font-medium">OIC / Constable</p>
            </div>
          </button>
          
          {/* JMO */}
          <button onClick={() => handleRoleClick('jmo')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-green-600 flex items-center gap-4 hover:shadow-xl hover:scale-[1.02] transition-all group">
            <div className="bg-green-50 p-4 rounded-full group-hover:bg-green-100 transition-colors"><Stethoscope className="text-green-600" size={28} /></div>
            <div className="text-left">
                <h3 className="text-lg font-bold text-slate-800">JMO Portal</h3>
                <p className="text-slate-400 text-sm font-medium">Medical Officer</p>
            </div>
          </button>
          
          {/* ATTORNEY */}
          <button onClick={() => handleRoleClick('attorney')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500 flex items-center gap-4 hover:shadow-xl hover:scale-[1.02] transition-all group">
            <div className="bg-amber-50 p-4 rounded-full group-hover:bg-amber-100 transition-colors"><User className="text-amber-600" size={28} /></div>
            <div className="text-left">
                <h3 className="text-lg font-bold text-slate-800">Attorney Portal</h3>
                <p className="text-slate-400 text-sm font-medium">Legal Counsel</p>
            </div>
          </button>
          
          {/* JUDGE */}
          <button onClick={() => handleRoleClick('judge')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-purple-800 flex items-center gap-4 hover:shadow-xl hover:scale-[1.02] transition-all group">
            <div className="bg-purple-50 p-4 rounded-full group-hover:bg-purple-100 transition-colors"><Gavel className="text-purple-800" size={28} /></div>
            <div className="text-left">
                <h3 className="text-lg font-bold text-slate-800">Magistrate</h3>
                <p className="text-slate-400 text-sm font-medium">Judicial Oversight</p>
            </div>
          </button>

          {/* ADMIN */}
          <button onClick={() => handleRoleClick('admin')} className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-red-600 flex items-center justify-center gap-4 hover:shadow-xl hover:scale-[1.02] transition-all group mt-2">
            <div className="bg-red-50 p-4 rounded-full group-hover:bg-red-100 transition-colors"><Settings className="text-red-600" size={28} /></div>
            <div className="text-left">
                <h3 className="text-lg font-bold text-slate-800">Admin Portal</h3>
                <p className="text-slate-400 text-sm font-medium">System Configuration & Management</p>
            </div>
          </button>
        </div>
        <div className="mt-12 text-center text-slate-400 text-xs">Protected by Government Secured Network (GSN) v2.0</div>
      </div>
    );
  }

  // --- LOGIN FORM VIEW ---
  return (
    <div className="min-h-screen flex bg-white font-sans">
      <div className="w-1/2 bg-slate-50 flex flex-col items-center justify-center border-r border-slate-200 hidden md:flex">
        <div className="w-32 h-32 rounded-full border-4 border-slate-900 flex items-center justify-center mb-8 shadow-2xl bg-white">
            <Gavel size={60} className="text-slate-900" />
        </div>
        <h2 className="text-2xl font-medium text-slate-600 mb-2">Welcome To </h2>
        <h1 className="text-5xl font-extrabold text-slate-900">JusticeFlow</h1>
      </div>

      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-10">
        <div className="w-full max-w-md border border-slate-200 rounded-2xl p-8 shadow-xl relative bg-white">
          <button onClick={() => setView('role-select')} className="absolute top-6 left-6 text-slate-400 flex items-center gap-1 text-sm hover:text-slate-800 transition-colors font-bold">
            <ArrowLeft size={16} /> Back
          </button>
          
          <div className="text-center mb-8 mt-4">
            <h2 className="text-3xl font-bold text-slate-800">Log In</h2>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mt-6 mb-4 shadow-inner
                ${selectedRole === 'admin' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
                {selectedRole === 'admin' ? <Settings size={40}/> : <User size={40}/>}
            </div>
            <p className={`text-sm font-bold uppercase tracking-wider ${selectedRole === 'admin' ? 'text-red-600' : 'text-blue-600'}`}>
                {selectedRole} Portal
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-slate-900 outline-none" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
              <div className="relative">
                <input 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full p-3 border rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-slate-900 outline-none pr-10" 
                />
                <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="text-right">
                <button type="button" onClick={handleForgotPassword} className="text-xs text-blue-600 hover:underline font-bold">
                    Forgot password?
                </button>
            </div>
            
            <button type="submit" className={`w-full text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl
                ${selectedRole === 'admin' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-black'}`}>
                <Lock size={18} /> {selectedRole === 'admin' ? 'ADMIN ACCESS' : 'SIGN IN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}