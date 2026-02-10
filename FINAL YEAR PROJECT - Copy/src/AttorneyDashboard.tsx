import React, { useState } from 'react';
import { Gavel, Search, X, User, FileText, Scale, AlertCircle, File, Lock, Eye, Calendar } from 'lucide-react';
import { executeSQLQuery } from './database';

export function AttorneyDashboard({ onLogout }: { onLogout: () => void }) {
  // SEARCH STATE
  const [searchId, setSearchId] = useState('');
  const [foundCase, setFoundCase] = useState<any | null>(null);
  const [error, setError] = useState('');

  // PREVIEW STATE
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  // PROFILE STATE
  const [showProfile, setShowProfile] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');

  // --- SEARCH LOGIC ---
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFoundCase(null);
    setPreviewDoc(null);

    const term = searchId.trim();
    if (!term) return setError("Please enter a Case ID.");

    // Retrieve data from the shared 'database'
    const allData = executeSQLQuery('SELECT');
    const match = allData.find((c: any) => c.id.toLowerCase() === term.toLowerCase());

    if (match) {
      setFoundCase(match);
    } else {
      setError("Restricted: Case ID not found or access denied.");
    }
  };

  // --- HELPER: Safely extract Judicial Data (Aggressive Search) ---
  const getJudicialInfo = () => {
    if (!foundCase) return null;

    // 1. Look for container objects
    const courtData = foundCase.courtData || foundCase.judicialData || {};
    
    // 2. Look for values in Root AND Containers
    const verdict = foundCase.verdict || courtData.verdict || foundCase.judicialVerdict;
    const remarks = foundCase.remarks || courtData.remarks || courtData.summary || foundCase.judicialRemarks;
    const sentence = foundCase.sentence || courtData.sentence;
    const nextDate = foundCase.nextHearing || courtData.nextHearing || foundCase.date || courtData.date;

    // 3. Determine if any data exists
    const hasData = !!(verdict || remarks || sentence);

    return {
      hasData,
      verdict,
      remarks: remarks || "No additional remarks recorded.",
      sentence,
      nextDate
    };
  };

  // --- HELPER: Safely extract JMO Data (Aggressive Search) ---
  const getMedicalInfo = () => {
    if (!foundCase) return null;

    // 1. Look for container objects (Handle variations like 'medicalReport', 'jmoReport')
    const med = foundCase.medicalReport || foundCase.jmoReport || foundCase.medical || {};
    
    // 2. Look for values in Root AND Containers
    const notes = med.notes || med.description || med.summary || med.observations || foundCase.medicalNotes;
    const documents = med.documents || med.files || med.attachments || [];

    return {
      hasData: !!(notes || documents.length > 0),
      notes: notes || "No medical observations recorded.",
      documents
    };
  };

  const judicialInfo = getJudicialInfo();
  const medicalInfo = getMedicalInfo();

  // --- PROFILE LOGIC ---
  const handleUpdatePassword = () => {
    setPassError('');
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/;
    if (!regex.test(newPass)) return setPassError("Min 8 chars, 1 Upper, 1 Lower, 1 Num, 1 Symbol");
    if (newPass !== confirmPass) return setPassError("Passwords do not match");
    alert("Password Updated Successfully");
    setShowProfile(false);
    onLogout();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* HEADER */}
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-slate-900"><Scale size={20} /></div>
          <div><h1 className="font-bold text-lg tracking-tight">JusticeFlow</h1><p className="text-[10px] uppercase tracking-widest text-slate-400">Attorney Portal</p></div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowProfile(true)} className="flex items-center gap-2 hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors">
            <div className="text-right hidden md:block"><p className="font-bold text-sm">Attorney at Law</p></div>
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center"><User size={16} /></div>
          </button>
          <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors">LOGOUT</button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full flex flex-col">
        
        {/* VIEW 1: SEARCH BAR */}
        {!foundCase ? (
          <div className="flex-1 flex flex-col items-center justify-center -mt-20">
            <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-lg text-center border border-slate-100">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <Lock size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Case Access</h2>
              <p className="text-slate-500 mb-8 text-sm">Enter the specific Case Number to retrieve evidentiary documents.</p>
              
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-4 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    value={searchId} 
                    onChange={(e) => setSearchId(e.target.value)} 
                    placeholder="Enter Case ID (e.g. POL-001)" 
                    className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-mono text-lg font-bold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all"
                  />
                </div>
                {error && <div className="flex items-center gap-2 text-red-500 text-sm font-bold justify-center bg-red-50 p-3 rounded-lg"><AlertCircle size={16}/> {error}</div>}
                <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-black shadow-lg transition-all">
                  Search Records
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* VIEW 2: CASE DETAILS */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* TOP BAR */}
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => {setFoundCase(null); setSearchId('');}} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors">
                <X size={18}/> Close & Search Another
              </button>
              <span className="px-4 py-1 bg-slate-200 rounded-full text-xs font-black uppercase text-slate-600">Read Only Mode</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT COL: CASE INFO & JUDICIAL */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* 1. Basic Info */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-xs font-black text-slate-400 uppercase mb-4">Case Overview</h3>
                  <div className="space-y-4">
                    <div><label className="text-[10px] uppercase font-bold text-slate-400">Case ID</label><p className="font-mono text-xl font-black text-amber-600">{foundCase.id}</p></div>
                    <div><label className="text-[10px] uppercase font-bold text-slate-400">Victim</label><p className="font-bold text-slate-800">{foundCase.victimName}</p></div>
                    <div><label className="text-[10px] uppercase font-bold text-slate-400">Status</label><p className="font-bold text-slate-800">{foundCase.status}</p></div>
                  </div>
                </div>

                {/* 2. Judicial Remarks */}
                <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                  <Gavel className="absolute right-[-20px] top-[-20px] text-slate-700 opacity-50" size={100} />
                  <h3 className="text-xs font-black text-amber-500 uppercase mb-4 relative z-10">Judicial Findings</h3>
                  
                  {judicialInfo && judicialInfo.hasData ? (
                    <div className="relative z-10 space-y-4">
                      {judicialInfo.verdict && (
                        <div>
                            <label className="text-[10px] text-slate-400 uppercase font-bold">Verdict</label>
                            <p className="text-lg font-bold text-white leading-tight">"{judicialInfo.verdict}"</p>
                        </div>
                      )}
                      
                      {judicialInfo.sentence && (
                         <div>
                            <label className="text-[10px] text-slate-400 uppercase font-bold">Sentence</label>
                            <p className="text-sm text-slate-200">{judicialInfo.sentence}</p>
                         </div>
                      )}

                      {judicialInfo.nextDate && (
                         <div className="flex items-center gap-2 mt-2 bg-slate-700/50 p-2 rounded">
                            <Calendar size={14} className="text-amber-500"/>
                            <span className="text-xs font-bold text-amber-500">Next Hearing: {judicialInfo.nextDate}</span>
                         </div>
                      )}

                      <div className="pt-2 border-t border-slate-700">
                        <label className="text-[10px] text-slate-500 uppercase font-bold">Remarks</label>
                        <p className="text-xs text-slate-400 italic mt-1">{judicialInfo.remarks}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative z-10 flex flex-col items-center justify-center py-6 text-slate-400">
                        <Scale size={32} className="mb-2 opacity-50"/>
                        <p className="text-xs font-bold">Pending Judicial Review</p>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COL: JMO / MEDICAL EVIDENCE */}
              <div className="lg:col-span-2 space-y-6">
                 <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 h-full">
                    <h3 className="text-sm font-black text-slate-800 uppercase mb-6 flex items-center gap-2"><FileText className="text-blue-600"/> JMO Medical Report</h3>
                    
                    {medicalInfo && medicalInfo.hasData ? (
                      <div className="space-y-8">
                        {/* Notes Section */}
                        <div>
                          <label className="text-xs font-black text-slate-400 uppercase mb-2 block">Medical Observations</label>
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 italic leading-relaxed">
                            "{medicalInfo.notes}"
                          </div>
                        </div>

                        {/* Documents Section */}
                        <div>
                           <label className="text-xs font-black text-slate-400 uppercase mb-3 block">Evidence Attachments</label>
                           
                           {medicalInfo.documents.length > 0 ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                               {medicalInfo.documents.map((doc: any, i: number) => (
                                 <div key={i} onClick={() => setPreviewDoc(doc)} className="flex items-center gap-3 p-3 border rounded-xl hover:bg-blue-50 cursor-pointer transition-all group">
                                   <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center"><File size={18}/></div>
                                   <div className="flex-1">
                                       <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{doc.name}</p>
                                       <p className="text-[10px] text-slate-400">{doc.type}</p>
                                   </div>
                                   <Eye size={16} className="text-slate-300 group-hover:text-blue-500" />
                                 </div>
                               ))}
                             </div>
                           ) : (
                               <div className="p-4 border-2 border-dashed border-slate-100 rounded-xl text-center">
                                   <p className="text-xs font-bold text-slate-300">No physical documents attached.</p>
                               </div>
                           )}
                        </div>
                      </div>
                    ) : (
                      <div className="h-64 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl">
                          <AlertCircle size={32} className="mb-2 opacity-20"/>
                          <p>No Medical Report Available</p>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- PREVIEW MODAL --- */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2"><FileText size={18}/> {previewDoc.name}</h3>
                <p className="text-xs text-slate-400">Evidence ID: {foundCase?.id}</p>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="bg-red-600 hover:bg-red-700 p-2 rounded-lg"><X size={18}/></button>
            </div>

            {/* Content Viewer */}
            <div className="flex-1 bg-slate-200 p-4 overflow-y-auto flex justify-center items-center">
               
               {/* 1. REAL FILE UPLOADED BY JMO */}
               {previewDoc.fileData ? (
                 <div className="w-full h-full flex items-center justify-center bg-white shadow-lg">
                   {/* If it is an Image */}
                   {previewDoc.type.includes('image') || previewDoc.name.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                       <img src={previewDoc.fileData} alt="Evidence" className="max-w-full max-h-full object-contain" />
                   ) : (
                       /* If it is a PDF or other file, use Object tag */
                       <object data={previewDoc.fileData} type="application/pdf" className="w-full h-full min-h-[500px]">
                          <div className="flex flex-col items-center justify-center h-full text-slate-500">
                             <p>Preview not available for this file type.</p>
                             <a href={previewDoc.fileData} download={previewDoc.name} className="mt-4 text-blue-600 underline">Download File</a>
                          </div>
                       </object>
                   )}
                 </div>
               ) : (
                 /* 2. FALLBACK SIMULATION */
                 <div className="bg-white shadow-xl w-full max-w-2xl min-h-[600px] p-10 relative flex flex-col items-center justify-center text-center">
                    <AlertCircle size={48} className="text-slate-300 mb-4"/>
                    <h2 className="text-xl font-bold text-slate-700">Preview Unavailable</h2>
                    <p className="text-slate-500 mt-2 max-w-md">The actual file content was not found. This can happen if the upload failed to save the Blob data.</p>
                    <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-lg text-left w-full">
                        <p className="text-xs font-bold uppercase text-slate-400 mb-2">Metadata Record:</p>
                        <p className="text-sm font-mono">Filename: {previewDoc.name}</p>
                        <p className="text-sm font-mono">Type: {previewDoc.type}</p>
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD MODAL */}
      {showProfile && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <button onClick={() => setShowProfile(false)} className="absolute top-4 right-4"><X/></button>
              <h2 className="font-bold text-lg mb-4">Security Settings</h2>
              <p className="text-sm text-slate-500">Password update functionality is active.</p>
           </div>
        </div>
      )}
    </div>
  );
}