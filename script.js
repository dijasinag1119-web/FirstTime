// 1. Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJppZPfue3_he_0-VuQs1aSAwiFr6CKfk", // Tumhari API Key
  authDomain: "academicfriend.firebaseapp.com",
  projectId: "academicfriend",
  storageBucket: "academicfriend.firebasestorage.app",
  messagingSenderId: "817866727755",
  appId: "1:817866727755:web:919e536c8976ef52c408ce",
  measurementId: "G-QXEPEJFHMT"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

console.log("Firebase Cloud Active!");
// ACADEMIA PORTAL — script.js
// All logic: auth, data, rendering, charts
// ============================================================

// ------- BRANCH SUBJECT PRESETS -------
// When a student picks their branch, these subjects auto-fill
const BRANCH_SUBJECTS = {
 CSE_AIML: [
    ["Mathematics for AI","Core"],["Python for ML","Core"],["Data Structures","Core"],
    ["Digital Logic","Core"],["English","Core"],["Python Lab","Lab"],
    ["Maths II (Calculus)","Core"],["Machine Learning","Core"],["AI Ethics","Core"],
    ["Database Systems","Core"],["Neural Networks","Core"],["ML Lab","Lab"]
  ],
  CSE: [
    ["Mathematics I","Core"],["Physics","Core"],["C Programming","Core"],
    ["Digital Logic","Core"],["English","Core"],["Physics Lab","Lab"],
    ["C Programming Lab","Lab"],["Mathematics II","Core"],
    ["Data Structures","Core"],["Computer Organization","Core"],
    ["Discrete Mathematics","Core"],["OOP with Java","Core"],
    ["DS Lab","Lab"],["Java Lab","Lab"],["Operating Systems","Core"],
    ["DBMS","Core"],["Computer Networks","Core"],["Theory of Computation","Core"],
    ["Software Engineering","Core"],["DBMS Lab","Lab"],
    ["Compiler Design","Core"],["AI & ML","Core"],["Web Technologies","Core"],
    ["Cloud Computing","Elective"],["ML Lab","Lab"],
    ["Information Security","Core"],["Data Mining","Elective"],
    ["Mobile App Dev","Elective"],["Project Work","Core"],["Seminar","Core"],
    ["Internship / Project","Core"],["Open Elective","Elective"]
  ],
  ECE: [
    ["Mathematics I","Core"],["Physics","Core"],["Basic Electronics","Core"],
    ["English","Core"],["Workshop","Lab"],["Mathematics II","Core"],
    ["Circuit Theory","Core"],["Electronic Devices","Core"],
    ["Signals & Systems","Core"],["Electronics Lab","Lab"],
    ["Analog Circuits","Core"],["Digital Electronics","Core"],
    ["Microprocessors","Core"],["Communication Theory","Core"],
    ["VLSI Design","Core"],["DSP","Core"],["Embedded Systems","Core"],
    ["Wireless Comm.","Elective"],["Antenna Theory","Core"],
    ["Project Work","Core"],["Seminar","Core"],["Open Elective","Elective"]
  ],
  MECH: [
    ["Mathematics I","Core"],["Physics","Core"],["Engineering Drawing","Core"],
    ["Workshop","Lab"],["English","Core"],["Mathematics II","Core"],
    ["Thermodynamics","Core"],["Material Science","Core"],
    ["Fluid Mechanics","Core"],["Manufacturing Processes","Core"],
    ["Machine Design","Core"],["Heat Transfer","Core"],
    ["CAD / CAM","Core"],["Industrial Engineering","Elective"],
    ["Project Work","Core"],["Seminar","Core"],["Open Elective","Elective"]
  ],
  CIVIL: [
    ["Mathematics I","Core"],["Physics","Core"],["Engineering Drawing","Core"],
    ["English","Core"],["Workshop","Lab"],["Structural Analysis","Core"],
    ["Soil Mechanics","Core"],["Fluid Mechanics","Core"],
    ["Surveying","Core"],["Construction Materials","Core"],
    ["Concrete Technology","Core"],["Geotechnical Eng.","Core"],
    ["Transportation Eng.","Elective"],["Project Work","Core"],
    ["Seminar","Core"],["Open Elective","Elective"]
  ],
  EE: [
    ["Mathematics I","Core"],["Physics","Core"],["Basic Electrical Eng.","Core"],
    ["English","Core"],["Workshop","Lab"],["Circuit Theory","Core"],
    ["Electrical Machines","Core"],["Power Systems","Core"],
    ["Control Systems","Core"],["Power Electronics","Core"],
    ["Drives & Control","Core"],["High Voltage Eng.","Elective"],
    ["Project Work","Core"],["Seminar","Core"],["Open Elective","Elective"]
  ],
  CUSTOM: []
};

