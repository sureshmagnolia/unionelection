import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// FIX: Added 'orderBy' to imports
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, orderBy } 
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
let invigilationSlots = {}; 
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

// --- AUTHENTICATION ---
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

// --- NEW: FETCH FULL DATA (HANDLES CHUNKS) ---
async function fetchFullCollegeData(collegeId) {
    console.log("Fetching full data from cloud...");
    
    // 1. Fetch Main Document
    const mainRef = doc(db, "colleges", collegeId);
    const mainSnap = await getDoc(mainRef);
    
    if (!mainSnap.exists()) return null;
    let fullData = mainSnap.data();

    // 2. Fetch Data Chunks (Student Data is here)
    try {
        const dataColRef = collection(db, "colleges", collegeId, "data");
        const q = query(dataColRef, orderBy("index")); 
        const querySnapshot = await getDocs(q);
        
        let fullPayload = "";
        querySnapshot.forEach((doc) => {
            const d = doc.data();
            if (d.payload) fullPayload += d.payload;
        });

        if (fullPayload) {
            const bulkData = JSON.parse(fullPayload);
            // Merge bulk data (examBaseData, etc.) into the main object
            fullData = { ...fullData, ...bulkData };
            console.log("Chunks merged successfully.");
        }
    } catch (e) {
        console.error("Error fetching chunks:", e);
    }
    
    return fullData;
}

// --- CORE LOGIN LOGIC ---
async function handleLogin(user) {
    document.getElementById('login-btn').innerText = "Verifying...";
    
    const collegesRef = collection(db, "colleges");
    const q = query(collegesRef, where("allowedUsers", "array-contains", user.email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        currentCollegeId = docSnap.id;
        
        // FIX: Fetch FULL data (including student list chunks)
        collegeData = await fetchFullCollegeData(currentCollegeId);
        
        initAdminDashboard();
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');
        if (urlId) await checkStaffAccess(urlId, user.email);
        else { alert("Access Denied."); signOut(auth); }
    }
}

async function checkStaffAccess(collegeId, email) {
    // For Staff, we usually don't need the full massive student list, just slots & staff info.
    // But to be safe and consistent, we'll fetch the main doc first.
    const docRef = doc(db, "colleges", collegeId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        const data = docSnap.data(); // Main doc is enough for Invigilators
        const staffList = JSON.parse(data.examStaffData || '[]');
        const me = staffList.find(s => s.email.toLowerCase() === email.toLowerCase());
        
        if (me) {
            currentCollegeId = collegeId;
            collegeData = data;
            initStaffDashboard(me);
        } else { alert("Email not found in staff list."); signOut(auth); }
    } else { alert("Invalid Link."); signOut(auth); }
}

// --- ADMIN DASHBOARD ---
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
    if(desigSelect) {
        desigSelect.innerHTML = Object.keys(designationsConfig).map(r => `<option value="${r}">${r}</option>`).join('');
    }
    
    renderStaffTable(); 
}

// --- RENDER STAFF TABLE ---
function renderStaffTable() {
    if(!ui.staffTableBody) return;
    ui.staffTableBody.innerHTML = '';
    const filter = document.getElementById('staff-search').value.toLowerCase();

    staffData.forEach((staff, index) => {
        if (filter && !staff.name.toLowerCase().includes(filter)) return;

        const target = calculateStaffTarget(staff);
        const done = staff.dutiesDone || 0; 
        const pending = target - done;
        
        // Active Role Label
        let activeRoleLabel = "";
        const today = new Date();
        if (staff.roleHistory) {
            const activeRole = staff.roleHistory.find(r => new Date(r.start) <= today && new Date(r.end) >= today);
            if (activeRole) activeRoleLabel = `<span class="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded ml-1">${activeRole.role}</span>`;
        }

        const statusColor = pending > 3 ? 'text-red-600 font-bold' : (pending > 0 ? 'text-orange-600' : 'text-green-600');

        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 transition border-b border-gray-100";
        row.innerHTML = `
            <td class="px-6 py-3">
                <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs mr-3">
                        ${staff.name.charAt(0)}
                    </div>
                    <div>
                        <div class="text-sm font-bold text-gray-800">${staff.name}</div>
                        <div class="text-xs text-gray-500">${staff.designation} ${activeRoleLabel}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-3 text-center font-mono text-sm text-gray-600">${target}</td>
            <td class="px-6 py-3 text-center font-mono text-sm font-bold">${done}</td>
            <td class="px-6 py-3 text-center font-mono text-sm ${statusColor}">${pending}</td>
            <td class="px-6 py-3 text-right text-xs font-medium flex justify-end gap-2">
                <button onclick="openRoleAssignmentModal(${index})" class="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-2 py-1 rounded">Assign Role</button>
                <button onclick="deleteStaff(${index})" class="text-red-500 hover:text-red-700">&times;</button>
            </td>
        `;
        ui.staffTableBody.appendChild(row);
    });
}

