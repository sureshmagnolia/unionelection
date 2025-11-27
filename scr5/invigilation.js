import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const auth = window.firebase.auth;
const db = window.firebase.db;
const provider = window.firebase.provider;

// --- CONFIG ---
const DEFAULT_DESIGNATIONS = { "Assistant Professor": 2, "Associate Professor": 1, "Guest Lecturer": 4, "Professor": 0 };
const DEFAULT_ROLES = { "Vice Principal": 0, "HOD": 1, "NSS Officer": 1, "Warden": 0, "Exam Chief": 0 };

// --- STATE ---
let currentUser = null;
let currentCollegeId = null;
let collegeData = null;
let staffData = [];
let invigilationSlots = {}; // { "SessionID": { req: 5, assigned: [], ... } }
let designationsConfig = {};
let rolesConfig = {};

// --- DOM ELEMENTS ---
const views = { login: document.getElementById('view-login'), admin: document.getElementById('view-admin'), staff: document.getElementById('view-staff') };
const ui = {
    headerName: document.getElementById('header-college-name'), authSection: document.getElementById('auth-section'),
    userName: document.getElementById('user-name'), userRole: document.getElementById('user-role'),
    staffTableBody: document.getElementById('staff-table-body'),
    adminSlotsGrid: document.getElementById('admin-slots-grid'),
    staffSlotsGrid: document.getElementById('staff-slots-grid')
};

// --- AUTH ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await handleLogin(user);
    } else {
        currentUser = null;
        showView('login');
        document.getElementById('auth-section').classList.add('hidden');
    }
});

document.getElementById('login-btn').addEventListener('click', () => signInWithPopup(auth, provider));
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth).then(() => window.location.reload()));