// Subject dot colors — cycles through these for visual variety
const SUBJ_COLORS = [
  "#4f8ef7","#3ecf8e","#f59e0b","#f87171","#a78bfa",
  "#34d399","#fb923c","#60a5fa","#e879f9","#4ade80"
];

// ============================================================
// STATE — current user and selected items
// ============================================================
let currentUser   = null;  // username of logged-in user
let currentSem    = 1;     // 1-8
let currentSubject = null; // name of selected subject
let currentMatTab = "books";
let marksChartObj = null;  // Chart.js instance
let semChartObj   = null;
let cgpaChartObj  = null;

// ============================================================
// STORAGE HELPERS
// Think of localStorage as a notebook for your browser.
// We store everything as JSON (text version of JS objects).
// ============================================================

// save any value with a key
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// load a value by key (returns null if not found)
function load(key) {
  const v = localStorage.getItem(key);
  return v ? JSON.parse(v) : null;
}

// key pattern: "academia_username_datatype_sem"
function userKey(type, sem) {
  const s = sem ? `_sem${sem}` : "";
  return `academia_${currentUser}_${type}${s}`;
}

// ============================================================
// AUTH — Login / Register
// ============================================================

function showAuthTab(tab) {
  document.getElementById("login-form").classList.toggle("hidden", tab !== "login");
  document.getElementById("register-form").classList.toggle("hidden", tab !== "register");
  document.getElementById("tab-login").classList.toggle("active", tab === "login");
  document.getElementById("tab-register").classList.toggle("active", tab !== "login");
  clearAuthMessage();
}

function showAuthMessage(msg, type) {
  const el = document.getElementById("auth-message");
  el.textContent = msg;
  el.className = "auth-message " + type;
}

function clearAuthMessage() {
  const el = document.getElementById("auth-message");
  el.className = "auth-message";
  el.textContent = "";
}