// --- SLOT GENERATION & ALLOCATION ---
window.calculateSlotsFromSchedule = async function() {
    if(!confirm("This will recalculate invigilation needs using the latest exam data from the cloud. Continue?")) return;
    
    // This now works because we fetched chunks in handleLogin
    const students = JSON.parse(collegeData.examBaseData || '[]'); 
    
    if(students.length === 0) return alert("No exam data found. Please ensure data is uploaded in the main app.");

    const sessions = {};
    students.forEach(s => {
        const key = `${s.Date} | ${s.Time}`;
        if(!sessions[key]) sessions[key] = 0;
        sessions[key]++;
    });

    let newSlots = { ...invigilationSlots };
    let slotsAdded = 0;

    Object.keys(sessions).forEach(key => {
        const count = sessions[key];
        const base = Math.ceil(count / 30);
        const reserve = Math.ceil(base * 0.10);
        const total = base + reserve;
        
        if(!newSlots[key]) {
            newSlots[key] = { required: total, assigned: [], unavailable: [], isLocked: false };
            slotsAdded++;
        } else {
            newSlots[key].required = total; // Update count if changed
        }
    });

    invigilationSlots = newSlots;
    await syncSlotsToCloud();
    renderSlotsGridAdmin();
    alert(`Slots updated! Found ${Object.keys(sessions).length} sessions.`);
}

window.runAutoAllocation = async function() {
    if(!confirm("Auto-Assign duties?")) return;
    
    let eligibleStaff = [...staffData].map(s => ({
        ...s,
        pending: calculateStaffTarget(s) - (s.dutiesDone || 0)
    })).sort((a, b) => b.pending - a.pending);

    let assignedCount = 0;

    for (const sessionKey in invigilationSlots) {
        const slot = invigilationSlots[sessionKey];
        if(slot.isLocked) continue;

        const needed = slot.required - slot.assigned.length;
        if (needed <= 0) continue;

        const [dateStr] = sessionKey.split(' | ');
        const parts = dateStr.split('.');
        const examDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        const dayOfWeek = examDate.getDay(); 

        for (let i = 0; i < needed; i++) {
            const candidate = eligibleStaff.find(s => {
                if (slot.assigned.includes(s.email)) return false;
                if (slot.unavailable.includes(s.email)) return false;
                if (s.designation === "Guest Lecturer" && s.preferredDays && !s.preferredDays.includes(dayOfWeek)) return false;
                return true;
            });

            if (candidate) {
                slot.assigned.push(candidate.email);
                candidate.pending--; 
                eligibleStaff.sort((a, b) => b.pending - a.pending);
                assignedCount++;
            }
        }
    }
    
    await syncSlotsToCloud();
    renderSlotsGridAdmin();
    alert(`Assigned ${assignedCount} duties.`);
}

