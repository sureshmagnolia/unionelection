// invigilation.js
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const auth = window.firebase.auth;
const db = window.firebase.db;
const provider = window.firebase.provider;

// --- STATE ---
let currentUser = null;
let currentCollegeId = null;
let collegeData = null;
let staffData = [];
let rolesConfig = {
    "Assistant Professor": { target: 2 },
    "Guest Lecturer": { target: 4 },
    "Associate Professor": { target: 1 }
};

// --- DOM ELEMENTS ---
const views = {
    login: document.getElementById('view-login'),
    admin: document.getElementById('view-admin'),
    staff: document.getElementById('view-staff')
};
const ui = {
    headerName: document.getElementById('header-college-name'),
    authSection: document.getElementById('auth-section'),
    userName: document.getElementById('user-name'),
    userRole: document.getElementById('user-role'),
    loginBtn: document.getElementById('login-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    staffTableBody: document.getElementById('staff-table-body'),
    roleSelect: document.getElementById('stf-role')
};

// --- AUTHENTICATION FLOW ---

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        console.log("User:", user.email);
        await handleLogin(user);
    } else {
        currentUser = null;
        showView('login');
        ui.authSection.classList.add('hidden');
    }
});

ui.loginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch((error) => {
        document.getElementById('login-status').textContent = "Login failed: " + error.message;
    });
});

ui.logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => window.location.reload());
});

// --- CORE LOGIC ---

async function handleLogin(user) {
    ui.loginBtn.innerText = "Checking Access...";
    
    // 1. Find College (Admin Check)
    const collegesRef = collection(db, "colleges");
    const q = query(collegesRef, where("allowedUsers", "array-contains", user.email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        // IS ADMIN
        const docSnap = querySnapshot.docs[0];
        currentCollegeId = docSnap.id;
        collegeData = docSnap.data();
        
        initAdminDashboard();
    } else {
        // 2. Check if Staff (Invigilator)
        // We need to query all colleges to find if this email exists in 'examStaffData' subcollection 
        // OR since we don't know the college ID yet, we might need a global lookup.
        // FOR PHASE 1: We assume the staff link provided includes the College ID in URL if they are not admin
        // OR we scan collections (inefficient).
        
        // BETTER: Check if the email is in a "Staff Index" or try the ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');
        
        if (urlId) {
            await checkStaffAccess(urlId, user.email);
        } else {
            alert("Access Denied. If you are an Invigilator, please use the link provided by your Admin.");
            signOut(auth);
        }
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
            // IS STAFF
            currentCollegeId = collegeId;
            collegeData = data;
            initStaffDashboard(me);
        } else {
            alert("Your email is not registered as a staff member for this college.");
            signOut(auth);
        }
    } else {
        alert("Invalid College Link.");
        signOut(auth);
    }
}

// --- ADMIN DASHBOARD ---

function initAdminDashboard() {
    ui.headerName.textContent = collegeData.examCollegeName;
    ui.userName.textContent = currentUser.displayName;
    ui.userRole.textContent = "ADMIN";
    ui.authSection.classList.remove('hidden');
    
    // Load Data
    staffData = JSON.parse(collegeData.examStaffData || '[]');
    const savedRoles = JSON.parse(collegeData.examStaffRoles || '{}');
    if(Object.keys(savedRoles).length > 0) rolesConfig = savedRoles;
    
    updateAdminUI();
    showView('admin');
}

function updateAdminUI() {
    // Update Stats
    document.getElementById('stat-total-staff').textContent = staffData.length;
    document.getElementById('stat-active-roles').textContent = Object.keys(rolesConfig).length;
    
    // Populate Role Dropdown
    ui.roleSelect.innerHTML = Object.keys(rolesConfig).map(r => `<option>${r}</option>`).join('');
    
    renderStaffTable();
}

function renderStaffTable() {
    ui.staffTableBody.innerHTML = '';
    const filter = document.getElementById('staff-search').value.toLowerCase();
    const today = new Date();

    staffData.forEach(staff => {
        if (filter && !staff.name.toLowerCase().includes(filter)) return;

        // Calculate Logic
        const joinDate = new Date(staff.joiningDate);
        // Months of service (approx)
        const months = (today.getFullYear() - joinDate.getFullYear()) * 12 + (today.getMonth() - joinDate.getMonth());
        const target = Math.max(0, months * (rolesConfig[staff.role]?.target || 2));
        const pending = target - (staff.dutiesDone || 0);

        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 transition";
        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs mr-3">
                        ${staff.name.charAt(0)}
                    </div>
                    <div>
                        <div class="text-sm font-medium text-gray-900">${staff.name}</div>
                        <div class="text-xs text-gray-500">${staff.phone}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-900">${staff.role}</div>
                <div class="text-xs text-gray-500">${staff.dept}</div>
            </td>
            <td class="px-6 py-4 text-center text-sm text-gray-500 font-mono">${target}</td>
            <td class="px-6 py-4 text-center text-sm font-bold text-gray-700 font-mono">${staff.dutiesDone || 0}</td>
            <td class="px-6 py-4 text-center">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${pending > 5 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                    ${pending}
                </span>
            </td>
            <td class="px-6 py-4 text-right text-sm font-medium">
                <a href="https://wa.me/${staff.phone}" target="_blank" class="text-green-600 hover:text-green-900 mr-3">WhatsApp</a>
                <button class="text-red-600 hover:text-red-900" onclick="deleteStaff('${staff.email}')">Delete</button>
            </td>
        `;
        ui.staffTableBody.appendChild(row);
    });
}

// --- STAFF DASHBOARD ---

function initStaffDashboard(me) {
    ui.headerName.textContent = collegeData.examCollegeName;
    ui.userName.textContent = me.name;
    ui.userRole.textContent = "INVIGILATOR";
    ui.authSection.classList.remove('hidden');
    
    document.getElementById('staff-view-name').textContent = me.name;
    document.getElementById('staff-view-dept').textContent = me.dept;
    document.getElementById('staff-view-role').textContent = me.role;
    
    showView('staff');
}

// --- ACTIONS ---

window.saveNewStaff = async function() {
    const name = document.getElementById('stf-name').value;
    const email = document.getElementById('stf-email').value;
    const phone = document.getElementById('stf-phone').value;
    const dept = document.getElementById('stf-dept').value;
    const role = document.getElementById('stf-role').value;
    const date = document.getElementById('stf-join').value;

    if(!name || !email || !date) return alert("Fill all fields");

    const newObj = {
        name, email, phone, dept, role, joiningDate: date,
        dutiesDone: 0, dutiesAssigned: 0
    };

    staffData.push(newObj);
    await syncStaffToCloud();
    closeModal('add-staff-modal');
    renderStaffTable();
}

window.deleteStaff = async function(email) {
    if(confirm("Delete this staff member?")) {
        staffData = staffData.filter(s => s.email !== email);
        await syncStaffToCloud();
        renderStaffTable();
    }
}

async function syncStaffToCloud() {
    if(!currentCollegeId) return;
    const ref = doc(db, "colleges", currentCollegeId);
    await updateDoc(ref, {
        examStaffData: JSON.stringify(staffData)
    });
}

// --- HELPERS ---

window.openModal = (id) => document.getElementById(id).classList.remove('hidden');
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');
window.filterStaffTable = renderStaffTable; // Re-use render for search

function showView(viewName) {
    Object.values(views).forEach(el => el.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
}