async function handleRegister(e) {
  e.preventDefault();
  const name     = document.getElementById("reg-name").value.trim();
  const username = document.getElementById("reg-username").value.trim();
  const password = document.getElementById("reg-password").value;
  const branch   = document.getElementById("reg-branch").value;

  if (!name || !username || !password || !branch) {
    showAuthMessage("Please fill all fields.", "error");
    return;
  }

  try {
    // 1. Check if user already exists in Firestore
    const userDoc = await db.collection("users").doc(username).get();
    
    if (userDoc.exists) {
      showAuthMessage("Username already taken. Try another.", "error");
      return;
    }

    // 2. Save to Firebase Firestore
    await db.collection("users").doc(username).set({
      name: name,
      username: username,
      password: password, // Note: Real app mein hashing zaroori hai
      branch: branch,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 3. Keep LocalStorage sync (jo tumhara purana logic tha)
    const users = load("academia_users") || {};
    users[username] = { name, password, branch };
    save("academia_users", users);

    // Subjects prefill logic
    prefillSubjects(username, branch);

    showAuthMessage("Account created & synced to Cloud!", "success");
    showAuthTab("login");
    document.getElementById("login-username").value = username;

  } catch (error) {
    console.error("Firebase Error:", error);
    showAuthMessage("Error: " + error.message, "error");
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    // 1. Firebase Firestore 
    const userDoc = await db.collection("users").doc(username).get();

    // 2. check if user exists
    if (!userDoc.exists) {
      showAuthMessage("User not found.", "error");
      return;
    }

    const userData = userDoc.data();

    // 3.  password check (again, real app mein hashing zaroori hai)
    if (userData.password !== password) {
      showAuthMessage("Wrong password.", "error");
      return;
    }

    // 4.  Login successful, set current user and sync localStorage
    currentUser = username;
    save("academia_last_user", username);
    
    // LocalStorage mein bhi user data sync kar do (optional, for backward compatibility)
    const users = load("academia_users") || {};
    users[username] = userData;
    save("academia_users", users);

    launchApp(userData);

  } catch (error) {
    console.error("Login Error:", error);
    showAuthMessage("Connection error. Try again.", "error");
  }
}

function handleLogout() {
  currentUser = null;
  document.getElementById("app-screen").classList.add("hidden");
  document.getElementById("auth-screen").classList.remove("hidden");
  clearAuthMessage();
  showAuthTab("login");
}

// ============================================================
// SUBJECT PREFILL
// Distributes preset subjects across 8 semesters for a branch
// ============================================================
function prefillSubjects(username, branch) {
  const list = BRANCH_SUBJECTS[branch] || [];
  if (!list.length) return;

  // 8 semesters, ~4 subjects each
  const perSem = Math.ceil(list.length / 8);

  for (let s = 1; s <= 8; s++) {
    const slice = list.slice((s - 1) * perSem, s * perSem);
    const subjects = slice.map((item, i) => ({
      id: Date.now() + i,
      name: item[0],
      type: item[1],
      color: SUBJ_COLORS[i % SUBJ_COLORS.length]
    }));
    const key = `academia_${username}_subjects_sem${s}`;
    save(key, subjects);
  }
}

// ============================================================
// APP LAUNCH — called right after login
// ============================================================
function launchApp(user) {
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("app-screen").classList.remove("hidden");
  document.getElementById("app-screen").classList.add("show");

  // --- Avatar set karne ka naya logic ---
  const avatarEl = document.getElementById("nav-avatar");
  if (user.photo) {
    // Agar photo hai toh img tag lagao
    avatarEl.innerHTML = `<img src="${user.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    avatarEl.textContent = "";
  } else {
    // Agar photo nahi hai toh naam ka pehla letter dikhao
    avatarEl.textContent = user.name.charAt(0).toUpperCase();
    avatarEl.innerHTML = user.name.charAt(0).toUpperCase();
  }

  document.getElementById("nav-username").textContent = user.name;
  buildSemPills();
  selectSem(1);
  showPage("dashboard");
}

// ============================================================
// SEMESTER PILLS
// ============================================================
function buildSemPills() {
  const wrap = document.getElementById("nav-sems");
  wrap.innerHTML = "";
  for (let s = 1; s <= 8; s++) {
    const btn = document.createElement("button");
    btn.className = "sem-pill" + (s === 1 ? " active" : "");
    btn.textContent = "Sem " + s;
    btn.onclick = () => selectSem(s);
    wrap.appendChild(btn);
  }
}

function selectSem(s) {
  currentSem = s;
  currentSubject = null;

  // update pill active state
  document.querySelectorAll(".sem-pill").forEach((p, i) => {
    p.classList.toggle("active", i + 1 === s);
  });

  // update semester label on subjects page
  document.getElementById("subj-sem-label").textContent = "Semester " + s;

  // refresh whichever page is currently visible
  refreshCurrentPage();
}

// ============================================================
// PAGE NAVIGATION
// ============================================================
function showPage(pageId) {
  // hide all pages
  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("active");
    p.classList.add("hidden");
  });

  // show target
  const target = document.getElementById("page-" + pageId);
  if (target) {
    target.classList.remove("hidden");
    target.classList.add("active");
  }

  // highlight active tab
  document.querySelectorAll(".page-tab").forEach(t => {
    t.classList.remove("active");
  });
  // match tab by position
  const tabMap = {
    dashboard:0, subjects:1, materials:2, marks:3, exams:4, cgpa:5
  };
  const tabs = document.querySelectorAll(".page-tab");
  if (tabs[tabMap[pageId]]) tabs[tabMap[pageId]].classList.add("active");

  // render the page
  const renders = {
    dashboard: renderDashboard,
    subjects:  renderSubjects,
    materials: renderMaterials,
    marks:     renderMarks,
    exams:     renderExams,
    cgpa:      renderCGPA
  };
  if (renders[pageId]) renders[pageId]();
}

function refreshCurrentPage() {
  const active = document.querySelector(".page.active");
  if (!active) return;
  const id = active.id.replace("page-", "");
  showPage(id);
}

// ============================================================
// SUBJECTS — get / add / delete / rename
// ============================================================
function getSubjects(sem) {
  return load(userKey("subjects", sem)) || [];
}

function saveSubjects(list, sem) {
  save(userKey("subjects", sem || currentSem), list);
}

function addSubject() {
  const name = document.getElementById("new-subject-name").value.trim();
  const type = document.getElementById("new-subject-type").value;
  if (!name) return alert("Enter a subject name.");

  const list = getSubjects(currentSem);
  list.push({
    id: Date.now(),
    name,
    type,
    color: SUBJ_COLORS[list.length % SUBJ_COLORS.length]
  });
  saveSubjects(list);
  document.getElementById("new-subject-name").value = "";
  renderSubjects();
}

function deleteSubject(id) {
  if (!confirm("Delete this subject and all its data?")) return;
  const list = getSubjects(currentSem).filter(s => s.id !== id);
  saveSubjects(list);
  if (currentSubject && currentSubject.id === id) currentSubject = null;
  renderSubjects();
}

function renameSubject(id) {
  const list = getSubjects(currentSem);
  const subj = list.find(s => s.id === id);
  if (!subj) return;
  const newName = prompt("New name for this subject:", subj.name);
  if (!newName || !newName.trim()) return;
  subj.name = newName.trim();
  saveSubjects(list);
  renderSubjects();
}

// ============================================================
// SUBJECTS RENDER
// ============================================================
function renderSubjects() {
  const list = getSubjects(currentSem);
  const grid = document.getElementById("subjects-grid");

  if (!list.length) {
    grid.innerHTML =
      `<p class="empty-msg" style="grid-column:1/-1">
        No subjects yet. Add your first subject above.
       </p>`;
    return;
  }

  grid.innerHTML = list.map(s => {
    const resources = getResources(s.id, "all");
    const topics    = getTopics(s.id);
    const donePct   = topics.length
      ? Math.round(topics.filter(t => t.done).length / topics.length * 100)
      : 0;

    return `
      <div class="subject-card" id="sc-${s.id}">
        <span class="subj-badge ${s.type}">${s.type}</span>
        <div class="subj-name">${s.name}</div>
        <div class="subj-count">${resources} resource${resources !== 1 ? "s" : ""}</div>
        <div class="prog-bg">
          <div class="prog-fill" style="width:${donePct}%;background:${s.color}"></div>
        </div>
        <div class="prog-label">${donePct}% topics done</div>
        <div class="subj-actions">
          <button class="btn-icon" onclick="renameSubject(${s.id})">Rename</button>
          <button class="btn-icon del" onclick="deleteSubject(${s.id})">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

// count all resources for a subject
function getResources(subjId, tab) {
  if (tab === "all") {
    let count = 0;
    ["books","notes","youtube","assignments","pyqs"].forEach(t => {
      count += (load(`${userKey("res")}_${subjId}_${t}`) || []).length;
    });
    return count;
  }
  return load(`${userKey("res")}_${subjId}_${tab}`) || [];
}

// ============================================================
// MATERIALS — render subject selector + resources
// ============================================================
function renderMaterials() {
  buildSubjectSelector("material-subject-selector", subj => {
    currentSubject = subj;
    document.getElementById("material-content").classList.remove("hidden");
    renderResourceList();
    renderTopics();
  });

  if (currentSubject) {
    document.getElementById("material-content").classList.remove("hidden");
    renderResourceList();
    renderTopics();
  } else {
    document.getElementById("material-content").classList.add("hidden");
  }
}

function buildSubjectSelector(containerId, onSelect) {
  const list = getSubjects(currentSem);
  const wrap = document.getElementById(containerId);

  if (!list.length) {
    wrap.innerHTML = `<p class="empty-msg">No subjects in Sem ${currentSem}. Add them in the Subjects tab.</p>`;
    return;
  }

  wrap.innerHTML = list.map(s =>
    `<button class="sel-pill ${currentSubject && currentSubject.id === s.id ? "active" : ""}"
      onclick='selectSubjectFor("${containerId}", ${JSON.stringify(s).replace(/"/g, "&quot;")})'
      style="border-color:${currentSubject && currentSubject.id === s.id ? s.color : ""}">
      ${s.name}
    </button>`
  ).join("");
}

function selectSubjectFor(containerId, subj) {
  currentSubject = subj;

  // update pills
  document.querySelectorAll(`#${containerId} .sel-pill`).forEach(p => {
    p.classList.remove("active");
  });
  event.target.classList.add("active");

  if (containerId === "material-subject-selector") {
    document.getElementById("material-content").classList.remove("hidden");
    renderResourceList();
    renderTopics();
  } else if (containerId === "marks-subject-selector") {
    document.getElementById("marks-content").classList.remove("hidden");
    renderMarksContent();
  }
}

function showMatTab(tab) {
  currentMatTab = tab;
  document.querySelectorAll(".mat-tab").forEach(t => t.classList.remove("active"));
  event.target.classList.add("active");
  renderResourceList();
}

// ============================================================
// RESOURCES — add / delete / render
// ============================================================
function resKey(subjId, tab) {
  return `${userKey("res")}_${subjId}_${tab}`;
}

function addResource() {
  if (!currentSubject) return alert("Select a subject first.");
  const name = document.getElementById("res-name").value.trim();
  const url  = document.getElementById("res-url").value.trim();
  const file = document.getElementById("res-file").files[0];

  if (!name) return alert("Enter a resource name.");

  const list = load(resKey(currentSubject.id, currentMatTab)) || [];

  const item = {
    id:   Date.now(),
    name,
    url:  url || null,
    file: null,
    date: new Date().toLocaleDateString("en-IN", {day:"numeric", month:"short"})
  };

  // if a file is chosen, store it as base64
  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      item.file = { name: file.name, data: e.target.result };
      list.push(item);
      save(resKey(currentSubject.id, currentMatTab), list);
      renderResourceList();
    };
    reader.readAsDataURL(file);
  } else {
    list.push(item);
    save(resKey(currentSubject.id, currentMatTab), list);
    renderResourceList();
  }

  document.getElementById("res-name").value = "";
  document.getElementById("res-url").value  = "";
  document.getElementById("res-file").value = "";
}

function deleteResource(id) {
  const list = (load(resKey(currentSubject.id, currentMatTab)) || [])
    .filter(r => r.id !== id);
  save(resKey(currentSubject.id, currentMatTab), list);
  renderResourceList();
}

function renderResourceList() {
  if (!currentSubject) return;
  const list = load(resKey(currentSubject.id, currentMatTab)) || [];
  const wrap = document.getElementById("resource-list");

  if (!list.length) {
    wrap.innerHTML = `<p class="empty-msg">No items here yet. Add one above.</p>`;
    return;
  }

  const iconMap = {
    books: "📚", notes: "📄", youtube: "▶", assignments: "📝", pyqs: "📋"
  };
  const iconClass = {
    books:"note", notes:"pdf", youtube:"yt", assignments:"note", pyqs:"pdf"
  };

  wrap.innerHTML = list.map(r => {
    const openBtn = r.url
      ? `<a class="res-open" href="${r.url}" target="_blank">Open ↗</a>`
      : r.file
        ? `<a class="res-open" href="${r.file.data}" download="${r.file.name}">Download</a>`
        : "";

    return `
      <div class="resource-item">
        <div class="res-icon ${iconClass[currentMatTab]}"
          style="font-size:14px">${iconMap[currentMatTab]}</div>
        <div class="res-info">
          <div class="res-name">${r.name}</div>
          <div class="res-meta">
            ${r.file ? r.file.name + " · " : ""}Added ${r.date}
          </div>
        </div>
        ${openBtn}
        <button class="res-del" onclick="deleteResource(${r.id})">✕</button>
      </div>
    `;
  }).join("");
}

// ============================================================
// TOPICS CHECKLIST
// ============================================================
function topicsKey(subjId) {
  return `${userKey("topics")}_${subjId}`;
}

function getTopics(subjId) {
  return load(topicsKey(subjId)) || [];
}

function addTopic() {
  if (!currentSubject) return alert("Select a subject first.");
  const name = prompt("Topic name:");
  if (!name || !name.trim()) return;
  const list = getTopics(currentSubject.id);
  list.push({ id: Date.now(), name: name.trim(), done: false });
  save(topicsKey(currentSubject.id), list);
  renderTopics();
}

function toggleTopic(id) {
  const list = getTopics(currentSubject.id);
  const t = list.find(x => x.id === id);
  if (t) t.done = !t.done;
  save(topicsKey(currentSubject.id), list);
  renderTopics();
}

function renderTopics() {
  if (!currentSubject) return;
  const list = getTopics(currentSubject.id);
  const wrap = document.getElementById("topics-wrap");

  if (!list.length) {
    wrap.innerHTML = `<span style="color:#3d4a63;font-size:13px">No topics yet. Click "+ Add topic".</span>`;
    return;
  }

  wrap.innerHTML = list.map(t =>
    `<button class="topic-chip ${t.done ? "done" : ""}"
      onclick="toggleTopic(${t.id})">${t.name}</button>`
  ).join("");
}

// ============================================================
// MARKS — add / render / charts
// ============================================================
function marksKey(subjId) {
  return `${userKey("marks")}_${subjId}`;
}

function renderMarks() {
  buildSubjectSelector("marks-subject-selector", subj => {
    currentSubject = subj;
    document.getElementById("marks-content").classList.remove("hidden");
    renderMarksContent();
  });

  if (currentSubject) {
    document.getElementById("marks-content").classList.remove("hidden");
    renderMarksContent();
  } else {
    document.getElementById("marks-content").classList.add("hidden");
  }
}

function addMarks() {
  if (!currentSubject) return alert("Select a subject first.");
  const type  = document.getElementById("marks-type").value;
  const score = parseFloat(document.getElementById("marks-score").value);
  const outof = parseFloat(document.getElementById("marks-outof").value);
  const label = document.getElementById("marks-label").value.trim()
                || `${typeLabel(type)} ${Date.now()}`;

  if (isNaN(score) || isNaN(outof) || outof <= 0) {
    return alert("Enter valid score and total marks.");
  }

  const list = load(marksKey(currentSubject.id)) || [];
  list.push({ id: Date.now(), type, score, outof, label,
    date: new Date().toLocaleDateString("en-IN") });
  save(marksKey(currentSubject.id), list);

  document.getElementById("marks-score").value = "";
  document.getElementById("marks-outof").value = "";
  document.getElementById("marks-label").value = "";
  renderMarksContent();
}

function typeLabel(t) {
  return { unit:"Unit Test", mid:"Mid Term", end:"End Sem" }[t] || t;
}

function deleteMarks(id) {
  const list = (load(marksKey(currentSubject.id)) || []).filter(m => m.id !== id);
  save(marksKey(currentSubject.id), list);
  renderMarksContent();
}

function renderMarksContent() {
  if (!currentSubject) return;
  const list = load(marksKey(currentSubject.id)) || [];

  // summary cards
  const types = ["unit","mid","end"];
  const summary = document.getElementById("marks-summary");
  summary.innerHTML = types.map(t => {
    const items = list.filter(m => m.type === t);
    const avg = items.length
      ? Math.round(items.reduce((a, m) => a + (m.score / m.outof * 100), 0) / items.length)
      : null;
    const color = avg === null ? "" : avg >= 70 ? "green" : avg >= 50 ? "amber" : "red";
    return `
      <div class="stat-card">
        <div class="stat-label">${typeLabel(t)} avg</div>
        <div class="stat-value ${color}">${avg !== null ? avg + "%" : "—"}</div>
      </div>`;
  }).join("");

  // marks history table
  const tableWrap = document.getElementById("marks-table");
  if (!list.length) {
    tableWrap.innerHTML = `<p class="empty-msg">No marks added yet.</p>`;
  } else {
    tableWrap.innerHTML = `
      <table class="marks-table">
        <thead>
          <tr><th>Label</th><th>Type</th><th>Score</th><th>%</th><th></th></tr>
        </thead>
        <tbody>
          ${list.map(m => {
            const pct = Math.round(m.score / m.outof * 100);
            const cls = pct >= 70 ? "high" : pct >= 50 ? "mid" : "low";
            return `
              <tr>
                <td>${m.label}</td>
                <td style="color:#64748b">${typeLabel(m.type)}</td>
                <td>${m.score} / ${m.outof}</td>
                <td><span class="pct-badge ${cls}">${pct}%</span></td>
                <td><button class="res-del" onclick="deleteMarks(${m.id})">✕</button></td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>`;
  }

  // performance chart
  renderMarksChart(list);

  // all subjects comparison
  renderSemChart();
}

function renderMarksChart(list) {
  const canvas = document.getElementById("marks-chart");
  if (!canvas) return;

  // destroy old chart if exists
  if (marksChartObj) { marksChartObj.destroy(); marksChartObj = null; }

  if (!list.length) {
    canvas.style.display = "none";
    return;
  }
  canvas.style.display = "block";

  const typeColors = {
    unit: "#4f8ef7",
    mid:  "#f59e0b",
    end:  "#3ecf8e"
  };

  const labels = list.map(m => m.label);
  const data   = list.map(m => Math.round(m.score / m.outof * 100));
  const colors = list.map(m => typeColors[m.type]);

  marksChartObj = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Score %",
        data,
        backgroundColor: colors.map(c => c + "99"),
        borderColor: colors,
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.y}%`
          }
        }
      },
      scales: {
        y: {
          min: 0, max: 100,
          ticks: { color: "#64748b", callback: v => v + "%" },
          grid:  { color: "rgba(255,255,255,0.05)" }
        },
        x: {
          ticks: { color: "#64748b" },
          grid:  { display: false }
        }
      }
    }
  });
}

