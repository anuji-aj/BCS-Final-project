import React, { useState, useEffect } from 'react';
// importing icons for the UI
import { 
  Gavel, Plus, X, Search, Info, MapPin, Upload, FileText, 
  Edit3, Save, User, Key, LogOut, Trash2, UserPlus, Calendar, 
  Shield, Lock, AlertTriangle, Eye, EyeOff 
} from 'lucide-react';
// getting the fake database connection
import { executeSQLQuery } from './database';

// --- CONSTANTS ---
// list of hospitals for the dropdown
const HOSPITALS = [
    "National Hospital Colombo",
    "Kandy General Hospital",
    "Karapitiya Teaching Hospital",
    "Lady Ridgeway Hospital"
];

// courts we can assign cases to
const COURTS = [
    "Magistrate Court Fort",
    "District Court Colombo",
    "High Court Colombo",
    "Magistrate Court Kaduwela",
    "Mount Lavinia Magistrate Court"
];

// --- HELPER: CONVERT FILE TO BASE64 ---
// this function takes an image file and turns it into a string so we can save it
const fileToBase64 = (file: File): Promise<{name: string, type: string, data: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve({
      name: file.name,
      type: file.type,
      data: reader.result as string
    });
    reader.onerror = error => reject(error);
  });
};

// --- MAIN COMPONENT ---
export function PoliceDashboard({ onLogout, currentUser }: { onLogout: () => void, currentUser: any }) {
  
  // getting the officer details from the login info
  const assignedStation = currentUser?.appointedPlace || 'General Headquarters';
  const officerName = currentUser?.name || 'Officer';

  // --- CORE STATE ---
  // this holds all the cases we fetch from the database
  const [cases, setCases] = useState<any[]>([]);
  // keeping track of which case is currently open in the popup
  const [viewingCase, setViewingCase] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // --- PASSWORD UPDATE STATE ---
  // variables for the change password form
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // --- EDIT & FILTER STATE ---
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCourt, setFilterCourt] = useState('');

  // --- REGISTRATION FORM STATE ---
  // all the inputs for the "Add New Case" form are stored here
  const [incidentDate, setIncidentDate] = useState('');
  const [incidentVenue, setIncidentVenue] = useState('');
  const [description, setDescription] = useState('');
  const [reportingRole, setReportingRole] = useState('Victim'); 
  const [evidenceFiles, setEvidenceFiles] = useState<{name: string, type: string, data: string}[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [assignedCourt, setAssignedCourt] = useState('');
  
  // --- PARTY SUB-FORM STATE ---
  const [pName, setPName] = useState('');
  const [pNic, setPNic] = useState('');
  const [pRole, setPRole] = useState('Victim');
  const [pStatement, setPStatement] = useState('');
  const [isHospitalized, setIsHospitalized] = useState(false);
  const [hospitalName, setHospitalName] = useState(''); 

  // --- VIEWER EDIT STATE ---
  // temporary storage when we are editing an existing case
  const [editVenue, setEditVenue] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editRole, setEditRole] = useState('');
  const [newEvidenceForEdit, setNewEvidenceForEdit] = useState<any[]>([]);

  const today = new Date().toISOString().split('T')[0];

  // --- LOAD DATA ON MOUNT ---
  // this runs once when the page loads to get the data
  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    // requesting all cases from our local database file
    const data = executeSQLQuery('SELECT');
    setCases(Array.isArray(data) ? data : []);
  };

  // --- PASSWORD UPDATE LOGIC ---
  const handleUpdatePassword = () => {
    if (!currentUser || !currentUser.password) {
        alert("System Error: Your profile data is missing. Please logout and login again.");
        return;
    }

    if (currentPass !== currentUser.password) {
        alert("Error: The current password you entered is incorrect.");
        return;
    }

    // checking if the password has big letters, small letters and symbols
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{6,})/;
    if (!passwordRegex.test(newPass)) {
        alert("Error: New password is too weak. It must have:\n- 6+ characters\n- Uppercase letter\n- Lowercase letter\n- Special character (!@#$%)");
        return;
    }

    if (newPass !== confirmPass) {
        alert("Error: New passwords do not match.");
        return;
    }

    try {
        // finding the user in localstorage to save the new password
        const savedUsers = localStorage.getItem('justiceflow_users_final');
        if (!savedUsers) {
            alert("Error: No user database found.");
            return;
        }

        let users = JSON.parse(savedUsers);
        const userIndex = users.findIndex((u: any) => u.email === currentUser.email);
        
        if (userIndex !== -1) {
            users[userIndex].password = newPass;
            localStorage.setItem('justiceflow_users_final', JSON.stringify(users));
            alert("Success! Password updated. Please use the NEW password next time you login.");
            setCurrentPass('');
            setNewPass('');
            setConfirmPass('');
            setShowPasswordModal(false);
        } else {
            alert("Error: Could not find your account in the database to update.");
        }
    } catch (e) {
        console.error("Failed to update password", e);
        alert("System Error: Something went wrong while saving.");
    }
  };

  // --- CASE VIEWER LOGIC ---
  const openViewer = (c: any) => {
    setViewingCase(c);
    // fill the edit fields just in case they want to edit
    setEditVenue(c.venue);
    setEditDesc(c.desc);
    setEditRole(c.reporterRole);
    setNewEvidenceForEdit([]);
    setIsEditing(false);
  };

  // saves changes when editing an EXISTING case
  const saveEdits = () => {
    const existingEvidence = viewingCase.evidence || [];
    const updatedEvidence = [...existingEvidence, ...newEvidenceForEdit];

    const updated = { 
        ...viewingCase, 
        venue: editVenue, 
        desc: editDesc, 
        reporterRole: editRole,
        evidence: updatedEvidence 
    };
    executeSQLQuery('UPDATE', updated);
    
    // --- SUCCESS MESSAGE ADDED HERE ---
    alert("Record Updated Successfully! The case details have been modified.");

    setViewingCase(updated);
    setNewEvidenceForEdit([]);
    setIsEditing(false);
    loadData();
  };

  const updateStatus = (newStatus: string) => {
    const updated = { ...viewingCase, status: newStatus };
    executeSQLQuery('UPDATE', updated);
    
    // --- SUCCESS MESSAGE ADDED HERE ---
    alert(`Success: Case status changed to '${newStatus}'`);

    setViewingCase(updated);
    loadData();
  };

  // --- FILE HANDLING ---
  // handles uploading files for a NEW case
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const processedFiles = await Promise.all(filesArray.map(file => fileToBase64(file)));
      setEvidenceFiles(prev => [...prev, ...processedFiles]);
    }
  };

  const removeEvidence = (indexToRemove: number) => {
    setEvidenceFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // handles uploading files when EDITING a case
  const handleEditModeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const filesArray = Array.from(e.target.files);
        const processedFiles = await Promise.all(filesArray.map(file => fileToBase64(file)));
        setNewEvidenceForEdit(prev => [...prev, ...processedFiles]);
    }
  };

  // --- ADD PARTY LOGIC ---
  const addParty = () => {
    if (!pName || pNic.length !== 12) return alert("Valid Name & 12-char NIC required.");
    if (isHospitalized && !hospitalName) return alert("Please select a hospital."); 
    
    // adding the person to the temporary list
    setParties(prev => [...prev, { 
        name: pName, 
        nic: pNic, 
        role: pRole, 
        statement: pStatement,
        isHospitalized: isHospitalized,
        hospitalName: isHospitalized ? hospitalName : null 
    }]);

    // clear the person form inputs
    setPName(''); setPNic(''); setPStatement(''); 
    setIsHospitalized(false);
    setHospitalName('');
  };

  // --- CREATE CASE LOGIC ---
  // this is the main function that saves a NEW case
  const handleCreateCase = () => {
    if (!incidentDate || !incidentVenue || !description || !assignedCourt) return alert("Fill all mandatory fields including Court Assignment!");
    
    // creating the object to save to DB
    const newCase = {
      id: `CRIM-${Math.floor(1000 + Math.random() * 9000)}`,
      date: incidentDate,
      venue: incidentVenue,
      desc: description,
      reporterRole: reportingRole,
      evidence: [...evidenceFiles],
      parties: [...parties],
      status: 'Pending',
      victimName: parties.find(p => p.role === 'Victim')?.name || (parties.length > 0 ? parties[0].name : 'N/A'),
      jmoRequired: parties.some(p => p.isHospitalized),
      assignedCourt: assignedCourt,
      station: assignedStation,
      officer: officerName
    };

    executeSQLQuery('INSERT', newCase);
    
    // --- SUCCESS MESSAGE ADDED HERE ---
    alert("Record Successfully Added! The new incident has been registered in the system.");

    loadData();
    setShowAddModal(false);
    
    // Reset Form so it's empty next time
    setIncidentDate(''); setIncidentVenue(''); setDescription(''); setAssignedCourt('');
    setEvidenceFiles([]); setParties([]);
  };

  // --- RENDER HELPERS ---
  const renderEvidencePreview = (file: any, index: number, isRemovable: boolean, onRemove?: () => void) => {
    const isLegacy = typeof file === 'string';
    const fileName = isLegacy ? file : file.name;
    const fileType = isLegacy ? 'unknown' : file.type;
    const fileData = isLegacy ? null : file.data;
    const isImage = fileType.startsWith('image/');

    return (
        <div key={index} className="relative group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
            {isImage && fileData ? (
                <div className="h-24 w-full bg-slate-100 overflow-hidden relative">
                    <img src={fileData} alt={fileName} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <a href={fileData} download={fileName} className="text-white bg-blue-600 p-1 rounded-full"><Eye size={16}/></a>
                    </div>
                </div>
            ) : (
                <div className="h-24 w-full bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-2">
                    <FileText size={32} />
                    <span className="text-[9px] mt-2 uppercase font-black text-center truncate w-full">{fileName.split('.').pop()} FILE</span>
                </div>
            )}
            
            <div className="p-2 flex justify-between items-center bg-white">
                <span className="text-[10px] font-bold text-slate-700 truncate w-24 block" title={fileName}>{fileName}</span>
                {isRemovable && onRemove && (
                    <button onClick={onRemove} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );
  };

  // filtering the cases based on search bar and dropdowns
  const filteredCases = cases.filter(c => {
    const s = searchTerm.toLowerCase();
    const matchStation = c.station === assignedStation; 
    const matchSearch = (c.id?.toLowerCase().includes(s) || c.victimName?.toLowerCase().includes(s) || c.venue?.toLowerCase().includes(s));
    const matchDate = (startDate ? c.date >= startDate : true) && (endDate ? c.date <= endDate : true);
    const matchCourt = filterCourt ? c.assignedCourt === filterCourt : true;
    return matchStation && matchSearch && matchDate && matchCourt;
  });

  // --- JSX RENDER ---
  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      
      {/* HEADER */}
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-xl relative z-50">
        <div className="flex items-center gap-3">
          <Gavel className="text-blue-400" />
          <div>
            <h1 className="font-bold text-xl uppercase tracking-tighter leading-none">JusticeFlow</h1>
            <p className="text-[10px] text-blue-200 uppercase font-mono tracking-widest flex items-center gap-1 mt-1">
                <MapPin size={10} /> {assignedStation}
            </p>
          </div>
        </div>
        
        <div className="relative">
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 p-2 px-4 rounded-xl border border-slate-700 transition-all">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-black text-xs text-white">
                {officerName.charAt(0)}
            </div>
            <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-white leading-tight">{officerName}</p>
                <p className="text-[10px] text-slate-400">Police Officer</p>
            </div>
            <User size={18} />
          </button>
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border text-slate-800 overflow-hidden z-[60]">
               <div className="p-4 bg-slate-50 border-b">
                   <p className="text-[10px] uppercase font-black text-slate-400">Station</p>
                   <p className="font-bold text-sm text-blue-600">{assignedStation}</p>
               </div>
               <button onClick={() => { setShowPasswordModal(true); setShowProfileMenu(false); }} className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 font-bold text-sm"><Key size={16}/> Change Password</button>
               <button onClick={onLogout} className="w-full flex items-center gap-3 p-4 hover:bg-red-50 text-red-600 font-bold text-sm border-t"><LogOut size={16}/> Logout</button>
            </div>
          )}
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-3xl font-black uppercase text-slate-800">Station Records</h2>
                <p className="text-slate-500 font-medium text-sm">Showing cases for <span className="text-blue-600 font-bold">{assignedStation}</span> only.</p>
            </div>
            <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all">
                <Plus size={20}/> REGISTER INCIDENT
            </button>
        </div>

        {/* FILTERS */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={18}/>
            <input type="text" placeholder="Search ID, Name..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full pl-10 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <select value={filterCourt} onChange={e=>setFilterCourt(e.target.value)} className="p-3 border rounded-xl font-bold text-sm text-slate-600 outline-none">
            <option value="">All Courts</option>
            {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="p-3 border rounded-xl font-bold"/>
          <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="p-3 border rounded-xl font-bold"/>
        </div>

        {/* TABLE */}
        <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50 border-b">
              <tr className="text-[11px] font-black text-slate-400 uppercase">
                <th className="p-5 text-left">Case ID</th>
                <th className="p-5 text-left">Date</th>
                <th className="p-5 text-left">Venue</th>
                <th className="p-5 text-left">Assigned Court</th>
                <th className="p-5 text-left">Primary Person</th>
                <th className="p-5 text-left">Status</th>
                <th className="p-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCases.map(c => (
                <tr key={c.id} className="hover:bg-blue-50/50 transition-colors text-sm font-bold">
                  <td className="p-5 text-blue-600 font-mono">{c.id}</td>
                  <td className="p-5 text-slate-500">{c.date}</td>
                  <td className="p-5 text-slate-500 uppercase">{c.venue}</td>
                  <td className="p-5 text-slate-700">{c.assignedCourt || <span className="text-red-300 italic">Unassigned</span>}</td>
                  <td className="p-5 uppercase">{c.victimName}</td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] uppercase 
                        ${c.status === 'Closed' || c.status === 'Case Dismissed' ? 'bg-green-100 text-green-700' : 
                          c.status === 'Adjourned' ? 'bg-orange-100 text-orange-700' :
                          c.status === 'Referred to Higher Court' ? 'bg-purple-100 text-purple-700' :
                          'bg-amber-100 text-amber-700'}`}>
                        {c.status}
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    <button onClick={() => openViewer(c)} className="bg-slate-100 p-2 rounded-lg text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                        <Info size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCases.length === 0 && (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                <Shield size={48} className="text-slate-200" />
                <div>
                    <p className="font-bold text-lg text-slate-600">No records found</p>
                    <p className="text-sm">No cases currently assigned to {assignedStation}.</p>
                </div>
            </div>
          )}
        </div>
      </main>

      {/* --- CASE VIEWER MODAL --- */}
      {viewingCase && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-300 flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <FileText size={18} className="text-blue-400"/> {isEditing ? "Editing Record" : "Case Record"} {viewingCase.id}
              </h3>
              <div className="flex gap-2">
                {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"><Edit3 size={14}/> EDIT</button>
                ) : (
                    <button onClick={saveEdits} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"><Save size={14}/> SAVE CHANGES</button>
                )}
                <button onClick={() => setViewingCase(null)} className="bg-slate-800 p-2 rounded-lg hover:bg-red-500 transition-colors"><X size={18}/></button>
              </div>
            </div>

            <div className="p-10 space-y-8 overflow-y-auto">
                <div className="flex justify-between items-start border-b pb-6">
                    <div className="flex-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Location / Venue</label>
                        {isEditing ? (
                            <input value={editVenue} onChange={e=>setEditVenue(e.target.value)} className="w-full p-2 border-2 border-blue-200 rounded-lg font-bold outline-none text-lg"/>
                        ) : (
                            <p className="font-black text-lg text-red-600 flex items-center gap-2"><MapPin size={18}/> {viewingCase.venue}</p>
                        )}
                        <p className="mt-2 text-xs font-bold text-slate-400 flex items-center gap-1"><Calendar size={12}/> Incident Date: {viewingCase.date}</p>
                        <p className="mt-2 text-xs font-bold text-blue-600 flex items-center gap-1"><Gavel size={12}/> Assigned to: {viewingCase.assignedCourt}</p>
                        <p className="mt-2 text-xs font-bold text-slate-600 flex items-center gap-1"><Shield size={12}/> Station: {viewingCase.station}</p>
                    </div>
                    <div className="text-right">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Case Status</label>
                        <select 
                            value={viewingCase.status} 
                            onChange={(e) => updateStatus(e.target.value)}
                            disabled={['Closed', 'Case Dismissed', 'Adjourned', 'Referred to Higher Court'].includes(viewingCase.status)}
                            className={`p-2 rounded-xl bg-slate-100 font-black text-xs uppercase outline-none border-2 border-slate-200 focus:border-blue-500 ${['Closed', 'Case Dismissed', 'Adjourned', 'Referred to Higher Court'].includes(viewingCase.status) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <option value="Pending">Pending</option>
                            <option value="Under Investigation">Under Investigation</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Incident Summary</label>
                    {isEditing ? (
                        <div className="space-y-2">
                            <select value={editRole} onChange={e=>setEditRole(e.target.value)} className="p-2 border rounded font-bold text-xs"><option value="Victim">Victim</option><option value="Witness">Witness</option></select>
                            <textarea value={editDesc} onChange={e=>setEditDesc(e.target.value)} className="w-full p-4 border-2 border-blue-200 rounded-xl h-32 font-medium outline-none"/>
                        </div>
                    ) : (
                        <div className="bg-slate-50 p-5 rounded-2xl border text-sm italic">
                            <span className="font-black text-blue-600 text-[10px] uppercase block mb-2">Reported by {viewingCase.reporterRole}</span>
                            "{viewingCase.desc}"
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block">Involved Parties</label>
                        <div className="space-y-2">
                            {viewingCase.parties?.map((p:any, i:number) => (
                                <div key={i} className={`p-3 bg-white border rounded-xl border-l-4 shadow-sm ${p.isHospitalized ? 'border-l-red-500 bg-red-50' : 'border-l-blue-600'}`}>
                                    <div className="font-black text-xs uppercase flex justify-between">
                                        <span>{p.name} <span className="text-slate-400">[{p.role}]</span></span>
                                        {p.isHospitalized && <span className="text-[10px] text-red-600 bg-white px-2 rounded-full border border-red-200">HOSPITALIZED</span>}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1 truncate">"{p.statement}"</div>
                                    {p.hospitalName && <div className="text-[9px] text-slate-400 mt-1 font-bold flex gap-1"><MapPin size={10}/> {p.hospitalName}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase block">Evidence Gallery</label>
                            {isEditing && (
                                <label className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2 py-1 rounded cursor-pointer flex items-center gap-1 transition-all">
                                    <Plus size={10}/> ADD FILES
                                    <input type="file" multiple onChange={handleEditModeFileUpload} className="hidden" />
                                </label>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                             {viewingCase.evidence?.map((f:any, i:number) => renderEvidencePreview(f, i, false))}
                             {newEvidenceForEdit.map((f:any, i:number) => renderEvidencePreview(f, `new-${i}`, true, () => setNewEvidenceForEdit(prev => prev.filter((_, idx) => idx !== i))))}
                        </div>
                        
                        {(!viewingCase.evidence || viewingCase.evidence.length === 0) && newEvidenceForEdit.length === 0 && <p className="text-xs text-slate-300 font-bold p-4 text-center border-2 border-dashed rounded-xl">No files attached.</p>}
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* --- REGISTRATION MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[2.5rem] w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <h2 className="font-black uppercase text-slate-800 tracking-tight text-xl">New Incident Registration</h2>
              <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase">
                      Recording at: {assignedStation}
                  </span>
                  <button onClick={() => setShowAddModal(false)} className="bg-slate-200 p-2 rounded-full hover:bg-red-500 hover:text-white transition-all"><X size={18}/></button>
              </div>
            </div>
            
            <div className="p-10 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Incident Date *</label>
                    <input type="date" max={today} value={incidentDate} onChange={e=>setIncidentDate(e.target.value)} className="w-full p-3 border rounded-xl bg-white focus:ring-4 focus:ring-blue-100 outline-none font-bold"/>
                  </div>
                  <div><label className="text-xs font-black text-slate-500 uppercase mb-2 block">Venue *</label><input type="text" placeholder="Location..." value={incidentVenue} onChange={e=>setIncidentVenue(e.target.value)} className="w-full p-3 border rounded-xl outline-none font-bold"/></div>
                </div>

                <div>
                    <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Description of Incident *</label>
                    <textarea placeholder="Detailed summary..." value={description} onChange={e=>setDescription(e.target.value)} className="w-full p-4 border rounded-xl h-32 outline-none font-medium text-sm"></textarea>
                </div>
                
                <div>
                   <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Assign Court *</label>
                   <select value={assignedCourt} onChange={e=>setAssignedCourt(e.target.value)} className="w-full p-3 border rounded-xl outline-none font-bold text-sm bg-white">
                        <option value="">-- Select Court --</option>
                        {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>

                <div>
                    <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Evidence Upload</label>
                    <label className="w-full border-2 border-dashed border-slate-300 rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all group">
                        <Upload size={24} className="text-slate-400 group-hover:text-blue-500 mb-2"/>
                        <span className="text-xs font-bold text-slate-400">Click to upload images/documents</span>
                        <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                    </label>
                    
                    {evidenceFiles.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-4">
                            {evidenceFiles.map((f, i) => renderEvidencePreview(f, i, true, () => removeEvidence(i)))}
                        </div>
                    )}
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 h-full">
                <h3 className="font-black uppercase text-slate-700 mb-4 flex items-center gap-2"><UserPlus size={18}/> Involved Parties</h3>
                
                <div className="space-y-4 mb-6">
                   <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="Name" value={pName} onChange={e=>setPName(e.target.value)} className="w-full p-3 border rounded-xl outline-none font-bold text-sm"/>
                      <input type="text" placeholder="NIC (12 chars)" maxLength={12} value={pNic} onChange={e=>setPNic(e.target.value)} className="w-full p-3 border rounded-xl outline-none font-bold text-sm"/>
                   </div>
                   <select value={pRole} onChange={e=>setPRole(e.target.value)} className="w-full p-3 border rounded-xl outline-none font-bold text-sm bg-white">
                      <option value="Victim">Victim</option>
                      <option value="Suspect">Suspect</option>
                      <option value="Witness">Witness</option>
                   </select>
                   <textarea placeholder="Statement Summary..." value={pStatement} onChange={e=>setPStatement(e.target.value)} className="w-full p-3 border rounded-xl outline-none font-medium text-sm h-24"></textarea>
                   
                   <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                       <label className="flex items-center gap-3 cursor-pointer select-none">
                           <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isHospitalized ? 'bg-red-500 border-red-500' : 'border-slate-300'}`}>
                               {isHospitalized && <X size={14} className="text-white"/>}
                           </div>
                           <input type="checkbox" checked={isHospitalized} onChange={e=>setIsHospitalized(e.target.checked)} className="hidden"/>
                           <span className="font-bold text-xs text-slate-700 uppercase">Hospitalization Required?</span>
                       </label>

                       {isHospitalized && (
                           <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Select Hospital</label>
                               <select 
                                   value={hospitalName} 
                                   onChange={(e) => setHospitalName(e.target.value)}
                                   className="w-full p-3 border-2 border-red-100 bg-red-50 text-red-800 rounded-xl outline-none font-bold text-sm"
                               >
                                   <option value="">-- Select Location --</option>
                                   {HOSPITALS.map(h => <option key={h} value={h}>{h}</option>)}
                               </select>
                           </div>
                       )}
                   </div>

                   <button onClick={addParty} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg">Add Person</button>
                </div>

                <div className="mt-8 space-y-3">
                    {parties.map((p, i) => (
                        <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group">
                            <div>
                                <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
                                    {p.name} <span className="text-[10px] bg-slate-100 px-2 rounded text-slate-500 uppercase">{p.role}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-1">{p.nic}</div>
                            </div>
                            <button onClick={() => setParties(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    {parties.length === 0 && <p className="text-center text-xs text-slate-400 font-bold italic py-4">No parties added yet.</p>}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setShowAddModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-all">Cancel</button>
                <button onClick={handleCreateCase} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2">
                    <Save size={18}/> SUBMIT CASE
                </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PASSWORD UPDATE MODAL --- */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-300 p-8">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} className="text-slate-700" />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 uppercase">Update Password</h2>
                    <p className="text-xs text-slate-500 mt-2">Ensure your new password is secure.</p>
                </div>

                <div className="space-y-4">
                    {/* CURRENT PASSWORD */}
                    <div className="relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Current Password</label>
                        <div className="relative">
                            <input 
                                type={showCurrentPass ? "text" : "password"} 
                                value={currentPass} 
                                onChange={e=>setCurrentPass(e.target.value)} 
                                className="w-full p-3 pr-10 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-200" 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowCurrentPass(!showCurrentPass)}
                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                            >
                                {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    
                    {/* NEW PASSWORD */}
                    <div className="relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">New Password</label>
                        <div className="relative">
                            <input 
                                type={showNewPass ? "text" : "password"} 
                                value={newPass} 
                                onChange={e=>setNewPass(e.target.value)} 
                                className="w-full p-3 pr-10 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-200" 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowNewPass(!showNewPass)}
                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                            >
                                {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg flex gap-2 items-start">
                             <AlertTriangle size={14} className="text-blue-500 mt-0.5 shrink-0" />
                             <p className="text-[10px] text-blue-700 leading-tight">
                                Must contain 6+ chars, 1 uppercase, 1 lowercase & 1 special character.
                             </p>
                        </div>
                    </div>

                    {/* CONFIRM PASSWORD */}
                    <div className="relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Confirm Password</label>
                        <div className="relative">
                            <input 
                                type={showConfirmPass ? "text" : "password"} 
                                value={confirmPass} 
                                onChange={e=>setConfirmPass(e.target.value)} 
                                className="w-full p-3 pr-10 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-200" 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowConfirmPass(!showConfirmPass)}
                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                            >
                                {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8">
                    <button onClick={() => setShowPasswordModal(false)} className="py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all">Cancel</button>
                    <button onClick={handleUpdatePassword} className="py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg">Update</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}