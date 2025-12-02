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

// Global Listeners
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
        // --- MODULE A: NOMINAL ROLL ---
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

        loadStudentsFromDB: () => {
            if(unsubStudents) unsubStudents(); 
            const tbody = document.getElementById('nominal-tbody');
            if(tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center">Syncing...</td></tr>';

            unsubStudents = onSnapshot(collection(db, "students"), (snapshot) => {
                App.data.students = [];
                snapshot.forEach(doc => App.data.students.push(doc.data()));
                App.data.students.sort((a,b) => parseInt(a.slNo) - parseInt(b.slNo));
                App.Admin.renderTable(App.data.students);
                const countEl = document.getElementById('student-count');
                if(countEl) countEl.innerText = `Live: ${App.data.students.length} students.`;
            });
        },

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
                    <td><input type="text" class="form-control form-control-sm bg-light" value="${student.admNo}" readonly></td>
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
            if(row) row.style.backgroundColor = "#fff3cd"; 
        },

        saveRow: async (index) => {
            const student = App.data.students[index];
            if(!student.admNo) return alert("Error: No Admission Number");
            try {
                await setDoc(doc(db, "students", student.admNo.toString()), student);
                const row = document.getElementById('nominal-tbody').children[index];
                if(row) { row.style.backgroundColor = "#d1e7dd"; setTimeout(() => row.style.backgroundColor = "", 1000); }
            } catch (e) { alert("Error saving: " + e.message); }
        },

        deleteRow: async (admNo, index) => {
            if(!confirm("Delete this student?")) return;
            try { if(admNo) await deleteDoc(doc(db, "students", admNo.toString())); } 
            catch(e) { alert("Error deleting"); }
        },

        // --- REPLACEMENT FUNCTION: Chunked Save ---
        saveStudentsToDB: async () => {
            const allStudents = App.data.students;
            const total = allStudents.length;
            
            if (total === 0) return alert("No data to save.");
            
            // Disable button to prevent double clicks
            const statusEl = document.getElementById('student-count');
            statusEl.innerText = "Initializing Batch Upload...";
            
            // Firestore limit is 500. We use 450 to be safe.
            const BATCH_SIZE = 450; 
            const totalBatches = Math.ceil(total / BATCH_SIZE);
            
            try {
                for (let i = 0; i < totalBatches; i++) {
                    const start = i * BATCH_SIZE;
                    const end = start + BATCH_SIZE;
                    const chunk = allStudents.slice(start, end);
                    
                    const batch = writeBatch(db);
                    
                    chunk.forEach(s => {
                        if (s.admNo) {
                            // Ensure Adm No is string to avoid ID errors
                            const docRef = doc(db, "students", s.admNo.toString());
                            batch.set(docRef, s);
                        }
                    });

                    // Update UI Status
                    statusEl.innerText = `Saving Batch ${i + 1} of ${totalBatches}... (${chunk.length} records)`;
                    console.log(`Committing batch ${i+1}`);
                    
                    // Send to Firebase and wait
                    await batch.commit();
                }

                alert(`Success! All ${total} students saved to database.`);
                statusEl.innerText = `Complete: ${total} students saved.`;
                
                // Refresh view
                App.Admin.loadStudentsFromDB(); 

            } catch (e) {
                console.error(e);
                alert("Error during upload: " + e.message);
                statusEl.innerText = "Upload Failed.";
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

        // --- MODULE B: POSTS ---
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

        // --- MODULE C: SCRUTINY ---
        loadNominations: () => {
            if(unsubNominations) unsubNominations();
            const tbody = document.getElementById('scrutiny-tbody');
            if(tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center">Syncing...</td></tr>';

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

      // --- VALID LIST MANAGEMENT ---

        // 1. Publish to Students
        publishValidList: async () => {
            if(!confirm("Are you sure? This will make the 'Accepted' nominations visible to ALL students on their dashboard.")) return;
            
            try {
                // Set a global setting flag
                await setDoc(doc(db, "settings", "electionStatus"), { 
                    validListPublished: true,
                    publishedAt: new Date()
                }, { merge: true });
                alert("Published! Students can now see the candidate list.");
            } catch(e) {
                alert("Error: " + e.message);
            }
        },

        // 2. Print Formal Report
        printValidList: async () => {
            // Get all accepted nominations
            const q = await getDocs(collection(db, "nominations"));
            const valid = [];
            q.forEach(doc => {
                const data = doc.data();
                if(data.status === 'Accepted') valid.push(data);
            });

            if(valid.length === 0) return alert("No valid nominations found yet.");

            // Group by Post
            const grouped = {};
            valid.forEach(n => {
                if(!grouped[n.postName]) grouped[n.postName] = [];
                grouped[n.postName].push(n);
            });

            // Generate HTML
            let htmlContent = '';
            Object.keys(grouped).sort().forEach(post => {
                const candidates = grouped[post];
                // Sort candidates alphabetically
                candidates.sort((a,b) => a.candidate.name.localeCompare(b.candidate.name));

                htmlContent += `
                    <div class="post-block">
                        <div class="post-title">${post}</div>
                        <table class="table">
                            <thead>
                                <tr>
                                    <th style="width:50px">Sl</th>
                                    <th>Candidate Name</th>
                                    <th>Dept & Class</th>
                                    <th>Serial No</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${candidates.map((c, i) => `
                                    <tr>
                                        <td>${i+1}</td>
                                        <td><strong>${c.candidate.name.toUpperCase()}</strong></td>
                                        <td>${c.candidate.dept} - ${c.candidate.year} Year</td>
                                        <td>${c.serialNo}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            });

            // Open Print Window
            const win = window.open('', '_blank');
            win.document.write(`
                <html>
                <head>
                    <title>Valid Nominations List</title>
                    <style>
                        body { font-family: 'Times New Roman', serif; padding: 40px; }
                        h1 { text-align: center; text-decoration: underline; }
                        .post-block { margin-bottom: 30px; page-break-inside: avoid; }
                        .post-title { font-size: 18px; font-weight: bold; background: #eee; padding: 5px; border: 1px solid #000; border-bottom: none; }
                        .table { width: 100%; border-collapse: collapse; }
                        .table th, .table td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <h1>List of Valid Nominations - Union Election 2025</h1>
                    ${htmlContent}
                    <br><br>
                    <div style="float: right; text-align: center;">
                        <p>Returning Officer</p>
                    </div>
                </body>
                </html>
            `);
            win.document.close();
            win.print();
        },

      // ------------------------------------------------
        // MODULE: BOOTHS & ROOMS (Logistics Engine)
        // ------------------------------------------------
        
        // 1. Generate Sequential Booths (Booth 1, Booth 2...)
        generateBooths: async () => {
            const count = parseInt(document.getElementById('gen-count').value);
            if (!count || count < 1) return alert("Enter a valid number");
            
            if(!confirm(`This will create ${count} new booths. Existing booths will be kept. Continue?`)) return;

            const batch = writeBatch(db);
            
            for(let i = 1; i <= count; i++) {
                // ID: booth_1, Name: Booth 1
                const docRef = doc(db, "booths", `booth_${i}`);
                batch.set(docRef, {
                    name: `Booth ${i}`,
                    roomId: "",      // Empty initially
                    roomName: "Not Assigned",
                    location: "",
                    voterCount: 0,
                    assignedDepts: [],
                    assignedClasses: []
                }, { merge: true }); // Merge ensures we don't wipe existing voter data if we re-run
            }

            try {
                await batch.commit();
                alert(`Created ${count} Booths successfully.`);
            } catch(e) {
                alert("Error: " + e.message);
            }
        },

        // 2. Room Inventory Management
        addRoom: async () => {
            const num = document.getElementById('r-no').value;
            const loc = document.getElementById('r-loc').value;
            if(!num || !loc) return;

            await addDoc(collection(db, "rooms"), { number: num, location: loc });
            document.getElementById('r-no').value = '';
            document.getElementById('r-loc').value = '';
        },

        deleteRoom: async (id) => {
            if(confirm("Remove this room from inventory?")) await deleteDoc(doc(db, "rooms", id));
        },

        // 3. Load Data (Booths + Rooms)
        loadBooths: () => {
            // A. Listen to ROOMS first (to populate dropdowns)
            onSnapshot(collection(db, "rooms"), (roomSnap) => {
                const rooms = [];
                roomSnap.forEach(doc => rooms.push({ id: doc.id, ...doc.data() }));
                
                // Render Room List (Top Right Box)
                const roomTbody = document.getElementById('rooms-tbody');
                if(roomTbody) {
                    roomTbody.innerHTML = rooms.map(r => `
                        <tr>
                            <td>${r.number}</td>
                            <td>${r.location}</td>
                            <td><button class="btn btn-sm btn-link text-danger p-0" onclick="window.App.Admin.deleteRoom('${r.id}')">×</button></td>
                        </tr>
                    `).join('');
                }

                // B. Listen to BOOTHS
                onSnapshot(collection(db, "booths"), (boothSnap) => {
                    const booths = [];
                    boothSnap.forEach(doc => booths.push({ id: doc.id, ...doc.data() }));
                    
                    // Sort naturally: Booth 1, Booth 2, Booth 10 (not Booth 1, Booth 10, Booth 2)
                    booths.sort((a,b) => {
                        const numA = parseInt(a.name.replace('Booth ', ''));
                        const numB = parseInt(b.name.replace('Booth ', ''));
                        return numA - numB;
                    });

                    const boothTbody = document.getElementById('booths-tbody');
                    if(boothTbody) {
                        if(booths.length === 0) {
                            boothTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No booths generated yet. Use "Define Scale" above.</td></tr>';
                            return;
                        }

                        boothTbody.innerHTML = booths.map(b => {
                            // Create Dropdown Options
                            let options = `<option value="">-- Select Room --</option>`;
                            rooms.forEach(r => {
                                const isSelected = b.roomId === r.id ? 'selected' : '';
                                options += `<option value="${r.id}" ${isSelected}>${r.number} - ${r.location}</option>`;
                            });

                            return `
                                <tr>
                                    <td class="fw-bold fs-5">${b.name}</td>
                                    <td>
                                        <div class="d-flex justify-content-between align-items-center">
                                            <span class="badge bg-primary rounded-pill">${b.voterCount || 0} Voters</span>
                                        </div>
                                        <div class="small text-muted mt-1" style="line-height:1.2; font-size: 0.75rem;">
                                            ${b.assignedDepts ? b.assignedDepts.join(', ') : '-'}
                                        </div>
                                    </td>
                                    <td>
                                        <select class="form-select" onchange="window.App.Admin.assignRoom('${b.id}', this.value)">
                                            ${options}
                                        </select>
                                    </td>
                                    <td>
                                        <button class="btn btn-sm btn-outline-dark w-100" onclick="window.App.Admin.printBoothReport('${b.id}')">🖨 Print</button>
                                    </td>
                                </tr>
                            `;
                        }).join('');
                    }
                });
            });
        },

        // 4. Assign Room Logic (Updates DB when dropdown changes)
        assignRoom: async (boothId, roomId) => {
            if(!roomId) {
                // Clear assignment
                await setDoc(doc(db, "booths", boothId), { roomId: "", roomName: "Not Assigned", location: "" }, { merge: true });
                return;
            }

            // Get Room Details
            const roomSnap = await getDoc(doc(db, "rooms", roomId));
            const room = roomSnap.data();

            // Update Booth
            await setDoc(doc(db, "booths", boothId), { 
                roomId: roomId, 
                roomName: room.number, 
                location: room.location 
            }, { merge: true });
        },

        // 5. HYBRID LOAD BALANCER (Kept as requested)
        autoAssignBooths: async () => {
            if(!confirm("⚠️ START HYBRID ALLOCATION?")) return;
            const statusEl = document.getElementById('student-count');
            statusEl.innerText = "Analyzing data...";

            const boothSnap = await getDocs(collection(db, "booths"));
            const booths = [];
            boothSnap.forEach(doc => booths.push({ id: doc.id, ...doc.data(), currentLoad: 0, assignedUnits: [], studentUpdates: [] }));

            if(booths.length === 0) return alert("Generate booths first!");

            const studentSnap = await getDocs(collection(db, "students"));
            const allStudents = [];
            studentSnap.forEach(doc => allStudents.push(doc.data()));

            // Group by Dept
            const deptMap = {};
            allStudents.forEach(s => {
                const d = s.dept.trim().toUpperCase(); 
                if(!deptMap[d]) deptMap[d] = [];
                deptMap[d].push(s);
            });

            // Find Giant
            let largestDeptName = "";
            let maxCount = 0;
            for (const d in deptMap) {
                if (deptMap[d].length > maxCount) {
                    maxCount = deptMap[d].length;
                    largestDeptName = d;
                }
            }

            const allocationUnits = [];
            for (const deptName in deptMap) {
                const students = deptMap[deptName];
                if (deptName === largestDeptName) {
                    // Split Giant
                    const classMap = {};
                    students.forEach(s => {
                        const classKey = `${s.dept} ${s.year} ${s.stream}`.toUpperCase();
                        if(!classMap[classKey]) classMap[classKey] = [];
                        classMap[classKey].push(s);
                    });
                    for(const cKey in classMap) {
                        allocationUnits.push({ name: cKey, students: classMap[cKey], count: classMap[cKey].length });
                    }
                } else {
                    allocationUnits.push({ name: deptName, students: students, count: students.length });
                }
            }

            allocationUnits.sort((a, b) => b.count - a.count);

            allocationUnits.forEach(unit => {
                booths.sort((a, b) => a.currentLoad - b.currentLoad);
                const target = booths[0];
                target.assignedUnits.push(unit.name);
                target.currentLoad += unit.count;
                target.studentUpdates.push(...unit.students);
            });

            statusEl.innerText = "Saving allocations...";
            try {
                const batchSize = 450;
                let batch = writeBatch(db);
                let opCount = 0;

                for (const b of booths) {
                    const bRef = doc(db, "booths", b.id);
                    batch.update(bRef, { voterCount: b.currentLoad, assignedDepts: b.assignedUnits });
                    opCount++;
                }

                for (const b of booths) {
                    for (const s of b.studentUpdates) {
                        const sRef = doc(db, "students", s.admNo.toString());
                        batch.update(sRef, { boothId: b.id, boothName: b.name });
                        opCount++;
                        if (opCount >= batchSize) { await batch.commit(); batch = writeBatch(db); opCount = 0; }
                    }
                }
                if (opCount > 0) await batch.commit();
                alert(`Allocation Complete! Giant Dept (${largestDeptName}) was split.`);
                statusEl.innerText = "Allocation Finished.";
            } catch(e) { alert("Error: " + e.message); }
        },

        // 6. Print Report (Updated to show Room Info)
        printBoothReport: async (boothId) => {
            const bSnap = await getDoc(doc(db, "booths", boothId));
            const booth = bSnap.data();
            const q = await getDocs(collection(db, "students"));
            const voters = [];
            q.forEach(doc => { const s = doc.data(); if(s.boothId === boothId) voters.push(s); });
            voters.sort((a,b) => a.dept.localeCompare(b.dept) || a.year - b.year || a.name.localeCompare(b.name));
            
            if(voters.length === 0) return alert("No voters assigned.");

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
                        .stats { margin-top: 20px; border: 1px solid black; padding: 10px; background: #f0f0f0; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>Presiding Officer's Report</h2>
                        <h1>${booth.name}</h1>
                        <h3>Location: ${booth.roomName || 'Not Assigned'} (${booth.location || 'Unknown'})</h3>
                    </div>
                    <div class="stats">
                        <strong>Assigned Groups:</strong> ${booth.assignedDepts ? booth.assignedDepts.join(', ') : 'None'}<br>
                        <strong>Total Voters:</strong> ${voters.length}<br>
                        <strong>Ballot Range:</strong> From ______ To ______
                    </div>
                    <h3>Voter List</h3>
                    <table><thead><tr><th>Sl</th><th>Adm</th><th>Name</th><th>Class</th><th>Sign</th></tr></thead>
                    <tbody>
                        ${voters.map((v, i) => `<tr><td>${i+1}</td><td>${v.admNo}</td><td>${v.name}</td><td>${v.dept} ${v.year} ${v.stream}</td><td></td></tr>`).join('')}
                    </tbody></table>
                </body></html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
        
        // ----------------------------------------------------------------
        // HYBRID LOAD BALANCER: Split Only Largest Dept
        // ----------------------------------------------------------------
        autoAssignBooths: async () => {
            if(!confirm("⚠️ START HYBRID ALLOCATION?\n\nLogic:\n1. Identify the SINGLE largest Department.\n2. Split ONLY that department into Classes.\n3. Keep all other departments intact.\n4. Distribute to balance booth numbers.")) return;

            const statusEl = document.getElementById('student-count');
            statusEl.innerText = "Analyzing data...";

            // 1. Fetch Data
            const boothSnap = await getDocs(collection(db, "booths"));
            const booths = [];
            boothSnap.forEach(doc => booths.push({ 
                id: doc.id, 
                ...doc.data(), 
                currentLoad: 0, 
                assignedUnits: [], // Stores Dept Names OR Class Names
                studentUpdates: [] 
            }));

            if(booths.length === 0) return alert("Create booths first!");

            const studentSnap = await getDocs(collection(db, "students"));
            const allStudents = [];
            studentSnap.forEach(doc => allStudents.push(doc.data()));

            if(allStudents.length === 0) return alert("No students found.");

            // 2. Group All Students by Department First
            const deptMap = {};
            allStudents.forEach(s => {
                const d = s.dept.trim().toUpperCase(); 
                if(!deptMap[d]) deptMap[d] = [];
                deptMap[d].push(s);
            });

            // 3. Find the "Giant" (Largest Dept)
            let largestDeptName = "";
            let maxCount = 0;
            for (const d in deptMap) {
                if (deptMap[d].length > maxCount) {
                    maxCount = deptMap[d].length;
                    largestDeptName = d;
                }
            }
            console.log(`Largest Dept is ${largestDeptName} with ${maxCount} students.`);

            // 4. Create "Allocation Units" (Puzzle Pieces)
            // A Unit is either a Whole Dept OR a Specific Class (if it's the giant)
            const allocationUnits = [];

            for (const deptName in deptMap) {
                const students = deptMap[deptName];

                if (deptName === largestDeptName) {
                    // --- SPLIT LOGIC for the Giant ---
                    const classMap = {};
                    students.forEach(s => {
                        // Key: "COMMERCE 1 UG"
                        const classKey = `${s.dept} ${s.year} ${s.stream}`.toUpperCase();
                        if(!classMap[classKey]) classMap[classKey] = [];
                        classMap[classKey].push(s);
                    });
                    
                    // Add each class as a separate unit
                    for(const cKey in classMap) {
                        allocationUnits.push({
                            name: cKey, // e.g., "COMMERCE 1 UG"
                            students: classMap[cKey],
                            count: classMap[cKey].length,
                            isSplit: true
                        });
                    }
                } else {
                    // --- WHOLE LOGIC for others ---
                    allocationUnits.push({
                        name: deptName, // e.g., "HISTORY"
                        students: students,
                        count: students.length,
                        isSplit: false
                    });
                }
            }

            // 5. Sort Units Largest to Smallest (Greedy Algorithm)
            // This ensures big blocks get seated first, small blocks fill gaps.
            allocationUnits.sort((a, b) => b.count - a.count);

            // 6. Assign to Emptiest Booth
            allocationUnits.forEach(unit => {
                // Find booth with lowest load
                booths.sort((a, b) => a.currentLoad - b.currentLoad);
                const target = booths[0];

                target.assignedUnits.push(unit.name);
                target.currentLoad += unit.count;
                target.studentUpdates.push(...unit.students);
            });

            // 7. Commit to Database
            statusEl.innerText = "Saving allocations...";
            try {
                const batchSize = 450;
                let batch = writeBatch(db);
                let opCount = 0;

                // Update Booths
                for (const b of booths) {
                    const bRef = doc(db, "booths", b.id);
                    batch.update(bRef, { 
                        voterCount: b.currentLoad, 
                        assignedDepts: b.assignedUnits // Saving the mixed list (Depts + Classes)
                    });
                    opCount++;
                }

                // Update Students
                for (const b of booths) {
                    for (const s of b.studentUpdates) {
                        const sRef = doc(db, "students", s.admNo.toString());
                        batch.update(sRef, { 
                            boothId: b.id, 
                            boothName: b.name 
                        });
                        opCount++;

                        if (opCount >= batchSize) {
                            await batch.commit();
                            batch = writeBatch(db);
                            opCount = 0;
                        }
                    }
                }
                if (opCount > 0) await batch.commit();

                // Report
                let report = `Allocation Complete!\nLargest Dept (${largestDeptName}) was split.\n\n`;
                booths.forEach(b => {
                    report += `${b.name}: ${b.currentLoad} Voters\n`;
                });
                alert(report);
                statusEl.innerText = "Allocation Finished.";

            } catch(e) {
                console.error(e);
                alert("Error: " + e.message);
            }
        },
       printBoothReport: async (boothId) => {
            const bSnap = await getDoc(doc(db, "booths", boothId));
            const booth = bSnap.data();
            const q = await getDocs(collection(db, "students"));
            const voters = [];
            q.forEach(doc => { 
                const s = doc.data(); 
                if(s.boothId === boothId) voters.push(s); 
            });
            
            // Sort: Dept -> Year -> Name
            voters.sort((a,b) => a.dept.localeCompare(b.dept) || a.year - b.year || a.name.localeCompare(b.name));
            
            if(voters.length === 0) return alert("No voters assigned.");

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
                        .stats { margin-top: 20px; border: 1px solid black; padding: 10px; background: #f0f0f0; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>Presiding Officer's Report</h2>
                        <h3>Booth: ${booth.name} (${booth.location})</h3>
                    </div>

                    <div class="stats">
                        <strong>Assigned Groups:</strong><br> 
                        ${booth.assignedDepts ? booth.assignedDepts.join(', ') : 'None'}
                        <br><br>
                        <strong>Total Voters:</strong> ${voters.length}
                        <br>
                        <strong>Ballot Paper Serial Range:</strong> From ______ To ______
                    </div>

                    <h3>Voter List</h3>
                    <table>
                        <thead><tr><th>Sl No</th><th>Adm No</th><th>Name</th><th>Class</th><th>Signature</th></tr></thead>
                        <tbody>
                            ${voters.map((v, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td>${v.admNo}</td>
                                    <td><strong>${v.name}</strong></td>
                                    <td>${v.dept} ${v.year} ${v.stream}</td>
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
        }
    }, // <--- The critical comma separating Admin and Student

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

            // --- 1. CHECK IF CANDIDATE LIST IS PUBLISHED ---
            onSnapshot(doc(db, "settings", "electionStatus"), (docSnap) => {
                const settings = docSnap.data();
                if (settings && settings.validListPublished) {
                    document.getElementById('sec-candidate-list').classList.remove('hidden');
                    App.Student.renderCandidateList(); // Helper function below
                } else {
                    document.getElementById('sec-candidate-list').classList.add('hidden');
                }
            });

            // --- 2. LOAD ELIGIBLE POSTS FOR NOMINATION (Existing Logic) ---
            const list = document.getElementById('eligible-posts-list');
            list.innerHTML = '<div class="spinner-border text-primary"></div>';
            
            onSnapshot(collection(db, "posts"), (snapshot) => {
                list.innerHTML = '';
                let eligibleCount = 0;
                snapshot.forEach((doc) => {
                    const post = { id: doc.id, ...doc.data() };
                    let isEligible = true;
                    // Logic checks...
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

        // --- NEW HELPER: Render the Clean List for Students ---
        renderCandidateList: async () => {
            const container = document.getElementById('candidate-list-container');
            container.innerHTML = '<p class="text-center">Loading List...</p>';

            const q = await getDocs(collection(db, "nominations"));
            const valid = [];
            q.forEach(doc => {
                const data = doc.data();
                if(data.status === 'Accepted') valid.push(data);
            });

            if(valid.length === 0) {
                container.innerHTML = '<p class="text-center text-muted">No valid nominations yet.</p>';
                return;
            }

            // Group by Post
            const grouped = {};
            valid.forEach(n => {
                if(!grouped[n.postName]) grouped[n.postName] = [];
                grouped[n.postName].push(n);
            });

            let html = '';
            Object.keys(grouped).sort().forEach(post => {
                const candidates = grouped[post];
                // Sort Alphabetically
                candidates.sort((a,b) => a.candidate.name.localeCompare(b.candidate.name));

                html += `
                    <div class="mb-4">
                        <h5 class="bg-light p-2 border-start border-4 border-success fw-bold">${post}</h5>
                        <ul class="list-group list-group-flush">
                            ${candidates.map(c => `
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    <div>
                                        <span class="fw-bold">${c.candidate.name}</span>
                                        <br><small class="text-muted">${c.candidate.dept}</small>
                                    </div>
                                    <span class="badge bg-secondary rounded-pill">S.No: ${c.serialNo}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            });
            container.innerHTML = html;
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
                    // CHANGED: Removed text-green-600, added font-bold and uppercase
                    display.innerHTML = `<span class="font-bold uppercase">✔ ${data.name}</span> (${data.dept})`;
                    if(type === 'p') App.Student.proposerData = data;
                    if(type === 's') App.Student.seconderData = data;
                } else {
                    // CHANGED: Removed text-red-500, added font-bold uppercase
                    display.innerHTML = "<span class='font-bold uppercase'>✘ Not Found</span>";
                    if(type === 'p') App.Student.proposerData = null;
                    if(type === 's') App.Student.seconderData = null;
                }
            } catch(e) { console.error(e); }
        },

        // Add a variable to store the correct answer (inside the Student object)
        captchaAnswer: 0,

        // 6. Generate Preview & Setup CAPTCHA
        generatePreview: () => {
            // ... (Validation checks kept same) ...
            if(!App.Student.proposerData || !App.Student.seconderData) return alert("Invalid Proposer/Seconder");
            const dob = document.getElementById('frm-dob').value;
            if(!dob) return alert("Enter DOB");

            const c = App.Student.currentStudent;
            const p = App.Student.proposerData;
            const s = App.Student.seconderData;

            // Fill Data (Same as before)
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

            // --- NEW: GENERATE MATH CAPTCHA ---
            const num1 = Math.floor(Math.random() * 10) + 1; // Random 1-10
            const num2 = Math.floor(Math.random() * 10) + 1; // Random 1-10
            App.Student.captchaAnswer = num1 + num2;
            
            document.getElementById('math-q').innerText = `${num1} + ${num2}`;
            document.getElementById('math-a').value = ''; // Clear previous answer
            document.getElementById('captcha-box').classList.remove('hidden'); // Show Captcha

            // UI State
            document.getElementById('btn-edit').classList.remove('hidden');
            document.getElementById('btn-submit').classList.remove('hidden');
            document.getElementById('btn-print').classList.add('hidden');
            document.getElementById('btn-exit').classList.add('hidden');

            document.getElementById('sec-form').classList.add('hidden');
            document.getElementById('nomination-preview-container').classList.remove('hidden');
        },

        // 7. Final Submit (With CAPTCHA Check)
        finalSubmit: async () => {
            // --- NEW: VERIFY CAPTCHA ---
            const userAnswer = parseInt(document.getElementById('math-a').value);
            if (userAnswer !== App.Student.captchaAnswer) {
                alert("❌ Incorrect CAPTCHA Answer.\nPlease solve the math question to prove you are human.");
                return;
            }

            if(!confirm("Are you sure? Once submitted, you cannot edit.")) return;

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

                // Hide Captcha & Edit buttons after success
                document.getElementById('captcha-box').classList.add('hidden'); 
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