function renderSemChart() {
  const canvas = document.getElementById("sem-chart");
  if (!canvas) return;
  if (semChartObj) { semChartObj.destroy(); semChartObj = null; }

  const subjects = getSubjects(currentSem);
  if (!subjects.length) return;

  const labels = subjects.map(s => s.name);
  const avgs   = subjects.map(s => {
    const list = load(marksKey(s.id)) || [];
    if (!list.length) return 0;
    return Math.round(list.reduce((a, m) => a + (m.score / m.outof * 100), 0) / list.length);
  });

  semChartObj = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Average %",
        data: avgs,
        backgroundColor: subjects.map(s => s.color + "88"),
        borderColor:      subjects.map(s => s.color),
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 0, max: 100,
          ticks: { color: "#64748b", callback: v => v + "%" },
          grid:  { color: "rgba(255,255,255,0.05)" }
        },
        x: { ticks: { color: "#64748b" }, grid: { display: false } }
      }
    }
  });
}

// ============================================================
// EXAMS CALENDAR
// ============================================================
function examsKey() { return userKey("exams"); }

function addExam() {
  const name    = document.getElementById("exam-name").value.trim();
  const semVal  = document.getElementById("exam-sem-sel").value;
  const type    = document.getElementById("exam-type").value;
  const dateVal = document.getElementById("exam-date").value;

  if (!name || !dateVal) return alert("Enter name and date.");

  const list = load(examsKey()) || [];
  list.push({ id: Date.now(), name, sem: semVal, type, date: dateVal });
  save(examsKey(), list);

  document.getElementById("exam-name").value = "";
  document.getElementById("exam-date").value = "";
  renderExams();
}

