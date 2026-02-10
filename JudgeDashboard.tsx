import React, { useState } from 'react';
import { Gavel, Search, AlertTriangle, FileText, Save, Upload, Calendar, X, LogOut } from 'lucide-react';
import { executeSQLQuery } from './database';

// --- GLOBAL CONSTANTS ---
// NOTE: Hardcoded court assignment for demonstration purposes. 
// In a production environment, this value would be retrieved from the authenticated user's session data.
const ASSIGNED_COURT = "Magistrate Court Fort"; 

export function JudgeDashboard({ onLogout }: { onLogout: () => void }) {
  
  // --- STATE MANAGEMENT ---
  // State variables for managing user input and current view context.
  const [searchId, setSearchId] = useState('');
  const [activeCase, setActiveCase] = useState<any>(null);
  
  // --- FORM INPUT STATES ---
  const [hearingNote, setHearingNote] = useState('');
  const [rulingStatus, setRulingStatus] = useState('');
  const [rulingReason, setRulingReason] = useState('');
  const [nextDate, setNextDate] = useState('');

  // --- SEARCH FUNCTIONALITY ---
  // Query the database for the specific case ID entered by the user.
  const handleSearch = () => {
    // Reset active case state to ensure clean data loading.
    setActiveCase(null);

    // 1. Retrieve all records. 
    // Note: In a real-world scenario, this should be a parameterized query to improve performance and security.
    const allCases = executeSQLQuery('SELECT');
    
    // 2. Perform a case-insensitive comparison to ensure robust search functionality.
    const found = allCases.find((c: any) => c.id.toLowerCase() === searchId.toLowerCase());

    if (!found) {
        alert("Error: Case ID does not exist in the registry.");
        return;
    }

    // 3. Authorization Check.
    // Verify that the retrieved case belongs to the judge's assigned jurisdiction to prevent unauthorized access.
    if (found.assignedCourt !== ASSIGNED_COURT) {
        alert(`ACCESS DENIED: You are not authorized to view cases from ${found.assignedCourt}.`);
        return;
    }

    // 4. Load valid case data into the active state.
    setActiveCase(found);
    
    // Initialize form fields with existing data to facilitate editing.
    setRulingStatus(found.status);
    setRulingReason(''); 
    setNextDate('');
    setHearingNote('');
    
    // Notify user of successful data retrieval.
    alert("Case loaded successfully.");
  };

  // --- UPDATE / SAVE FUNCTIONALITY ---
  // Persist the ruling updates to the data store.
  const saveRuling = () => {
    // Validation: Ensure a ruling status is selected before proceeding.
    if (!rulingStatus) {
        alert("Validation Error: Please select a ruling status.");
        return;
    }

    // Conditional Validation: Ensure 'Adjourned' cases have a next hearing date.
    if (rulingStatus === 'Adjourned' && !nextDate) {
        alert("Validation Error: A Next Hearing Date is required for adjourned cases.");
        return; 
    }
    // Conditional Validation: Ensure specific rulings have a documented reason.
    if ((rulingStatus === 'Case Dismissed' || rulingStatus === 'Referred to Higher Court') && !rulingReason) {
        alert("Validation Error: You must provide a valid reason for this ruling.");
        return;
    }

    // Construct a new history entry object with the current timestamp.
    const newHistoryEntry = {
        date: new Date().toISOString().split('T')[0],
        action: `Ruling: ${rulingStatus}`,
        details: rulingReason || hearingNote || "Status updated by Court", // Fallback text if description is empty
        nextDate: nextDate || null
    };

    // Update the local case object using ES6 spread syntax to maintain immutability.
    const updatedCase = {
        ...activeCase,
        status: rulingStatus,
        courtHistory: [...(activeCase.courtHistory || []), newHistoryEntry] // Append new entry to history array
    };

    // Execute database update.
    executeSQLQuery('UPDATE', updatedCase);
    
    // Update component state to reflect changes immediately in the UI.
    setActiveCase(updatedCase);
    
    // Reset input fields post-submission.
    setHearingNote('');
    setRulingReason('');
    setNextDate('');

    // Notify the user of successful transaction.
    alert("Record Updated Successfully. Relevant departments have been notified.");
  };

  return (
    <div className="min-h-screen bg-amber-50 font-sans text-slate-900 relative">
        
        {/* HEADER SECTION */}
        <header className="bg-slate-900 text-amber-500 p-4 flex justify-between items-center shadow-lg border-b-4 border-amber-600">
            <div className="flex items-center gap-3">
                <div className="bg-amber-500 text-slate-900 p-2 rounded">
                    <Gavel size={24} />
                </div>
                <div>
                    <h1 className="font-bold text-xl uppercase tracking-tighter text-white">Judicial Bench</h1>
                    {/* Display the constant court assignment */}
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">{ASSIGNED_COURT}</p>
                </div>
            </div>
            <button onClick={onLogout} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 px-4 py-2 rounded-lg">
                <LogOut size={14}/> EXIT SESSION
            </button>
        </header>

        <main className="p-8 max-w-6xl mx-auto">
            
            {/* SEARCH INTERFACE - Displayed when no case is active */}
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
                            // Event listener to trigger search on 'Enter' key press for better UX.
                            onKeyDown={e => e.key === 'Enter' && handleSearch()} 
                            className="w-full p-6 pl-6 text-xl font-mono border-4 border-white shadow-xl rounded-2xl outline-none focus:border-amber-500 transition-all"
                        />
                        <button onClick={handleSearch} className="absolute right-3 top-3 bottom-3 bg-amber-500 hover:bg-amber-600 text-white px-8 rounded-xl font-black uppercase">
                            Search
                        </button>
                    </div>
                </div>
            )}

            {/* MAIN WORKSPACE - Displayed upon successful case retrieval */}
            {activeCase && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column: Display read-only case details and historical data. */}
                    <div className="lg:col-span-2 space-y-6">
                        <button onClick={() => setActiveCase(null)} className="text-xs font-black text-slate-400 hover:text-amber-600 uppercase flex items-center gap-2 mb-2">
                            <X size={14}/> Close Case
                        </button>

                        {/* CASE DETAILS CARD */}
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

                        {/* PARTIES INVOLVED GRID */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="font-black text-xs uppercase text-slate-400 mb-4">Involved Parties</h3>
                                <div className="space-y-3">
                                    {/* Iterate through the parties array. Optional chaining is used to handle potential undefined values safely. */}
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

                        {/* PROCEDURAL HISTORY */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="font-black text-xs uppercase text-slate-400 mb-4">Court Proceedings History</h3>
                            <div className="space-y-4">
                                {/* Conditional rendering to handle empty history states */}
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

                    {/* Right Column: Input form for judicial rulings and updates. */}
                    <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl h-fit sticky top-6">
                        <h3 className="font-black text-amber-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Gavel size={20}/> Court Order
                        </h3>

                        <div className="space-y-6">
                            {/* RULING STATUS SELECTOR */}
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

                            {/* CONDITIONAL RENDER: DATE PICKER 
                                Conditional Rendering: Display date picker only when the status is set to 'Adjourned'.
                            */}
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

                            {/* CONDITIONAL RENDER: REASON TEXTAREA 
                                Display reasoning field only for dismissal or referral actions.
                            */}
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

                            {/* HEARING NOTES */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Hearing Notes / Comments</label>
                                <textarea 
                                    value={hearingNote}
                                    onChange={e => setHearingNote(e.target.value)}
                                    placeholder="Add notes to the court record..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm h-24 outline-none focus:border-amber-500"
                                />
                            </div>

                            {/* DOCUMENT UPLOAD */}
                            {/* Placeholder for document upload functionality (Back-end implementation pending). */}
                            <div>
                                <label className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-3 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-2 border border-slate-700 border-dashed transition-all">
                                    <Upload size={16} className="text-amber-500"/> Upload Court Document
                                    <input type="file" className="hidden" />
                                </label>
                            </div>

                            {/* SUBMIT BUTTON */}
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