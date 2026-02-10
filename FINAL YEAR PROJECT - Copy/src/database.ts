// database.ts

// --- 1. INITIAL SEED DATA ---
const INITIAL_DATA = [
  {
    id: "CASE-2023-001",
    date: "2023-10-24",
    desc: "Traffic accident involving two motorcycles at Borella Junction.",
    location: "Borella",
    status: "Open",
    assignedCourt: "Magistrate Court Fort", // Ensure this matches your dashboard logic
    parties: [
      {
        name: "Saman Perera",
        nic: "851234567V",
        role: "Victim",
        isHospitalized: true,
        hospitalName: "National Hospital Colombo",
        medicalReport: null 
      },
      {
        name: "Nimal Silva",
        nic: "901234567V",
        role: "Accused",
        isHospitalized: false,
        hospitalName: "",
        medicalReport: null
      }
    ]
  },
  {
    id: "CASE-2023-002",
    date: "2023-10-25",
    desc: "Physical altercation at public market.",
    location: "Pettah",
    status: "Investigating",
    assignedCourt: "Magistrate Court Fort",
    parties: [
      {
        name: "Kamal Gunaratne",
        nic: "781234567V",
        role: "Victim",
        isHospitalized: true,
        hospitalName: "National Hospital Colombo",
        medicalReport: null
      }
    ]
  },
  {
    id: "CASE-2023-005",
    date: "2023-10-26",
    desc: "Pedestrian hit by three-wheeler.",
    location: "Maradana",
    status: "Open",
    assignedCourt: "Magistrate Court Kaduwela",
    parties: [
      {
        name: "Sunil Bandara",
        nic: "651234567V",
        role: "Victim",
        isHospitalized: true,
        hospitalName: "General Hospital Kandy",
        medicalReport: null
      }
    ]
  }
];

// --- 2. STORAGE KEY ---
// Changed key to ensure we don't conflict with old versions
const DB_KEY = "justiceflow_master_db_v2";

// --- 3. THE FUNCTION ---
export const executeSQLQuery = (type: string, payload?: any) => {
  
  // A. Load current data from LocalStorage
  let currentData = [];
  const stored = localStorage.getItem(DB_KEY);

  if (stored) {
    currentData = JSON.parse(stored);
  } else {
    currentData = INITIAL_DATA;
    localStorage.setItem(DB_KEY, JSON.stringify(INITIAL_DATA));
  }

  // B. Handle "SELECT" (Get Data)
  if (type === 'SELECT') {
    return currentData;
  }

  // --- C. NEW: Handle "INSERT" (Create New Case) ---
  // THIS WAS MISSING IN YOUR CODE
  if (type === 'INSERT' && payload) {
    // Add the new case to the BEGINNING of the list (newest first)
    currentData = [payload, ...currentData];
    
    // Save to LocalStorage
    localStorage.setItem(DB_KEY, JSON.stringify(currentData));
    
    console.log("New case created successfully:", payload.id);
    return currentData;
  }

  // D. Handle "UPDATE" (Edit/Save Report)
  if (type === 'UPDATE' && payload) {
    const caseIndex = currentData.findIndex((c: any) => c.id === payload.id);

    if (caseIndex !== -1) {
      currentData[caseIndex] = payload;
      localStorage.setItem(DB_KEY, JSON.stringify(currentData));
      console.log("Database updated successfully for Case:", payload.id);
      return currentData;
    }
  }

  return [];
};

// --- HELPER TO RESET DB ---
export const resetDB = () => {
    localStorage.removeItem(DB_KEY);
    window.location.reload();
}