// --- CORE LOGIC ---
async function handleLogin(user) {
    document.getElementById('login-btn').innerText = "Verifying...";
    
    const collegesRef = collection(db, "colleges");
    const q = query(collegesRef, where("allowedUsers", "array-contains", user.email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        currentCollegeId = docSnap.id;
        collegeData = docSnap.data();
        initAdminDashboard();
    } else {
        // Check Staff Access
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');
        if (urlId) await checkStaffAccess(urlId, user.email);
        else { alert("Access Denied."); signOut(auth); }
    }
}

async function checkStaffAccess(collegeId, email) {
    const docRef = doc(db, "colleges", collegeId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        const data = docSnap.data();
        const staffList = JSON.parse(data.examStaffData || '[]');
        const me = staffList.find(s => s.email.toLowerCase() === email.toLowerCase());
        
        if (me) {
            currentCollegeId = collegeId;
            collegeData = data;
            initStaffDashboard(me);
        } else { alert("Email not found in staff list."); signOut(auth); }
    } else { alert("Invalid Link."); signOut(auth); }
}

// --- ADMIN FUNCTIONS ---

function initAdminDashboard() {
    ui.headerName.textContent = collegeData.examCollegeName;
    ui.userName.textContent = currentUser.displayName;
    ui.userRole.textContent = "ADMIN";
    document.getElementById('auth-section').classList.remove('hidden');
    
    designationsConfig = JSON.parse(collegeData.invigDesignations || JSON.stringify(DEFAULT_DESIGNATIONS));
    rolesConfig = JSON.parse(collegeData.invigRoles || JSON.stringify(DEFAULT_ROLES));
    staffData = JSON.parse(collegeData.examStaffData || '[]');
    invigilationSlots = JSON.parse(collegeData.examInvigilationSlots || '{}');

    updateAdminUI();
    renderSlotsGridAdmin();
    showView('admin');
}

function updateAdminUI() {
    document.getElementById('stat-total-staff').textContent = staffData.length;
    const acYear = getCurrentAcademicYear();
    document.getElementById('lbl-academic-year').textContent = `AY: ${acYear.label}`;
    
    const desigSelect = document.getElementById('stf-designation');
    desigSelect.innerHTML = Object.keys(designationsConfig).map(r => `<option value="${r}">${r}</option>`).join('');
    
    renderStaffTable();
}

// --- SLOT CALCULATION ---
window.calculateSlotsFromSchedule = async function() {
    if(!confirm("This will recalculate invigilation needs from the current Exam Data. Continue?")) return;
    
    const students = JSON.parse(collegeData.examBaseData || '[]');
    if(students.length === 0) return alert("No exam data found to generate slots.");

    const sessions = {};
    students.forEach(s => {
        const key = `${s.Date} | ${s.Time}`;
        if(!sessions[key]) sessions[key] = 0;
        sessions[key]++;
    });

    let newSlots = { ...invigilationSlots }; // Keep existing data
    
    Object.keys(sessions).forEach(key => {
        const count = sessions[key];
        // Logic: 1 per 30 students + 10% Reserve
        const base = Math.ceil(count / 30);
        const reserve = Math.ceil(base * 0.10);
        const total = base + reserve;
        
        if(!newSlots[key]) {
            newSlots[key] = {
                required: total,
                assigned: [],
                unavailable: [],
                isLocked: false
            };
        } else {
            newSlots[key].required = total; // Update requirement
        }
    });

    invigilationSlots = newSlots;
    await syncSlotsToCloud();
    renderSlotsGridAdmin();
    alert("Slots generated successfully!");
}

// --- AUTO ALLOCATION ALGORITHM ---
window.runAutoAllocation = async function() {
    if(!confirm("Auto-Assign duties to empty slots based on pending load?")) return;
    
    // 1. Sort Staff by Pending Duty (High -> Low)
    // We clone to avoid messing up original array order
    let eligibleStaff = [...staffData].map(s => ({
        ...s,
        pending: calculateStaffTarget(s) - (s.dutiesDone || 0)
    })).sort((a, b) => b.pending - a.pending);

    let assignedCount = 0;

    // 2. Iterate Sessions
    for (const sessionKey in invigilationSlots) {
        const slot = invigilationSlots[sessionKey];
        if(slot.isLocked) continue;

        const needed = slot.required - slot.assigned.length;
        if (needed <= 0) continue;

        // Parse Date for checking availability
        const [dateStr] = sessionKey.split(' | ');
        const parts = dateStr.split('.');
        const examDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        const dayOfWeek = examDate.getDay(); // 0=Sun, 1=Mon...

        for (let i = 0; i < needed; i++) {
            // Find best candidate
            const candidate = eligibleStaff.find(s => {
                // Check 1: Already assigned this session?
                if (slot.assigned.includes(s.email)) return false;
                // Check 2: Marked Unavailable?
                if (slot.unavailable.includes(s.email)) return false;
                // Check 3: Guest Availability (Mon-Fri check)
                if (s.designation === "Guest Lecturer" && s.preferredDays && !s.preferredDays.includes(dayOfWeek)) return false;
                
                return true;
            });

            if (candidate) {
                slot.assigned.push(candidate.email);
                candidate.dutiesDone = (candidate.dutiesDone || 0) + 1; // Temp update for loop logic
                candidate.pending--; // Reduce priority for next slot
                
                // Re-sort eligible list to push this person down
                eligibleStaff.sort((a, b) => b.pending - a.pending);
                
                assignedCount++;
            }
        }
    }
    
    // 3. Sync Changes
    // We need to map temp `dutiesDone` back to main `staffData`? 
    // No, dutiesDone updates when an exam is *completed*. Here we update `dutiesAssigned` conceptually.
    // For simplicity, we just save the slot assignments.
    
    await syncSlotsToCloud();
    renderSlotsGridAdmin();
    alert(`Auto-allocation complete. Assigned ${assignedCount} duties.`);
}

// --- RENDER ADMIN SLOTS ---
function renderSlotsGridAdmin() {
    ui.adminSlotsGrid.innerHTML = '';
    const sortedKeys = Object.keys(invigilationSlots).sort();
    
    sortedKeys.forEach(key => {
        const slot = invigilationSlots[key];
        const filled = slot.assigned.length;
        const statusColor = filled >= slot.required ? "border-green-400 bg-green-50" : "border-orange-300 bg-orange-50";
        
        ui.adminSlotsGrid.innerHTML += `
            <div class="border-l-4 ${statusColor} bg-white p-4 rounded shadow-sm slot-card">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-gray-800 text-sm">${key}</h4>
                    <span class="text-xs font-bold px-2 py-1 rounded bg-white border">${filled} / ${slot.required}</span>
                </div>
                
                <div class="text-xs text-gray-600 mb-3">
                    <strong>Assigned:</strong> ${slot.assigned.map(email => getNameFromEmail(email)).join(', ') || "None"}
                </div>

                <div class="flex gap-2">
                    <button onclick="toggleLock('${key}')" class="flex-1 text-xs border border-gray-300 rounded py-1 hover:bg-gray-50">
                        ${slot.isLocked ? '🔒 Unlock' : '🔓 Lock'}
                    </button>
                    <button onclick="waNotify('${key}')" class="flex-1 text-xs bg-green-600 text-white rounded py-1 hover:bg-green-700">
                        WhatsApp
                    </button>
                </div>
            </div>
        `;
    });
}

// --- STAFF DASHBOARD ---

function initStaffDashboard(me) {
    ui.headerName.textContent = collegeData.examCollegeName;
    ui.userName.textContent = me.name;
    ui.userRole.textContent = "INVIGILATOR";
    document.getElementById('auth-section').classList.remove('hidden');
    
    document.getElementById('staff-view-name').textContent = me.name;
    const pending = calculateStaffTarget(me) - (me.dutiesDone || 0);
    document.getElementById('staff-view-pending').textContent = pending > 0 ? pending : "0 (Done)";
    
    invigilationSlots = JSON.parse(collegeData.examInvigilationSlots || '{}');
    renderStaffSlots(me.email);
    
    showView('staff');
}

function renderStaffSlots(myEmail) {
    ui.staffSlotsGrid.innerHTML = '';
    const sortedKeys = Object.keys(invigilationSlots).sort();
    
    sortedKeys.forEach(key => {
        const slot = invigilationSlots[key];
        if(slot.isLocked) return; // Hide locked slots from staff interaction? Or show as locked.

        const isAssigned = slot.assigned.includes(myEmail);
        const isUnavailable = slot.unavailable.includes(myEmail);
        
        let btnAction = "";
        if(isAssigned) {
            btnAction = `<div class="text-green-700 font-bold text-sm flex items-center gap-1"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg> Assigned</div>`;
        } else if (isUnavailable) {
            btnAction = `<button onclick="setAvailability('${key}', '${myEmail}', true)" class="text-xs text-blue-600 hover:underline">Undo "Unavailable"</button>`;
        } else {
            btnAction = `
                <div class="flex gap-2 mt-2">
                    <button onclick="volunteer('${key}', '${myEmail}')" class="flex-1 bg-indigo-600 text-white text-xs py-2 rounded hover:bg-indigo-700">Volunteer</button>
                    <button onclick="setAvailability('${key}', '${myEmail}', false)" class="flex-1 border border-red-200 text-red-600 text-xs py-2 rounded hover:bg-red-50">Mark Unavailable</button>
                </div>
            `;
        }

        ui.staffSlotsGrid.innerHTML += `
            <div class="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                <h4 class="font-bold text-gray-800 text-sm mb-1">${key}</h4>
                <p class="text-xs text-gray-500 mb-3">Slots: ${slot.assigned.length} / ${slot.required}</p>
                ${btnAction}
            </div>
        `;
    });
}

// --- COMMON HELPERS ---

window.toggleLock = async function(key) {
    invigilationSlots[key].isLocked = !invigilationSlots[key].isLocked;
    await syncSlotsToCloud();
    renderSlotsGridAdmin();
}

window.volunteer = async function(key, email) {
    if(!confirm("Confirm duty for this session?")) return;
    invigilationSlots[key].assigned.push(email);
    await syncSlotsToCloud();
    renderStaffSlots(email);
}

window.setAvailability = async function(key, email, isAvailable) {
    if(isAvailable) {
        invigilationSlots[key].unavailable = invigilationSlots[key].unavailable.filter(e => e !== email);
    } else {
        const reason = prompt("Reason for unavailability (Optional):");
        if(reason === null) return;
        invigilationSlots[key].unavailable.push(email);
    }
    await syncSlotsToCloud();
    renderStaffSlots(email);
}

window.waNotify = function(key) {
    const slot = invigilationSlots[key];
    if(slot.assigned.length === 0) return alert("No staff assigned yet.");
    
    // Get phones
    const phones = slot.assigned.map(email => {
        const s = staffData.find(st => st.email === email);
        return s ? s.phone : "";
    }).filter(p => p);
    
    if(phones.length === 0) return alert("No phone numbers found.");
    
    const msg = encodeURIComponent(`Exam Duty Reminder: You are assigned for invigilation on ${key}. Please report 30 mins early.`);
    // Open WA for first person (Bulk API requires business account, loop manual is best for free)
    // Or list links
    let links = phones.map(p => `https://wa.me/${p}?text=${msg}`).join('\n');
    console.log(links);
    window.open(`https://wa.me/${phones[0]}?text=${msg}`, '_blank');
}

// --- DATABASE SYNC ---

async function syncSlotsToCloud() {
    const ref = doc(db, "colleges", currentCollegeId);
    await updateDoc(ref, { examInvigilationSlots: JSON.stringify(invigilationSlots) });
}

// --- MATH HELPERS ---
function getCurrentAcademicYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); 
    let startYear = (month < 5) ? year - 1 : year;
    return { label: `${startYear}-${startYear+1}`, start: new Date(startYear, 5, 1), end: new Date(startYear+1, 4, 31) };
}

