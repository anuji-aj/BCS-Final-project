import React, { useState } from 'react';
import { Gavel, Search, AlertTriangle, FileText, Save, Upload, Calendar, X, LogOut, ShieldAlert } from 'lucide-react';
import { executeSQLQuery } from './database';

// --- ADMIN SETTING SIMULATION ---
// Since Admin assignment isn't done yet, we HARDCODE the court here.
// The Judge cannot change this. 
const ASSIGNED_COURT = "Magistrate Court Fort"; 

export function JudgeDashboard({ onLogout }: { onLogout: () => void }) {
  // --- STATE 1: SEARCH & DATA ---
  const [searchId, setSearchId] = useState('');
  const [activeCase, setActiveCase] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // --- STATE 2: JUDICIAL ACTIONS ---
  const [hearingNote, setHearingNote] = useState('');
  const [rulingStatus, setRulingStatus] = useState('');
  const [rulingReason, setRulingReason] = useState('');
  const [nextDate, setNextDate] = useState('');

  // --- SEARCH LOGIC (STRICT JURISDICTION CHECK) ---
  const handleSearch = () => {
    setErrorMsg('');
    setActiveCase(null);

    // 1. Get all data
    const allCases = executeSQLQuery('SELECT');
    
    // 2. Find the specific case
    const found = allCases.find((c: any) => c.id.toLowerCase() === searchId.toLowerCase());

    if (!found) {
        setErrorMsg("Case ID not found in the National Registry.");
        return;
    }

    // 3. SECURITY CHECK: Does this case belong to THIS JUDGE'S court?
    // We compare against the hardcoded ASSIGNED_COURT
    if (found.assignedCourt !== ASSIGNED_COURT) {
        setErrorMsg(`ACCESS DENIED: This case belongs to '${found.assignedCourt}'. You only have jurisdiction over '${ASSIGNED_COURT}'.`);
        return;
    }

    // 4. Success
    setActiveCase(found);
    
    // Reset form fields based on loaded case
    setRulingStatus(found.status);
    setRulingReason('');
    setNextDate('');
    setHearingNote('');
  };

  // --- UPDATE LOGIC ---
  const saveRuling = () => {
    if (!rulingStatus) return;

    // Validation
    if (rulingStatus === 'Adjourned' && !nextDate) return alert("Please select the Next Hearing Date.");
    if ((rulingStatus === 'Case Dismissed' || rulingStatus === 'Referred to Higher Court') && !rulingReason) return alert("Please provide a reason for this ruling.");

    // Create History Entry
    const newHistoryEntry = {
        date: new Date().toISOString().split('T')[0],
        action: `Ruling: ${rulingStatus}`,
        details: rulingReason || hearingNote || "Status updated by Court",
        nextDate: nextDate || null
    };

    // Update Object
    const updatedCase = {
        ...activeCase,
        status: rulingStatus,
        courtHistory: [...(activeCase.courtHistory || []), newHistoryEntry]
    };

    // Save to DB
    executeSQLQuery('UPDATE', updatedCase);
    
    // Refresh View
    setActiveCase(updatedCase);
    alert("Court Order Saved & Police Notified.");
    setHearingNote('');
    setRulingReason('');
    setNextDate('');
  };

  // --- MAIN DASHBOARD (No Login Screen, Immediate Access) ---
  return (
    <div className="min-h-screen bg-amber-50 font-sans text-slate-900">
        
        {/* HEADER */}
        <header className="bg-slate-900 text-amber-500 p-4 flex justify-between items-center shadow-lg border-b-4 border-amber-600">
            <div className="flex items-center gap-3">
                <div className="bg-amber-500 text-slate-900 p-2 rounded">
                    <Gavel size={24} />
                </div>
                <div>
                    <h1 className="font-bold text-xl uppercase tracking-tighter text-white">Judicial Bench</h1>
                    {/* Display the Hardcoded Court Name */}
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">{ASSIGNED_COURT}</p>
                </div>
            </div>
            <button onClick={onLogout} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 px-4 py-2 rounded-lg">
                <LogOut size={14}/> EXIT SESSION
            </button>
        </header>

        <main className="p-8 max-w-6xl mx-auto">
            
            {/* SEARCH AREA (Shown when no case is active) */}
            {!activeCase && (
                <div className="max-w-2xl mx-auto mt-20 text-center space-y-6">
                    <h2 className="text-3xl font-black uppercase text-slate-800">Case Lookup</h2>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Searching Database for: <span className="text-amber-600">{ASSIGNED_COURT}</span></p>
                    
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Enter Case ID (e.g., CRIM-1234)" 
                            value={searchId}
                            onChange={e => setSearchId(e.target.value)}
                            className="w-full p-6 pl-6 text-xl font-mono border-4 border-white shadow-xl rounded-2xl outline-none focus:border-amber-500 transition-all"
                        />
                        <button onClick={handleSearch} className="absolute right-3 top-3 bottom-3 bg-amber-500 hover:bg-amber-600 text-white px-8 rounded-xl font-black uppercase">Search</button>
                    </div>
                    {errorMsg && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-r shadow-md flex items-center justify-center gap-3 font-bold animate-pulse">
                            <ShieldAlert size={24}/> {errorMsg}
                        </div>
                    )}
                </div>
            )}

            {/* CASE WORKSPACE */}
            {activeCase && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* LEFT: READ ONLY DATA */}
                    <div className="lg:col-span-2 space-y-6">
                        <button onClick={() => setActiveCase(null)} className="text-xs font-black text-slate-400 hover:text-amber-600 uppercase flex items-center gap-2 mb-2">
                            <X size={14}/> Close Case
                        </button>

                        {/* Case Header Card */}
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-slate-900 text-white text-xs font-black px-4 py-2 rounded-bl-xl uppercase">
                                Status: {activeCase.status}
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 mb-1">{activeCase.id}</h2>
                            <p className="text-slate-500 font-bold text-sm uppercase flex gap-4">
                                <span>{activeCase.date}</span>
                                <span>•</span>
                                <span>{activeCase.venue}</span>
                            </p>
                            
                            <div className="mt-6 bg-slate-50 p-6 rounded-2xl border border-slate-100 italic text-slate-700">
                                "{activeCase.desc}"
                            </div>
                        </div>

                        {/* Parties & Evidence */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="font-black text-xs uppercase text-slate-400 mb-4">Involved Parties</h3>
                                <div className="space-y-3">
                                    {activeCase.parties?.map((p:any, i:number) => (
                                        <div key={i} className="border-l-4 border-amber-400 pl-3">
                                            <p className="font-bold text-sm">{p.name}</p>
                                            <p className="text-xs text-slate-500">{p.role} • {p.nic}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="font-black text-xs uppercase text-slate-400 mb-4">Police Evidence</h3>
                                <div className="flex flex-wrap gap-2">
                                    {activeCase.evidence?.map((f:string, i:number) => (
                                        <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold border border-blue-100 flex items-center gap-1">
                                            <FileText size={12}/> {f}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Court History Log */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="font-black text-xs uppercase text-slate-400 mb-4">Court Proceedings History</h3>
                            <div className="space-y-4">
                                {activeCase.courtHistory?.length > 0 ? activeCase.courtHistory.map((h:any, i:number) => (
                                    <div key={i} className="flex gap-4 text-sm">
                                        <div className="font-mono text-slate-400 text-xs w-20 pt-1">{h.date}</div>
                                        <div>
                                            <p className="font-bold text-slate-800">{h.action}</p>
                                            <p className="text-slate-600">{h.details}</p>
                                            {h.nextDate && <p className="text-amber-600 font-bold text-xs mt-1">Next Hearing: {h.nextDate}</p>}
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-slate-300 text-sm font-bold italic">No prior proceedings recorded.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: ACTION PANEL */}
                    <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl h-fit sticky top-6">
                        <h3 className="font-black text-amber-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Gavel size={20}/> Court Order
                        </h3>

                        <div className="space-y-6">
                            
                            {/* 1. Status Dropdown */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Judicial Ruling / Status</label>
                                <select 
                                    value={rulingStatus} 
                                    onChange={e => setRulingStatus(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-amber-500"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Adjourned">Adjourned (Next Hearing)</option>
                                    <option value="Referred to Higher Court">Refer to Higher Court</option>
                                    <option value="Case Dismissed">Dismiss Case</option>
                                    <option value="Closed">Close Case</option>
                                </select>
                            </div>

                            {/* 2. Dynamic Inputs based on Status */}
                            {rulingStatus === 'Adjourned' && (
                                <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/30 animate-in fade-in">
                                    <label className="text-[10px] font-bold text-amber-400 uppercase mb-2 block flex items-center gap-2"><Calendar size={12}/> Next Hearing Date</label>
                                    <input 
                                        type="date" 
                                        value={nextDate}
                                        onChange={e => setNextDate(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white font-bold text-sm"
                                    />
                                </div>
                            )}

                            {(rulingStatus === 'Case Dismissed' || rulingStatus === 'Referred to Higher Court') && (
                                <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/30 animate-in fade-in">
                                    <label className="text-[10px] font-bold text-red-400 uppercase mb-2 block flex items-center gap-2"><AlertTriangle size={12}/> Reason for Order</label>
                                    <textarea 
                                        value={rulingReason}
                                        onChange={e => setRulingReason(e.target.value)}
                                        placeholder="Enter legal reasoning..."
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white text-sm h-24"
                                    />
                                </div>
                            )}

                            {/* 3. General Comments */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Hearing Notes / Comments</label>
                                <textarea 
                                    value={hearingNote}
                                    onChange={e => setHearingNote(e.target.value)}
                                    placeholder="Add notes to the court record..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm h-24 outline-none focus:border-amber-500"
                                />
                            </div>

                            {/* 4. File Upload */}
                            <div>
                                <label className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-3 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-2 border border-slate-700 border-dashed transition-all">
                                    <Upload size={16} className="text-amber-500"/> Upload Court Document
                                    <input type="file" className="hidden" />
                                </label>
                            </div>

                            {/* 5. Submit Button */}
                            <button 
                                onClick={saveRuling}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-black uppercase py-4 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
                            >
                                <Save size={18}/> Update Record
                            </button>

                        </div>
                    </div>
                </div>
            )}
        </main>
    </div>
  );
}