function deleteExam(id) {
  const list = (load(examsKey()) || []).filter(e => e.id !== id);
  save(examsKey(), list);
  renderExams();
}

function renderExams() {
  // fill semester select
  const semSel = document.getElementById("exam-sem-sel");
  semSel.innerHTML = Array.from({length:8}, (_,i) =>
    `<option value="${i+1}">Semester ${i+1}</option>`
  ).join("");
  semSel.value = currentSem;

  const list = (load(examsKey()) || [])
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const wrap = document.getElementById("exam-list");

  if (!list.length) {
    wrap.innerHTML = `<p class="empty-msg">No exams or deadlines added yet.</p>`;
    return;
  }

  const today = new Date();
  today.setHours(0,0,0,0);

  wrap.innerHTML = list.map(e => {
    const d    = new Date(e.date);
    const diff = Math.round((d - today) / 86400000);
    let cls, barColor, label;

    if      (diff < 0)  { cls = "past";   barColor = "#3d4a63"; label = "Past"; }
    else if (diff <= 3) { cls = "urgent"; barColor = "#f87171"; label = diff === 0 ? "Today!" : `${diff}d`; }
    else if (diff <= 10){ cls = "soon";   barColor = "#f59e0b"; label = `${diff}d`; }
    else                { cls = "ok";     barColor = "#3ecf8e"; label = `${diff}d`; }

    return `
      <div class="exam-item ${cls}">
        <div class="exam-urgency-bar" style="background:${barColor}"></div>
        <div class="exam-info">
          <div class="exam-name">${e.name}</div>
          <div class="exam-meta">
            Sem ${e.sem} · ${typeLabel(e.type)} ·
            ${d.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}
          </div>
        </div>
        <div class="days-badge">${label}</div>
        <button class="exam-del" onclick="deleteExam(${e.id})">✕</button>
      </div>`;
  }).join("");
}