function renderSlotsGridAdmin() {
    if(!ui.adminSlotsGrid) return;
    ui.adminSlotsGrid.innerHTML = '';
    Object.keys(invigilationSlots).sort().forEach(key => {
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
    if(!ui.staffSlotsGrid) return;
    ui.staffSlotsGrid.innerHTML = '';
    Object.keys(invigilationSlots).sort().forEach(key => {
        const slot = invigilationSlots[key];
        if(slot.isLocked) return;

        const isAssigned = slot.assigned.includes(myEmail);
        const isUnavailable = slot.unavailable.includes(myEmail);
        
        let btnAction = "";
        if(isAssigned) {
            btnAction = `<div class="text-green-700 font-bold text-sm">✅ Assigned</div>`;
        } else if (isUnavailable) {
            btnAction = `<button onclick="setAvailability('${key}', '${myEmail}', true)" class="text-xs text-blue-600 underline">Undo Unavailable</button>`;
        } else {
            btnAction = `
                <div class="flex gap-2 mt-2">
                    <button onclick="volunteer('${key}', '${myEmail}')" class="flex-1 bg-indigo-600 text-white text-xs py-2 rounded">Volunteer</button>
                    <button onclick="setAvailability('${key}', '${myEmail}', false)" class="flex-1 border border-red-200 text-red-600 text-xs py-2 rounded">Unavailable</button>
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

// --- HELPERS ---
function getCurrentAcademicYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); 
    let startYear = (month < 5) ? year - 1 : year;
    return { label: `${startYear}-${startYear+1}`, start: new Date(startYear, 5, 1), end: new Date(startYear+1, 4, 31) };
}

function calculateStaffTarget(staff) {
    const roleTarget = designationsConfig[staff.designation] || 2;
    if (staff.roleHistory) {
        const today = new Date();
        const active = staff.roleHistory.find(r => new Date(r.start) <= today && new Date(r.end) >= today);
        if(active && rolesConfig[active.role] !== undefined) return rolesConfig[active.role] * 5; 
    }
    return roleTarget * 5; 
}

function getNameFromEmail(email) {
    const s = staffData.find(st => st.email === email);
    return s ? s.name.split(' ')[0] : email.split('@')[0];
}

async function syncSlotsToCloud() {
    const ref = doc(db, "colleges", currentCollegeId);
    await updateDoc(ref, { examInvigilationSlots: JSON.stringify(invigilationSlots) });
}

async function syncStaffToCloud() {
    const ref = doc(db, "colleges", currentCollegeId);
    await updateDoc(ref, { examStaffData: JSON.stringify(staffData) });
}

async function addUserToWhitelist(email) {
    try {
        const ref = doc(db, "colleges", currentCollegeId);
        await updateDoc(ref, { allowedUsers: arrayUnion(email) });
    } catch(e) { console.error(e); }
}

// --- EXPORTED FUNCTIONS ---

window.toggleLock = async function(key) {
    invigilationSlots[key].isLocked = !invigilationSlots[key].isLocked;
    await syncSlotsToCloud();
    renderSlotsGridAdmin();
}

window.volunteer = async function(key, email) {
    if(!confirm("Confirm duty?")) return;
    invigilationSlots[key].assigned.push(email);
    await syncSlotsToCloud();
    renderStaffSlots(email);
}

window.setAvailability = async function(key, email, isAvailable) {
    if(isAvailable) {
        invigilationSlots[key].unavailable = invigilationSlots[key].unavailable.filter(e => e !== email);
    } else {
        invigilationSlots[key].unavailable.push(email);
    }
    await syncSlotsToCloud();
    renderStaffSlots(email);
}

window.waNotify = function(key) {
    const slot = invigilationSlots[key];
    if(slot.assigned.length === 0) return alert("No staff assigned.");
    const phones = slot.assigned.map(email => {
        const s = staffData.find(st => st.email === email);
        return s ? s.phone : "";
    }).filter(p => p);
    if(phones.length === 0) return alert("No phones found.");
    const msg = encodeURIComponent(`Exam Duty: You are assigned for ${key}.`);
    window.open(`https://wa.me/${phones[0]}?text=${msg}`, '_blank');
}

window.openModal = (id) => document.getElementById(id).classList.remove('hidden');
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

window.saveNewStaff = async function() {
    const name = document.getElementById('stf-name').value;
    const email = document.getElementById('stf-email').value;
    const phone = document.getElementById('stf-phone').value;
    const dept = document.getElementById('stf-dept').value;
    const designation = document.getElementById('stf-designation').value;
    const date = document.getElementById('stf-join').value;

    if(!name || !email) return alert("Fill all fields");

    const newObj = { name, email, phone, dept, designation, joiningDate: date, dutiesDone: 0, roleHistory: [] };
    staffData.push(newObj);
    await syncStaffToCloud();
    await addUserToWhitelist(email);
    
    window.closeModal('add-staff-modal');
    renderStaffTable();
}

window.deleteStaff = async function(index) {
    if(confirm("Delete staff?")) {
        staffData.splice(index, 1);
        await syncStaffToCloud();
        renderStaffTable();
    }
}

window.openRoleAssignmentModal = function(index) {
    const staff = staffData[index];
    const modal = document.getElementById('role-assignment-modal');
    document.getElementById('role-assign-name').textContent = staff.name;
    document.getElementById('role-assign-index').value = index;
    
    const select = document.getElementById('assign-role-select');
    select.innerHTML = Object.keys(rolesConfig).map(r => `<option value="${r}">${r}</option>`).join('');
    
    const hist = document.getElementById('role-history-list');
    hist.innerHTML = (staff.roleHistory || []).map((h, i) => 
        `<div class="flex justify-between text-xs p-1 bg-gray-50 mb-1"><span>${h.role}</span> <button onclick="removeRole(${index},${i})" class="text-red-500">&times;</button></div>`
    ).join('');
    
    modal.classList.remove('hidden');
}

window.saveRoleAssignment = async function() {
    const idx = document.getElementById('role-assign-index').value;
    const role = document.getElementById('assign-role-select').value;
    const start = document.getElementById('assign-start-date').value;
    const end = document.getElementById('assign-end-date').value;
    
    if(!start) return alert("Dates required");
    
    if(!staffData[idx].roleHistory) staffData[idx].roleHistory = [];
    staffData[idx].roleHistory.push({ role, start, end });
    
    await syncStaffToCloud();
    window.closeModal('role-assignment-modal');
    renderStaffTable();
}

window.removeRole = async function(sIdx, rIdx) {
    staffData[sIdx].roleHistory.splice(rIdx, 1);
    await syncStaffToCloud();
    window.closeModal('role-assignment-modal'); 
    renderStaffTable();
}

window.filterStaffTable = renderStaffTable;

window.switchAdminTab = function(tabName) {
    document.getElementById('tab-content-staff').classList.add('hidden');
    document.getElementById('tab-content-slots').classList.add('hidden');
    document.getElementById('tab-btn-staff').classList.replace('border-indigo-600', 'border-transparent');
    document.getElementById('tab-btn-slots').classList.replace('border-indigo-600', 'border-transparent');
    document.getElementById(`tab-content-${tabName}`).classList.remove('hidden');
    document.getElementById(`tab-btn-${tabName}`).classList.replace('border-transparent', 'border-indigo-600');
}

function showView(viewName) {
    Object.values(views).forEach(el => el.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
}
