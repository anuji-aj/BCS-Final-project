import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Trash2, FileText, LogOut, Key, Stethoscope, Save, Upload, AlertCircle, Clock, Calendar, Activity } from 'lucide-react';
import { executeSQLQuery } from './database';

// THIS JMO IS ASSIGNED TO THIS HOSPITAL
const CURRENT_HOSPITAL = "National Hospital Colombo";

export function JMODashboard({ onLogout }: { onLogout: () => void }) {
  // --- CORE STATE ---
  // We no longer store just 'cases', we store 'patientRecords' which links a case to a specific person
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // --- WORKSPACE STATE ---
  const [victimStatus, setVictimStatus] = useState('In Hospital');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [docType, setDocType] = useState('Medical Report'); // NEW: Doc Type Selection
  const [jmoDocs, setJmoDocs] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- FILTER STATE (NEW) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Date Logic: Get Today's date to prevent future dates
  const today = new Date().toISOString().split('T')[0];

  // --- LOAD DATA ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
        const allCases = executeSQLQuery('SELECT');
        const records: any[] = [];

        // FLATTEN LOGIC: Incident -> Parties -> Hospitalized Parties -> Individual Rows
        allCases.forEach((c: any) => {
            if (c.parties) {
                c.parties.forEach((p: any, index: number) => {
                    // REQUIREMENT 4: Filter by IsHospitalized AND Matching Hospital Location
                    if (p.isHospitalized && p.hospitalName === CURRENT_HOSPITAL) {
                        records.push({
                            uniqueId: `${c.id}-${index}`, // Unique Ref for UI
                            caseData: c,
                            partyData: p,
                            partyIndex: index
                        });
                    }
                });
            }
        });
        setPatientRecords(records);
    } catch (e) {
        setPatientRecords([]);
    }
  };

  const openWorkspace = (record: any) => {
    setSelectedRecord(record);
    
    // Check if THIS specific person already has a report
    const existingReport = record.partyData.medicalReport;

    if(existingReport) {
        setVictimStatus(existingReport.status);
        setMedicalNotes(existingReport.notes);
        setJmoDocs(existingReport.documents || []);
    } else {
        setVictimStatus('In Hospital');
        setMedicalNotes('');
        setJmoDocs([]);
    }
  };

  // --- FILE UPLOAD LOGIC ---
  const addFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 500000) return alert("⚠️ File too large! Max 500KB.");

      const reader = new FileReader();
      reader.onloadend = () => {
        setJmoDocs([...jmoDocs, { 
            name: file.name, 
            type: docType, // REQUIREMENT 2: Use selected type
            date: new Date().toISOString().split('T')[0],
            fileData: reader.result as string 
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitReport = () => {
    if(!selectedRecord) return;
    
    const report = { 
        status: victimStatus, 
        notes: medicalNotes, 
        documents: jmoDocs, 
        updatedDate: new Date().toISOString().split('T')[0],
        officer: 'Dr. Perera (JMO)' 
    };

    // DEEP UPDATE: We need to update the specific party inside the case
    const caseToUpdate = { ...selectedRecord.caseData };
    caseToUpdate.parties[selectedRecord.partyIndex] = {
        ...caseToUpdate.parties[selectedRecord.partyIndex],
        medicalReport: report // Save report to the PERSON, not the case
    };
    
    executeSQLQuery('UPDATE', caseToUpdate);
    alert("Medical Report Submitted for " + selectedRecord.partyData.name);
    setSelectedRecord(null);
    loadData();
  };

  // --- FILTER LOGIC (NEW) ---
  const filteredRecords = patientRecords.filter(rec => {
      const s = searchTerm.toLowerCase();
      // Search: Case ID OR Patient Name OR Patient NIC
      const matchesSearch = (
          rec.caseData.id?.toLowerCase().includes(s) ||
          rec.partyData.name?.toLowerCase().includes(s) ||
          rec.partyData.nic?.toLowerCase().includes(s)
      );

      // Date Range: Checks Reported Date
      const d = rec.caseData.date;
      const matchesDate = (startDate ? d >= startDate : true) && (endDate ? d <= endDate : true);

      return matchesSearch && matchesDate;
  });

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
       
       {/* HEADER */}
       <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-xl relative z-50">
        <div className="flex items-center gap-3">
          <Stethoscope className="text-emerald-400" />
          <h1 className="font-bold text-xl uppercase tracking-tighter">JusticeFlow <span className="text-slate-500 text-xs ml-2">JMO PORTAL</span></h1>
        </div>
        
        <div className="relative">
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 p-2 px-4 rounded-xl border border-slate-700 transition-all">
            <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center font-black text-xs">DR</div>
            <User size={18} />
          </button>
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border text-slate-800 overflow-hidden z-[60]">
               <div className="p-4 bg-slate-50 border-b"><p className="text-[10px] uppercase font-black text-slate-400">Account</p><p className="font-bold text-sm">Chief JMO Officer</p><p className="text-[10px] text-emerald-600 font-bold">{CURRENT_HOSPITAL}</p></div>
               <button className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 font-bold text-sm"><Key size={16}/> Change Password</button>
               <button onClick={onLogout} className="w-full flex items-center gap-3 p-4 hover:bg-red-50 text-red-600 font-bold text-sm border-t"><LogOut size={16}/> Logout</button>
            </div>
          )}
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
            <h2 className="text-3xl font-black uppercase text-slate-800 mb-2">Pending Reviews</h2>
            <p className="text-slate-500 font-bold text-sm mb-6">Location: {CURRENT_HOSPITAL}</p>

            {/* FILTERS BAR (NEW) */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                    <input 
                        type="text" 
                        placeholder="Search Name, NIC or Case ID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
                    />
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-slate-400 px-2">Reported:</span>
                    <input type="date" max={today} value={startDate} onChange={e=>setStartDate(e.target.value)} className="p-2 border rounded-lg text-xs font-bold bg-white outline-none"/>
                    <span className="text-slate-400">-</span>
                    <input type="date" max={today} value={endDate} onChange={e=>setEndDate(e.target.value)} className="p-2 border rounded-lg text-xs font-bold bg-white outline-none"/>
                </div>
                 {(searchTerm || startDate || endDate) && (
                    <button onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); }} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><X size={18}/></button>
                )}
            </div>
        </div>

        {/* TABLE VIEW */}
        <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50 border-b">
              <tr className="text-[11px] font-black text-slate-400 uppercase">
                <th className="p-5 text-left">Case Ref</th>
                <th className="p-5 text-left">Patient Name</th>
                <th className="p-5 text-left">Reported Date</th>
                <th className="p-5 text-left text-emerald-700">Last Update</th> 
                <th className="p-5 text-left">Condition</th> {/* NEW COLUMN HEADER */}
                <th className="p-5 text-left">Status</th>
                <th className="p-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredRecords.map(rec => (
                <tr key={rec.uniqueId} className="hover:bg-emerald-50/50 transition-colors text-sm font-bold">
                    <td className="p-5 text-emerald-700 font-mono">{rec.caseData.id}</td>
                    <td className="p-5 uppercase">
                        {rec.partyData.name}
                        <span className="block text-[10px] text-slate-400 font-normal">NIC: {rec.partyData.nic}</span>
                    </td>
                    <td className="p-5 text-slate-500">{rec.caseData.date}</td>
                    
                    {/* LAST UPDATED COLUMN */}
                    <td className="p-5">
                         {rec.partyData.medicalReport?.updatedDate ? (
                            <span className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md w-fit text-xs">
                                <Clock size={12}/> {rec.partyData.medicalReport.updatedDate}
                            </span>
                        ) : (
                            <span className="text-slate-300 text-[10px] italic">No updates</span>
                        )}
                    </td>

                    {/* NEW CONDITION COLUMN */}
                    <td className="p-5">
                        <span className={`flex items-center gap-2 px-2 py-1 rounded-md w-fit text-xs font-black uppercase ${
                            !rec.partyData.medicalReport?.status ? 'text-slate-400 bg-slate-100' :
                            rec.partyData.medicalReport.status.includes('Critical') ? 'text-red-600 bg-red-50' :
                            rec.partyData.medicalReport.status.includes('Deceased') ? 'text-slate-100 bg-slate-800' :
                            rec.partyData.medicalReport.status.includes('Discharged') ? 'text-blue-600 bg-blue-50' :
                            'text-emerald-600 bg-emerald-50'
                        }`}>
                           <Activity size={12}/> {rec.partyData.medicalReport?.status || "Pending"}
                        </span>
                    </td>

                    <td className="p-5">
                        {rec.partyData.medicalReport ? (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] uppercase">Examined</span>
                        ) : (
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] uppercase animate-pulse">Action Required</span>
                        )}
                    </td>
                    <td className="p-5 text-center">
                        <button onClick={() => openWorkspace(rec)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-black hover:bg-emerald-600 transition-all shadow-lg flex items-center gap-2 mx-auto">
                            <Stethoscope size={14} /> EXAMINE
                        </button>
                    </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400 font-bold">No records found matching your criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* JMO WORKSPACE MODAL */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Header */}
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <div>
                  <h2 className="font-black uppercase text-slate-800 tracking-tight text-xl flex items-center gap-2">
                    <AlertCircle className="text-emerald-500"/> Medical Examination
                  </h2>
                  <p className="text-xs text-slate-400 font-bold uppercase mt-1">Ref: {selectedRecord.caseData.id} / Patient: {selectedRecord.partyData.name}</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="bg-slate-200 p-2 rounded-full hover:bg-red-500 hover:text-white transition-all"><X size={18}/></button>
            </div>

            {/* Content */}
            <div className="p-10 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
                
                {/* Left: Case Info */}
                <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Patient Details</label>
                        <div className="text-xl font-black text-slate-800 mb-1">
                            {selectedRecord.partyData.name}
                        </div>
                        <div className="text-sm font-bold text-slate-500">
                             NIC: {selectedRecord.partyData.nic}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Police Incident Summary</label>
                        <div className="p-4 border rounded-2xl bg-white text-sm text-slate-600 font-medium">
                            {selectedRecord.caseData.desc}
                        </div>
                    </div>
                </div>

                {/* Right: Medical Form */}
                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Current Condition</label>
                        <select value={victimStatus} onChange={e=>setVictimStatus(e.target.value)} className="w-full p-4 border rounded-2xl font-bold bg-white outline-none focus:ring-2 focus:ring-emerald-200">
                            <option>In Hospital - Stable</option>
                            <option>In Hospital - Critical</option>
                            <option>Discharged</option>
                            <option>Deceased</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Medical Observations</label>
                        <textarea 
                            value={medicalNotes} 
                            onChange={e=>setMedicalNotes(e.target.value)} 
                            className="w-full p-4 border rounded-2xl h-40 font-medium outline-none focus:ring-2 focus:ring-emerald-200" 
                            placeholder="Enter detailed medical findings..."
                        ></textarea>
                    </div>

                    <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl">
                        <div className="mb-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase block mb-2">Upload Attachments</span>
                            
                            {/* REQUIREMENT 2: Select Document Type First */}
                            <div className="flex gap-2 mb-2">
                                <select 
                                    value={docType} 
                                    onChange={(e) => setDocType(e.target.value)}
                                    className="p-2 rounded-lg border text-xs font-bold outline-none flex-1"
                                >
                                    <option>Medical Report</option>
                                    <option>X-Ray Scan</option>
                                    <option>Lab Result</option>
                                    <option>Forensic Image</option>
                                </select>
                                <button onClick={()=>fileInputRef.current?.click()} className="bg-emerald-600 text-white font-bold text-xs px-3 rounded-lg flex items-center gap-1 hover:bg-emerald-700"><Upload size={14}/> ADD</button>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={addFile} className="hidden" />
                        </div>

                        <div className="space-y-2">
                            {jmoDocs.map((d, i) => (
                                <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700 flex items-center gap-2"><FileText size={14} className="text-emerald-500"/> {d.name}</span>
                                        <span className="text-[10px] text-slate-400 ml-6 uppercase">{d.type}</span>
                                    </div>
                                    <button onClick={()=>setJmoDocs(jmoDocs.filter((_,x)=>x!==i))}><Trash2 size={14} className="text-red-400"/></button>
                                </div>
                            ))}
                            {jmoDocs.length === 0 && <p className="text-xs text-center text-slate-400 italic">No documents attached.</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t bg-slate-50 flex justify-end">
                <button onClick={submitReport} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl flex items-center gap-2">
                    <Save size={18} /> SUBMIT OFFICIAL REPORT
                </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}