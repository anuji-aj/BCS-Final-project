import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, X, User, Trash2, FileText, LogOut, Key, 
  Stethoscope, Save, Upload, AlertCircle, Clock, 
  Activity, CheckCircle, Filter 
} from 'lucide-react';
import { executeSQLQuery } from './database';

// --- CONFIGURATION ---
// In a real production environment, this constant would be derived from the 
// authenticated user's session token (JWT) to enforce data segregation.
const CURRENT_HOSPITAL = "National Hospital Colombo";

export function JMODashboard({ onLogout }: { onLogout: () => void }) {
  
  // --- STATE MANAGEMENT: DATA & RECORDS ---
  // We store 'patientRecords' instead of raw cases. This involves flattening the 
  // hierarchical case data into a flat list of patients for the table view.
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // --- STATE MANAGEMENT: FILTERING & SEARCH ---
  // Client-side filtering state to handle searching without repeated API/DB calls.
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- STATE MANAGEMENT: FORM & WORKSPACE ---
  // These states handle the controlled inputs within the Medical Examination Modal.
  const [victimStatus, setVictimStatus] = useState('In Hospital');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [docType, setDocType] = useState('Medical Report');
  const [jmoDocs, setJmoDocs] = useState<any[]>([]);
  
  // --- STATE MANAGEMENT: UI ---
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Custom Toast Notification State
  const [notification, setNotification] = useState<{show: boolean, msg: string, type: 'success' | 'error'}>({
    show: false, msg: '', type: 'success'
  });

  // Utility: Date for "max" attribute to prevent future date selection
  const today = new Date().toISOString().split('T')[0];

  // --- LIFECYCLE HOOKS ---
  useEffect(() => {
    loadAndNormalizeData();
  }, []);

  // --- HELPER FUNCTIONS ---

  /**
   * Shows a temporary feedback message to the user.
   * Improves UX over native browser 'alert()'.
   */
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, msg: message, type });
    setTimeout(() => setNotification({ show: false, msg: '', type: 'success' }), 3000);
  };

  /**
   * DATA TRANSFORMATION LAYER
   * The database returns 'Cases' (Incidents), but a JMO dashboard needs to display 'Patients'.
   * * Logic:
   * 1. Fetch all cases.
   * 2. Iterate through the 'parties' array in each case.
   * 3. Filter for parties where isHospitalized === true AND hospitalName matches the current user's location.
   * 4. Flatten this into a single array of patient objects for the Data Table.
   */
  const loadAndNormalizeData = () => {
    try {
        const allCases = executeSQLQuery('SELECT');
        const records: any[] = [];

        allCases.forEach((c: any) => {
            if (c.parties && Array.isArray(c.parties)) {
                c.parties.forEach((p: any, index: number) => {
                    // FILTER LOGIC: Strict check for location authorization
                    if (p.isHospitalized && p.hospitalName === CURRENT_HOSPITAL) {
                        records.push({
                            uniqueId: `${c.id}-${index}`, // Composite Key for React rendering
                            caseData: c,
                            partyData: p,
                            partyIndex: index // Preserved to allow updates to the correct array index later
                        });
                    }
                });
            }
        });
        setPatientRecords(records);
    } catch (e) {
        console.error("Data Load Error:", e);
        showNotification("Failed to load patient records.", "error");
        setPatientRecords([]);
    }
  };

  /**
   * Initializes the workspace modal.
   * If a report already exists for this patient, populate the state with existing data.
   * Otherwise, reset the form for a fresh entry.
   */
  const openWorkspace = (record: any) => {
    setSelectedRecord(record);
    
    // Check for existing persistence data
    const existingReport = record.partyData.medicalReport;

    if(existingReport) {
        setVictimStatus(existingReport.status);
        setMedicalNotes(existingReport.notes);
        setJmoDocs(existingReport.documents || []);
    } else {
        // Reset to defaults for new report
        setVictimStatus('In Hospital');
        setMedicalNotes('');
        setJmoDocs([]);
    }
  };

  /**
   * FILE HANDLING SYSTEM
   * Converts uploaded files into Base64 Data URLs.
   * * Rationale:
   * Since this prototype lacks a cloud storage backend (like AWS S3), we store
   * the file binary data directly in the JSON structure as a string.
   * A size limit of 500KB is enforced to prevent local storage quota overflow.
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validation: Size Check
      if (file.size > 500000) {
          showNotification("File too large! Maximum limit is 500KB.", "error");
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        // State Update: functional update pattern not strictly necessary here but good practice
        setJmoDocs(prev => [...prev, { 
            name: file.name, 
            type: docType, // Captures the dropdown value selected by user
            date: new Date().toISOString().split('T')[0],
            fileData: reader.result as string 
        }]);
        showNotification("Document attached successfully.", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * DATABASE UPDATE TRANSACTION
   * Performs a "Deep Update" on the nested data structure.
   */
  const submitReport = () => {
    if(!selectedRecord) return;
    
    // 1. Construct the payload
    const reportPayload = { 
        status: victimStatus, 
        notes: medicalNotes, 
        documents: jmoDocs, 
        updatedDate: new Date().toISOString().split('T')[0],
        officer: 'Dr. Perera (JMO)',
        location: CURRENT_HOSPITAL
    };

    try {
        // 2. IMMUTABILITY HANDLER: Create a shallow copy of the case object
        const caseToUpdate = { ...selectedRecord.caseData };
        
        // 3. Deep copy the parties array to avoid mutating the original reference
        const updatedParties = [...caseToUpdate.parties];
        
        // 4. Update the specific index associated with this patient
        updatedParties[selectedRecord.partyIndex] = {
            ...updatedParties[selectedRecord.partyIndex],
            medicalReport: reportPayload
        };

        // 5. Reassign the updated array back to the case object
        caseToUpdate.parties = updatedParties;
        
        // 6. Commit to Database
        executeSQLQuery('UPDATE', caseToUpdate);
        
        showNotification(`Medical Report submitted for ${selectedRecord.partyData.name}`, "success");
        setSelectedRecord(null); // Close Modal
        loadAndNormalizeData();  // Refresh Table
    } catch (err) {
        showNotification("Database Transaction Failed.", "error");
    }
  };

  /**
   * CLIENT-SIDE FILTERING ENGINE
   * Filters the 'patientRecords' array based on Search Term AND Date Range.
   */
  const filteredRecords = patientRecords.filter(rec => {
      const s = searchTerm.toLowerCase();
      
      // Search logic: checks Case ID, Name, or NIC
      const matchesSearch = (
          rec.caseData.id?.toLowerCase().includes(s) ||
          rec.partyData.name?.toLowerCase().includes(s) ||
          rec.partyData.nic?.toLowerCase().includes(s)
      );

      // Date logic: checks against the Incident Date
      const d = rec.caseData.date;
      const matchesDate = (startDate ? d >= startDate : true) && (endDate ? d <= endDate : true);

      return matchesSearch && matchesDate;
  });

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 relative">
       
       {/* --- NOTIFICATION TOAST --- */}
       {notification.show && (
        <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border-2 animate-bounce
            ${notification.type === 'error' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-green-100 border-green-500 text-green-700'}`}>
            {notification.type === 'error' ? <AlertCircle size={24}/> : <CheckCircle size={24}/>}
            <span className="font-bold">{notification.msg}</span>
        </div>
       )}

       {/* --- HEADER COMPONENT --- */}
       <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
             <Stethoscope className="text-emerald-400" size={20} />
          </div>
          <div>
              <h1 className="font-bold text-lg tracking-tighter uppercase">JusticeFlow</h1>
              <p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">JMO Medical Portal</p>
          </div>
        </div>
        
        <div className="relative">
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 p-2 px-4 rounded-xl border border-slate-700 transition-all">
            <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-slate-300">Dr. Perera</p>
                <p className="text-[10px] text-slate-500 uppercase">Chief Medical Officer</p>
            </div>
            <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center font-black text-xs text-white border-2 border-slate-900 shadow-sm">DR</div>
          </button>
          
          {/* Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-800 overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2">
               <div className="p-4 bg-slate-50 border-b"><p className="text-[10px] uppercase font-black text-slate-400">Current Station</p><p className="font-bold text-xs text-emerald-700">{CURRENT_HOSPITAL}</p></div>
               <button className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 font-bold text-sm text-slate-600"><Key size={16}/> Change Password</button>
               <button onClick={onLogout} className="w-full flex items-center gap-3 p-4 hover:bg-red-50 text-red-600 font-bold text-sm border-t"><LogOut size={16}/> Logout</button>
            </div>
          )}
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        
        {/* --- PAGE HEADING --- */}
        <div className="mb-8">
            <h2 className="text-2xl font-black uppercase text-slate-800 mb-2 flex items-center gap-2"><Activity className="text-emerald-600"/> Clinical Dashboard</h2>
            <p className="text-slate-500 font-bold text-sm">Managing active forensic cases at <span className="text-slate-800 underline decoration-emerald-400 decoration-2">{CURRENT_HOSPITAL}</span></p>
        </div>

        {/* --- SEARCH & FILTER BAR --- */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center mb-6">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-3.5 text-slate-400" size={18}/>
                <input 
                    type="text" 
                    placeholder="Search Patient Name, NIC or Case ID..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm transition-all"
                />
            </div>
            
            {/* Date Range Filter */}
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 w-full md:w-auto">
                <Filter size={14} className="text-slate-400 ml-2"/>
                <span className="text-[10px] font-black uppercase text-slate-400 px-1">Reported:</span>
                <input type="date" max={today} value={startDate} onChange={e=>setStartDate(e.target.value)} className="p-2 border rounded-lg text-xs font-bold bg-white outline-none focus:border-emerald-500"/>
                <span className="text-slate-400 font-bold">-</span>
                <input type="date" max={today} value={endDate} onChange={e=>setEndDate(e.target.value)} className="p-2 border rounded-lg text-xs font-bold bg-white outline-none focus:border-emerald-500"/>
            </div>

            {/* Clear Filters Button (Conditional Render) */}
            {(searchTerm || startDate || endDate) && (
                <button onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); }} className="text-red-500 hover:bg-red-50 p-3 rounded-lg transition-colors border border-red-100">
                    <X size={18}/>
                </button>
            )}
        </div>

        {/* --- DATA TABLE --- */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="p-5 text-left">Case Ref</th>
                    <th className="p-5 text-left">Patient Details</th>
                    <th className="p-5 text-left">Reported Date</th>
                    <th className="p-5 text-left text-emerald-700">Last Update</th> 
                    <th className="p-5 text-left">Condition</th>
                    <th className="p-5 text-left">Status</th>
                    <th className="p-5 text-center">Action</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {filteredRecords.map(rec => (
                    <tr key={rec.uniqueId} className="hover:bg-emerald-50/30 transition-colors text-sm font-medium group">
                        <td className="p-5 text-emerald-700 font-mono font-bold">{rec.caseData.id}</td>
                        <td className="p-5">
                            <div className="font-bold text-slate-800 uppercase">{rec.partyData.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">NIC: {rec.partyData.nic}</div>
                        </td>
                        <td className="p-5 text-slate-500">{rec.caseData.date}</td>
                        
                        {/* Dynamic Rendering: Last Updated Timestamp */}
                        <td className="p-5">
                                {rec.partyData.medicalReport?.updatedDate ? (
                                    <span className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md w-fit text-xs font-bold">
                                        <Clock size={12}/> {rec.partyData.medicalReport.updatedDate}
                                    </span>
                                ) : (
                                    <span className="text-slate-300 text-[10px] italic">No prior records</span>
                                )}
                        </td>

                        {/* Dynamic Rendering: Patient Condition Badge */}
                        <td className="p-5">
                            <span className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit text-[10px] font-black uppercase tracking-wide border ${
                                !rec.partyData.medicalReport?.status ? 'text-slate-400 bg-slate-100 border-slate-200' :
                                rec.partyData.medicalReport.status.includes('Critical') ? 'text-red-600 bg-red-50 border-red-100' :
                                rec.partyData.medicalReport.status.includes('Deceased') ? 'text-slate-100 bg-slate-800 border-slate-700' :
                                rec.partyData.medicalReport.status.includes('Discharged') ? 'text-blue-600 bg-blue-50 border-blue-100' :
                                'text-emerald-600 bg-emerald-50 border-emerald-100'
                            }`}>
                                <Activity size={12}/> {rec.partyData.medicalReport?.status || "Pending Review"}
                            </span>
                        </td>

                        <td className="p-5">
                            {rec.partyData.medicalReport ? (
                                <span className="bg-white border border-green-200 text-green-700 px-3 py-1 rounded-full text-[10px] uppercase font-bold flex items-center gap-1 w-fit shadow-sm">
                                    <CheckCircle size={10} /> Complete
                                </span>
                            ) : (
                                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] uppercase font-bold animate-pulse">
                                    Pending
                                </span>
                            )}
                        </td>
                        <td className="p-5 text-center">
                            <button onClick={() => openWorkspace(rec)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2 mx-auto">
                                <Stethoscope size={14} /> EXAMINE
                            </button>
                        </td>
                    </tr>
                ))}
                
                {/* Empty State Handling */}
                {filteredRecords.length === 0 && (
                    <tr>
                        <td colSpan={7} className="p-12 text-center">
                            <div className="flex flex-col items-center text-slate-300">
                                <Search size={40} className="mb-4 opacity-50"/>
                                <p className="font-bold text-slate-400">No records found matching your filters.</p>
                                <p className="text-xs mt-1">Try adjusting the date range or search terms.</p>
                            </div>
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* --- MODAL: MEDICAL WORKSPACE --- */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div>
                  <h2 className="font-black uppercase text-slate-800 tracking-tight text-xl flex items-center gap-2">
                    <Stethoscope className="text-emerald-500" size={24}/> Medical Examination Console
                  </h2>
                  <p className="text-xs text-slate-400 font-bold uppercase mt-1 pl-8">Case: {selectedRecord.caseData.id} • Ref: {selectedRecord.uniqueId}</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="bg-white border border-slate-200 p-2 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all">
                  <X size={20}/>
              </button>
            </div>

            {/* Modal Content Grid */}
            <div className="p-8 overflow-y-auto flex-1 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                    {/* LEFT COLUMN: Patient & Incident Context (ReadOnly) */}
                    <div className="lg:col-span-5 space-y-6 border-r border-slate-100 pr-0 lg:pr-8">
                        <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                            <label className="text-[10px] font-black text-emerald-400 uppercase mb-3 block">Patient Identification</label>
                            <div className="text-2xl font-black text-slate-800 mb-1">
                                {selectedRecord.partyData.name}
                            </div>
                            <div className="text-sm font-bold text-slate-500 flex items-center gap-2">
                                <User size={14}/> NIC: {selectedRecord.partyData.nic}
                            </div>
                            <div className="mt-4 pt-4 border-t border-emerald-100/50 flex gap-4">
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Age</span>
                                    <p className="font-bold text-slate-700">{selectedRecord.partyData.age || "N/A"}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Gender</span>
                                    <p className="font-bold text-slate-700">{selectedRecord.partyData.gender || "N/A"}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Police Incident Report</label>
                            <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50 text-sm text-slate-600 font-medium leading-relaxed">
                                "{selectedRecord.caseData.desc}"
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Medical Input Form (Writable) */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* Status Select */}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Current Condition Status</label>
                            <div className="relative">
                                <select 
                                    value={victimStatus} 
                                    onChange={e=>setVictimStatus(e.target.value)} 
                                    className="w-full p-4 pl-10 border border-slate-200 rounded-2xl font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 appearance-none cursor-pointer"
                                >
                                    <option>In Hospital - Stable</option>
                                    <option>In Hospital - Critical</option>
                                    <option>Discharged</option>
                                    <option>Deceased</option>
                                </select>
                                <Activity className="absolute left-3 top-4 text-emerald-500" size={18} />
                            </div>
                        </div>

                        {/* Medical Observations Textarea */}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Medical Observations & Findings</label>
                            <textarea 
                                value={medicalNotes} 
                                onChange={e=>setMedicalNotes(e.target.value)} 
                                className="w-full p-4 border border-slate-200 rounded-2xl h-40 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 resize-none" 
                                placeholder="Enter detailed medical findings, injuries observed, and treatments administered..."
                            ></textarea>
                        </div>

                        {/* File Upload Section */}
                        <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl hover:border-emerald-400 transition-colors">
                            <div className="mb-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase block mb-3">Evidence Attachments</span>
                                
                                {/* Document Type Selector & Add Button */}
                                <div className="flex gap-2 mb-2">
                                    <select 
                                        value={docType} 
                                        onChange={(e) => setDocType(e.target.value)}
                                        className="p-3 rounded-xl border border-slate-200 text-xs font-bold outline-none flex-1 focus:border-emerald-500 bg-white"
                                    >
                                        <option>Medical Report</option>
                                        <option>X-Ray Scan</option>
                                        <option>Lab Result</option>
                                        <option>Forensic Image</option>
                                    </select>
                                    <button 
                                        onClick={()=>fileInputRef.current?.click()} 
                                        className="bg-emerald-600 text-white font-bold text-xs px-4 rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm"
                                    >
                                        <Upload size={14}/> UPLOAD
                                    </button>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf" />
                            </div>

                            {/* Attachments List */}
                            <div className="space-y-2">
                                {jmoDocs.map((d, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                                <FileText size={14} className="text-emerald-500"/> {d.name}
                                            </span>
                                            <span className="text-[10px] text-slate-400 ml-6 uppercase font-bold tracking-wider">{d.type}</span>
                                        </div>
                                        <button 
                                            onClick={()=>setJmoDocs(jmoDocs.filter((_,x)=>x!==i))}
                                            className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                ))}
                                {jmoDocs.length === 0 && <p className="text-xs text-center text-slate-400 italic py-2">No documents currently attached.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t bg-slate-50 flex justify-end gap-4">
                <button onClick={() => setSelectedRecord(null)} className="px-6 py-4 rounded-xl font-bold text-xs uppercase text-slate-500 hover:bg-slate-200 transition-colors">
                    Cancel
                </button>
                <button onClick={submitReport} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl hover:shadow-2xl flex items-center gap-2 transform active:scale-95">
                    <Save size={16} /> Submit Official Report
                </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}