import React, { useState, useEffect } from 'react';
import { 
  Users, Settings, LogOut, Shield, Gavel, 
  Activity, Plus, Trash2, Save, X, Edit,
  FileText, Printer, Filter, AlertCircle
} from 'lucide-react';

// --- TYPE DEFINITIONS ---
interface Organization {
  id: string;
  name: string;
  location: string;
  contact: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  nic: string;
  role: string;
  contact: string;
  appointedPlace: string;
  status: 'Active' | 'Inactive';
  password?: string; 
}

// Interface for Reports
interface CaseRecord {
  id: string;
  date: string;
  policeStation: string;
  court: string;
  hospital: string;
  status: string;
}

// --- MOCK DATA INITIALIZATION ---
const INITIAL_STATIONS = [
  { id: 'POL-001', name: 'Mount Lavinia HQ', location: 'Mount Lavinia', contact: '0112717501' },
  { id: 'POL-002', name: 'Dehiwala Station', location: 'Dehiwala', contact: '0112717502' }
];

const INITIAL_HOSPITALS = [
  { id: 'HOS-001', name: 'Colombo South Teaching Hospital', location: 'Kalubowila', contact: '0112763000' },
  { id: 'HOS-002', name: 'National Hospital', location: 'Colombo 10', contact: '0112691111' }
];

const INITIAL_COURTS = [
  { id: 'CRT-001', name: 'Mount Lavinia Magistrate Court', location: 'Mount Lavinia', contact: '0112717341' },
  { id: 'CRT-002', name: 'Gangodawila Magistrate Court', location: 'Nugegoda', contact: '0112852555' }
];

const INITIAL_USERS = [
  { id: 'USR-001', name: 'OIC Perera', email: 'police@justiceflow.gov.lk', nic: '198512345678', role: 'police', contact: '0711111111', appointedPlace: 'Mount Lavinia HQ', status: 'Active' as const, password: '123' },
  { id: 'USR-002', name: 'Dr. Silva', email: 'jmo@justiceflow.gov.lk', nic: '197812345678', role: 'jmo', contact: '0772222222', appointedPlace: 'Colombo South Teaching Hospital', status: 'Active' as const, password: '123' }
];