// ============================================================
// CGPA TRACKER
// ============================================================
function calcSemGPA(s) {
  const subjects = getSubjects(s);
  if (!subjects.length) return null;

  const gpas = subjects.map(subj => {
    const list = load(marksKey(subj.id)) || [];
    if (!list.length) return null;
    const avg = list.reduce((a, m) => a + (m.score / m.outof * 100), 0) / list.length;
    // convert percentage to 10-point scale
    if      (avg >= 90) return 10;
    else if (avg >= 80) return 9;
    else if (avg >= 70) return 8;
    else if (avg >= 60) return 7;
    else if (avg >= 50) return 6;
    else                return 0;
  }).filter(g => g !== null);

  if (!gpas.length) return null;
  return Math.round(gpas.reduce((a, g) => a + g, 0) / gpas.length * 100) / 100;
}

function renderCGPA() {
  const semGPAs = Array.from({length:8}, (_, i) => calcSemGPA(i + 1));

  // overall CGPA = average of all non-null sem GPAs
  const valid = semGPAs.filter(g => g !== null);
  const cgpa  = valid.length
    ? Math.round(valid.reduce((a, g) => a + g, 0) / valid.length * 100) / 100
    : null;

  document.getElementById("cgpa-number").textContent =
    cgpa !== null ? cgpa.toFixed(2) : "—";

  // per-semester cells
  const grid = document.getElementById("sem-gpa-grid");
  grid.innerHTML = semGPAs.map((g, i) => {
    const color = g === null ? "#3d4a63"
                : g >= 8    ? "#3ecf8e"
                : g >= 6    ? "#4f8ef7"
                :              "#f59e0b";
    return `
      <div class="sem-gpa-cell">
        <div class="sem-gpa-num">Semester ${i + 1}</div>
        <div class="sem-gpa-val" style="color:${color}">
          ${g !== null ? g.toFixed(1) : "—"}
        </div>
      </div>`;
  }).join("");

  // trend chart
  renderCGPAChart(semGPAs);
}

