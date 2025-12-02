// ==========================================
// 1. FIREBASE IMPORTS & CONFIG
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, setDoc, doc, deleteDoc, writeBatch, runTransaction, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDstlguyk5d3Cr4AqYkH1hMYuvqSNGJ05I",
  authDomain: "unionelection.firebaseapp.com",
  projectId: "unionelection",
  storageBucket: "unionelection.firebasestorage.app",
  messagingSenderId: "1090892401508",
  appId: "1:1090892401508:web:c18bde654d0b36d3ddc871",
  measurementId: "G-Z83NH3ZN11"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Global Listeners (to stop background updates if needed)
let unsubStudents = null;
let unsubPosts = null;
let unsubNominations = null;
let unsubTeam = null;

// ==========================================
// 2. MAIN APP LOGIC
// ==========================================
const App = {
    data: {
        students: [],
        posts: [],
        nominations: []
    },

    UI: {
        showSection: (id) => {
            document.querySelectorAll('[id^="sec-"]').forEach(el => el.classList.add('hidden'));
            const target = document.getElementById(`sec-${id}`);
            if(target) target.classList.remove('hidden');
        },
        // Helper to render Posts table in Admin Post View
        renderPostsTable: () => {
            const tbody = document.getElementById('posts-tbody');
            if(!tbody) return;
            tbody.innerHTML = '';
            App.data.posts.forEach((post) => {
                let restrictions = [];
                if(post.gender !== "Any") restrictions.push(post.gender);
                if(post.stream !== "Any") restrictions.push(post.stream);
                if(post.year !== "Any") restrictions.push(post.year + " Year");
                if(post.dept) restrictions.push("Dept: " + post.dept);
                if(restrictions.length === 0) restrictions.push("General");

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${post.name}</td>
                    <td>${post.vacancy}</td>
                    <td><small>${restrictions.join(", ")}</small></td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="window.App.Admin.deletePost('${post.id}')">X</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    },

    Admin: {
        // ------------------------------------------------
        // MODULE A: NOMINAL ROLL (CSV, Edit, Save)
        // ------------------------------------------------
        
        processCSV: () => {
            const fileInput = document.getElementById('csv-file');
            if (!fileInput || !fileInput.files.length) return alert("Select CSV");
            
            Papa.parse(fileInput.files[0], {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    App.data.students = results.data.map((row, index) => ({
                        slNo: row['Sl No'] || row['sl no'] || index+1,
                        name: row['Name'],
                        gender: row['Gender'],
                        dept: row['Dept'],
                        year: row['Year'],
                        stream: row['UG-PG'] || row['Stream'] || "UG",
                        admNo: row['Admission Number'] || row['Adm No']
                    }));
                    
                    App.Admin.renderTable(App.data.students);
                    document.getElementById('student-count').innerText = `Previewing ${App.data.students.length} students (Not saved yet)`;
                }
            });
        },

        // LIVE SYNC: Students
        loadStudentsFromDB: () => {
            if(unsubStudents) unsubStudents(); 
            
            const tbody = document.getElementById('nominal-tbody');
            if(tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center">Syncing Database...</td></tr>';

            unsubStudents = onSnapshot(collection(db, "students"), (snapshot) => {
                App.data.students = [];
                snapshot.forEach(doc => App.data.students.push(doc.data()));
                
                // Sort by Sl No
                App.data.students.sort((a,b) => parseInt(a.slNo) - parseInt(b.slNo));
                
                App.Admin.renderTable(App.data.students);
                const countEl = document.getElementById('student-count');
                if(countEl) countEl.innerText = `Live: ${App.data.students.length} students synced.`;
            });
        },

        // RENDER TABLE (With Inputs for Editing)
        renderTable: (data) => {
            const tbody = document.getElementById('nominal-tbody');
            if(!tbody) return;
            tbody.innerHTML = '';

            data.forEach((student, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><input type="text" class="form-control form-control-sm" value="${student.slNo}" onchange="window.App.Admin.updateLocalData(${index}, 'slNo', this.value)"></td>
                    <td><input type="text" class="form-control form-control-sm fw-bold" value="${student.name}" onchange="window.App.Admin.updateLocalData(${index}, 'name', this.value)"></td>
                    <td>
                        <select class="form-select form-select-sm" onchange="window.App.Admin.updateLocalData(${index}, 'gender', this.value)">
                            <option value="Male" ${student.gender === 'Male' ? 'selected' : ''}>Male</option>
                            <option value="Female" ${student.gender === 'Female' ? 'selected' : ''}>Female</option>
                        </select>
                    </td>
                    <td><input type="text" class="form-control form-control-sm" value="${student.dept}" onchange="window.App.Admin.updateLocalData(${index}, 'dept', this.value)"></td>
                    <td><input type="text" class="form-control form-control-sm" value="${student.year}" onchange="window.App.Admin.updateLocalData(${index}, 'year', this.value)"></td>
                    <td><input type="text" class="form-control form-control-sm" value="${student.stream}" onchange="window.App.Admin.updateLocalData(${index}, 'stream', this.value)"></td>
                    <td><input type="text" class="form-control form-control-sm bg-light" value="${student.admNo}" readonly title="ID cannot be changed"></td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-success" onclick="window.App.Admin.saveRow(${index})">💾</button>
                            <button class="btn btn-sm btn-danger" onclick="window.App.Admin.deleteRow('${student.admNo}', ${index})">X</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        },

        updateLocalData: (index, field, value) => {
            App.data.students[index][field] = value;
            const row = document.getElementById('nominal-tbody').children[index];
            if(row) row.style.backgroundColor = "#fff3cd"; // Yellow = Unsaved
        },

        saveRow: async (index) => {
            const student = App.data.students[index];
            if(!student.admNo) return alert("Error: No Admission Number");

            try {
                await setDoc(doc(db, "students", student.admNo.toString()), student);
                const row = document.getElementById('nominal-tbody').children[index];
                if(row) {
                    row.style.backgroundColor = "#d1e7dd"; // Green = Saved
                    setTimeout(() => row.style.backgroundColor = "", 1000);
                }
            } catch (e) {
                alert("Error saving: " + e.message);
            }
        },

        deleteRow: async (admNo, index) => {
            if(!confirm("Delete this student?")) return;
            try {
                if(admNo) await deleteDoc(doc(db, "students", admNo.toString()));
                // onSnapshot will remove it from UI
            } catch(e) {
                alert("Error deleting");
            }
        },

        saveStudentsToDB: async () => {
            if(App.data.students.length === 0) return alert("No data to save");
            const batch = writeBatch(db); 
            // Warning: Limit is 500 ops.
            const chunk = App.data.students.slice(0, 490);
            chunk.forEach(s => {
                if(s.admNo) {
                    const docRef = doc(db, "students", s.admNo.toString());
                    batch.set(docRef, s);
                }
            });
            try {
                await batch.commit();
                alert("Batch Save Complete!");
            } catch(e) {
                console.error(e);
                alert("Error saving: " + e.message);
            }
        },

        filterTable: () => {
            const query = document.getElementById('admin-search').value.toLowerCase();
            const filtered = App.data.students.filter(s => s.name.toLowerCase().includes(query) || s.admNo.toString().includes(query));
            App.Admin.renderTable(filtered);
        },

        downloadTemplate: () => {
            const csv = "Sl No,Name,Gender,Dept,Year,Stream,Admission Number\n1,Sample,Male,Botany,1,UG,12345";
            const a = document.createElement('a');
            a.href = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            a.download = "template.csv";
            a.click();
        },

        // ------------------------------------------------
        // MODULE B: POSTS
        // ------------------------------------------------
        
        loadPosts: () => {
            if(unsubPosts) unsubPosts();
            unsubPosts = onSnapshot(collection(db, "posts"), (snapshot) => {
                App.data.posts = [];
                snapshot.forEach((doc) => App.data.posts.push({ id: doc.id, ...doc.data() }));
                App.UI.renderPostsTable();
            });
        },
        addPost: async () => {
            const newPost = {
                name: document.getElementById('p-name').value,
                vacancy: parseInt(document.getElementById('p-vacancy').value),
                gender: document.getElementById('p-gender').value,
                stream: document.getElementById('p-stream').value,
                year: document.getElementById('p-year').value,
                dept: document.getElementById('p-dept').value.trim(), 
                createdAt: new Date()
            };
            await addDoc(collection(db, "posts"), newPost);
            document.getElementById('post-form').reset();
        },
        deletePost: async (id) => {
            if(confirm("Delete post?")) await deleteDoc(doc(db, "posts", id));
        },
        lockPosts: async () => {
            if(confirm("Lock posts & Open Nominations?")) {
                await setDoc(doc(db, "settings", "config"), { postsLocked: true, nominationOpen: true }, { merge: true });
                alert("Done.");
            }
        },

        // ------------------------------------------------
        // MODULE C: SCRUTINY (Nominations)
        // ------------------------------------------------

        loadNominations: () => {
            if(unsubNominations) unsubNominations();
            
            const tbody = document.getElementById('scrutiny-tbody');
            if(tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center">Connecting to Live Stream...</td></tr>';

            unsubNominations = onSnapshot(collection(db, "nominations"), (snapshot) => {
                App.data.nominations = [];
                snapshot.forEach(doc => App.data.nominations.push({ id: doc.id, ...doc.data() }));
                App.Admin.refreshScrutinyView();
            });
        },
        
        refreshScrutinyView: () => {
            const activeBtn = document.querySelector('#pills-tab .nav-link.active');
            const status = activeBtn ? activeBtn.innerText.replace('Pending', 'Submitted') : 'Submitted';
            App.Admin.filterNominations(status);
        },

        filterNominations: (status) => {
            const searchEl = document.getElementById('scrutiny-search');
            const query = searchEl ? searchEl.value.toLowerCase().trim() : "";
            
            const list = App.data.nominations.filter(n => {
                const matchesStatus = (n.status === status);
                const matchesSearch = (n.serialNo.toString().toLowerCase().includes(query) || 
                                       n.candidate.name.toLowerCase().includes(query));
                return matchesStatus && matchesSearch;
            });

            const tbody = document.getElementById('scrutiny-tbody');
            if(!tbody) return;
            tbody.innerHTML = '';

            // Update Tabs
            document.querySelectorAll('.nav-pills .nav-link').forEach(btn => {
                const btnStatus = btn.innerText === 'Pending' ? 'Submitted' : btn.innerText;
                if(btnStatus === status) { btn.classList.add('active'); btn.classList.remove('text-dark'); }
                else { btn.classList.remove('active'); btn.classList.add('text-dark'); }
            });

            if(list.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No records found.</td></tr>`;
                const count = document.getElementById('nomination-count');
                if(count) count.innerText = "";
                return;
            }

            // Sort by Serial No
            list.sort((a, b) => parseInt(a.serialNo) - parseInt(b.serialNo));

            list.forEach(n => {
                const tr = document.createElement('tr');
                let badgeClass = "bg-warning text-dark";
                if(n.status === 'Accepted') badgeClass = "bg-success";
                if(n.status === 'Rejected') badgeClass = "bg-danger";

                let actions = "";
                if(n.status === 'Submitted') {
                    actions = `
                        <button class="btn btn-sm btn-success mb-1 w-100" onclick="window.App.Admin.processNomination('${n.id}', 'Accepted')">Accept</button>
                        <button class="btn btn-sm btn-outline-danger w-100" onclick="window.App.Admin.processNomination('${n.id}', 'Rejected')">Reject</button>
                    `;
                } else {
                    actions = `<span class="badge ${badgeClass}">${n.status}</span>`;
                    if(n.reason) actions += `<br><small class="text-danger">${n.reason}</small>`;
                    actions += `<div class="mt-2"><button class="btn btn-xs btn-link text-muted" onclick="window.App.Admin.processNomination('${n.id}', 'Submitted')">Undo</button></div>`;
                }

                tr.innerHTML = `
                    <td class="fw-bold text-primary fs-5 text-center">${n.serialNo}</td>
                    <td>${n.postName}</td>
                    <td>
                        <div class="fw-bold">${n.candidate.name}</div>
                        <small class="text-muted">Adm: ${n.candidate.admNo}</small>
                    </td>
                    <td>${n.age || 'N/A'}</td>
                    <td><small>P: ${n.proposer.admNo}<br>S: ${n.seconder.admNo}</small></td>
                    <td><span class="badge ${badgeClass}">${n.status}</span></td>
                    <td>${actions}</td>
                `;
                tbody.appendChild(tr);
            });
            const count = document.getElementById('nomination-count');
            if(count) count.innerText = `Live: ${list.length} records.`;
        },

        processNomination: async (id, newStatus) => {
            let reason = "";
            if(newStatus === 'Rejected') {
                reason = prompt("Reason for Rejection:");
                if(!reason) return;
            }
            if(!confirm(`Mark as ${newStatus}?`)) return;

            await setDoc(doc(db, "nominations", id), { 
                status: newStatus,
                reason: reason,
                scrutinizedAt: new Date()
            }, { merge: true });
        },

        // ------------------------------------------------
        // MODULE D: TEAM
        // ------------------------------------------------
        loadTeam: () => {
            if(unsubTeam) unsubTeam();
            unsubTeam = onSnapshot(collection(db, "admins"), (snapshot) => {
                const list = document.getElementById('admin-list');
                if(!list) return;
                list.innerHTML = `<li class="list-group-item active">sureshmagnolia@gmail.com (Super)</li>`;
                snapshot.forEach(doc => {
                    if(doc.id !== 'sureshmagnolia@gmail.com') {
                        list.innerHTML += `<li class="list-group-item d-flex justify-content-between">${doc.id} <button class="btn btn-sm btn-danger" onclick="window.App.Admin.removeTeamMember('${doc.id}')">X</button></li>`;
                    }
                });
            });
        },
        addTeamMember: async () => {
            const email = document.getElementById('new-admin-email').value.trim().toLowerCase();
            if(email) await setDoc(doc(db, "admins", email), { role: "admin" });
        },
        removeTeamMember: async (email) => {
            if(confirm("Remove admin?")) await deleteDoc(doc(db, "admins", email));
        }
    },

// ------------------------------------------------
        // MODULE: BOOTHS (Missing Part)
        // ------------------------------------------------
        loadBooths: () => {
            const tbody = document.getElementById('booths-tbody');
            if(!tbody) return;
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
            
            // Live Listener for Booths
            onSnapshot(collection(db, "booths"), (snapshot) => {
                const booths = [];
                snapshot.forEach(doc => booths.push({ id: doc.id, ...doc.data() }));
                booths.sort((a,b) => a.name.localeCompare(b.name));

                tbody.innerHTML = '';
                if(booths.length === 0) { 
                    tbody.innerHTML = '<tr><td colspan="4" class="text-center">No booths created yet.</td></tr>'; 
                    return; 
                }

                booths.forEach(b => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><span class="fw-bold">${b.name}</span><br><small class="text-muted">${b.location}</small></td>
                        <td>
                            <span class="badge bg-primary fs-6">${b.voterCount || 0}</span>
                            <div class="small text-muted mt-1" style="max-width:200px; overflow:hidden;">
                                ${b.assignedDepts ? b.assignedDepts.join(', ') : '-'}
                            </div>
                        </td>
                        <td><small>Start: <strong>${b.serialStart || '-'}</strong></small><br><small>End: <strong>${b.serialEnd || '-'}</strong></small></td>
                        <td>
                            <button class="btn btn-sm btn-outline-dark" onclick="window.App.Admin.printBoothReport('${b.id}')">🖨 Report</button>
                            <button class="btn btn-sm btn-danger" onclick="window.App.Admin.deleteBooth('${b.id}')">X</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            });
        },

        addBooth: async () => {
            const name = document.getElementById('b-name').value;
            const loc = document.getElementById('b-loc').value;
            if(!name || !loc) return;
            await addDoc(collection(db, "booths"), { 
                name: name, 
                location: loc, 
                voterCount: 0, 
                assignedDepts: [] 
            });
            document.getElementById('b-name').value = '';
            document.getElementById('b-loc').value = '';
        },

        deleteBooth: async (id) => {
            if(confirm("Delete this booth?")) await deleteDoc(doc(db, "booths", id));
        },

        autoAssignBooths: async () => {
            if(!confirm("Reset and auto-assign ALL students to booths?")) return;
            
            const boothSnap = await getDocs(collection(db, "booths"));
            const booths = [];
            boothSnap.forEach(doc => booths.push({ id: doc.id, ...doc.data(), currentLoad: 0, depts: [] }));
            
            if(booths.length === 0) return alert("Create booths first!");

            const studentSnap = await getDocs(collection(db, "students"));
            const students = [];
            studentSnap.forEach(doc => students.push(doc.data()));

            const deptMap = {};
            students.forEach(s => { if(!deptMap[s.dept]) deptMap[s.dept] = []; deptMap[s.dept].push(s); });

            let boothIndex = 0;
            const batch = writeBatch(db);

            Object.keys(deptMap).forEach(deptName => {
                const deptStudents = deptMap[deptName];
                const targetBooth = booths[boothIndex];
                deptStudents.forEach(s => {
                    const sRef = doc(db, "students", s.admNo.toString());
                    batch.update(sRef, { boothId: targetBooth.id, boothName: targetBooth.name });
                });
                targetBooth.currentLoad += deptStudents.length;
                targetBooth.depts.push(deptName);
                boothIndex = (boothIndex + 1) % booths.length;
            });

            booths.forEach(b => {
                const bRef = doc(db, "booths", b.id);
                batch.update(bRef, { voterCount: b.currentLoad, assignedDepts: b.depts });
            });
            
            try { await batch.commit(); alert(`Success! Assigned ${students.length} students.`); }
            catch(e) { alert("Error: " + e.message); }
        },

        printBoothReport: async (boothId) => {
            const bSnap = await getDoc(doc(db, "booths", boothId));
            const booth = bSnap.data();
            const q = await getDocs(collection(db, "students"));
            const voters = [];
            q.forEach(doc => { const s = doc.data(); if(s.boothId === boothId) voters.push(s); });
            voters.sort((a,b) => parseInt(a.slNo) - parseInt(b.slNo));
            
            if(voters.length === 0) return alert("No voters assigned.");

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`<html><head><title>Booth Report</title><style>body{font-family:sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;margin-top:10px;}th,td{border:1px solid black;padding:5px;font-size:12px;}.header{text-align:center;margin-bottom:20px;}.stats{margin-top:20px;border:1px solid black;padding:10px;}</style></head><body><div class="header"><h2>Presiding Officer Report</h2><h3>${booth.name} (${booth.location})</h3></div><div class="stats"><strong>Depts:</strong> ${booth.assignedDepts}<br><strong>Total:</strong> ${voters.length}</div><h3>Voter List</h3><table><thead><tr><th>Sl</th><th>Adm</th><th>Name</th><th>Dept</th><th>Sign</th></tr></thead><tbody>${voters.map(v => `<tr><td>${v.slNo}</td><td>${v.admNo}</td><td>${v.name}</td><td>${v.dept}</td><td></td></tr>`).join('')}</tbody></table></body></html>`);
            printWindow.document.close();
            printWindow.print();
        }
  

            // Sort by Serial No
            voters.sort((a,b) => parseInt(a.slNo) - parseInt(b.slNo));
            
            if(voters.length === 0) return alert("No voters assigned to this booth yet.");

            // Generate HTML for Print
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Booth Report - ${booth.name}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid black; padding: 5px; font-size: 12px; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .stats { margin-top: 20px; border: 1px solid black; padding: 10px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>Presiding Officer's Report</h2>
                        <h3>Booth: ${booth.name} (${booth.location})</h3>
                    </div>

                    <div class="stats">
                        <strong>Assigned Departments:</strong> ${booth.assignedDepts ? booth.assignedDepts.join(', ') : 'None'}<br>
                        <strong>Total Voters:</strong> ${voters.length}<br>
                        <strong>Ballot Paper Serial Range:</strong> From ______ To ______
                    </div>

                    <h3>Voter List</h3>
                    <table>
                        <thead><tr><th>Sl No</th><th>Adm No</th><th>Name</th><th>Dept</th><th>Signature</th></tr></thead>
                        <tbody>
                            ${voters.map(v => `
                                <tr>
                                    <td>${v.slNo}</td>
                                    <td>${v.admNo}</td>
                                    <td>${v.name}</td>
                                    <td>${v.dept}</td>
                                    <td></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <br><br>
                    <div style="display: flex; justify-content: space-between;">
                        <div>Signature of Polling Agent</div>
                        <div>Signature of Presiding Officer</div>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        },
    // ==========================================
    // 3. STUDENT PORTAL LOGIC
    // ==========================================
    Student: {
        currentStudent: null,
        selectedPost: null,
        proposerData: null,
        seconderData: null,

        search: async () => {
            const input = document.getElementById('search-input').value.trim();
            const err = document.getElementById('search-error');
            err.innerText = "";
            if(!input) return;

            try {
                const docRef = doc(db, "students", input);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    App.Student.currentStudent = docSnap.data();
                    App.Student.loadDashboard();
                } else {
                    err.innerText = "Student not found.";
                }
            } catch (e) {
                console.error(e);
                err.innerText = "System Error.";
            }
        },

        loadDashboard: async () => {
            const s = App.Student.currentStudent;
            document.getElementById('st-name').innerText = s.name;
            document.getElementById('st-dept').innerText = s.dept;
            document.getElementById('st-year').innerText = s.year + " Year";
            document.getElementById('st-stream').innerText = s.stream;
            document.getElementById('st-adm').innerText = s.admNo;

            App.UI.showSection('dashboard');
            document.getElementById('sec-search').classList.add('hidden');

            const list = document.getElementById('eligible-posts-list');
            list.innerHTML = '<div class="spinner-border text-primary"></div>';
            
            // Listen to posts for student too
            onSnapshot(collection(db, "posts"), (snapshot) => {
                list.innerHTML = '';
                let eligibleCount = 0;
                snapshot.forEach((doc) => {
                    const post = { id: doc.id, ...doc.data() };
                    let isEligible = true;
                    if(post.gender !== "Any" && post.gender !== s.gender) isEligible = false;
                    if(post.stream !== "Any" && post.stream !== s.stream) isEligible = false;
                    if(post.year !== "Any" && String(post.year) !== String(s.year)) isEligible = false;
                    if(post.dept && post.dept !== "" && post.dept !== s.dept) isEligible = false;

                    if(isEligible) {
                        eligibleCount++;
                        list.innerHTML += `
                            <div class="col-md-6">
                                <div class="card h-100 border-primary shadow-sm">
                                    <div class="card-body">
                                        <h5 class="card-title fw-bold">${post.name}</h5>
                                        <button class="btn btn-primary w-100 mt-2" 
                                            onclick="window.App.Student.openNomination('${post.id}', '${post.name}')">
                                            Apply Now
                                        </button>
                                    </div>
                                </div>
                            </div>`;
                    }
                });
                if(eligibleCount === 0) document.getElementById('no-posts-msg').classList.remove('hidden');
            });
        },

        openNomination: (postId, postName) => {
            App.Student.selectedPost = { id: postId, name: postName };
            document.getElementById('sec-dashboard').classList.add('hidden');
            document.getElementById('sec-form').classList.remove('hidden');
            document.getElementById('nomination-preview-container').classList.add('hidden');

            document.getElementById('display-post-name').innerText = postName;
            document.getElementById('frm-c-name').value = App.Student.currentStudent.name;
            document.getElementById('frm-c-adm').value = App.Student.currentStudent.admNo;
        },

        calcAge: () => {
            const dobInput = document.getElementById('frm-dob').value;
            if(!dobInput) return;
            const dob = new Date(dobInput);
            const today = new Date();
            let age = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
            document.getElementById('age-display').innerText = `Age: ${age} Years`;
            return age;
        },

        fetchStudentDetails: async (type) => {
            const inputId = type === 'p' ? 'frm-p-adm' : 'frm-s-adm';
            const detailsId = type === 'p' ? 'p-details' : 's-details';
            const admNo = document.getElementById(inputId).value.trim();
            const display = document.getElementById(detailsId);
            
            if(!admNo) { display.innerText = ""; return; }
            
            try {
                display.innerText = "Checking...";
                const docRef = doc(db, "students", admNo);
                const snap = await getDoc(docRef);

                if(snap.exists()) {
                    const data = snap.data();
                    display.innerHTML = `<span class="text-green-600 font-bold">✔ ${data.name}</span> (${data.dept})`;
                    if(type === 'p') App.Student.proposerData = data;
                    if(type === 's') App.Student.seconderData = data;
                } else {
                    display.innerHTML = "<span class='text-red-500'>✘ Not Found</span>";
                    if(type === 'p') App.Student.proposerData = null;
                    if(type === 's') App.Student.seconderData = null;
                }
            } catch(e) { console.error(e); }
        },

        generatePreview: () => {
            if(!App.Student.proposerData || !App.Student.seconderData) return alert("Invalid Proposer/Seconder");
            const dob = document.getElementById('frm-dob').value;
            if(!dob) return alert("Enter DOB");

            const c = App.Student.currentStudent;
            const p = App.Student.proposerData;
            const s = App.Student.seconderData;

            document.getElementById('prev-post').innerText = App.Student.selectedPost.name;
            document.getElementById('preview-date').innerText = "Date: " + new Date().toLocaleDateString();
            document.getElementById('prev-serial-display').innerText = "---"; 

            document.getElementById('prev-c-name').innerText = c.name;
            document.getElementById('prev-c-adm').innerText = c.admNo;
            document.getElementById('prev-c-dept').innerText = c.dept;
            document.getElementById('prev-c-year').innerText = c.year + " " + c.stream;
            document.getElementById('prev-c-dob').innerText = dob;
            document.getElementById('prev-c-age').innerText = App.Student.calcAge() + " Years";

            document.getElementById('prev-p-name').innerText = p.name;
            document.getElementById('prev-p-adm').innerText = p.admNo;
            document.getElementById('prev-p-dept').innerText = p.dept;
            document.getElementById('prev-p-year').innerText = p.year + " " + p.stream;

            document.getElementById('prev-s-name').innerText = s.name;
            document.getElementById('prev-s-adm').innerText = s.admNo;
            document.getElementById('prev-s-dept').innerText = s.dept;
            document.getElementById('prev-s-year').innerText = s.year + " " + s.stream;

            document.getElementById('btn-edit').classList.remove('hidden');
            document.getElementById('btn-submit').classList.remove('hidden');
            document.getElementById('btn-print').classList.add('hidden');
            document.getElementById('btn-exit').classList.add('hidden');

            document.getElementById('sec-form').classList.add('hidden');
            document.getElementById('nomination-preview-container').classList.remove('hidden');
        },

        editForm: () => {
            document.getElementById('sec-form').classList.remove('hidden');
            document.getElementById('nomination-preview-container').classList.add('hidden');
        },

        finalSubmit: async () => {
            if(!confirm("Submit Nomination?")) return;

            const submitBtn = document.getElementById('btn-submit');
            submitBtn.disabled = true;
            submitBtn.innerText = "Processing...";

            try {
                let assignedSerial = "";

                await runTransaction(db, async (transaction) => {
                    const counterRef = doc(db, "settings", "counters");
                    const counterDoc = await transaction.get(counterRef);

                    let nextSerial = 1;
                    if (counterDoc.exists()) {
                        nextSerial = (counterDoc.data().nominationSerial || 0) + 1;
                    }

                    assignedSerial = nextSerial.toString();
                    const newNomRef = doc(collection(db, "nominations"));

                    transaction.set(counterRef, { nominationSerial: nextSerial }, { merge: true });
                    transaction.set(newNomRef, {
                        serialNo: assignedSerial,
                        postId: App.Student.selectedPost.id,
                        postName: App.Student.selectedPost.name,
                        candidate: App.Student.currentStudent,
                        proposer: App.Student.proposerData,
                        seconder: App.Student.seconderData,
                        dob: document.getElementById('frm-dob').value,
                        age: App.Student.calcAge(),
                        status: "Submitted",
                        timestamp: new Date()
                    });
                });

                alert(`Submitted! Serial No: ${assignedSerial}`);
                
                document.getElementById('prev-serial-display').innerText = `Serial No: ${assignedSerial}`;

                document.getElementById('btn-edit').classList.add('hidden');
                document.getElementById('btn-submit').classList.add('hidden');
                document.getElementById('btn-print').classList.remove('hidden');
                document.getElementById('btn-exit').classList.remove('hidden');

            } catch(e) {
                console.error(e);
                alert("Error: " + e.message);
                submitBtn.disabled = false;
                submitBtn.innerText = "Confirm & Submit";
            }
        }
    }
};

window.App = App;
