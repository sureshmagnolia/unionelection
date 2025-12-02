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
     // --- Helper: Download CSV Template ---
        downloadTemplate: () => {
            // The exact headers your app expects
            const csvContent = "Sl No,Name,Gender,Dept,Year,Stream,Admission Number\n1,Sample Name,Male,Botany,1,UG,12345";
            
            // Create a virtual file and trigger download
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "nominal_roll_template.csv"; // File name
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        },
        // --- CSV & Nominal Roll Logic ---
        processCSV: () => {
            const fileInput = document.getElementById('csv-file');
            if (!fileInput || !fileInput.files.length) return alert("Select CSV");
            
            // Assuming Papa is loaded globally in index.html
            Papa.parse(fileInput.files[0], {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    App.data.students = results.data.map(row => ({
                        slNo: row['Sl No'] || row['sl no'],
                        name: row['Name'],
                        gender: row['Gender'],
                        dept: row['Dept'],
                        year: row['Year'],
                        stream: row['UG-PG'] || row['Stream'] || "UG",
                        admNo: row['Admission Number'] || row['Adm No']
                    }));
                    const countDiv = document.getElementById('student-count');
                    if(countDiv) countDiv.innerText = `Loaded ${App.data.students.length} students. Ready to Save.`;
                }
            });
        },

        saveStudentsToDB: async () => {
            if(App.data.students.length === 0) return alert("No data to save");
            const batch = writeBatch(db); 
            
            // Limit to first 490 for safety (Firestore batch limit is 500)
            const chunk = App.data.students.slice(0, 490);
            
            chunk.forEach(s => {
                if(s.admNo) {
                    const docRef = doc(db, "students", s.admNo.toString());
                    batch.set(docRef, s);
                }
            });

            try {
                await batch.commit();
                alert("Students saved to Firebase!");
            } catch(e) {
                console.error(e);
                alert("Error saving: " + e.message);
            }
        },

        // --- Post Management Logic ---
        loadPosts: async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "posts"));
                App.data.posts = [];
                querySnapshot.forEach((doc) => {
                    App.data.posts.push({ id: doc.id, ...doc.data() });
                });
                App.UI.renderPostsTable();
            } catch(e) {
                console.log("Could not load posts (likely not logged in yet).");
            }
        },

        addPost: async () => {
            const name = document.getElementById('p-name').value;
            const vacancy = document.getElementById('p-vacancy').value;
            const gender = document.getElementById('p-gender').value;
            const stream = document.getElementById('p-stream').value;
            const year = document.getElementById('p-year').value;
            const dept = document.getElementById('p-dept').value;

            const newPost = {
                name: name,
                vacancy: parseInt(vacancy),
                gender: gender,
                stream: stream,
                year: year,
                dept: dept.trim(), 
                createdAt: new Date()
            };

            try {
                const docRef = await addDoc(collection(db, "posts"), newPost);
                App.data.posts.push({ id: docRef.id, ...newPost });
                App.UI.renderPostsTable();
                document.getElementById('post-form').reset();
            } catch (e) {
                console.error("Error adding post: ", e);
                alert("Error adding post");
            }
        },

        deletePost: async (id) => {
            if(!confirm("Delete this post?")) return;
            try {
                await deleteDoc(doc(db, "posts", id));
                App.data.posts = App.data.posts.filter(p => p.id !== id);
                App.UI.renderPostsTable();
            } catch(e) {
                alert("Error deleting");
            }
        },

        lockPosts: async () => {
            if(confirm("Locking posts means no more posts can be added. Students can start nominating. Proceed?")) {
                await setDoc(doc(db, "settings", "config"), { 
                    postsLocked: true,
                    nominationOpen: true 
                }, { merge: true });
                alert("Posts Locked. Nominations are now OPEN.");
            }
        },

        // --- Team Management Logic (THIS IS THE NEW PART) ---
        loadTeam: async () => {
            const list = document.getElementById('admin-list');
            if(!list) return;
            list.innerHTML = '<li class="list-group-item">Loading...</li>';
            
            try {
                const querySnapshot = await getDocs(collection(db, "admins"));
                list.innerHTML = '';
                
                // 1. Show YOU (Super Admin)
                list.innerHTML += `<li class="list-group-item active">sureshmagnolia@gmail.com (Super Admin)</li>`;

                // 2. Show OTHERS
                querySnapshot.forEach((doc) => {
                    if(doc.id !== 'sureshmagnolia@gmail.com') {
                        list.innerHTML += `
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                ${doc.id}
                                <button class="btn btn-sm btn-outline-danger" onclick="window.App.Admin.removeTeamMember('${doc.id}')">Remove</button>
                            </li>`;
                    }
                });
            } catch (e) {
                console.error(e);
                list.innerHTML = `<li class="list-group-item text-danger">Error loading team. Permissions?</li>`;
            }
        },

        addTeamMember: async () => {
            const emailField = document.getElementById('new-admin-email');
            const email = emailField.value.trim().toLowerCase();
            
            if(!email || !email.includes('@')) return alert("Please enter a valid email.");

            try {
                await setDoc(doc(db, "admins", email), {
                    addedAt: new Date(),
                    role: "admin"
                });
                alert(`${email} added to Team!`);
                emailField.value = ''; 
                App.Admin.loadTeam(); 
            } catch (e) {
                console.error(e);
                alert("Error adding admin: " + e.message);
            }
        },

        removeTeamMember: async (email) => {
            if(!confirm(`Remove access for ${email}?`)) return;
            try {
                await deleteDoc(doc(db, "admins", email));
                App.Admin.loadTeam(); 
            } catch (e) {
                alert("Error removing admin.");
            }
        }
    
    
    }

  , // <--- IMPORTANT COMMA here to separate Admin and Student blocks

    Student: {
        currentStudent: null,
        selectedPost: null,

        // 1. Search Logic
        search: async () => {
            const input = document.getElementById('search-input').value.trim();
            const err = document.getElementById('search-error');
            err.innerText = "";
            
            if(!input) return;

            try {
                // Fetch Student Doc
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

        // 2. Load Dashboard & Check Eligibility
        loadDashboard: async () => {
            const s = App.Student.currentStudent;
            
            // Fill Profile
            document.getElementById('st-name').innerText = s.name;
            document.getElementById('st-dept').innerText = s.dept;
            document.getElementById('st-year').innerText = s.year + " Year";
            document.getElementById('st-stream').innerText = s.stream;
            document.getElementById('st-adm').innerText = s.admNo;

            // Show Dashboard
            App.UI.showSection('dashboard');
            document.getElementById('sec-search').classList.add('hidden');

            // Fetch Posts & Filter
            const list = document.getElementById('eligible-posts-list');
            list.innerHTML = '<div class="spinner-border text-primary"></div>';
            
            const querySnapshot = await getDocs(collection(db, "posts"));
            list.innerHTML = '';
            
            let eligibleCount = 0;

            querySnapshot.forEach((doc) => {
                const post = { id: doc.id, ...doc.data() };
                
                // --- THE LAW: Eligibility Check ---
                let isEligible = true;
                
                // 1. Gender Check
                if(post.gender !== "Any" && post.gender !== s.gender) isEligible = false;
                
                // 2. Stream Check
                if(post.stream !== "Any" && post.stream !== s.stream) isEligible = false;
                
                // 3. Year Check (Ensure comparison handles strings/numbers)
                if(post.year !== "Any" && String(post.year) !== String(s.year)) isEligible = false;
                
                // 4. Dept Check (If post has specific dept)
                if(post.dept && post.dept !== "" && post.dept !== s.dept) isEligible = false;

                if(isEligible) {
                    eligibleCount++;
                    list.innerHTML += `
                        <div class="col-md-6">
                            <div class="card h-100 border-primary">
                                <div class="card-body">
                                    <h5 class="card-title">${post.name}</h5>
                                    <p class="card-text small text-muted">Vacancies: ${post.vacancy}</p>
                                    <button class="btn btn-primary w-100" 
                                        onclick="window.App.Student.openNomination('${post.id}', '${post.name}')">
                                        Apply for this Post
                                    </button>
                                </div>
                            </div>
                        </div>`;
                }
            });

            if(eligibleCount === 0) {
                document.getElementById('no-posts-msg').classList.remove('hidden');
            }
        },

        // 3. Open Form
        openNomination: (postId, postName) => {
            App.Student.selectedPost = { id: postId, name: postName };
            
            document.getElementById('form-post-name').innerText = postName;
            document.getElementById('frm-c-name').value = App.Student.currentStudent.name;
            document.getElementById('frm-c-adm').value = App.Student.currentStudent.admNo;
            
            App.UI.showSection('form');
        },

        // 4. Calculate Age
        calcAge: () => {
            const dobInput = document.getElementById('frm-dob').value;
            if(!dobInput) return;
            
            const dob = new Date(dobInput);
            const today = new Date();
            let age = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                age--;
            }
            document.getElementById('age-display').innerText = `Age: ${age} Years`;
        },

        // 5. Submit Nomination
        submitNomination: async () => {
            const s = App.Student.currentStudent;
            const pid = App.Student.selectedPost.id;
            const pAdm = document.getElementById('frm-p-adm').value;
            const sAdm = document.getElementById('frm-s-adm').value;
            const dob = document.getElementById('frm-dob').value;

            // Simple Validation
            if(!pAdm || !sAdm || !dob) return alert("Fill all fields");
            if(pAdm === s.admNo || sAdm === s.admNo) return alert("You cannot propose/second yourself!");

            try {
                // Generate Serial No (Time based)
                const serial = "NOM-" + Date.now().toString().slice(-6);

                await addDoc(collection(db, "nominations"), {
                    serialNo: serial,
                    postId: pid,
                    postName: App.Student.selectedPost.name,
                    candidate: { name: s.name, admNo: s.admNo, dept: s.dept },
                    proposerAdm: pAdm,
                    seconderAdm: sAdm,
                    dob: dob,
                    status: "Submitted", // Pending Scrutiny
                    timestamp: new Date()
                });

                alert(`Nomination Submitted Successfully!\nYour Serial No: ${serial}`);
                location.reload();

            } catch(e) {
                console.error(e);
                alert("Submission Failed: " + e.message);
            }
        }
    }
};

// Make App global so HTML buttons can access it
window.App = App;

// Run startup tasks
// We delay slightly to let auth settle in index.html, but immediate call is fine too
// App.Admin.loadPosts();