function calculateStaffTarget(staff) {
    // Simplified for now: Monthly * 5 months per sem approx
    const roleTarget = designationsConfig[staff.designation] || 2;
    // Check active role override
    if (staff.roleHistory) {
        const today = new Date();
        const active = staff.roleHistory.find(r => new Date(r.start) <= today && new Date(r.end) >= today);
        if(active && rolesConfig[active.role] !== undefined) return rolesConfig[active.role] * 5; 
    }
    return roleTarget * 5; // Exam season target
}

function getNameFromEmail(email) {
    const s = staffData.find(st => st.email === email);
    return s ? s.name.split(' ')[0] : email.split('@')[0];
}

// --- TAB SWITCHING ---
window.switchAdminTab = function(tabName) {
    document.getElementById('tab-content-staff').classList.add('hidden');
    document.getElementById('tab-content-slots').classList.add('hidden');
    document.getElementById('tab-btn-staff').classList.replace('border-indigo-600', 'border-transparent');
    document.getElementById('tab-btn-slots').classList.replace('border-indigo-600', 'border-transparent');
    
    document.getElementById(`tab-content-${tabName}`).classList.remove('hidden');
    document.getElementById(`tab-btn-${tabName}`).classList.replace('border-transparent', 'border-indigo-600');
}

// Expose
window.calculateSlotsFromSchedule = calculateSlotsFromSchedule;
window.runAutoAllocation = runAutoAllocation;
window.toggleLock = toggleLock;
window.volunteer = volunteer;
window.setAvailability = setAvailability;
window.waNotify = waNotify;
window.saveNewStaff = saveNewStaff;
window.saveRoleAssignment = saveRoleAssignment;
window.removeRoleFromStaff = removeRoleFromStaff;
window.deleteStaff = deleteStaff;
window.openModal = (id) => document.getElementById(id).classList.remove('hidden');
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');
window.filterStaffTable = renderStaffTable;
function showView(viewName) {
    Object.values(views).forEach(el => el.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
}
