// 1. IMPORT FIREBASE (Using standard CDN URLs for Modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, setDoc, doc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
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
            document.getElementById(`sec-${id}`).classList.remove('hidden');
        },
        renderPostsTable: () => {
            const tbody = document.getElementById('posts-tbody');
            tbody.innerHTML = '';
            App.data.posts.forEach((post, index) => {
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
        // --- CSV & Nominal Roll Logic (Brief) ---
        processCSV: () => {
            const fileInput = document.getElementById('csv-file');
            if (!fileInput.files.length) return alert("Select CSV");
            
            Papa.parse(fileInput.files[0], {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    // Normalize Data
                    App.data.students = results.data.map(row => ({
                        slNo: row['Sl No'] || row['sl no'],
                        name: row['Name'],
                        gender: row['Gender'],
                        dept: row['Dept'],
                        year: row['Year'],
                        stream: row['UG-PG'] || row['Stream'] || "UG",
                        admNo: row['Admission Number'] || row['Adm No']
                    }));
                    document.getElementById('student-count').innerText = `Loaded ${App.data.students.length} students. Ready to Save.`;
                }
            });
        },

        saveStudentsToDB: async () => {
            if(App.data.students.length === 0) return alert("No data to save");
            const batch = writeBatch(db); // Note: Batch limit is 500. For large colleges, needs chunking loop.
            
            // Limit to first 490 for this demo to avoid error
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
        
        // Load existing posts from DB on startup
        loadPosts: async () => {
            const querySnapshot = await getDocs(collection(db, "posts"));
            App.data.posts = [];
            querySnapshot.forEach((doc) => {
                App.data.posts.push({ id: doc.id, ...doc.data() });
            });
            App.UI.renderPostsTable();
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
                dept: dept.trim(), // Empty string if general
                createdAt: new Date()
            };

            try {
                const docRef = await addDoc(collection(db, "posts"), newPost);
                // Update local state and UI
                App.data.posts.push({ id: docRef.id, ...newPost });
                App.UI.renderPostsTable();
                
                // Clear Form
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
        }
    }
};

// Make App global so HTML buttons can access it
window.App = App;

// Run startup tasks
App.Admin.loadPosts();