function renderCGPAChart(semGPAs) {
  const canvas = document.getElementById("cgpa-chart");
  if (!canvas) return;
  if (cgpaChartObj) { cgpaChartObj.destroy(); cgpaChartObj = null; }

  const labels = semGPAs.map((_, i) => "Sem " + (i + 1));
  const data   = semGPAs.map(g => g !== null ? g : null);

  cgpaChartObj = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "GPA",
        data,
        borderColor: "#4f8ef7",
        backgroundColor: "rgba(79,142,247,0.08)",
        borderWidth: 2,
        pointBackgroundColor: "#4f8ef7",
        pointRadius: 5,
        tension: 0.3,
        spanGaps: true,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 0, max: 10,
          ticks: { color: "#64748b" },
          grid:  { color: "rgba(255,255,255,0.05)" }
        },
        x: { ticks: { color: "#64748b" }, grid: { display: false } }
      }
    }
  });
}

// ============================================================
// DASHBOARD RENDER
// ============================================================
function renderDashboard() {
  const subjects = getSubjects(currentSem);
  let totalRes = 0;
  subjects.forEach(s => { totalRes += getResources(s.id, "all"); });

  // stat cards
  document.getElementById("stat-sem").textContent = "Sem " + currentSem;
  document.getElementById("stat-subjects").textContent = subjects.length;
  document.getElementById("stat-resources").textContent = totalRes;

  // next exam countdown
  const exams = load(examsKey()) || [];
  const today = new Date(); today.setHours(0,0,0,0);
  const next  = exams
    .map(e => ({ ...e, diff: Math.round((new Date(e.date) - today) / 86400000) }))
    .filter(e => e.diff >= 0)
    .sort((a, b) => a.diff - b.diff)[0];

  document.getElementById("stat-exam").textContent =
    next ? (next.diff === 0 ? "Today!" : next.diff + "d") : "—";

  // subjects list
  const subjWrap = document.getElementById("dash-subjects-list");
  if (!subjects.length) {
    subjWrap.innerHTML = `<p class="empty-msg">No subjects in Sem ${currentSem} yet.</p>`;
  } else {
    subjWrap.innerHTML = subjects.map(s => {
      const pct = (() => {
        const topics = getTopics(s.id);
        return topics.length
          ? Math.round(topics.filter(t => t.done).length / topics.length * 100)
          : 0;
      })();
      return `
        <div class="dash-subj-item">
          <div class="dash-dot" style="background:${s.color}"></div>
          <div class="dash-subj-name">${s.name}</div>
          <div class="dash-prog-wrap">
            <div class="prog-bg">
              <div class="prog-fill" style="width:${pct}%;background:${s.color}"></div>
            </div>
          </div>
          <span style="font-size:12px;color:#64748b;margin-left:8px;min-width:30px">
            ${pct}%
          </span>
        </div>`;
    }).join("");
  }

  // upcoming exams
  const examWrap = document.getElementById("dash-exams-list");
  const upcoming = exams
    .map(e => ({ ...e, diff: Math.round((new Date(e.date) - today) / 86400000) }))
    .filter(e => e.diff >= 0)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 5);

  if (!upcoming.length) {
    examWrap.innerHTML = `<p class="empty-msg">No upcoming exams.</p>`;
  } else {
    examWrap.innerHTML = upcoming.map(e => {
      const cls = e.diff <= 3 ? "urgent" : e.diff <= 10 ? "soon" : "ok";
      const clr = { urgent:"#f87171", soon:"#f59e0b", ok:"#3ecf8e" }[cls];
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;
          border-bottom:1px solid rgba(255,255,255,0.04)">
          <div style="width:3px;height:36px;border-radius:99px;
            background:${clr};flex-shrink:0"></div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500;color:#e2e8f0">${e.name}</div>
            <div style="font-size:12px;color:#64748b">
              Sem ${e.sem} · ${typeLabel(e.type)}
            </div>
          </div>
          <span style="font-size:12px;font-weight:600;color:${clr}">
            ${e.diff === 0 ? "Today!" : e.diff + "d"}
          </span>
        </div>`;
    }).join("");
  }
}

// ============================================================
// AUTO-LOGIN on page load
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
  const last  = load("academia_last_user");
  const users = load("academia_users") || {};
  if (last && users[last]) {
    currentUser = last;
    launchApp(users[last]);
  }
});
function updateProfilePhoto(input) {
  if (input.files && input.files[0] && currentUser) {
    const file = input.files[0];
    // Folder: profile_photos/username.jpg
    const storageRef = storage.ref(`profile_photos/${currentUser}`);
    
    // Cloud par upload shuru
    storageRef.put(file).then((snapshot) => {
      snapshot.ref.getDownloadURL().then((url) => {
        // 1. Dashboard avatar update karein
        const avatar = document.getElementById("nav-avatar");
        avatar.innerHTML = `<img src="${url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        avatar.textContent = "";

        // 2. Local memory sync karein
        const users = load("academia_users") || {};
        if (users[currentUser]) {
          users[currentUser].photo = url;
          save("academia_users", users);
        }
        alert("Photo uploaded to Firebase Cloud! ☁️");
      });
    }).catch(error => {
      console.error("Cloud Error:", error);
      alert("Error: Check Firebase Storage Rules!");
    });
  }
}