// --- MOCK CASE DATABASE FOR REPORTS ---
// Updated dates to be more recent so testing yields results
const MOCK_CASE_DATABASE: CaseRecord[] = [
  { id: 'CRIM-2023-001', date: '2023-10-15', policeStation: 'Mount Lavinia HQ', court: 'Mount Lavinia Magistrate Court', hospital: 'Colombo South Teaching Hospital', status: 'Closed' },
  { id: 'CRIM-2024-045', date: '2024-01-05', policeStation: 'Mount Lavinia HQ', court: 'Gangodawila Magistrate Court', hospital: 'National Hospital', status: 'Pending' },
  { id: 'CRIM-2024-089', date: '2024-05-12', policeStation: 'Dehiwala Station', court: 'Gangodawila Magistrate Court', hospital: 'National Hospital', status: 'Pending' },
  { id: 'CRIM-2025-001', date: '2025-01-10', policeStation: 'Mount Lavinia HQ', court: 'Mount Lavinia Magistrate Court', hospital: 'Colombo South Teaching Hospital', status: 'Dismissed' },
  { id: 'CRIM-2025-012', date: '2025-02-14', policeStation: 'Dehiwala Station', court: 'Mount Lavinia Magistrate Court', hospital: 'Colombo South Teaching Hospital', status: 'Adjourned' },
];

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'police' | 'hospitals' | 'courts' | 'users' | 'reports'>('police');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- REPORT STATE ---
  const [hasSearched, setHasSearched] = useState(false); // Track if user has clicked "Generate"
  const [reportFilters, setReportFilters] = useState({
    startDate: '',
    endDate: '',
    policeStation: '',
    court: '',
    hospital: '',
    status: ''
  });
  const [filteredCases, setFilteredCases] = useState<CaseRecord[]>([]);

  // Helper to get today's date in YYYY-MM-DD format for the max attribute
  const todayDate = new Date().toISOString().split('T')[0];

  // --- DATA PERSISTENCE ---
  const [stations, setStations] = useState<Organization[]>(() => {
    const saved = localStorage.getItem('justice_stations_seq'); 
    return saved ? JSON.parse(saved) : INITIAL_STATIONS;
  });

  const [hospitals, setHospitals] = useState<Organization[]>(() => {
    const saved = localStorage.getItem('justice_hospitals_seq'); 
    return saved ? JSON.parse(saved) : INITIAL_HOSPITALS;
  });

  const [courts, setCourts] = useState<Organization[]>(() => {
    const saved = localStorage.getItem('justice_courts_seq'); 
    return saved ? JSON.parse(saved) : INITIAL_COURTS;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('justiceflow_users_seq'); 
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  useEffect(() => { localStorage.setItem('justice_stations_seq', JSON.stringify(stations)); }, [stations]);
  useEffect(() => { localStorage.setItem('justice_hospitals_seq', JSON.stringify(hospitals)); }, [hospitals]);
  useEffect(() => { localStorage.setItem('justice_courts_seq', JSON.stringify(courts)); }, [courts]);
  useEffect(() => { localStorage.setItem('justiceflow_users_seq', JSON.stringify(users)); }, [users]);

  // --- FORM HANDLING ---
  const [formData, setFormData] = useState({
    name: '', location: '', contact: '', email: '', nic: '', role: 'police', password: '', appointedPlace: ''
  });

  const getNextID = (list: any[], prefix: string) => {
    if (list.length === 0) return `${prefix}-001`;
    const ids = list.map(item => {
        const parts = item.id.split('-');
        return parseInt(parts[1] || '0', 10);
    });
    const maxId = Math.max(...ids);
    return `${prefix}-${String(maxId + 1).padStart(3, '0')}`;
  };

  const validatePhone = (phone: string) => /^\d{10}$/.test(phone);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({ name: '', location: '', contact: '', email: '', nic: '', role: 'police', password: '', appointedPlace: '' });
    setEditingId(null);
    setShowAddForm(false);
  };

  // --- CRUD OPERATIONS ---
  const handleDelete = (id: string, type: string) => {
    if (!window.confirm("Are you sure you want to delete this record? This action cannot be undone.")) return;
    
    if (type === 'police') setStations(stations.filter(s => s.id !== id));
    if (type === 'hospital') setHospitals(hospitals.filter(h => h.id !== id));
    if (type === 'court') setCourts(courts.filter(c => c.id !== id));
    if (type === 'users') setUsers(users.filter(u => u.id !== id));

    alert("Record deleted successfully.");
  };

  const handleEdit = (item: any, type: string) => {
    setFormData({
      name: item.name,
      location: item.location || '',
      contact: item.contact,
      email: item.email || '',
      nic: item.nic || '',
      role: item.role || 'police',
      password: '', 
      appointedPlace: item.appointedPlace || ''
    });
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const handleAddOrganization = (type: 'police' | 'hospital' | 'court') => {
    if (!formData.name || !formData.location || !formData.contact) {
        alert("Error: Please fill in all required fields.");
        return;
    }
    if (!validatePhone(formData.contact)) {
        alert("Error: Invalid phone number format. Please enter 10 digits.");
        return;
    }

    let prefix = 'POL';
    let currentList = stations;
    if (type === 'hospital') { prefix = 'HOS'; currentList = hospitals; }
    if (type === 'court') { prefix = 'CRT'; currentList = courts; }

    const newOrg = {
      id: editingId ? editingId : getNextID(currentList, prefix),
      name: formData.name,
      location: formData.location,
      contact: formData.contact
    };

    const updateList = (list: Organization[]) => {
        if (editingId) {
            return list.map(item => item.id === editingId ? newOrg : item);
        }
        return [...list, newOrg];
    };

    if (type === 'police') setStations(updateList(stations));
    if (type === 'hospital') setHospitals(updateList(hospitals));
    if (type === 'court') setCourts(updateList(courts));

    alert(editingId ? "Record updated successfully." : "New record added successfully.");
    resetForm();
  };

  const handleAddUser = () => {
    if (!formData.name || !formData.email || !formData.nic || !formData.contact) {
        alert("Error: Please complete all required user fields.");
        return;
    }
    if (!editingId && !formData.password) {
        alert("Error: A password is required for new users.");
        return;
    }
    if (!validatePhone(formData.contact)) {
        alert("Error: Invalid phone number format.");
        return;
    }
    if (formData.role !== 'attorney' && !formData.appointedPlace) {
        alert("Error: Please select an appointed place of work.");
        return;
    }

    let finalPassword = formData.password;
    if (editingId) {
        const existingUser = users.find(u => u.id === editingId);
        if (!formData.password && existingUser) {
            finalPassword = existingUser.password || '123'; 
        }
    }

    const newUser: User = {
      id: editingId ? editingId : getNextID(users, 'USR'),
      name: formData.name,
      email: formData.email,
      nic: formData.nic,
      role: formData.role,
      contact: formData.contact,
      appointedPlace: formData.role === 'attorney' ? 'Bar Association / Private' : formData.appointedPlace,
      status: 'Active',
      password: finalPassword 
    };

    if (editingId) {
      setUsers(users.map(u => u.id === editingId ? newUser : u));
      alert("User profile updated successfully.");
    } else {
      setUsers([...users, newUser]);
      alert("New user account created successfully.");
    }
    
    resetForm();
  };

  // --- REPORT LOGIC (UPDATED) ---
  const generateReport = () => {
    const results = MOCK_CASE_DATABASE.filter(c => {
        // Date Logic
        if (reportFilters.startDate && c.date < reportFilters.startDate) return false;
        if (reportFilters.endDate && c.date > reportFilters.endDate) return false;
        
        // Dropdown Logic (Only filter if a specific value is selected)
        if (reportFilters.policeStation !== '' && c.policeStation !== reportFilters.policeStation) return false;
        if (reportFilters.court !== '' && c.court !== reportFilters.court) return false;
        if (reportFilters.hospital !== '' && c.hospital !== reportFilters.hospital) return false;
        if (reportFilters.status !== '' && c.status !== reportFilters.status) return false;

        return true;
    });

    setFilteredCases(results);
    setHasSearched(true); // Mark that a search has been performed
  };

  // Handle PDF Print
  const handlePrint = () => {
    window.print();
  };

  // --- RENDER HELPERS ---
  const renderHeader = (title: string, btnText?: string) => (
    <div className="flex justify-between items-center mb-6 print:hidden">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        <p className="text-slate-500 text-sm">Manage system records and configurations</p>
      </div>
      {btnText && (
        <button onClick={() => { resetForm(); setShowAddForm(true); }} className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all shadow-lg">
            <Plus size={18} /> {btnText}
        </button>
      )}
    </div>
  );

  const renderTable = (columns: string[], data: any[], type: string) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs border-b border-slate-100">
          <tr>
            {columns.map((col, idx) => <th key={idx} className="p-4">{col}</th>)}
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50 transition-colors">
              <td className="p-4 font-mono font-bold text-slate-600 border-r border-slate-50">{row.id}</td>
              <td className="p-4 font-bold text-slate-800">{row.name}</td>
              {type !== 'users' && <td className="p-4 text-slate-600">{row.location}</td>}
              {type === 'users' && (
                <>
                  <td className="p-4 text-slate-600">{row.email}</td>
                  <td className="p-4 text-slate-600">{row.nic}</td>
                  <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded capitalize font-bold text-xs">{row.role}</span></td>
                  <td className="p-4 text-slate-600">{row.appointedPlace}</td>
                </>
              )}
              <td className="p-4 text-slate-600">{row.contact}</td>
              <td className="p-4 text-right">
                <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(row, type)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(row.id, type)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan={columns.length + 1} className="p-8 text-center text-slate-400">No records found.</td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans relative">
      
      {/* PRINT STYLES */}
      <style>{`
        @media print {
          .print-hidden, .sidebar-nav { display: none !important; }
          .print-full-width { width: 100% !important; margin: 0 !important; padding: 0 !important; }
          body { background: white; }
          .report-container { box-shadow: none; border: none; }
        }
      `}</style>

      {/* SIDEBAR NAVIGATION */}
      <div className="sidebar-nav w-64 bg-slate-900 text-white flex flex-col shadow-2xl shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <Settings className="text-red-500" size={24} />
          <div><h1 className="text-lg font-bold">ADMIN PORTAL</h1><p className="text-xs text-slate-400">System Configuration</p></div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {['police', 'hospitals', 'courts', 'users'].map((t) => (
            <button key={t} onClick={() => {setActiveTab(t as any); resetForm();}} className={`w-full flex items-center gap-3 p-3 rounded-lg capitalize transition-all ${activeTab === t ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                {t === 'police' ? <Shield size={20} /> : t === 'hospitals' ? <Activity size={20} /> : t === 'courts' ? <Gavel size={20} /> : <Users size={20} />} 
                {t === 'police' ? 'Police Stations' : t === 'hospitals' ? 'Hospitals' : t === 'courts' ? 'Courts' : 'Users'}
            </button>
          ))}
          
          <div className="pt-4 mt-4 border-t border-slate-800">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-3 mb-2">Analytics</p>
            <button onClick={() => {setActiveTab('reports'); resetForm(); setHasSearched(false); setFilteredCases([]);}} className={`w-full flex items-center gap-3 p-3 rounded-lg capitalize transition-all ${activeTab === 'reports' ? 'bg-amber-500 text-black font-bold shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <FileText size={20} /> Reports & Logs
            </button>
          </div>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={onLogout} className="w-full bg-slate-800 hover:bg-black text-white p-3 rounded-lg flex items-center justify-center gap-2 font-bold border border-slate-700"><LogOut size={18} /> Sign Out</button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-8 overflow-auto print-full-width">
        {activeTab === 'police' && !showAddForm && <>{renderHeader('Police Station Registry', 'Add New Station')}{renderTable(['Station ID', 'Name', 'Location', 'Telephone'], stations, 'police')}</>}
        {activeTab === 'hospitals' && !showAddForm && <>{renderHeader('Hospital Management', 'Add New Hospital')}{renderTable(['Hospital ID', 'Name', 'Location', 'Contact Number'], hospitals, 'hospital')}</>}
        {activeTab === 'courts' && !showAddForm && <>{renderHeader('Court Registry', 'Add New Court')}{renderTable(['Court ID', 'Name', 'Location', 'Contact Number'], courts, 'court')}</>}
        {activeTab === 'users' && !showAddForm && <>{renderHeader('System User Management', 'Register User')}{renderTable(['User ID', 'Name', 'Email', 'NIC', 'Role', 'Appointed Place', 'Contact'], users, 'users')}</>}

        {/* --- REPORT SECTION --- */}
        {activeTab === 'reports' && (
            <div className="space-y-6">
                {/* FILTER CONTROLS */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print-hidden">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Filter size={20}/> Filter Case Records</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Date Range (Start)</label>
                            <input 
                                type="date" 
                                max={todayDate} // RESTRICT FUTURE DATES
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={reportFilters.startDate} 
                                onChange={e => setReportFilters({...reportFilters, startDate: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Date Range (End)</label>
                            <input 
                                type="date" 
                                max={todayDate} // RESTRICT FUTURE DATES
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={reportFilters.endDate} 
                                onChange={e => setReportFilters({...reportFilters, endDate: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Current Status</label>
                            <select className="w-full border p-2 rounded" value={reportFilters.status} onChange={e => setReportFilters({...reportFilters, status: e.target.value})}>
                                <option value="">All Statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Adjourned">Adjourned</option>
                                <option value="Closed">Closed</option>
                                <option value="Dismissed">Dismissed</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Police Station</label>
                            <select className="w-full border p-2 rounded" value={reportFilters.policeStation} onChange={e => setReportFilters({...reportFilters, policeStation: e.target.value})}>
                                <option value="">All Stations</option>
                                {stations.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Court</label>
                            <select className="w-full border p-2 rounded" value={reportFilters.court} onChange={e => setReportFilters({...reportFilters, court: e.target.value})}>
                                <option value="">All Courts</option>
                                {courts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Hospital</label>
                            <select className="w-full border p-2 rounded" value={reportFilters.hospital} onChange={e => setReportFilters({...reportFilters, hospital: e.target.value})}>
                                <option value="">All Hospitals</option>
                                {hospitals.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button onClick={generateReport} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-black transition-all">
                            Generate Report
                        </button>
                    </div>
                </div>

                {/* RESULTS AREA */}
                {filteredCases.length > 0 ? (
                    <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 report-container">
                        {/* Report Header */}
                        <div className="flex justify-between items-end mb-6 border-b pb-4">
                            <div>
                                <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">System Report</h1>
                                <p className="text-sm text-slate-500">Generated on {new Date().toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-4xl font-black text-amber-500">{filteredCases.length}</p>
                                <p className="text-xs font-bold uppercase text-slate-400">Total Records</p>
                            </div>
                        </div>

                        {/* Report Table */}
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-xs">
                                <tr>
                                    <th className="p-3">Case Number</th>
                                    <th className="p-3">Reported Date</th>
                                    <th className="p-3">Police Station</th>
                                    <th className="p-3">Current Court</th>
                                    <th className="p-3 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCases.map(c => (
                                    <tr key={c.id}>
                                        <td className="p-3 font-mono font-bold">{c.id}</td>
                                        <td className="p-3">{c.date}</td>
                                        <td className="p-3">{c.policeStation}</td>
                                        <td className="p-3">{c.court}</td>
                                        <td className="p-3 text-right">
                                            <span className={`px-2 py-1 rounded text-xs font-bold 
                                                ${c.status === 'Closed' ? 'bg-green-100 text-green-700' : 
                                                  c.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 
                                                  'bg-slate-100 text-slate-700'}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end print-hidden">
                            <button onClick={handlePrint} className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 flex items-center gap-2">
                                <Printer size={18}/> Print / Download PDF
                            </button>
                        </div>
                    </div>
                ) : (
                    // Logic to handle "Not Searched" vs "No Results Found"
                    <div className="text-center p-12 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300">
                        {hasSearched ? (
                            // State: Searched but no results
                            <>
                                <AlertCircle className="mx-auto text-red-400 mb-2" size={48} />
                                <h3 className="text-lg font-bold text-slate-700">No Available Data</h3>
                                <p className="text-slate-500">No records matched your selected criteria.</p>
                            </>
                        ) : (
                            // State: Hasn't searched yet
                            <>
                                <FileText className="mx-auto text-slate-400 mb-2" size={48} />
                                <h3 className="text-lg font-bold text-slate-700">Ready to Generate</h3>
                                <p className="text-slate-500">Select filters and click "Generate Report" to view results.</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* INPUT FORM (ADD/EDIT) */}
        {showAddForm && (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-8 animate-in zoom-in-95 duration-200 print-hidden">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Record' : 'Add New Record'}</h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              
              {activeTab !== 'users' && (
                <>
                  <div><label className="block text-sm font-bold text-slate-700 mb-1">Name</label><input name="name" onChange={handleInputChange} value={formData.name} className="w-full p-3 border rounded-lg" placeholder="Name" /></div>
                  <div><label className="block text-sm font-bold text-slate-700 mb-1">Location</label><input name="location" onChange={handleInputChange} value={formData.location} className="w-full p-3 border rounded-lg" placeholder="Location" /></div>
                </>
              )}

              {activeTab === 'users' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label><input name="name" onChange={handleInputChange} value={formData.name} className="w-full p-3 border rounded-lg" placeholder="Officer Name" /></div>
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">NIC Number</label><input name="nic" onChange={handleInputChange} value={formData.nic} className="w-full p-3 border rounded-lg" placeholder="National ID" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label><input name="email" type="email" onChange={handleInputChange} value={formData.email} className="w-full p-3 border rounded-lg" placeholder="Email" /></div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
                      <select name="role" onChange={handleInputChange} value={formData.role} className="w-full p-3 border rounded-lg font-bold text-slate-700">
                        <option value="police">Police Officer</option>
                        <option value="jmo">JMO (Medical Officer)</option>
                        <option value="attorney">Attorney</option>
                        <option value="judge">Judge / Magistrate</option>
                      </select>
                    </div>
                  </div>
                  
                  {formData.role !== 'attorney' && (
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Appointed Place</label>
                        <select name="appointedPlace" onChange={handleInputChange} value={formData.appointedPlace} className="w-full p-3 border rounded-lg bg-slate-50">
                            <option value="">Select Location...</option>
                            {formData.role === 'police' && stations.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            {formData.role === 'jmo' && hospitals.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                            {(formData.role === 'judge') && courts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                  )}

                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
                      <input 
                          name="password" 
                          type="text" 
                          onChange={handleInputChange} 
                          value={formData.password} 
                          className="w-full p-3 border rounded-lg font-mono text-red-600 bg-red-50" 
                          placeholder={editingId ? "Leave empty to keep current password" : "Set Password"} 
                      />
                  </div>
                </>
              )}
              
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Contact Number</label><input name="contact" maxLength={10} onChange={handleInputChange} value={formData.contact} className="w-full p-3 border rounded-lg" placeholder="011xxxxxxx" /></div>

              <div className="pt-4 flex gap-4">
                <button onClick={() => activeTab === 'users' ? handleAddUser() : handleAddOrganization(activeTab as any)} className="flex-1 bg-slate-900 hover:bg-black text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2"><Save size={18} /> {editingId ? 'Update Record' : 'Save Record'}</button>
                <button onClick={resetForm} className="px-6 py-3 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}