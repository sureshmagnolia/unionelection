// 1. IMPORT FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, setDoc, doc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-analytics.js";

// 2. YOUR CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyDstlguyk5d3Cr4AqYkH1hMYuvqSNGJ05I",
  authDomain: "unionelection.firebaseapp.com",
  projectId: "unionelection",
  storageBucket: "unionelection.firebasestorage.app",
  messagingSenderId: "1090892401508",
  appId: "1:1090892401508:web:c18bde654d0b36d3ddc871",
  measurementId: "G-Z83NH3ZN11"
};

// 3. INITIALIZE
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// 4. APP LOGIC CONTAINER
const App = {
    data: {
        students: [],
        posts: []
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
                
                if(restrictions.length === 0) restrictions.push("General (Open to All)");

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${post.name}</td>
                    <td>${post.vacancy}</td>
                    <td><small>${restrictions.join(", ")}</small></td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="window.App.Admin.deletePost('${post.id}')">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    },

    Admin: {
        // 1. Process CSV Upload
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
                    
                    // CALL THE RENDER TABLE FUNCTION
                    App.Admin.renderTable(App.data.students);
                    document.getElementById('student-count').innerText = `Previewing ${App.data.students.length} students (Not saved yet)`;
                }
            });
        },

        // 2. Load Existing Data from Firebase
        loadStudentsFromDB: async () => {
            const tbody = document.getElementById('nominal-tbody');
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Loading from Database...</td></tr>';
            
            try {
                const q = await getDocs(collection(db, "students"));
                App.data.students = [];
                q.forEach(doc => {
                    App.data.students.push(doc.data());
                });
                App.Admin.renderTable(App.data.students);
                document.getElementById('student-count').innerText = `Loaded ${App.data.students.length} students from DB.`;
            } catch(e) {
                console.error(e);
                alert("Error loading data: " + e.message);
            }
        },

        // 3. RENDER TABLE (The missing function!)
        renderTable: (data) => {
            const tbody = document.getElementById('nominal-tbody');
            if(!tbody) return;
            tbody.innerHTML = '';

            data.forEach((student, index) => {
                const tr = document.createElement('tr');
                
                // We add 'onchange' events to update the local array when you type
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

        // 4. Update Local Data (Helper)
        updateLocalData: (index, field, value) => {
            App.data.students[index][field] = value;
            // Turn row yellow to indicate "Unsaved Changes"
            document.getElementById('nominal-tbody').children[index].style.backgroundColor = "#fff3cd";
        },

        // 5. Save Single Row
        saveRow: async (index) => {
            const student = App.data.students[index];
            if(!student.admNo) return alert("Error: No Admission Number");

            try {
                await setDoc(doc(db, "students", student.admNo.toString()), student);
                // Turn row green to indicate "Saved"
                const row = document.getElementById('nominal-tbody').children[index];
                row.style.backgroundColor = "#d1e7dd";
                setTimeout(() => row.style.backgroundColor = "", 1000);
            } catch (e) {
                alert("Error saving: " + e.message);
            }
        },

        // 6. Delete Row
        deleteRow: async (admNo, index) => {
            if(!confirm("Delete this student?")) return;
            try {
                if(admNo) await deleteDoc(doc(db, "students", admNo.toString()));
                App.data.students.splice(index, 1);
                App.Admin.renderTable(App.data.students);
            } catch(e) {
                alert("Error deleting");
            }
        },

        // 7. Bulk Save (From CSV)
        saveStudentsToDB: async () => {
            if(App.data.students.length === 0) return alert("No data to save");
            const batch = writeBatch(db); 
            // Limit to 490 for demo
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
                App.Admin.loadStudentsFromDB(); // Reload to show edit buttons
            } catch(e) {
                console.error(e);
                alert("Error saving: " + e.message);
            }
        },

        // 8. Filter Table
        filterTable: () => {
            const query = document.getElementById('admin-search').value.toLowerCase();
            const filtered = App.data.students.filter(s => s.name.toLowerCase().includes(query) || s.admNo.toString().includes(query));
            App.Admin.renderTable(filtered);
        },

        // --- Post & Team Logic (Kept Same) ---
        loadPosts: async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "posts"));
                App.data.posts = [];
                querySnapshot.forEach((doc) => App.data.posts.push({ id: doc.id, ...doc.data() }));
                App.UI.renderPostsTable();
            } catch(e) { console.log("Not logged in"); }
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
            App.Admin.loadPosts();
            document.getElementById('post-form').reset();
        },
        deletePost: async (id) => {
            if(confirm("Delete post?")) {
                await deleteDoc(doc(db, "posts", id));
                App.Admin.loadPosts();
            }
        },
        lockPosts: async () => {
            if(confirm("Lock posts & Open Nominations?")) {
                await setDoc(doc(db, "settings", "config"), { postsLocked: true, nominationOpen: true }, { merge: true });
                alert("Done.");
            }
        },
        loadTeam: async () => {
            const list = document.getElementById('admin-list');
            if(!list) return;
            list.innerHTML = '';
            const q = await getDocs(collection(db, "admins"));
            list.innerHTML = `<li class="list-group-item active">sureshmagnolia@gmail.com (Super)</li>`;
            q.forEach(doc => {
                if(doc.id !== 'sureshmagnolia@gmail.com') {
                    list.innerHTML += `<li class="list-group-item d-flex justify-content-between">${doc.id} <button class="btn btn-sm btn-danger" onclick="window.App.Admin.removeTeamMember('${doc.id}')">X</button></li>`;
                }
            });
        },
        addTeamMember: async () => {
            const email = document.getElementById('new-admin-email').value.trim().toLowerCase();
            if(email) {
                await setDoc(doc(db, "admins", email), { role: "admin" });
                App.Admin.loadTeam();
            }
        },
        removeTeamMember: async (email) => {
            if(confirm("Remove admin?")) {
                await deleteDoc(doc(db, "admins", email));
                App.Admin.loadTeam();
            }
        },
        downloadTemplate: () => {
            const csv = "Sl No,Name,Gender,Dept,Year,Stream,Admission Number\n1,Sample,Male,Botany,1,UG,12345";
            const a = document.createElement('a');
            a.href = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            a.download = "template.csv";
            a.click();
        }
    },

  , // <--- IMPORTANT COMMA here to separate Admin and Student blocks

  Student: {
        currentStudent: null,
        selectedPost: null,
        proposerData: null,
        seconderData: null,

        // 1. Search Logic
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
                    err.innerText = "Student not found. Check Admission Number.";
                }
            } catch (e) {
                console.error(e);
                err.innerText = "System Error. Try again.";
            }
        },

        // 2. Load Dashboard
        loadDashboard: async () => {
            const s = App.Student.currentStudent;
            // Fill Profile
            document.getElementById('st-name').innerText = s.name;
            document.getElementById('st-dept').innerText = s.dept;
            document.getElementById('st-year').innerText = s.year + " Year";
            document.getElementById('st-stream').innerText = s.stream;
            document.getElementById('st-adm').innerText = s.admNo;

            App.UI.showSection('dashboard');
            document.getElementById('sec-search').classList.add('hidden');

            // Load Posts
            const list = document.getElementById('eligible-posts-list');
            list.innerHTML = '<div class="spinner-border text-primary"></div>';
            
            const querySnapshot = await getDocs(collection(db, "posts"));
            list.innerHTML = '';
            let eligibleCount = 0;

            querySnapshot.forEach((doc) => {
                const post = { id: doc.id, ...doc.data() };
                let isEligible = true;
                
                // Eligibility Logic
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
                                    <p class="card-text small text-muted">Vacancies: ${post.vacancy}</p>
                                    <button class="btn btn-primary w-100" 
                                        onclick="window.App.Student.openNomination('${post.id}', '${post.name}')">
                                        Apply Now
                                    </button>
                                </div>
                            </div>
                        </div>`;
                }
            });

            if(eligibleCount === 0) document.getElementById('no-posts-msg').classList.remove('hidden');
        },

        // 3. Open Nomination Form
        openNomination: (postId, postName) => {
            App.Student.selectedPost = { id: postId, name: postName };
            
            // UI Switch
            document.getElementById('sec-dashboard').classList.add('hidden');
            document.getElementById('sec-form').classList.remove('hidden');
            document.getElementById('nomination-preview-container').classList.add('hidden');

            // Pre-fill Candidate
            document.getElementById('display-post-name').innerText = postName;
            document.getElementById('frm-c-name').value = App.Student.currentStudent.name;
            document.getElementById('frm-c-adm').value = App.Student.currentStudent.admNo;
        },

        // 4. Calculate Age
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

        // 5. Fetch Proposer/Seconder Details (AJAX style)
        fetchStudentDetails: async (type) => {
            const inputId = type === 'p' ? 'frm-p-adm' : 'frm-s-adm';
            const detailsId = type === 'p' ? 'p-details' : 's-details';
            const admNo = document.getElementById(inputId).value.trim();
            const display = document.getElementById(detailsId);
            
            if(!admNo) { display.innerText = ""; return; }
            if(admNo === App.Student.currentStudent.admNo) {
                display.innerHTML = "<span class='text-red-500'>Cannot match Candidate</span>";
                return;
            }

            try {
                display.innerText = "Checking DB...";
                const docRef = doc(db, "students", admNo);
                const snap = await getDoc(docRef);

                if(snap.exists()) {
                    const data = snap.data();
                    display.innerHTML = `<span class="text-green-600 font-bold">✔ ${data.name}</span> (${data.dept}, ${data.year} Yr)`;
                    // Store for later
                    if(type === 'p') App.Student.proposerData = data;
                    if(type === 's') App.Student.seconderData = data;
                } else {
                    display.innerHTML = "<span class='text-red-500 font-bold'>✘ Student Not Found</span>";
                    if(type === 'p') App.Student.proposerData = null;
                    if(type === 's') App.Student.seconderData = null;
                }
            } catch(e) { console.error(e); }
        },

        // 6. Generate Preview
        generatePreview: () => {
            // Validation
            if(!App.Student.proposerData || !App.Student.seconderData) return alert("Please enter valid Proposer and Seconder Admission Numbers.");
            const dob = document.getElementById('frm-dob').value;
            if(!dob) return alert("Enter Date of Birth");

            const c = App.Student.currentStudent;
            const p = App.Student.proposerData;
            const s = App.Student.seconderData;

            // Fill Preview
            document.getElementById('prev-post').innerText = App.Student.selectedPost.name;
            document.getElementById('preview-date').innerText = "Date: " + new Date().toLocaleDateString();

            // Candidate
            document.getElementById('prev-c-name').innerText = c.name;
            document.getElementById('prev-c-adm').innerText = c.admNo;
            document.getElementById('prev-c-dept').innerText = c.dept;
            document.getElementById('prev-c-year').innerText = c.year + " " + c.stream;
            document.getElementById('prev-c-dob').innerText = dob;
            document.getElementById('prev-c-age').innerText = App.Student.calcAge() + " Years";

            // Proposer
            document.getElementById('prev-p-name').innerText = p.name;
            document.getElementById('prev-p-adm').innerText = p.admNo;
            document.getElementById('prev-p-dept').innerText = p.dept;
            document.getElementById('prev-p-year').innerText = p.year + " " + p.stream;

            // Seconder
            document.getElementById('prev-s-name').innerText = s.name;
            document.getElementById('prev-s-adm').innerText = s.admNo;
            document.getElementById('prev-s-dept').innerText = s.dept;
            document.getElementById('prev-s-year').innerText = s.year + " " + s.stream;

            // Show Preview, Hide Form
            document.getElementById('sec-form').classList.add('hidden');
            document.getElementById('nomination-preview-container').classList.remove('hidden');
        },

        editForm: () => {
            document.getElementById('sec-form').classList.remove('hidden');
            document.getElementById('nomination-preview-container').classList.add('hidden');
        },

        // 7. Final Submit to Firebase
        finalSubmit: async () => {
            if(!confirm("Are you sure? This will officially submit your nomination.")) return;

            try {
                const serial = "NOM-" + Date.now().toString().slice(-6);
                await addDoc(collection(db, "nominations"), {
                    serialNo: serial,
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

                alert(`Success! Your Serial Number is ${serial}. Please Print this form.`);
                // Disable submit button to prevent double submit
                document.querySelector('#btn-print-group button:last-child').disabled = true;
                document.querySelector('#btn-print-group button:last-child').innerText = "Submitted ✔";

            } catch(e) {
                console.error(e);
                alert("Error: " + e.message);
            }
        }
    }
    
};

// Make App global so HTML buttons can access it
window.App = App;

// Run startup tasks
// We delay slightly to let auth settle in index.html, but immediate call is fine too
// App.Admin.loadPosts();
