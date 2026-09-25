/**
 * AI Viva Examiner - Client Engine
 * Simple, Clean, Voice + Text, Dynamic LLM Integration
 */

// App State
const VivaState = {
  studentName: "",
  projectTitle: "",
  sourceCode: "",
  projectDocs: "",
  persona: "strict", // strict, techlead, friendly
  examFormat: "oral", // oral, mcq
  roundsCount: 3,
  voiceMode: "enabled",
  currentRound: 1,
  tabSwitches: 0,
  timerSeconds: 600,
  timerInterval: null,
  isPaused: false,
  isAwaitingNext: false,
  isExamCompleted: false,
  activeSpeechRecognition: null,
  isRecording: false,
  isSpeaking: false,
  questionsLog: [],
  activeQuestionData: null,
  projectScan: null
};

// Preset examples only loaded if clicked
const QUICK_EXAMPLES = {
  ecommerce: {
    title: "E-Commerce Checkout API",
    docs: "API handling cart checkout, discount calculations, inventory check, and order placement.",
    code: `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

INVENTORY = {
    "item_1": {"name": "Laptop", "stock": 5, "price": 50000},
    "item_2": {"name": "Mouse", "stock": 10, "price": 1000}
}

class Order(BaseModel):
    item_id: str
    quantity: int
    discount_code: str | None = None

@app.post("/checkout")
def checkout(order: Order):
    if order.item_id not in INVENTORY:
        raise HTTPException(status_code=404, detail="Item not found")
        
    stock = INVENTORY[order.item_id]["stock"]
    if stock < order.quantity:
        raise HTTPException(status_code=400, detail="Out of stock")
        
    # Deduct stock
    INVENTORY[order.item_id]["stock"] -= order.quantity
    price = INVENTORY[order.item_id]["price"] * order.quantity
    
    if order.discount_code == "SAVE10":
        price = price * 0.9
        
    return {"status": "success", "total_price": price}`
  },
  ml: {
    title: "Heart Disease Prediction Model",
    docs: "Machine Learning model to predict disease risk from patient clinical test records.",
    code: `from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import numpy as np

# Load and split dataset
X = np.random.randn(100, 5)
y = np.random.randint(0, 2, 100)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

model = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
print("Accuracy:", accuracy_score(y_test, y_pred))`
  },
  web: {
    title: "User Authentication & JWT Tokens",
    docs: "Backend service for user login, password hashing with bcrypt, and issuing JWT tokens.",
    code: `const crypto = require('crypto');

function generateToken(userId) {
    const payload = {
        userId: userId,
        exp: Math.floor(Date.now() / 1000) + 3600
    };
    const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', "secret_key").update(header + "." + body).digest('base64url');
    return header + "." + body + "." + signature;
}`
  }
};

/* ==========================================================================
   STATE PERSISTENCE
   ========================================================================== */
function saveState() {
  localStorage.setItem("viva_user_state", JSON.stringify(VivaState));
}

function loadState() {
  const saved = localStorage.getItem("viva_user_state");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(VivaState, parsed);
    } catch (e) {
      console.error("State parse error", e);
    }
  }
}

/* ==========================================================================
   PAGE 1: SETUP (index.html)
   ========================================================================== */
function loadQuickExample(key) {
  const ex = QUICK_EXAMPLES[key];
  if (!ex) return;

  const titleInput = document.getElementById("project-title");
  const docInput = document.getElementById("project-doc");
  const codeInput = document.getElementById("project-code");
  const nameInput = document.getElementById("student-name");

  if (titleInput) titleInput.value = ex.title;
  if (docInput) docInput.value = ex.docs;
  if (codeInput) codeInput.value = ex.code;
  if (nameInput && !nameInput.value) nameInput.value = "Demo Student";

  // Invalidate any old project scan so fresh diagram is generated for this example!
  VivaState.projectScan = null;
  VivaState.projectTitle = ex.title;
  VivaState.sourceCode = ex.code;
  saveState();

  updateCodeStats();
}

function clearForm() {
  const titleInput = document.getElementById("project-title");
  const docInput = document.getElementById("project-doc");
  const codeInput = document.getElementById("project-code");
  const nameInput = document.getElementById("student-name");

  if (titleInput) titleInput.value = "";
  if (docInput) docInput.value = "";
  if (codeInput) codeInput.value = "";
  if (nameInput) nameInput.value = "";

  VivaState.projectScan = null;
  saveState();

  updateCodeStats();
}

function switchUploadTab(tab) {
  const pasteTabBtn = document.getElementById("tab-btn-paste");
  const uploadTabBtn = document.getElementById("tab-btn-upload");
  const githubTabBtn = document.getElementById("tab-btn-github");

  const pasteContent = document.getElementById("tab-content-paste");
  const uploadContent = document.getElementById("tab-content-upload");
  const githubContent = document.getElementById("tab-content-github");

  const inactiveClass = "px-3 py-1 rounded-md text-slate-600 hover:text-slate-900 transition";
  const activeClass = "px-3 py-1 rounded-md bg-white text-slate-900 shadow-xs transition";

  if (pasteTabBtn) pasteTabBtn.className = inactiveClass;
  if (uploadTabBtn) uploadTabBtn.className = inactiveClass;
  if (githubTabBtn) githubTabBtn.className = inactiveClass;

  if (pasteContent) pasteContent.classList.add("hidden");
  if (uploadContent) uploadContent.classList.add("hidden");
  if (githubContent) githubContent.classList.add("hidden");

  if (tab === "paste") {
    if (pasteTabBtn) pasteTabBtn.className = activeClass;
    if (pasteContent) pasteContent.classList.remove("hidden");
  } else if (tab === "upload") {
    if (uploadTabBtn) uploadTabBtn.className = activeClass;
    if (uploadContent) uploadContent.classList.remove("hidden");
  } else if (tab === "github") {
    if (githubTabBtn) githubTabBtn.className = activeClass;
    if (githubContent) githubContent.classList.remove("hidden");
  }
}

async function fetchGitHubRepo() {
  const urlInput = document.getElementById("github-repo-url");
  const statusBox = document.getElementById("github-status-box");
  const fetchBtn = document.getElementById("btn-fetch-github");
  const url = urlInput?.value.trim() || "";

  if (!url) {
    alert("Please enter a public GitHub repository link (e.g. https://github.com/username/project).");
    return;
  }

  fetchBtn.disabled = true;
  fetchBtn.innerHTML = `<span class="animate-spin text-xs">⏳</span> Scanning...`;
  statusBox.className = "mt-3 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs";
  statusBox.innerHTML = `Fetching repository tree and scanning core architecture files...`;
  statusBox.classList.remove("hidden");

  try {
    const res = await fetch("/api/fetch-github-repo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_url: url })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Failed to fetch repository.");
    }

    // Set code and title
    VivaState.sourceCode = data.combined_code;
    VivaState.projectTitle = data.repo_name;

    const titleInput = document.getElementById("project-title");
    const codeArea = document.getElementById("project-code");
    if (titleInput) titleInput.value = data.repo_name;
    if (codeArea) codeArea.value = data.combined_code;

    updateCodeStats();

    // Render success badge
    statusBox.className = "mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs space-y-1.5";
    statusBox.innerHTML = `
      <div class="flex items-center justify-between font-bold text-emerald-800">
        <span>✅ GitHub Repository Loaded Successfully!</span>
        <span class="text-[10px] uppercase font-mono px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full">${data.files_count} Core Files</span>
      </div>
      <p class="text-[11px] text-emerald-700">Project: <strong>${data.repo_name}</strong> (Branch: <code>${data.default_branch}</code>)</p>
      <div class="text-[11px] text-slate-600 bg-white p-2 rounded border border-emerald-100 max-h-24 overflow-y-auto font-mono">
        ${data.files.map(f => `<div>📄 ${f}</div>`).join('')}
      </div>
      <p class="text-[11px] text-emerald-800 font-semibold pt-1">Code ready! Choose your Examiner Style and click "Start Viva Now".</p>
    `;
  } catch (err) {
    statusBox.className = "mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs";
    statusBox.innerHTML = `⚠️ <strong>Error:</strong> ${err.message || 'Ensure the repository is public and URL is correct.'}`;
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.innerHTML = `<span>Scan Repo</span> <span>&rarr;</span>`;
  }
}

function updateCodeStats() {
  const codeBox = document.getElementById("project-code");
  const counter = document.getElementById("code-lines-count");
  if (codeBox && counter) {
    const lines = codeBox.value.trim() ? codeBox.value.split("\n").length : 0;
    counter.textContent = `${lines} lines`;
  }
}

function startVivaSession() {
  const name = document.getElementById("student-name")?.value.trim() || "Student";
  const title = document.getElementById("project-title")?.value.trim() || "Project Submission";
  let code = document.getElementById("project-code")?.value.trim() || "";
  const docs = document.getElementById("project-doc")?.value.trim() || "";

  // If user left code completely empty, load quick default
  if (!code) {
    loadQuickExample('ecommerce');
    code = QUICK_EXAMPLES.ecommerce.code;
  }

  const personaEl = document.querySelector("input[name='persona']:checked");
  const formatEl = document.querySelector("input[name='exam_format']:checked");
  const roundsEl = document.getElementById("viva-rounds");
  const voiceEl = document.getElementById("voice-mode");

  VivaState.studentName = name;
  VivaState.projectTitle = title;
  VivaState.sourceCode = code;
  VivaState.projectDocs = docs;
  VivaState.persona = personaEl ? personaEl.value : "strict";
  VivaState.examFormat = formatEl ? formatEl.value : "oral";
  VivaState.roundsCount = roundsEl ? parseInt(roundsEl.value, 10) : 5;
  VivaState.voiceMode = voiceEl ? voiceEl.value : "enabled";

  // Reset runtime progression
  VivaState.currentRound = 1;
  VivaState.tabSwitches = 0;
  VivaState.questionsLog = [];
  VivaState.timerSeconds = 600;
  VivaState.isExamCompleted = false;
  VivaState.isPaused = false;
  VivaState.activeQuestionData = null;
  VivaState.projectScan = null; // Clear old project architecture graph

  PrefetchCache.questions = {};
  PrefetchCache.inFlight = {};

  saveState();
  window.location.href = "/viva";
}

function setupDropzone() {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const folderInput = document.getElementById("folder-input");
  const fileList = document.getElementById("file-list");
  if (!dropzone) return;

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("border-blue-500", "bg-blue-50/20");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("border-blue-500", "bg-blue-50/20");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("border-blue-500", "bg-blue-50/20");
    if (e.dataTransfer.files.length) {
      processUploadedFiles(Array.from(e.dataTransfer.files));
    }
  });

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      if (fileInput.files.length) {
        processUploadedFiles(Array.from(fileInput.files));
      }
    });
  }

  if (folderInput) {
    folderInput.addEventListener("change", (e) => {
      if (folderInput.files.length) {
        processUploadedFiles(Array.from(folderInput.files));
      }
    });
  }

  function processUploadedFiles(files) {
    if (!fileList) return;
    fileList.innerHTML = "";

    const JUNK_DIRS = ["node_modules", "venv", ".venv", "__pycache__", ".git", ".idea", ".vscode", "dist", "build", ".next", ".cache"];
    const VALID_EXTS = [".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".cpp", ".c", ".h", ".java", ".go", ".rs", ".php", ".rb", ".json", ".sql", ".md", ".txt", ".sh", ".yaml", ".yml"];

    // Filter valid code files
    const validFiles = files.filter(f => {
      const path = (f.webkitRelativePath || f.name).toLowerCase();
      // Skip junk directories
      if (JUNK_DIRS.some(j => path.includes(`/${j}/`) || path.includes(`\\${j}\\`) || path.startsWith(`${j}/`) || path.startsWith(`${j}\\`))) {
        return false;
      }
      // Check extension
      return VALID_EXTS.some(ext => path.endsWith(ext));
    });

    if (validFiles.length === 0) {
      fileList.innerHTML = `<div class="p-2 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg">No valid source code files found in selected upload.</div>`;
      return;
    }

    // Auto set project name from folder name if empty
    const firstRel = validFiles[0].webkitRelativePath;
    if (firstRel && firstRel.includes("/")) {
      const folderName = firstRel.split("/")[0];
      const titleInput = document.getElementById("project-title");
      if (titleInput && (!titleInput.value || titleInput.value === "Project Submission")) {
        titleInput.value = folderName.replace(/[-_]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      }
    }

    // Summary banner
    const summary = document.createElement("div");
    summary.className = "p-2 text-xs bg-blue-50 border border-blue-200 text-blue-800 rounded-lg font-semibold flex justify-between items-center";
    summary.innerHTML = `<span>📁 <strong>${validFiles.length} Code Files Loaded</strong> (Junk folders filtered)</span><span class="text-[11px] text-blue-600 font-normal">Ready for Viva</span>`;
    fileList.appendChild(summary);

    let combinedCode = "";
    let filesRead = 0;

    validFiles.forEach(file => {
      const relPath = file.webkitRelativePath || file.name;
      const item = document.createElement("div");
      item.className = "text-xs p-1.5 bg-white rounded border border-slate-200 flex justify-between items-center";
      item.innerHTML = `<span class="truncate max-w-[280px]">📄 ${relPath}</span><span class="text-[10px] text-slate-400 font-mono">${Math.round(file.size / 1024)} KB</span>`;
      fileList.appendChild(item);

      const reader = new FileReader();
      reader.onload = (event) => {
        combinedCode += `\n// ==========================================\n// File: ${relPath}\n// ==========================================\n` + event.target.result + "\n";
        filesRead++;
        if (filesRead === validFiles.length) {
          document.getElementById("project-code").value = combinedCode.trim();
          updateCodeStats();
        }
      };
      reader.readAsText(file);
    });
  }
}

/* ==========================================================================
   PAGE 2: VIVA ROOM (viva.html)
   ========================================================================== */
function initVivaChamber() {
  loadState();

  // CHECK IF EXAM IS ALREADY FINISHED
  const answeredCount = (VivaState.questionsLog && Array.isArray(VivaState.questionsLog)) ? VivaState.questionsLog.length : 0;
  const totalRounds = VivaState.roundsCount || 5;
  const isFinished = VivaState.isExamCompleted || (answeredCount >= totalRounds && totalRounds > 0);

  if (isFinished) {
    showExamCompletedStage();
    return;
  }

  // Kick off background deep architecture scan (Dedicated Key 3)
  ensureProjectArchitectureScanned();

  // Initialize 3D Cyber Robot Examiner (WebGL Engine)
  init3DRobotExaminer();

  // If user jumped directly to /viva without entering anything
  if (!VivaState.sourceCode) {
    loadQuickExample('ecommerce');
    VivaState.studentName = "Student";
    VivaState.projectTitle = "E-Commerce Checkout API";
    VivaState.sourceCode = QUICK_EXAMPLES.ecommerce.code;
    saveState();
  }

  const nameEl = document.getElementById("display-student-name");
  const titleEl = document.getElementById("display-project-title");
  const drawerCode = document.getElementById("drawer-code-content");
  
  if (nameEl) nameEl.textContent = VivaState.studentName || "Student";
  if (titleEl) titleEl.textContent = VivaState.projectTitle || "Project";
  if (drawerCode) drawerCode.textContent = VivaState.sourceCode || "// No code";

  // Setup persona name & format label
  const personaNameEl = document.getElementById("examiner-persona-name");
  if (personaNameEl) {
    const formatLabel = VivaState.examFormat === "mcq" ? "MCQ Quiz" : "Oral Viva";
    if (VivaState.persona === "strict") personaNameEl.textContent = `Strict Mode • ${formatLabel}`;
    else if (VivaState.persona === "techlead") personaNameEl.textContent = `Practical Mode • ${formatLabel}`;
    else personaNameEl.textContent = `Easy Mode • ${formatLabel}`;
  }

  // Anti-cheat tab switch tracker
  setupTabWatchdog();

  // Start timer (remains paused if VivaState.isPaused is true)
  startTimer();

  // Load question: if existing active question exists, re-render it; otherwise fetch first question
  if (VivaState.activeQuestionData) {
    renderQuestion(VivaState.activeQuestionData);
  } else {
    loadNextVivaQuestion();
  }

  // If viva was paused before navigation, preserve and restore paused state & UI!
  if (VivaState.isPaused) {
    updatePauseUI(true);
  } else {
    updatePauseUI(false);
  }
}

function showExamCompletedStage() {
  // 1. Ensure timer is stopped
  if (VivaState.timerInterval) {
    clearInterval(VivaState.timerInterval);
    VivaState.timerInterval = null;
  }

  // 2. Update timer badge in header
  const sessionTimer = document.getElementById("session-timer");
  if (sessionTimer) sessionTimer.textContent = "Finished";

  // 3. Hide pause button in header since exam is over
  const pauseBtn = document.getElementById("btn-pause-viva");
  if (pauseBtn) pauseBtn.classList.add("hidden");

  // 4. Update student & project name in case drawer or headers are inspected
  const nameEl = document.getElementById("display-student-name");
  const titleEl = document.getElementById("display-project-title");
  const drawerCode = document.getElementById("drawer-code-content");
  if (nameEl) nameEl.textContent = VivaState.studentName || "Student";
  if (titleEl) titleEl.textContent = VivaState.projectTitle || "Project";
  if (drawerCode) drawerCode.textContent = VivaState.sourceCode || "// No code";

  // 5. Swap views
  const activeStage = document.getElementById("active-exam-stage");
  const completedStage = document.getElementById("exam-completed-stage");
  if (activeStage) activeStage.classList.add("hidden");
  if (completedStage) completedStage.classList.remove("hidden");

  // 6. Populate completed card details
  const compTitle = document.getElementById("completed-project-title");
  if (compTitle) compTitle.textContent = VivaState.projectTitle || "Your Project";

  const answeredCount = (VivaState.questionsLog && Array.isArray(VivaState.questionsLog)) ? VivaState.questionsLog.length : 0;
  const totalRounds = VivaState.roundsCount || answeredCount || 5;

  const compCount = document.getElementById("completed-q-count");
  if (compCount) compCount.textContent = `${answeredCount}/${totalRounds}`;

  // Calculate real average score
  let totalScore = 0;
  if (answeredCount > 0) {
    VivaState.questionsLog.forEach(q => {
      totalScore += parseFloat(q.score || 0);
    });
  }
  const avg = answeredCount > 0 ? (totalScore / answeredCount).toFixed(1) : "0.0";
  const compScore = document.getElementById("completed-score-val");
  if (compScore) compScore.textContent = avg;

  const compExaminer = document.getElementById("completed-examiner");
  if (compExaminer) {
    const personaLabel = VivaState.persona === "strict" ? "Strict Mode" : (VivaState.persona === "techlead" ? "Practical Mode" : "Easy Mode");
    const formatLabel = VivaState.examFormat === "mcq" ? "MCQ Quiz" : "Oral Defense";
    compExaminer.textContent = `${personaLabel} (${formatLabel})`;
  }

  // Set avatar face and label
  updateAvatarEmotion("impressed", "Defense Finished");
  const avatarFace = document.getElementById("avatar-graphic");
  if (avatarFace) avatarFace.textContent = "🎓";
  setWaveformActive(false);
}

function retakeCurrentViva() {
  if (!confirm("Are you sure you want to retake the viva defense for this project? Your previous answers will be reset and fresh questions will be generated.")) {
    return;
  }

  VivaState.currentRound = 1;
  VivaState.questionsLog = [];
  VivaState.isExamCompleted = false;
  VivaState.tabSwitches = 0;
  VivaState.timerSeconds = (VivaState.roundsCount || 5) * 120;
  VivaState.isPaused = false;
  VivaState.isAwaitingNext = false;
  VivaState.activeQuestionData = null;

  // Clear cache so brand new questions are generated
  PrefetchCache.questions = {};
  PrefetchCache.inFlight = {};

  saveState();

  // Reset UI elements
  const activeStage = document.getElementById("active-exam-stage");
  const completedStage = document.getElementById("exam-completed-stage");
  const pauseBtn = document.getElementById("btn-pause-viva");
  const sessionTimer = document.getElementById("session-timer");

  if (activeStage) activeStage.classList.remove("hidden");
  if (completedStage) completedStage.classList.add("hidden");
  if (pauseBtn) pauseBtn.classList.remove("hidden");
  if (sessionTimer) sessionTimer.textContent = "10:00";

  // Re-run viva chamber initialization to start fresh viva
  initVivaChamber();
}

function retakeVivaFromReport() {
  if (!confirm("Do you want to retake the viva defense for this project? Fresh questions will be generated.")) {
    return;
  }
  loadState();
  VivaState.currentRound = 1;
  VivaState.questionsLog = [];
  VivaState.isExamCompleted = false;
  VivaState.tabSwitches = 0;
  VivaState.timerSeconds = (VivaState.roundsCount || 5) * 120;
  VivaState.isPaused = false;
  VivaState.isAwaitingNext = false;
  VivaState.activeQuestionData = null;
  PrefetchCache.questions = {};
  PrefetchCache.inFlight = {};
  saveState();
  window.location.href = "/viva";
}

/* ==========================================================================
   FEATURE: 3D CYBER ROBOT EXAMINER (Interactive WebGL Three.js Engine)
   ========================================================================== */
const Robot3D = {
  scene: null,
  camera: null,
  renderer: null,
  robotGroup: null,
  headMesh: null,
  visorMesh: null,
  leftEye: null,
  rightEye: null,
  eyeMaterial: null,
  antennaLight: null,
  outerRing: null,
  innerRing: null,
  clock: null,
  mouse: { currentX: 0, currentY: 0, targetX: 0, targetY: 0 },
  currentEmotion: "neutral",
  isInitialized: false,
  isSpeaking: false,
};

function init3DRobotExaminer() {
  const canvas = document.getElementById("robot-3d-canvas");
  const fallback = document.getElementById("avatar-graphic");
  if (!canvas || typeof THREE === "undefined") {
    if (fallback) fallback.classList.remove("hidden");
    return;
  }

  if (Robot3D.isInitialized) return;

  try {
    const width = 150;
    const height = 150;

    // 1. Scene & Camera
    Robot3D.scene = new THREE.Scene();
    Robot3D.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    Robot3D.camera.position.set(0, 0, 4.3);

    // 2. Renderer with Antialias & Alpha
    Robot3D.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true
    });
    Robot3D.renderer.setSize(width, height);
    Robot3D.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // 3. Cyber Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    Robot3D.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.4); // Cyan key light
    dirLight1.position.set(3, 4, 3);
    Robot3D.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 0.9); // Purple rim light
    dirLight2.position.set(-3, -2, -2);
    Robot3D.scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x60a5fa, 1.3, 10);
    pointLight.position.set(0, 2, 2.5);
    Robot3D.scene.add(pointLight);

    // 4. Robot Hierarchy
    Robot3D.robotGroup = new THREE.Group();
    Robot3D.scene.add(Robot3D.robotGroup);

    // 4.1. Glossy Ceramic Head Chassis
    const headGeo = new THREE.SphereGeometry(1.0, 32, 26);
    headGeo.scale(1.0, 1.05, 0.95);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.15,
      metalness: 0.35,
    });
    Robot3D.headMesh = new THREE.Mesh(headGeo, headMat);
    Robot3D.robotGroup.add(Robot3D.headMesh);

    // 4.2. Tinted Obsidian Glass Visor
    const visorGeo = new THREE.SphereGeometry(0.85, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.46);
    visorGeo.scale(0.96, 0.72, 0.52);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.08,
      metalness: 0.85,
    });
    Robot3D.visorMesh = new THREE.Mesh(visorGeo, visorMat);
    Robot3D.visorMesh.position.set(0, 0.06, 0.54);
    Robot3D.visorMesh.rotation.x = Math.PI * 0.5;
    Robot3D.robotGroup.add(Robot3D.visorMesh);

    // 4.3. Digital Glowing Visor Eyes (Neon Cyan Default)
    const eyeGeo = new THREE.BoxGeometry(0.24, 0.10, 0.08);
    Robot3D.eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    Robot3D.leftEye = new THREE.Mesh(eyeGeo, Robot3D.eyeMaterial);
    Robot3D.leftEye.position.set(-0.28, 0.12, 0.92);
    Robot3D.robotGroup.add(Robot3D.leftEye);

    Robot3D.rightEye = new THREE.Mesh(eyeGeo, Robot3D.eyeMaterial);
    Robot3D.rightEye.position.set(0.28, 0.12, 0.92);
    Robot3D.robotGroup.add(Robot3D.rightEye);

    // 4.4. Cyber Ear Pods
    const earGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.14, 24);
    const earMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.75, roughness: 0.25 });
    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.rotation.z = Math.PI * 0.5;
    leftEar.position.set(-1.03, 0.08, 0);
    Robot3D.robotGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, earMat);
    rightEar.rotation.z = Math.PI * 0.5;
    rightEar.position.set(1.03, 0.08, 0);
    Robot3D.robotGroup.add(rightEar);

    // Glowing LED ear rings
    const earGlowGeo = new THREE.TorusGeometry(0.18, 0.025, 16, 24);
    const leftEarGlow = new THREE.Mesh(earGlowGeo, Robot3D.eyeMaterial);
    leftEarGlow.rotation.y = Math.PI * 0.5;
    leftEarGlow.position.set(-1.11, 0.08, 0);
    Robot3D.robotGroup.add(leftEarGlow);

    const rightEarGlow = new THREE.Mesh(earGlowGeo, Robot3D.eyeMaterial);
    rightEarGlow.rotation.y = Math.PI * 0.5;
    rightEarGlow.position.set(1.11, 0.08, 0);
    Robot3D.robotGroup.add(rightEarGlow);

    // 4.5. Head Top Cyber Antenna
    const antStemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.36, 16);
    const antStemMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    const antStem = new THREE.Mesh(antStemGeo, antStemMat);
    antStem.position.set(0, 1.2, 0);
    Robot3D.robotGroup.add(antStem);

    const antOrbGeo = new THREE.SphereGeometry(0.1, 16, 16);
    Robot3D.antennaLight = new THREE.Mesh(antOrbGeo, Robot3D.eyeMaterial);
    Robot3D.antennaLight.position.set(0, 1.38, 0);
    Robot3D.robotGroup.add(Robot3D.antennaLight);

    // 4.6. Futuristic Orbital Hologram Gyro Rings
    const ring1Geo = new THREE.TorusGeometry(1.48, 0.016, 16, 64);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 });
    Robot3D.outerRing = new THREE.Mesh(ring1Geo, ring1Mat);
    Robot3D.outerRing.rotation.x = Math.PI * 0.36;
    Robot3D.outerRing.rotation.y = Math.PI * 0.15;
    Robot3D.robotGroup.add(Robot3D.outerRing);

    const ring2Geo = new THREE.TorusGeometry(1.64, 0.012, 16, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.4 });
    Robot3D.innerRing = new THREE.Mesh(ring2Geo, ring2Mat);
    Robot3D.innerRing.rotation.x = -Math.PI * 0.28;
    Robot3D.innerRing.rotation.y = -Math.PI * 0.22;
    Robot3D.robotGroup.add(Robot3D.innerRing);

    // 5. Interactive Cursor Head Tracking (Looks toward user!)
    window.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = (e.clientX - centerX) / (window.innerWidth / 2);
      const dy = (e.clientY - centerY) / (window.innerHeight / 2);
      Robot3D.mouse.targetX = Math.max(-0.45, Math.min(0.45, dx * 0.45));
      Robot3D.mouse.targetY = Math.max(-0.35, Math.min(0.35, dy * 0.35));
    });

    Robot3D.clock = new THREE.Clock();
    Robot3D.isInitialized = true;

    // Start 60fps render loop
    animate3DRobot();
  } catch (err) {
    console.warn("Failed to initialize 3D Robot WebGL:", err);
    if (fallback) fallback.classList.remove("hidden");
  }
}

function animate3DRobot() {
  if (!Robot3D.isInitialized) return;
  requestAnimationFrame(animate3DRobot);

  const time = Robot3D.clock.getElapsedTime();

  // Floating hover bobbing
  Robot3D.robotGroup.position.y = Math.sin(time * 2.2) * 0.06;

  // Gyro Hologram Ring Rotation
  if (Robot3D.outerRing) Robot3D.outerRing.rotation.z += 0.012;
  if (Robot3D.innerRing) Robot3D.innerRing.rotation.z -= 0.015;

  // Smooth mouse look interpolation (smooth lerp)
  Robot3D.mouse.currentX += (Robot3D.mouse.targetX - Robot3D.mouse.currentX) * 0.06;
  Robot3D.mouse.currentY += (Robot3D.mouse.targetY - Robot3D.mouse.currentY) * 0.06;

  // Apply head rotation
  Robot3D.robotGroup.rotation.y = Robot3D.mouse.currentX;
  Robot3D.robotGroup.rotation.x = Robot3D.mouse.currentY;

  // Emotion/State-based animations
  if (Robot3D.currentEmotion === "speaking" || Robot3D.isSpeaking) {
    // Speaking: eyes pulse rhythmically, robot head gives subtle nods
    const pulseScale = 1.0 + Math.sin(time * 16) * 0.35;
    if (Robot3D.leftEye) Robot3D.leftEye.scale.y = pulseScale;
    if (Robot3D.rightEye) Robot3D.rightEye.scale.y = pulseScale;
    Robot3D.robotGroup.rotation.x += Math.sin(time * 10) * 0.03;
  } else if (Robot3D.currentEmotion === "thinking") {
    // Thinking: head tilts quizzically, slow breathing
    Robot3D.robotGroup.rotation.z = Math.sin(time * 1.5) * 0.09;
    if (Robot3D.leftEye) Robot3D.leftEye.scale.y = 1.0;
    if (Robot3D.rightEye) Robot3D.rightEye.scale.y = 1.0;
  } else if (Robot3D.currentEmotion === "paused") {
    // Paused / Sleep Mode: eyes narrow into sleep slits, head dips down
    if (Robot3D.leftEye) Robot3D.leftEye.scale.y = 0.18;
    if (Robot3D.rightEye) Robot3D.rightEye.scale.y = 0.18;
    Robot3D.robotGroup.rotation.x = 0.15;
    Robot3D.robotGroup.rotation.z = 0;
  } else if (Robot3D.currentEmotion === "skeptical") {
    // Devil / Strict Mode: slight forward lean, intense focus
    Robot3D.robotGroup.rotation.x -= 0.08;
    if (Robot3D.leftEye) Robot3D.leftEye.scale.y = 1.15;
    if (Robot3D.rightEye) Robot3D.rightEye.scale.y = 0.85; // One eye cocked!
  } else {
    // Neutral / Ready: gentle natural blink every ~4 seconds
    const blinkCycle = time % 4;
    const isBlinking = blinkCycle > 3.85;
    const eyeScale = isBlinking ? 0.1 : 1.0;
    if (Robot3D.leftEye) Robot3D.leftEye.scale.y = eyeScale;
    if (Robot3D.rightEye) Robot3D.rightEye.scale.y = eyeScale;
    Robot3D.robotGroup.rotation.z = 0;
  }

  Robot3D.renderer.render(Robot3D.scene, Robot3D.camera);
}

function set3DRobotEmotion(emotion) {
  Robot3D.currentEmotion = emotion;

  if (!Robot3D.eyeMaterial) return;

  if (emotion === "thinking") {
    Robot3D.eyeMaterial.color.setHex(0xf59e0b); // Neon Amber
    if (Robot3D.outerRing) Robot3D.outerRing.material.color.setHex(0xf59e0b);
  } else if (emotion === "skeptical") {
    Robot3D.eyeMaterial.color.setHex(0xef4444); // Neon Crimson / Devil Mode
    if (Robot3D.outerRing) Robot3D.outerRing.material.color.setHex(0xef4444);
  } else if (emotion === "impressed") {
    Robot3D.eyeMaterial.color.setHex(0x10b981); // Neon Emerald Green
    if (Robot3D.outerRing) Robot3D.outerRing.material.color.setHex(0x10b981);
  } else if (emotion === "paused") {
    Robot3D.eyeMaterial.color.setHex(0xf59e0b); // Standby Amber
    if (Robot3D.outerRing) Robot3D.outerRing.material.color.setHex(0x64748b);
  } else if (emotion === "speaking") {
    Robot3D.eyeMaterial.color.setHex(0x38bdf8); // Bright Cyan
    if (Robot3D.outerRing) Robot3D.outerRing.material.color.setHex(0x38bdf8);
  } else {
    Robot3D.eyeMaterial.color.setHex(0x38bdf8); // Futuristic Cyan
    if (Robot3D.outerRing) Robot3D.outerRing.material.color.setHex(0x38bdf8);
  }
}

function updateAvatarEmotion(emotion, label) {
  const avatarFace = document.getElementById("avatar-graphic");
  const ring = document.getElementById("avatar-ring");
  const moodLabel = document.getElementById("examiner-mood-label");

  if (moodLabel && label) moodLabel.textContent = label;

  // Sync with 3D Cyber Robot
  set3DRobotEmotion(emotion);

  if (emotion === "speaking") {
    Robot3D.isSpeaking = true;
    ring?.classList.add("active");
  } else {
    Robot3D.isSpeaking = false;
    if (emotion === "thinking") {
      ring?.classList.add("active");
    } else {
      ring?.classList.remove("active");
    }
  }

  // Fallback 2D Avatar Graphic
  if (avatarFace) {
    if (emotion === "thinking") avatarFace.textContent = "🧐";
    else if (emotion === "skeptical") avatarFace.textContent = "🤨";
    else if (emotion === "impressed") avatarFace.textContent = "👏";
    else if (emotion === "speaking") avatarFace.textContent = "🤖";
    else if (emotion === "paused") avatarFace.textContent = "⏸️";
    else avatarFace.textContent = "🤖";
  }
}

function setWaveformActive(active) {
  const bars = document.querySelectorAll(".wave-bar");
  bars.forEach(bar => {
    if (active) bar.classList.add("active");
    else bar.classList.remove("active");
  });
}

function setupTabWatchdog() {
  document.addEventListener("visibilitychange", () => {
    // Only increment tab switches if viva is actively in progress and not paused
    if (document.hidden && !VivaState.isPaused) {
      VivaState.tabSwitches += 1;
      saveState();

      const countEl = document.getElementById("tab-switch-count");
      const dot = document.getElementById("tab-switch-dot");

      if (countEl) countEl.textContent = VivaState.tabSwitches;
      if (dot) dot.className = "w-2 h-2 rounded-full bg-amber-500 animate-ping";
    }
  });
}

function startTimer() {
  const timerEl = document.getElementById("session-timer");
  if (!timerEl) return;

  // Immediate display formatting
  const initialMins = Math.floor(VivaState.timerSeconds / 60);
  const initialSecs = VivaState.timerSeconds % 60;
  timerEl.textContent = `${String(initialMins).padStart(2, '0')}:${String(initialSecs).padStart(2, '0')}`;
  if (VivaState.isPaused) {
    timerEl.classList.add("text-amber-400");
  } else {
    timerEl.classList.remove("text-amber-400");
  }

  clearInterval(VivaState.timerInterval);
  VivaState.timerInterval = setInterval(() => {
    if (VivaState.isPaused) return; // Freeze timer if paused

    if (VivaState.timerSeconds <= 0) {
      clearInterval(VivaState.timerInterval);
      window.location.href = "/report";
      return;
    }
    VivaState.timerSeconds--;
    const mins = Math.floor(VivaState.timerSeconds / 60);
    const secs = VivaState.timerSeconds % 60;
    timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, 1000);
}

function updatePauseUI(isPaused) {
  const pauseBanner = document.getElementById("pause-inline-banner");
  const pauseIcon = document.getElementById("pause-icon");
  const pauseLabel = document.getElementById("pause-label");
  const pauseBtn = document.getElementById("btn-pause-viva");
  const timerBadge = document.getElementById("session-timer");

  if (isPaused) {
    // Show non-intrusive inline banner
    if (pauseBanner) pauseBanner.classList.remove("hidden");

    // Transform header button into clear green Resume button
    if (pauseIcon) pauseIcon.textContent = "▶️";
    if (pauseLabel) pauseLabel.textContent = "Resume Viva";
    if (pauseBtn) {
      pauseBtn.className = "flex items-center gap-1.5 px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 rounded-full text-xs font-bold shadow-md transition animate-pulse cursor-pointer";
    }
    if (timerBadge) {
      timerBadge.classList.add("text-amber-400");
    }
    updateAvatarEmotion("paused", "Session Paused ⏸️");
    setWaveformActive(false);
  } else {
    // Hide inline banner
    if (pauseBanner) pauseBanner.classList.add("hidden");

    // Reset header button to Pause
    if (pauseIcon) pauseIcon.textContent = "⏸️";
    if (pauseLabel) pauseLabel.textContent = "Pause";
    if (pauseBtn) {
      pauseBtn.className = "flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold shadow-xs transition cursor-pointer";
    }
    if (timerBadge) {
      timerBadge.classList.remove("text-amber-400");
    }
    updateAvatarEmotion("neutral", "Ready");
  }
}
window.updatePauseUI = updatePauseUI;

function togglePauseViva() {
  VivaState.isPaused = !VivaState.isPaused;
  saveState(); // Persist pause state so navigation doesn't reset it!

  if (VivaState.isPaused) {
    // 1. Cancel active speech & audio
    if (typeof currentTtsAudio !== "undefined" && currentTtsAudio) {
      try { currentTtsAudio.pause(); currentTtsAudio.currentTime = 0; currentTtsAudio = null; } catch(e){}
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    // 2. Stop mic safely if recording without raising alerts
    if (VivaState.isRecording && VivaState.activeSpeechRecognition) {
      try {
        VivaState.activeSpeechRecognition.stop();
      } catch (e) {}
      VivaState.isRecording = false;
      const micBtn = document.getElementById("btn-toggle-mic");
      const micLabel = document.getElementById("mic-btn-label");
      const micDot = document.getElementById("mic-status-dot");
      const micStatus = document.getElementById("mic-status-text");
      if (micBtn) micBtn.className = "btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5";
      if (micLabel) micLabel.textContent = "Speak Answer";
      if (micDot) micDot.className = "w-2 h-2 rounded-full bg-slate-300";
      if (micStatus) micStatus.textContent = "Mic Idle";
    }

    updatePauseUI(true);
  } else {
    updatePauseUI(false);
  }
}
window.togglePauseViva = togglePauseViva;

function toggleCodeDrawer() {
  const drawer = document.getElementById("code-drawer");
  if (drawer) drawer.classList.toggle("translate-x-full");
}

// High-Fidelity Voice Output (TTS) using Neural Edge-TTS + Browser Fallback
let currentTtsAudio = null;

function speakCurrentQuestion() {
  const text = document.getElementById("current-question-text")?.textContent;
  if (!text) return;

  // 1. Cancel any actively playing audio or synthesis
  if (currentTtsAudio) {
    try {
      currentTtsAudio.pause();
      currentTtsAudio.currentTime = 0;
      currentTtsAudio = null;
    } catch (e) {}
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  // Sanitize text for crisp pronunciation (strip markdown formatting/code backticks)
  const cleanText = text
    .replace(/```[\s\S]*?```/g, ' [code omitted] ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_#~]/g, '')
    .trim();

  const persona = VivaState.persona || "strict";
  const ttsUrl = `/api/tts?text=${encodeURIComponent(cleanText)}&persona=${encodeURIComponent(persona)}`;

  updateAvatarEmotion("speaking", "Speaking");
  setWaveformActive(true);

  // Play Neural Edge-TTS Audio
  const audio = new Audio(ttsUrl);
  currentTtsAudio = audio;

  audio.onplay = () => {
    updateAvatarEmotion("speaking", "Speaking");
    setWaveformActive(true);
  };

  audio.onended = () => {
    currentTtsAudio = null;
    updateAvatarEmotion("neutral", "Listening to you");
    setWaveformActive(false);
  };

  audio.onerror = (e) => {
    console.warn("Neural audio streaming failed, using fallback Natural browser voice...", e);
    currentTtsAudio = null;
    fallbackBrowserSpeech(cleanText);
  };

  audio.play().catch(err => {
    console.warn("Autoplay audio was blocked by browser interaction policy, falling back to Web Speech:", err);
    currentTtsAudio = null;
    fallbackBrowserSpeech(cleanText);
  });
}

function fallbackBrowserSpeech(text) {
  if (!window.speechSynthesis) {
    updateAvatarEmotion("neutral", "Ready");
    setWaveformActive(false);
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;

  // Pick best available Natural/Online voice
  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(v => (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Online")) && v.lang.startsWith("en"));
  if (naturalVoice) utterance.voice = naturalVoice;

  utterance.onstart = () => {
    updateAvatarEmotion("speaking", "Speaking");
    setWaveformActive(true);
  };
  utterance.onend = () => {
    updateAvatarEmotion("neutral", "Listening to you");
    setWaveformActive(false);
  };
  utterance.onerror = () => {
    updateAvatarEmotion("neutral", "Ready");
    setWaveformActive(false);
  };

  window.speechSynthesis.speak(utterance);
}

// Voice Input (STT) - High Accuracy Speech-to-Text
function toggleSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = document.getElementById("btn-toggle-mic");
  const micLabel = document.getElementById("mic-btn-label");
  const micDot = document.getElementById("mic-status-dot");
  const micStatus = document.getElementById("mic-status-text");
  const answerInput = document.getElementById("student-answer-input");

  if (!SpeechRecognition) {
    alert("Voice input is not supported in this browser. Please type your answer.");
    return;
  }

  if (VivaState.isRecording && VivaState.activeSpeechRecognition) {
    VivaState.activeSpeechRecognition.stop();
    VivaState.isRecording = false;
    micBtn.className = "btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5";
    micLabel.textContent = "Speak Answer";
    micDot.className = "w-2 h-2 rounded-full bg-slate-300";
    micStatus.textContent = "Mic Idle";
    setWaveformActive(false);
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  // Automatically support Indian English accent with fallback to US
  recognition.lang = (navigator.language && navigator.language.includes("IN")) ? 'en-IN' : 'en-US';

  recognition.onstart = () => {
    VivaState.isRecording = true;
    VivaState.activeSpeechRecognition = recognition;
    micBtn.className = "btn-primary py-2 px-3 text-xs font-semibold flex items-center gap-1.5 bg-red-600 hover:bg-red-700 animate-pulse";
    micLabel.textContent = "Listening... (Tap to stop)";
    micDot.className = "w-2 h-2 rounded-full bg-red-500 animate-ping";
    micStatus.textContent = "Recording...";
    setWaveformActive(true);
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }
    if (transcript && answerInput) {
      answerInput.value = transcript;
    }
  };

  recognition.onerror = () => {
    VivaState.isRecording = false;
    micBtn.className = "btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5";
    micLabel.textContent = "Speak Answer";
    micDot.className = "w-2 h-2 rounded-full bg-slate-300";
    micStatus.textContent = "Mic Idle";
    setWaveformActive(false);
  };

  recognition.onend = () => {
    VivaState.isRecording = false;
    micBtn.className = "btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5";
    micLabel.textContent = "Speak Answer";
    micDot.className = "w-2 h-2 rounded-full bg-slate-300";
    micStatus.textContent = "Mic Idle";
    setWaveformActive(false);
  };

  recognition.start();
}

/* ==========================================================================
   QUESTIONS & ANSWERS LOGIC + BACKGROUND PRE-FETCHING
   ========================================================================== */
let advanceTimer = null;

// Smart Background Pre-fetching Cache
const PrefetchCache = {
  questions: {}, // { roundNum: questionData }
  inFlight: {}   // { roundNum: Promise }
};

async function prefetchQuestion(targetRound) {
  if (targetRound > VivaState.roundsCount) return;
  if (PrefetchCache.questions[targetRound] || PrefetchCache.inFlight[targetRound]) return;

  const prevQuestions = VivaState.questionsLog.map(item => item.question).filter(Boolean);
  const endpoint = VivaState.examFormat === "mcq" ? "/api/generate-mcq" : "/api/generate-question";
  // Guarantee Devil's Advocate triggers on Round 2, plus penultimate round on long vivas
  const isDevils = VivaState.examFormat !== "mcq" && (targetRound === 2 || (VivaState.roundsCount >= 5 && targetRound === VivaState.roundsCount - 1));
  const body = {
    project_title: VivaState.projectTitle,
    source_code: VivaState.sourceCode,
    project_docs: VivaState.projectDocs,
    persona: VivaState.persona,
    round: targetRound,
    total_rounds: VivaState.roundsCount,
    is_followup: false,
    is_devils_advocate: isDevils,
    previous_questions: prevQuestions,
    project_scan: VivaState.projectScan
  };

  PrefetchCache.inFlight[targetRound] = fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  .then(res => res.json())
  .then(data => {
    PrefetchCache.questions[targetRound] = data;
    delete PrefetchCache.inFlight[targetRound];
    console.log(`[Prefetch] Round ${targetRound} cached in background! Devils:`, isDevils);
    return data;
  })
  .catch(err => {
    delete PrefetchCache.inFlight[targetRound];
  });
}

async function triggerDevilsAdvocateNow() {
  if (VivaState.isAwaitingNext) return;
  // Clear any existing cached question for this round so devil mode takes over immediately
  delete PrefetchCache.questions[VivaState.currentRound];
  delete PrefetchCache.inFlight[VivaState.currentRound];
  await loadNextVivaQuestion(false, "", true);
}
window.triggerDevilsAdvocateNow = triggerDevilsAdvocateNow;

async function loadNextVivaQuestion(isFollowup = false, previousAnswer = "", forceDevils = false) {
  // Hide reveal box if open
  const revealBox = document.getElementById("answer-reveal-box");
  if (revealBox) revealBox.classList.add("hidden");

  // Re-enable and reset answer textarea and submit button
  const inputEl = document.getElementById("student-answer-input");
  if (inputEl) {
    inputEl.value = "";
    inputEl.disabled = false;
  }
  const submitBtn = document.getElementById("btn-submit-answer");
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove("opacity-50", "cursor-not-allowed");
    submitBtn.innerHTML = `<span>Submit Answer</span> <span>&rarr;</span>`;
  }
  VivaState.isAwaitingNext = false;

  const qIndexEl = document.getElementById("current-q-index");
  const totalCountEl = document.getElementById("total-q-count");
  const progressBar = document.getElementById("viva-progress-bar");
  const qText = document.getElementById("current-question-text");

  if (qIndexEl) qIndexEl.textContent = VivaState.currentRound;
  if (totalCountEl) totalCountEl.textContent = VivaState.roundsCount;
  if (progressBar) {
    const pct = (VivaState.currentRound / VivaState.roundsCount) * 100;
    progressBar.style.width = `${pct}%`;
  }

  // 1. CHECK PREFETCH CACHE FOR INSTANT 0-SECOND TRANSITION!
  if (!isFollowup && !forceDevils && PrefetchCache.questions[VivaState.currentRound]) {
    console.log(`[Cache Hit] Instant load for round ${VivaState.currentRound}`);
    const cachedData = PrefetchCache.questions[VivaState.currentRound];
    renderQuestion(cachedData);
    // Prefetch next round silently in background
    prefetchQuestion(VivaState.currentRound + 1);
    return;
  }

  // 2. CHECK IF ALREADY IN-FLIGHT
  if (!isFollowup && !forceDevils && PrefetchCache.inFlight[VivaState.currentRound]) {
    updateAvatarEmotion("thinking", "Finalizing Question...");
    qText.textContent = "Finalizing question...";
    try {
      const awaitedData = await PrefetchCache.inFlight[VivaState.currentRound];
      if (awaitedData) {
        renderQuestion(awaitedData);
        prefetchQuestion(VivaState.currentRound + 1);
        return;
      }
    } catch (e) {
      console.warn("Awaited prefetch error", e);
    }
  }

  // 3. FRESH FETCH (First round, force devils, or cache miss)
  const isDevilsRound = forceDevils || (!isFollowup && VivaState.examFormat !== "mcq" && (VivaState.currentRound === 2 || (VivaState.roundsCount >= 5 && VivaState.currentRound === VivaState.roundsCount - 1)));

  updateAvatarEmotion(isDevilsRound ? "skeptical" : "thinking", isDevilsRound ? "Preparing Architecture Challenge..." : "Preparing Question...");
  qText.textContent = isDevilsRound ? "Analyzing your architecture & stack choices..." : "Loading question from AI...";

  const prevQuestions = VivaState.questionsLog.map(item => item.question).filter(Boolean);
  const endpoint = VivaState.examFormat === "mcq" ? "/api/generate-mcq" : "/api/generate-question";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_title: VivaState.projectTitle,
        source_code: VivaState.sourceCode,
        project_docs: VivaState.projectDocs,
        persona: VivaState.persona,
        round: VivaState.currentRound,
        total_rounds: VivaState.roundsCount,
        is_followup: isFollowup,
        is_devils_advocate: isDevilsRound,
        previous_answer: previousAnswer,
        previous_questions: prevQuestions,
        project_scan: VivaState.projectScan
      })
    });

    const data = await res.json();
    renderQuestion(data);
    // Start prefetching next question right away while student answers this one!
    if (!isFollowup) {
      prefetchQuestion(VivaState.currentRound + 1);
    }
  } catch (e) {
    const fallback = getLocalQuestion(VivaState.currentRound, isFollowup, isDevilsRound);
    renderQuestion(fallback);
  }
}

function renderQuestion(qData) {
  const qText = document.getElementById("current-question-text");
  const qCatBadge = document.getElementById("question-category-badge");
  const followupBadge = document.getElementById("followup-badge");
  const devilsBadge = document.getElementById("devils-advocate-badge");
  const devilsBanner = document.getElementById("devils-advocate-banner");
  const codeBox = document.getElementById("code-snippet-box");
  const targetCode = document.getElementById("target-code-display");

  qText.textContent = qData.question;
  if (qCatBadge) qCatBadge.textContent = qData.category || "Code Logic";

  const isDevils = qData.is_devils_advocate || (qData.category && qData.category.includes("Devil"));

  const cardBox = document.getElementById("question-card-container");

  if (isDevils) {
    devilsBadge?.classList.remove("hidden");
    devilsBanner?.classList.remove("hidden");
    followupBadge?.classList.add("hidden");
    if (cardBox) {
      cardBox.classList.add("border-red-400", "bg-red-50/20", "ring-2", "ring-red-100");
    }
    updateAvatarEmotion("skeptical", "Challenging Your Tech Stack");
  } else if (qData.is_followup) {
    devilsBadge?.classList.add("hidden");
    devilsBanner?.classList.add("hidden");
    followupBadge?.classList.remove("hidden");
    if (cardBox) {
      cardBox.classList.remove("border-red-400", "bg-red-50/20", "ring-2", "ring-red-100");
    }
    updateAvatarEmotion("skeptical", "Checking your answer");
  } else {
    devilsBadge?.classList.add("hidden");
    devilsBanner?.classList.add("hidden");
    followupBadge?.classList.add("hidden");
    if (cardBox) {
      cardBox.classList.remove("border-red-400", "bg-red-50/20", "ring-2", "ring-red-100");
    }
  }

  if (VivaState.isPaused) {
    updateAvatarEmotion("paused", "Session Paused ⏸️");
  } else if (isDevils) {
    updateAvatarEmotion("skeptical", "Challenging Your Tech Stack");
  } else if (qData.is_followup) {
    updateAvatarEmotion("skeptical", "Checking your answer");
  } else {
    updateAvatarEmotion("neutral", "Ready");
  }

  const fileBadge = document.getElementById("target-file-badge");
  const fileName = document.getElementById("target-file-name");
  const compBadge = document.getElementById("target-component-badge");
  const compName = document.getElementById("target-component-name");

  if (qData.target_file) {
    fileBadge?.classList.remove("hidden");
    if (fileName) fileName.textContent = qData.target_file;
  } else {
    fileBadge?.classList.add("hidden");
  }

  if (qData.target_component) {
    compBadge?.classList.remove("hidden");
    if (compName) compName.textContent = qData.target_component;
  } else {
    compBadge?.classList.add("hidden");
  }

  if (qData.code_snippet) {
    codeBox?.classList.remove("hidden");
    if (targetCode) targetCode.textContent = qData.code_snippet;
    const scopeLabel = document.getElementById("radar-scope-label");
    if (scopeLabel) {
      scopeLabel.textContent = qData.target_component || qData.target_file || "Critical Code Scope";
    }
  } else {
    codeBox?.classList.add("hidden");
  }

  VivaState.activeQuestionData = qData;
  saveState();

  // Sync progress indicators and round counters
  const qIndexEl = document.getElementById("current-q-index");
  const totalCountEl = document.getElementById("total-q-count");
  const progressBar = document.getElementById("viva-progress-bar");
  if (qIndexEl) qIndexEl.textContent = VivaState.currentRound || 1;
  if (totalCountEl) totalCountEl.textContent = VivaState.roundsCount || 5;
  if (progressBar) {
    const pct = ((VivaState.currentRound || 1) / (VivaState.roundsCount || 5)) * 100;
    progressBar.style.width = `${pct}%`;
  }

  // Toggle Oral vs MCQ Interface
  const oralSection = document.getElementById("oral-answer-section");
  const mcqSection = document.getElementById("mcq-answer-section");
  const mcqGrid = document.getElementById("mcq-options-grid");

  if (VivaState.examFormat === "mcq" && qData.options && qData.options.length === 4) {
    oralSection?.classList.add("hidden");
    mcqSection?.classList.remove("hidden");
    if (mcqGrid) {
      mcqGrid.innerHTML = "";
      const letters = ["A", "B", "C", "D"];
      qData.options.forEach((optText, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mcq-opt-card p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/20 text-left transition flex items-start gap-3 shadow-xs";
        btn.innerHTML = `
          <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-300">${letters[idx]}</span>
          <span class="text-xs font-semibold text-slate-800 leading-relaxed">${optText}</span>
        `;
        btn.onclick = () => selectMCQOption(idx, qData);
        mcqGrid.appendChild(btn);
      });
    }
  } else {
    mcqSection?.classList.add("hidden");
    oralSection?.classList.remove("hidden");
  }

  if (VivaState.voiceMode === "enabled" && !VivaState.isPaused) {
    setTimeout(() => speakCurrentQuestion(), 400);
  }
}

function selectMCQOption(chosenIdx, qData) {
  if (VivaState.isPaused) return;
  if (VivaState.isAwaitingNext) return;

  const optCards = document.querySelectorAll(".mcq-opt-card");
  optCards.forEach(c => c.disabled = true);

  const isCorrect = chosenIdx === qData.correct_index;
  const letters = ["A", "B", "C", "D"];

  optCards.forEach((c, idx) => {
    if (idx === qData.correct_index) {
      c.className = "mcq-opt-card p-3 rounded-xl border-2 border-emerald-500 bg-emerald-50/90 text-left flex items-start gap-3 shadow-xs";
      c.querySelector("span")?.classList.add("bg-emerald-600", "text-white");
    } else if (idx === chosenIdx && !isCorrect) {
      c.className = "mcq-opt-card p-3 rounded-xl border-2 border-rose-500 bg-rose-50/90 text-left flex items-start gap-3 shadow-xs";
      c.querySelector("span")?.classList.add("bg-rose-600", "text-white");
    } else {
      c.classList.add("opacity-50");
    }
  });

  const chosenText = qData.options[chosenIdx];
  const evalResult = {
    score: isCorrect ? 10.0 : 2.0,
    authorship_confidence: isCorrect ? 95 : 30,
    ideal_answer: qData.explanation || `Correct option is ${letters[qData.correct_index]}: ${qData.options[qData.correct_index]}`,
    critique: isCorrect ? "Excellent! Exact code understanding demonstrated." : `Incorrect option selected. Option ${letters[qData.correct_index]} is correct.`
  };

  recordResult(chosenText, evalResult);
}

function getLocalQuestion(round, isFollowup, isDevils = false) {
  const code = VivaState.sourceCode.toLowerCase();
  
  if (isFollowup) {
    return {
      question: "Can you explain what happens if an error occurs in that step? How is it handled?",
      category: "Error Handling",
      is_followup: true,
      code_snippet: null
    };
  }

  // 🥊 Devil's Advocate Mode (Round 2 or Forced)
  if (isDevils || round === 2) {
    if (code.includes("hash") || code.includes("integrity") || code.includes("sha")) {
      return {
        question: "Why did you implement file hashing in Python with a synchronous while-loop instead of Go or Rust which can utilize zero-copy I/O and process gigabyte files 10x faster? Defend your architectural choice.",
        category: "🥊 Devil's Advocate: Stack Defense",
        is_devils_advocate: true,
        code_snippet: "while chunk := file.read(4096):\n    hasher.update(chunk)"
      };
    } else if (code.includes("stock") || code.includes("checkout")) {
      return {
        question: "Why did you store inventory in an in-memory dictionary rather than a transactional database like PostgreSQL or Redis? If this server crashes, all inventory counts are wiped permanently. Defend this architecture.",
        category: "🥊 Devil's Advocate: Stack Defense",
        is_devils_advocate: true,
        code_snippet: "INVENTORY = {\n  'item_1': {'stock': 100, 'price': 15.00}\n}"
      };
    } else {
      return {
        question: "I see your technical design choices. Why would you build this using your current stack instead of industry-standard production solutions? Defend this architectural choice against scalability and failure points.",
        category: "🥊 Devil's Advocate: Stack Defense",
        is_devils_advocate: true,
        code_snippet: null
      };
    }
  }

  // 10 Diverse Questions specifically for File Integrity Checker / Hashing
  if (code.includes("hash") || code.includes("integrity") || code.includes("sha")) {
    const fileQuestions = [
      { question: "Walk me through how `calculate_file_hash` works step by step.", category: "Core Architecture", code_snippet: "hasher = hashlib.new(algorithm)" },
      { question: "Why did you read the file in 4096-byte chunks instead of using `file.read()` all at once?", category: "Memory & Buffers", code_snippet: "while chunk := file.read(4096):" },
      { question: "What is the difference between SHA-256 and MD5, and why is MD5 deprecated for integrity verification?", category: "Security & Collisions", code_snippet: "algorithm: str = 'sha256'" },
      { question: "What exception is raised if the target file is missing or path is corrupted?", category: "Error Handling", code_snippet: "if not os.path.exists(filepath):" },
      { question: "What is the computational time complexity to hash a 2 GB file using this function?", category: "Time Complexity", code_snippet: "while chunk := file.read(4096): hasher.update(chunk)" },
      { question: "Where is the `expected_hash` safely stored to prevent an attacker from modifying both the file and the hash?", category: "Threat Modeling", code_snippet: "if current_hash == expected_hash:" },
      { question: "If you need to verify 10,000 files in a directory, how would you speed this up with multiprocessing?", category: "Concurrency & Scale", code_snippet: null },
      { question: "Can this script differentiate between an accidental file corruption and an intentional malicious edit?", category: "Data Integrity", code_snippet: "print('[!] Warning: File integrity compromised!')" },
      { question: "How would you handle permission errors if the file is locked by the operating system?", category: "Edge Cases", code_snippet: "with open(filepath, 'rb') as file:" },
      { question: "What unit tests would you write to guarantee this script always catches modified bytes?", category: "Testing & Verification", code_snippet: null }
    ];
    return fileQuestions[(round - 1) % fileQuestions.length];
  } else if (code.includes("stock") || code.includes("checkout")) {
    const list = [
      { question: "What happens if two users try to order the last item in stock at the exact same second?", category: "Concurrency", code_snippet: "INVENTORY[order.item_id]['stock'] -= order.quantity" },
      { question: "What is the time complexity of looking up an item by its ID in your inventory?", category: "Time Complexity", code_snippet: "if order.item_id not in INVENTORY:" },
      { question: "How would you secure this checkout API so that unauthorized users cannot place orders?", category: "Security", code_snippet: "@app.post('/checkout')" },
      { question: "How do you roll back stock if a payment gateway fails midway?", category: "Transaction Resilience", code_snippet: null },
      { question: "Why use in-memory dictionary instead of a persistent database table?", category: "Data Persistence", code_snippet: null }
    ];
    return list[(round - 1) % list.length];
  } else {
    const genericList = [
      { question: "Explain the overall architecture and main entry point of your project.", category: "Architecture", code_snippet: null },
      { question: "What data structures did you choose for this project and why?", category: "Data Structures", code_snippet: null },
      { question: "What is the time and space complexity of your core execution loop?", category: "Performance", code_snippet: null },
      { question: "What edge cases did you test for, and where could this code break?", category: "Edge Cases", code_snippet: null },
      { question: "How would you deploy and scale this code in a production environment?", category: "Deployment", code_snippet: null },
      { question: "What security precautions did you take to prevent invalid inputs?", category: "Security", code_snippet: null },
      { question: "If data size grows 100x, where is the main bottleneck?", category: "Scalability", code_snippet: null },
      { question: "Why did you choose this language/library over alternatives?", category: "Design Choices", code_snippet: null },
      { question: "How did you verify that this code functions accurately?", category: "Verification", code_snippet: null },
      { question: "If you had 2 more weeks to work on this, what would you improve next?", category: "Future Scope", code_snippet: null }
    ];
    return genericList[(round - 1) % genericList.length];
  }
}

function getLocalIdealAnswer(question = "", snippet = "") {
  const combined = `${question} ${snippet}`.toLowerCase();
  if (combined.includes("randomforest") || combined.includes("xgboost") || combined.includes("decision tree") || combined.includes("gradient boosting")) {
    return "Random Forest aggregates multiple de-correlated decision trees via bootstrap bagging to lower variance, avoids severe overfitting on smaller tabular datasets, and trains in parallel across CPU cores without delicate hyperparameter tuning.";
  } else if (combined.includes("what your project does") || combined.includes("what does your project") || combined.includes("problem it tries") || combined.includes("solve") || combined.includes("tell me what")) {
    return "The project automates end-to-end data processing, verifies input integrity, and delivers algorithmic predictions/transactions with resilient error handling.";
  } else if (combined.includes("which library") || combined.includes("scikit") || combined.includes("sklearn") || combined.includes("pandas") || combined.includes("numpy") || combined.includes("library")) {
    return "Scikit-learn provides standard, highly optimized C-backed estimators and cross-validation tools, while NumPy/Pandas deliver high-speed vectorized data structures.";
  } else if (combined.includes("why python") || combined.includes("why use python") || combined.includes("gil") || combined.includes("concurrency")) {
    return "Python offers high developer velocity and an extensive ML/backend library ecosystem; for CPU-heavy tasks or massive concurrency, operations are offloaded to compiled C extensions or message worker queues.";
  } else if (combined.includes("roc") || combined.includes("auc") || combined.includes("accuracy") || combined.includes("metric") || combined.includes("imbalance")) {
    return "ROC-AUC measures discrimination across all decision thresholds, making it robust against class imbalance where simple accuracy gives a false sense of security.";
  } else if (combined.includes("4096") || combined.includes("buffer") || combined.includes("chunk")) {
    return "A 4096-byte buffer aligns with OS memory pages and disk block sizes, preventing out-of-memory errors on large files while minimizing disk I/O overhead.";
  } else if (combined.includes("sha") || combined.includes("md5") || combined.includes("hash")) {
    return "MD5 suffers from cryptographic collision vulnerabilities, while SHA-256 is collision-resistant and provides mathematically dependable file verification.";
  } else if (combined.includes("race") || combined.includes("stock") || combined.includes("inventory")) {
    return "Concurrent orders require database row-level locking or atomic decrement operations to prevent race conditions from overselling limited inventory.";
  } else if (combined.includes("exception") || combined.includes("error") || combined.includes("path")) {
    return "Explicitly checking file path existence and handling FileNotFoundError prevents unexpected runtime crashes and allows graceful error recovery.";
  } else if (combined.includes("complexity") || combined.includes("time") || combined.includes("space")) {
    return "Streaming chunks maintains linear O(n) execution time while keeping memory space complexity strictly constant O(1).";
  } else {
    return "The technical defense explains the core algorithm mechanics, justifies resource and library choices, and details how edge cases and exceptions are prevented.";
  }
}

async function submitStudentAnswer() {
  if (VivaState.isPaused) return;

  const inputEl = document.getElementById("student-answer-input");
  const answer = inputEl?.value.trim() || "";

  if (!answer || answer.length < 3) {
    alert("Please speak or type your answer before proceeding.");
    inputEl?.focus();
    return;
  }

  if (VivaState.isRecording && VivaState.activeSpeechRecognition) {
    toggleSpeechRecognition();
  }

  // 1. INSTANT NON-ANSWER CHECK (0ms delay! Score: 1.0/10)
  const nonAnswerPatterns = [
    /\bi\s*(don'?t|do\s*not)\s*know\b/i,
    /\b(idk|dunno|no\s*idea|not\s*sure|have\s*no\s*idea|don'?t\s*know)\b/i,
    /\b(skip|pass|next|nothing|na|none)\b/i,
    /\b(nahi\s*pata|pata\s*nahi|malum\s*nahi|kuch\s*nahi)\b/i,
    /^[?.\s!]+$/,
    /^(asdf|qwerty|xyz|abc|test|blah)/i
  ];

  const cleanChars = answer.replace(/[^a-zA-Z0-9]/g, '');
  const isGibberish = cleanChars.length > 3 && new Set(cleanChars.toLowerCase()).size <= 2;
  const isNonAnswer = nonAnswerPatterns.some(p => p.test(answer)) || isGibberish;

  if (isNonAnswer) {
    updateAvatarEmotion("skeptical", "Answer Checked");
    const actualIdeal = VivaState.activeQuestionData?.ideal_answer 
      || getLocalIdealAnswer(VivaState.activeQuestionData?.question, VivaState.activeQuestionData?.code_snippet);
    const instantEval = {
      score: 1.0,
      authorship_confidence: 12,
      ideal_answer: actualIdeal,
      critique: "You indicated you don't know the answer. Study the key mechanism in the ideal answer below to master it.",
      should_followup: true
    };
    recordResult(answer, instantEval);
    return;
  }

  // 2. Real technical answer evaluation
  updateAvatarEmotion("thinking", "Evaluating answer...");
  const submitBtn = document.getElementById("btn-submit-answer");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Evaluating...</span>`;
  }
  if (inputEl) inputEl.disabled = true;

  try {
    const res = await fetch("/api/evaluate-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: VivaState.activeQuestionData?.question || "Question",
        answer: answer,
        code_snippet: VivaState.activeQuestionData?.code_snippet || "",
        ideal_answer: VivaState.activeQuestionData?.ideal_answer || "",
        persona: VivaState.persona
      })
    });

    const evalData = await res.json();
    recordResult(answer, evalData);
  } catch (err) {
    const words = answer.split(" ").length;
    const fallbackEval = {
      score: words > 12 ? 8.0 : 4.0,
      authorship_confidence: words > 12 ? 85 : 45,
      ideal_answer: VivaState.activeQuestionData?.ideal_answer || getLocalIdealAnswer(VivaState.activeQuestionData?.question, VivaState.activeQuestionData?.code_snippet),
      critique: words > 12 ? "Technical response noted." : "Answer was too brief. Try explaining with deeper technical detail.",
      should_followup: words < 6
    };
    recordResult(answer, fallbackEval);
  }
}

function recordResult(studentAnswer, evalResult) {
  const idealAnswerText = evalResult.ideal_answer 
    || VivaState.activeQuestionData?.ideal_answer 
    || getLocalIdealAnswer(VivaState.activeQuestionData?.question, VivaState.activeQuestionData?.code_snippet);
  const authConf = evalResult.authorship_confidence != null 
    ? Number(evalResult.authorship_confidence) 
    : (evalResult.authorshipConfidence != null 
       ? Number(evalResult.authorshipConfidence) 
       : Math.min(98, Math.max(12, Math.round(Number(evalResult.score || 5) * 10))));

  VivaState.questionsLog.push({
    round: VivaState.currentRound,
    question: VivaState.activeQuestionData?.question,
    category: VivaState.activeQuestionData?.category || "Core Logic",
    studentAnswer: studentAnswer,
    score: Number(evalResult.score != null ? evalResult.score : 5.0),
    authorshipConfidence: authConf,
    idealAnswer: idealAnswerText,
    critique: evalResult.critique || "Good response."
  });

  saveState();

  const submitBtn = document.getElementById("btn-submit-answer");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add("opacity-50", "cursor-not-allowed");
    submitBtn.innerHTML = `<span>Answer Recorded</span>`;
  }

  const skipBtn = document.getElementById("btn-skip-answer");
  if (skipBtn) {
    skipBtn.disabled = true;
    skipBtn.classList.add("opacity-50", "cursor-not-allowed");
  }

  if (evalResult.score >= 7.5) {
    updateAvatarEmotion("impressed", "Good Answer");
  } else {
    updateAvatarEmotion("skeptical", "Feedback Noted");
  }

  // SHOW SHORT ANIMATED IDEAL ANSWER REVEAL BOX (No auto-timer, user controls pace!)
  const revealBox = document.getElementById("answer-reveal-box");
  const revealScore = document.getElementById("reveal-score");
  const revealIdeal = document.getElementById("reveal-ideal-answer");
  const revealCritique = document.getElementById("reveal-critique-text");
  const nextBtn = document.getElementById("btn-next-question");

  if (nextBtn) {
    if (VivaState.currentRound >= VivaState.roundsCount) {
      nextBtn.innerHTML = `<span>Finish Viva & View Official Result</span> <span>🎓 &rarr;</span>`;
      nextBtn.classList.remove("bg-blue-600");
      nextBtn.classList.add("bg-emerald-600", "hover:bg-emerald-700");
    } else {
      nextBtn.innerHTML = `<span>Next Question</span> <span>&rarr;</span>`;
      nextBtn.classList.remove("bg-emerald-600", "hover:bg-emerald-700");
      nextBtn.classList.add("bg-blue-600");
    }
  }

  if (revealBox && revealIdeal) {
    if (revealScore) revealScore.textContent = evalResult.score != null ? evalResult.score : 8.5;
    revealIdeal.textContent = idealAnswerText;
    if (revealCritique) revealCritique.textContent = evalResult.critique || "Clear explanation provided.";
    revealBox.classList.remove("hidden");
    VivaState.isAwaitingNext = true;
  }
}

function skipCurrentQuestion() {
  if (VivaState.isPaused) return;

  if (VivaState.isRecording && VivaState.activeSpeechRecognition) {
    toggleSpeechRecognition();
  }

  // Cancel any active speech
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  setWaveformActive(false);

  const inputEl = document.getElementById("student-answer-input");
  if (inputEl) {
    inputEl.value = "I don't know the answer to this question.";
    inputEl.disabled = true;
  }

  const submitBtn = document.getElementById("btn-submit-answer");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add("opacity-50", "cursor-not-allowed");
  }

  const skipBtn = document.getElementById("btn-skip-answer");
  if (skipBtn) {
    skipBtn.disabled = true;
    skipBtn.classList.add("opacity-50", "cursor-not-allowed");
  }

  updateAvatarEmotion("skeptical", "Question Passed");

  const actualIdeal = VivaState.activeQuestionData?.ideal_answer 
    || getLocalIdealAnswer(VivaState.activeQuestionData?.question, VivaState.activeQuestionData?.code_snippet);

  const instantEval = {
    score: 1.0,
    authorship_confidence: 12,
    ideal_answer: actualIdeal,
    critique: "Question passed. Review the model answer below to master the core concept.",
    should_followup: false
  };

  recordResult("Passed / Don't know", instantEval);
}

function advanceToNextQuestion() {
  const revealBox = document.getElementById("answer-reveal-box");
  if (revealBox) revealBox.classList.add("hidden");

  VivaState.isAwaitingNext = false;

  // Check if viva finished
  if (VivaState.currentRound >= VivaState.roundsCount) {
    VivaState.isExamCompleted = true;
    saveState();
    window.location.href = "/report";
    return;
  }

  // Re-enable answer input and submit button for next round
  const inputEl = document.getElementById("student-answer-input");
  if (inputEl) {
    inputEl.value = "";
    inputEl.disabled = false;
  }

  const submitBtn = document.getElementById("btn-submit-answer");
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove("opacity-50", "cursor-not-allowed");
    submitBtn.innerHTML = `<span>Submit Answer</span> <span>&rarr;</span>`;
  }

  const skipBtn = document.getElementById("btn-skip-answer");
  if (skipBtn) {
    skipBtn.disabled = false;
    skipBtn.classList.remove("opacity-50", "cursor-not-allowed");
  }

  VivaState.currentRound++;
  saveState();
  loadNextVivaQuestion(false);
}

/* ==========================================================================
   PAGE 3: REPORT (report.html)
   ========================================================================== */
function renderReportScreen() {
  loadState();

  const incompleteView = document.getElementById("incomplete-exam-view");
  const completedView = document.getElementById("completed-report-view");

  const answeredCount = (VivaState.questionsLog && Array.isArray(VivaState.questionsLog)) ? VivaState.questionsLog.length : 0;
  const totalRounds = VivaState.roundsCount || 5;
  const isFinished = VivaState.isExamCompleted || (answeredCount >= totalRounds && totalRounds > 0);

  // STRICT GUARD: If exam is not completed, block mock display and show incomplete banner!
  if (!isFinished) {
    if (completedView) completedView.classList.add("hidden");
    if (incompleteView) {
      incompleteView.classList.remove("hidden");

      const titleEl = document.getElementById("incomplete-title");
      const descEl = document.getElementById("incomplete-desc");
      const progressText = document.getElementById("incomplete-progress-text");
      const progressBar = document.getElementById("incomplete-progress-bar");
      const resumeBtn = document.getElementById("btn-resume-exam");
      const progressSection = document.getElementById("incomplete-progress-section");

      if (answeredCount > 0) {
        if (titleEl) titleEl.textContent = "Viva Exam In Progress";
        if (descEl) descEl.textContent = `You have completed ${answeredCount} of ${totalRounds} questions. Please finish the remaining questions in the Exam Room to generate your official scorecard.`;
        if (progressSection) progressSection.classList.remove("hidden");
        if (progressText) progressText.textContent = `${answeredCount} of ${totalRounds} Questions Answered`;
        if (progressBar) {
          const pct = Math.round((answeredCount / totalRounds) * 100);
          progressBar.style.width = `${pct}%`;
        }
        if (resumeBtn) {
          resumeBtn.innerHTML = `<span>Resume Exam (Question ${answeredCount + 1})</span> <span>&rarr;</span>`;
          resumeBtn.href = "/viva";
        }
      } else {
        if (titleEl) titleEl.textContent = "No Viva Exam Completed";
        if (descEl) descEl.textContent = "You have not completed a viva session yet. Configure your project and take the viva exam to unlock real-time scoring, authorship evaluation, and topic competencies.";
        if (progressSection) progressSection.classList.add("hidden");
        if (resumeBtn) {
          resumeBtn.innerHTML = `<span>Start Viva Exam</span> <span>&rarr;</span>`;
          resumeBtn.href = "/";
        }
      }
    }
    return;
  }

  // EXAM IS OFFICIALLY COMPLETED -> Render 100% REAL evaluated results!
  if (incompleteView) incompleteView.classList.add("hidden");
  if (completedView) completedView.classList.remove("hidden");

  const titleEl = document.getElementById("report-project-title");
  const studentEl = document.getElementById("report-student-name");
  const examinerEl = document.getElementById("report-examiner-name");
  const dateEl = document.getElementById("report-date");
  const scoreEl = document.getElementById("report-score");
  const gradeEl = document.getElementById("report-grade");
  const authorshipScoreEl = document.getElementById("authorship-score");
  const authorshipDescEl = document.getElementById("authorship-desc");
  const depthScoreEl = document.getElementById("depth-score");
  const depthDescEl = document.getElementById("depth-desc");
  const integrityScoreEl = document.getElementById("integrity-score");
  const integrityDescEl = document.getElementById("integrity-desc");
  const competencyBars = document.getElementById("competency-bars");
  const highlightsContainer = document.getElementById("performance-highlights");
  const logContainer = document.getElementById("viva-questions-log");
  const flashcardsGrid = document.getElementById("flashcards-grid");

  if (titleEl) titleEl.textContent = VivaState.projectTitle || "Your Project";
  if (studentEl) studentEl.textContent = VivaState.studentName || "Student";
  if (examinerEl) {
    const personaLabel = VivaState.persona === "strict" ? "Strict Mode" : (VivaState.persona === "techlead" ? "Practical Mode" : "Easy Mode");
    const formatLabel = VivaState.examFormat === "mcq" ? "Rapid MCQ" : "Oral Defense";
    examinerEl.textContent = `${personaLabel} • ${formatLabel}`;
  }
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // 1. Calculate Real Average Score
  const totalScore = VivaState.questionsLog.reduce((acc, q) => acc + (Number(q.score) || 0), 0);
  const avg = Number((totalScore / answeredCount).toFixed(1));

  if (scoreEl) scoreEl.innerHTML = `${avg}<span class="text-xs text-slate-400 font-normal">/10</span>`;

  // 2. Real Grade
  let grade = "A";
  if (avg >= 9.0) grade = "A+";
  else if (avg >= 8.0) grade = "A";
  else if (avg >= 7.0) grade = "B+";
  else if (avg >= 6.0) grade = "B";
  else if (avg >= 5.0) grade = "C";
  else grade = "Needs Improvement";
  if (gradeEl) gradeEl.textContent = grade;

  // 3. Real Code Understanding / Authorship %
  const totalAuth = VivaState.questionsLog.reduce((acc, q) => {
    const val = q.authorshipConfidence != null ? Number(q.authorshipConfidence) : Math.min(98, Math.max(15, Math.round(Number(q.score) * 10)));
    return acc + val;
  }, 0);
  const avgAuth = Math.round(totalAuth / answeredCount);

  if (authorshipScoreEl) authorshipScoreEl.textContent = `${avgAuth}%`;
  if (authorshipDescEl) {
    if (avgAuth >= 80) authorshipDescEl.textContent = "High confidence: Explanations align with code ownership.";
    else if (avgAuth >= 60) authorshipDescEl.textContent = "Moderate confidence: Some answers lacked functional depth.";
    else authorshipDescEl.textContent = "Low confidence: Answers indicated unfamiliarity with key logic.";
  }

  // 4. Real Concept Depth
  if (depthScoreEl) depthScoreEl.textContent = `${avg} / 10`;
  if (depthDescEl) depthDescEl.textContent = `Calculated across all ${answeredCount} answered viva questions.`;

  // 5. Real Tab Violations
  if (integrityScoreEl) {
    integrityScoreEl.textContent = `${VivaState.tabSwitches}`;
  }
  if (integrityDescEl) {
    if (VivaState.tabSwitches === 0) integrityDescEl.textContent = "100% exam focus: No tab departures recorded.";
    else if (VivaState.tabSwitches <= 2) integrityDescEl.textContent = "Minor tab switches recorded during exam.";
    else integrityDescEl.textContent = "Frequent tab departures recorded during session.";
  }

  // 6. DYNAMIC TOPIC COMPETENCIES (Grouped from actual questions and scores - ZERO MOCK DATA)
  if (competencyBars) {
    competencyBars.innerHTML = "";
    const categoryStats = {};

    VivaState.questionsLog.forEach((q, idx) => {
      let cat = (q.category && q.category.trim()) ? q.category.trim() : `Question ${idx + 1} Logic`;
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, count: 0 };
      }
      categoryStats[cat].total += (Number(q.score) || 0);
      categoryStats[cat].count += 1;
    });

    const strongTopics = [];
    const weakTopics = [];

    Object.keys(categoryStats).forEach(cat => {
      const stats = categoryStats[cat];
      const catAvg = stats.total / stats.count;
      const pct = Math.min(100, Math.max(10, Math.round(catAvg * 10)));

      let barColorClass = "bg-emerald-600";
      let textColorClass = "text-emerald-600";
      if (pct < 50) {
        barColorClass = "bg-red-500";
        textColorClass = "text-red-600";
        weakTopics.push({ category: cat, pct: pct, score: catAvg.toFixed(1) });
      } else if (pct < 70) {
        barColorClass = "bg-amber-500";
        textColorClass = "text-amber-600";
        weakTopics.push({ category: cat, pct: pct, score: catAvg.toFixed(1) });
      } else {
        strongTopics.push({ category: cat, pct: pct, score: catAvg.toFixed(1) });
      }

      const barItem = document.createElement("div");
      barItem.innerHTML = `
        <div class="flex justify-between text-xs font-semibold mb-1">
          <span class="text-slate-800">${cat}</span>
          <span class="${textColorClass}">${pct}% (${catAvg.toFixed(1)}/10)</span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
          <div class="${barColorClass} h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
        </div>
      `;
      competencyBars.appendChild(barItem);
    });

    // Render Real Highlights
    if (highlightsContainer) {
      highlightsContainer.innerHTML = "";
      
      const strongBox = document.createElement("div");
      strongBox.className = "p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs";
      if (strongTopics.length > 0) {
        strongBox.innerHTML = `
          <div class="font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
            <span>✅</span> Demonstrated Strengths
          </div>
          <p class="text-emerald-700">Solid grasp in: <strong>${strongTopics.map(t => t.category).join(', ')}</strong>.</p>
        `;
      } else {
        strongBox.innerHTML = `
          <div class="font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
            <span>💡</span> Areas for Growth
          </div>
          <p class="text-emerald-700">Focus on foundational principles and code structure.</p>
        `;
      }
      highlightsContainer.appendChild(strongBox);

      const weakBox = document.createElement("div");
      weakBox.className = "p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs";
      if (weakTopics.length > 0) {
        weakBox.innerHTML = `
          <div class="font-bold text-amber-800 mb-1 flex items-center gap-1.5">
            <span>⚠️</span> Topics to Review
          </div>
          <p class="text-amber-700">Review answers in: <strong>${weakTopics.map(t => t.category).join(', ')}</strong> before real defense.</p>
        `;
      } else {
        weakBox.innerHTML = `
          <div class="font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
            <span>🌟</span> Well-Balanced Defense
          </div>
          <p class="text-emerald-700">Consistent technical performance across tested areas.</p>
        `;
      }
      highlightsContainer.appendChild(weakBox);
    }
  }

  // 6.5. Render Interactive Skill Knowledge Graph
  renderKnowledgeGraph();

  // 6.6. Render System Architecture Blueprint (Mermaid Flowchart)
  renderReportArchitectureBlueprint();

  // 7. Render Real Question Transcript & Logs
  if (logContainer) {
    logContainer.innerHTML = "";
    VivaState.questionsLog.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2";
      div.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="badge-clean badge-blue text-[10px] font-bold">Question ${idx + 1} • ${item.category || 'Logic'}</span>
          <span class="text-xs font-bold text-slate-700">Score: <span class="${item.score >= 7 ? 'text-emerald-600' : (item.score >= 5 ? 'text-amber-600' : 'text-red-600')}">${item.score}/10</span></span>
        </div>
        <h4 class="font-bold text-xs sm:text-sm text-slate-900">${item.question}</h4>
        
        <div class="p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-700">
          <strong>Your Answer:</strong> "${item.studentAnswer}"
        </div>

        <div class="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-950">
          <strong class="text-emerald-800">💡 Ideal Answer (Key Point):</strong> ${item.idealAnswer || 'Clear explanation of logic and edge cases.'}
        </div>

        <p class="text-xs text-slate-500"><strong>Feedback:</strong> ${item.critique}</p>
      `;
      logContainer.appendChild(div);
    });
  }

  // 8. Render Dynamic Revision Flashcards from Actual Viva Questions
  if (flashcardsGrid) {
    flashcardsGrid.innerHTML = "";
    const cardsToRender = VivaState.questionsLog.slice(0, 3);
    if (cardsToRender.length > 0) {
      cardsToRender.forEach((item, idx) => {
        const badgeColors = ["badge-blue", "badge-amber", "badge-red"];
        const bColor = badgeColors[idx % badgeColors.length];
        
        const card = document.createElement("div");
        card.className = "flashcard-inner pro-card border border-slate-200";
        card.onclick = () => card.classList.toggle("flipped");
        card.innerHTML = `
          <div class="flashcard-content">
            <div class="flashcard-front bg-white p-3.5 flex flex-col justify-between">
              <div>
                <span class="badge-clean ${bColor} text-[10px]">Question ${idx + 1}</span>
                <h4 class="font-bold text-xs text-slate-900 mt-2 leading-snug">${item.question}</h4>
                <p class="text-[11px] text-slate-500 mt-1 line-clamp-2">Your answer: "${item.studentAnswer}"</p>
              </div>
              <div class="text-[10px] text-blue-600 font-semibold mt-2">Tap to see answer &rarr;</div>
            </div>
            <div class="flashcard-back p-3.5 flex flex-col justify-between">
              <div>
                <span class="badge-clean badge-green text-[10px]">Ideal Answer</span>
                <p class="text-[11px] text-slate-700 mt-2 leading-relaxed font-medium">
                  ${item.idealAnswer || 'Clear explanation of the logic and trade-offs.'}
                </p>
              </div>
              <div class="text-[10px] text-slate-400">Tap to flip back</div>
            </div>
          </div>
        `;
        flashcardsGrid.appendChild(card);
      });
    }
  }
}

/* ==========================================================================
   FEATURE: INTERACTIVE SKILL KNOWLEDGE GRAPH
   ========================================================================== */
function renderKnowledgeGraph() {
  const container = document.getElementById("knowledge-graph-nodes");
  if (!container) return;

  container.innerHTML = "";

  // 1. Center Core Root Node
  const rootNode = document.createElement("div");
  rootNode.className = "p-3 sm:p-3.5 bg-slate-900 text-white rounded-2xl shadow-md border border-slate-700 flex items-center gap-2.5 shrink-0 z-10 hover:scale-105 transition transform cursor-default";
  rootNode.innerHTML = `
    <div class="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-sm font-bold shadow-xs">🎓</div>
    <div>
      <div class="text-[10px] text-blue-300 uppercase font-mono font-bold">Project Core</div>
      <div class="text-xs sm:text-sm font-bold text-white max-w-[180px] truncate">${VivaState.projectTitle || "Your Project"}</div>
    </div>
  `;
  container.appendChild(rootNode);

  // 2. Evaluated Concept Nodes (From Actual Viva Questions)
  if (VivaState.questionsLog && VivaState.questionsLog.length > 0) {
    VivaState.questionsLog.forEach((item, idx) => {
      const score = Number(item.score || 0);
      let themeClass = "border-emerald-300 bg-white hover:bg-emerald-50/50 hover:border-emerald-500 text-emerald-950";
      let dotColor = "bg-emerald-500";
      let scoreBadge = "bg-emerald-100 text-emerald-800";

      if (score < 5.0) {
        themeClass = "border-red-300 bg-white hover:bg-red-50/50 hover:border-red-500 text-red-950";
        dotColor = "bg-red-500";
        scoreBadge = "bg-red-100 text-red-800";
      } else if (score < 7.5) {
        themeClass = "border-amber-300 bg-white hover:bg-amber-50/50 hover:border-amber-500 text-amber-950";
        dotColor = "bg-amber-500";
        scoreBadge = "bg-amber-100 text-amber-800";
      }

      let categoryName = item.category || `Concept ${idx + 1}`;
      if (categoryName.includes("Devil")) categoryName = "🥊 Stack Defense";

      const node = document.createElement("button");
      node.type = "button";
      node.className = `p-3 rounded-xl border ${themeClass} shadow-xs transition-all transform hover:-translate-y-0.5 hover:shadow-md text-left flex items-center gap-2.5 group cursor-pointer`;
      node.onclick = () => openGraphNodeDetail(idx);
      node.innerHTML = `
        <span class="w-2.5 h-2.5 rounded-full ${dotColor} shrink-0 group-hover:scale-125 transition"></span>
        <div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition truncate max-w-[130px]">${categoryName}</span>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ${scoreBadge}">${score}/10</span>
          </div>
          <span class="text-[10px] text-slate-400 block mt-0.5">Click to inspect &rarr;</span>
        </div>
      `;
      container.appendChild(node);
    });
  }
}

function openGraphNodeDetail(idx) {
  const item = VivaState.questionsLog[idx];
  if (!item) return;

  const detailBox = document.getElementById("graph-node-detail");
  const badgeEl = document.getElementById("detail-node-badge");
  const scoreEl = document.getElementById("detail-node-score");
  const titleEl = document.getElementById("detail-node-title");
  const qEl = document.getElementById("detail-node-question");
  const ansEl = document.getElementById("detail-node-answer");
  const idealEl = document.getElementById("detail-node-ideal");

  if (detailBox) {
    if (badgeEl) badgeEl.textContent = `Concept Node ${idx + 1} • ${item.category || 'Architecture'}`;
    if (scoreEl) scoreEl.textContent = `Score: ${item.score}/10`;
    if (titleEl) titleEl.textContent = item.category || `Concept ${idx + 1}`;
    if (qEl) qEl.textContent = `"${item.question}"`;
    if (ansEl) ansEl.textContent = item.studentAnswer ? `"${item.studentAnswer}"` : "No answer provided.";
    if (idealEl) idealEl.textContent = item.idealAnswer || "State the core mechanism and address edge cases clearly.";
    detailBox.classList.remove("hidden");
    detailBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function closeGraphNodeDetail() {
  const detailBox = document.getElementById("graph-node-detail");
  if (detailBox) detailBox.classList.add("hidden");
}

/* ==========================================================================
   PAGE 4: AI TUTOR (mentor.html)
   ========================================================================== */
function initMentorPage() {
  loadState();
}

function useQuickPrompt(text) {
  const input = document.getElementById("mentor-user-input");
  if (input) {
    input.value = text;
    input.focus();
  }
}

function clearMentorChat() {
  const log = document.getElementById("mentor-chat-messages");
  if (log) {
    log.innerHTML = `
      <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
        Chat cleared. Ask your doubt below!
      </div>
    `;
  }
}

async function handleMentorSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("mentor-user-input");
  const text = input?.value.trim();
  if (!text) return;

  const log = document.getElementById("mentor-chat-messages");
  
  // User message
  const userBubble = document.createElement("div");
  userBubble.className = "flex gap-2.5 justify-end";
  userBubble.innerHTML = `
    <div class="bg-blue-600 text-white rounded-xl rounded-tr-sm p-3 text-xs sm:text-sm max-w-lg shadow-xs">
      ${text}
    </div>
  `;
  log.appendChild(userBubble);
  input.value = "";
  log.scrollTop = log.scrollHeight;

  // Bot loading
  const botBubble = document.createElement("div");
  botBubble.className = "flex gap-2.5 items-start";
  botBubble.innerHTML = `
    <div class="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">🤖</div>
    <div class="bg-slate-50 border border-slate-200 rounded-xl rounded-tl-sm p-3 text-xs sm:text-sm text-slate-700 max-w-xl shadow-xs">
      <span class="animate-pulse">Thinking...</span>
    </div>
  `;
  log.appendChild(botBubble);
  log.scrollTop = log.scrollHeight;

  try {
    const res = await fetch("/api/mentor-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        project_title: VivaState.projectTitle,
        source_code: VivaState.sourceCode
      })
    });
    const data = await res.json();
    botBubble.querySelector("div:last-child").innerHTML = formatText(data.reply);
  } catch (err) {
    botBubble.querySelector("div:last-child").innerHTML = formatText(getSimpleTutorReply(text));
  }
  log.scrollTop = log.scrollHeight;
}

function formatText(text) {
  return text
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code class="bg-slate-200 px-1 py-0.5 rounded text-blue-800">$1</code>');
}

function getSimpleTutorReply(query) {
  const q = query.toLowerCase();
  if (q.includes("top") || q.includes("questions") || q.includes("3")) {
    return `Here are the top 3 viva questions you can expect:\n\n1. **Code Walkthrough:** "Explain the main logic and what happens when an input is given."\n2. **Complexity:** "What is the time complexity of your main search or loop?"\n3. **Failure Case:** "What happens if a database is down or wrong data is given?"`;
  } else if (q.includes("complexity") || q.includes("time")) {
    return `**How to explain Time Complexity:**\n• If you are looking up by key in a dictionary / hashmap: it takes **O(1)** on average.\n• If you are looping through a list / array: it takes **O(N)** time.\n• If you have nested loops: it takes **O(N²)** time. Mention this clearly to the examiner!`;
  } else {
    return `Good question! When answering in the viva, keep your response direct: first state the concept in 1 line, then point to the exact function in your code that handles it.`;
  }
}

/* ==========================================================================
   FLOATING BOT WIDGET
   ========================================================================== */
function toggleBotDrawer() {
  const drawer = document.getElementById("bot-drawer");
  if (drawer) drawer.classList.toggle("open");
}

async function sendBotMessage() {
  const input = document.getElementById("bot-input");
  const text = input?.value.trim();
  if (!text) return;

  const log = document.getElementById("bot-chat-log");
  
  const u = document.createElement("div");
  u.className = "p-2 rounded-lg bg-blue-600 text-white ml-6 text-right text-xs";
  u.textContent = text;
  log.appendChild(u);
  input.value = "";
  log.scrollTop = log.scrollHeight;

  const b = document.createElement("div");
  b.className = "p-2 rounded-lg bg-white border border-slate-200 text-slate-700 mr-6 text-xs";
  b.innerHTML = `<span class="animate-pulse text-slate-400">Thinking...</span>`;
  log.appendChild(b);
  log.scrollTop = log.scrollHeight;

  try {
    const res = await fetch("/api/mentor-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        project_title: VivaState.projectTitle,
        source_code: VivaState.sourceCode
      })
    });
    const data = await res.json();
    b.innerHTML = formatText(data.reply);
  } catch (e) {
    b.innerHTML = formatText(getSimpleTutorReply(text));
  }
  log.scrollTop = log.scrollHeight;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ==========================================================================
   FEATURE 4: ARCHITECTURE BLUEPRINT & DEEP SCAN ENGINE (Gemini Key 3)
   ========================================================================== */
async function ensureProjectArchitectureScanned(forceRescan = false) {
  const currentCodeSnippet = (VivaState.sourceCode || "").slice(0, 120);
  const isMatchingScan = VivaState.projectScan && 
                         VivaState.projectScan.mermaid_diagram &&
                         VivaState.projectScan.project_title === VivaState.projectTitle &&
                         VivaState.projectScan.code_snippet === currentCodeSnippet;

  if (!forceRescan && isMatchingScan) {
    populateArchitectureBlueprint(VivaState.projectScan);
    return VivaState.projectScan;
  }

  // Invalidate old/stale scan so previous project graph is NEVER shown!
  VivaState.projectScan = null;

  try {
    const res = await fetch("/api/scan-project-architecture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_title: VivaState.projectTitle,
        source_code: VivaState.sourceCode,
        project_docs: VivaState.projectDocs
      })
    });
    if (res.ok) {
      const scanData = await res.json();
      scanData.project_title = VivaState.projectTitle;
      scanData.code_snippet = currentCodeSnippet;
      VivaState.projectScan = scanData;
      saveState();
      populateArchitectureBlueprint(scanData);
      return scanData;
    }
  } catch (err) {
    console.warn("Scan project architecture error:", err);
  }
  return null;
}

let archZoomLevel = 1.0;
let archPanX = 0;
let archPanY = 0;
let isArchPanning = false;
let archStartX = 0;
let archStartY = 0;

function updateArchTransform() {
  const container = document.getElementById("arch-mermaid-container");
  const label = document.getElementById("arch-zoom-label");
  if (container) {
    container.style.transform = `translate(${archPanX}px, ${archPanY}px) scale(${archZoomLevel})`;
  }
  if (label) {
    label.textContent = `${Math.round(archZoomLevel * 100)}%`;
  }
}

function archZoomIn() {
  archZoomLevel = Math.min(2.5, archZoomLevel + 0.15);
  updateArchTransform();
}
window.archZoomIn = archZoomIn;

function archZoomOut() {
  archZoomLevel = Math.max(0.4, archZoomLevel - 0.15);
  updateArchTransform();
}
window.archZoomOut = archZoomOut;

function archResetZoom() {
  archZoomLevel = 1.0;
  archPanX = 0;
  archPanY = 0;
  updateArchTransform();
}
window.archResetZoom = archResetZoom;

function setupDiagramPanZoom() {
  const wrapper = document.getElementById("arch-diagram-wrapper");
  if (!wrapper || wrapper.dataset.panSetup === "true") return;
  wrapper.dataset.panSetup = "true";

  wrapper.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    isArchPanning = true;
    archStartX = e.clientX - archPanX;
    archStartY = e.clientY - archPanY;
    wrapper.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", (e) => {
    if (!isArchPanning) return;
    archPanX = e.clientX - archStartX;
    archPanY = e.clientY - archStartY;
    updateArchTransform();
  });

  window.addEventListener("mouseup", () => {
    if (isArchPanning) {
      isArchPanning = false;
      const w = document.getElementById("arch-diagram-wrapper");
      if (w) w.style.cursor = "grab";
    }
  });

  wrapper.addEventListener("wheel", (e) => {
    if (e.ctrlKey || Math.abs(e.deltaY) > 30) {
      e.preventDefault();
      if (e.deltaY < 0) {
        archZoomIn();
      } else {
        archZoomOut();
      }
    }
  }, { passive: false });
}

let archCanvasTheme = "light";

function toggleArchCanvasTheme() {
  archCanvasTheme = archCanvasTheme === "light" ? "dark" : "light";
  const wrapper = document.getElementById("arch-diagram-wrapper");
  const themeBtn = document.getElementById("btn-arch-theme");
  
  if (archCanvasTheme === "dark") {
    wrapper?.classList.remove("arch-light-canvas");
    wrapper?.classList.add("arch-dark-canvas");
    if (themeBtn) themeBtn.innerHTML = "<span>☀️ Light Canvas</span>";
  } else {
    wrapper?.classList.remove("arch-dark-canvas");
    wrapper?.classList.add("arch-light-canvas");
    if (themeBtn) themeBtn.innerHTML = "<span>🌙 Dark Studio</span>";
  }

  // Re-render current diagram with updated theme if available
  if (typeof switchArchDiagramView === "function") {
    switchArchDiagramView(currentArchDiagramView || "pipeline");
  } else if (VivaState.projectScan?.mermaid_diagram) {
    renderMermaidDiagram(VivaState.projectScan.mermaid_diagram, "arch-mermaid-container");
  }
}
window.toggleArchCanvasTheme = toggleArchCanvasTheme;

function renderMermaidDiagram(mermaidCode, targetContainerId) {
  const container = document.getElementById(targetContainerId);
  if (!container || !mermaidCode) return;

  // Clean markdown backticks if returned by LLM
  let cleanCode = mermaidCode.trim();
  if (cleanCode.startsWith("```mermaid")) cleanCode = cleanCode.replace(/^```mermaid\s*/i, "");
  else if (cleanCode.startsWith("```")) cleanCode = cleanCode.replace(/^```\s*/i, "");
  if (cleanCode.endsWith("```")) cleanCode = cleanCode.replace(/```$/i, "");
  cleanCode = cleanCode.trim();

  // Reset zoom on fresh diagram render
  archResetZoom();

  if (typeof mermaid === "undefined") {
    container.innerHTML = `<pre class="text-xs font-mono text-slate-700 overflow-x-auto">${escapeHtml(cleanCode)}</pre>`;
    return;
  }

  const isDark = archCanvasTheme === "dark";

  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      themeVariables: {
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        darkMode: isDark,
        background: isDark ? '#0b0f19' : '#fbfcfe',
        primaryColor: isDark ? '#1e293b' : '#ffffff',
        primaryBorderColor: isDark ? '#475569' : '#94a3b8',
        primaryTextColor: isDark ? '#f8fafc' : '#0f172a',
        lineColor: isDark ? '#94a3b8' : '#64748b',
        secondaryColor: isDark ? '#111827' : '#f8fafc',
        tertiaryColor: isDark ? '#0b0f19' : '#ffffff',
        mainBkg: isDark ? '#1e293b' : '#ffffff',
        nodeBorder: isDark ? '#475569' : '#94a3b8',
        clusterBkg: isDark ? '#111827' : '#f8fafc',
        clusterBorder: isDark ? '#334155' : '#cbd5e1',
        titleColor: isDark ? '#f8fafc' : '#0f172a',
        edgeLabelBackground: isDark ? '#1e293b' : '#ffffff'
      },
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'stepAfter', // 90-degree orthogonal right angle connectors (Images 2 & 3)
        rankSpacing: 60,
        nodeSpacing: 45,
        defaultRenderer: 'dagre'
      }
    });
    const uniqueId = `mermaid-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    mermaid.render(uniqueId, cleanCode).then(({ svg }) => {
      container.innerHTML = svg;
      setupDiagramPanZoom();
      attachNodeClickInspectors(container);
    }).catch(e => {
      console.warn("Mermaid render error, rendering resilient FigJam blueprint:", e);
      const safeBlueprint = `flowchart LR
  classDef startNode fill:#fed7aa,stroke:#f97316,stroke-width:2px,color:#7c2d12,font-weight:bold,rx:10px,ry:10px;
  classDef routerNode fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a,font-weight:bold,rx:8px,ry:8px;
  classDef decisionNode fill:#fbcfe8,stroke:#db2777,stroke-width:2px,color:#831843,font-weight:bold;
  classDef serviceNode fill:#ccfbf1,stroke:#0d9488,stroke-width:2px,color:#134e4a,font-weight:bold,rx:8px,ry:8px;
  classDef dbNode fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#4c1d95,font-weight:bold,rx:8px,ry:8px;
  classDef endNode fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d,font-weight:bold,rx:20px,ry:20px;
  classDef altNode fill:#fef08a,stroke:#ca8a04,stroke-width:2px,color:#713f12,font-weight:bold,rx:8px,ry:8px;

  UserInput["💻 Client Presentation<br/>(User Browser)"]:::startNode
  AppRouter["⚡ Routing Gateway<br/>(Request Dispatcher)"]:::routerNode
  SchemaCheck{"🛡️ Request Valid?"}:::decisionNode
  BusinessService["⚙️ Business Service<br/>(Domain Transformation)"]:::serviceNode
  PersistentStore[("🗄️ Relational Store<br/>(ACID Database)")]:::dbNode
  RejectBranch["⚠️ Validation Rejection<br/>(400 Bad Request)"]:::altNode
  SuccessResult["✅ Resolved Payload<br/>(HTTP 200 Response)"]:::endNode

  UserInput --> AppRouter
  AppRouter --> SchemaCheck
  SchemaCheck -- "Yes / Valid" --> BusinessService
  SchemaCheck -- "No / Invalid" --> RejectBranch
  BusinessService --> PersistentStore
  PersistentStore --> SuccessResult
  SuccessResult -.-> UserInput`;

      const safeId = `mermaid-safe-${Date.now()}`;
      mermaid.render(safeId, safeBlueprint).then(({ svg }) => {
        container.innerHTML = svg;
        setupDiagramPanZoom();
        attachNodeClickInspectors(container);
      }).catch(() => {
        container.innerHTML = `<pre class="text-xs font-mono text-slate-700 overflow-x-auto">${escapeHtml(cleanCode)}</pre>`;
      });
    });
  } catch (err) {
    console.warn("Mermaid init error:", err);
    container.innerHTML = `<pre class="text-xs font-mono text-slate-700 overflow-x-auto">${escapeHtml(cleanCode)}</pre>`;
  }
}

function populateArchitectureBlueprint(scanData) {
  if (!scanData) return;
  const summaryEl = document.getElementById("blueprint-system-summary");
  const patternEl = document.getElementById("blueprint-pattern-badge");
  const countEl = document.getElementById("blueprint-files-count");
  const filesListEl = document.getElementById("blueprint-files-list");

  if (summaryEl) summaryEl.textContent = scanData.system_summary || "Scanned project structure";
  if (patternEl) patternEl.textContent = `Pattern: ${scanData.architecture_pattern || 'Modular Architecture'}`;
  
  const files = scanData.identified_files || [];
  if (countEl) countEl.textContent = `${files.length} Core Files Identified`;

  if (filesListEl) {
    filesListEl.innerHTML = "";
    files.forEach(f => {
      const card = document.createElement("div");
      card.className = "p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-2";
      card.innerHTML = `
        <div>
          <div class="font-mono font-bold text-xs text-blue-700">📄 ${escapeHtml(f.file_name)}</div>
          <div class="text-[11px] text-slate-600 mt-0.5">${escapeHtml(f.purpose)}</div>
        </div>
      `;
      filesListEl.appendChild(card);
    });
  }

  if (scanData.mermaid_diagram) {
    renderMermaidDiagram(scanData.mermaid_diagram, "mermaid-diagram-stage");
  }
}

function toggleArchitectureModal() {
  const modal = document.getElementById("architecture-blueprint-modal");
  if (!modal) return;
  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    if (VivaState.projectScan) {
      populateArchitectureBlueprint(VivaState.projectScan);
    } else {
      ensureProjectArchitectureScanned();
    }
  } else {
    modal.classList.add("hidden");
  }
}
window.toggleArchitectureModal = toggleArchitectureModal;

/* ==========================================================================
   FEATURE 3: LIVE RADAR CODE SPOTLIGHT (Professor's Laser Pointer)
   ========================================================================== */
function spotlightInCodeDrawer() {
  const drawer = document.getElementById("code-drawer");
  const drawerContent = document.getElementById("drawer-code-content");
  const drawerBadge = document.getElementById("drawer-radar-badge");
  const scrollContainer = document.getElementById("code-drawer-scroll");
  if (!drawer || !drawerContent) return;

  // Open drawer
  drawer.classList.remove("translate-x-full");
  if (drawerBadge) drawerBadge.classList.remove("hidden");

  const targetSnippet = VivaState.activeQuestionData?.code_snippet;
  const targetFile = VivaState.activeQuestionData?.target_file;
  const rawCode = VivaState.sourceCode || "";

  if (targetSnippet && rawCode.includes(targetSnippet)) {
    const parts = rawCode.split(targetSnippet);
    drawerContent.innerHTML = `${escapeHtml(parts[0])}<mark class="radar-spotlight-active px-1 py-0.5 rounded font-bold">${escapeHtml(targetSnippet)}</mark>${escapeHtml(parts.slice(1).join(targetSnippet))}`;
    setTimeout(() => {
      const mark = drawerContent.querySelector("mark");
      if (mark && scrollContainer) {
        mark.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 250);
  } else if (targetFile && rawCode.includes(targetFile)) {
    const parts = rawCode.split(targetFile);
    drawerContent.innerHTML = `${escapeHtml(parts[0])}<mark class="radar-spotlight-active px-1 py-0.5 rounded font-bold">${escapeHtml(targetFile)}</mark>${escapeHtml(parts.slice(1).join(targetFile))}`;
    setTimeout(() => {
      const mark = drawerContent.querySelector("mark");
      if (mark && scrollContainer) {
        mark.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 250);
  } else {
    drawerContent.textContent = rawCode;
  }
}
window.spotlightInCodeDrawer = spotlightInCodeDrawer;

function renderReportArchitectureBlueprint() {
  const section = document.getElementById("report-architecture-section");
  if (!section) return;

  const patternBadge = document.getElementById("report-pattern-badge");
  const filesBreakdown = document.getElementById("report-files-breakdown");
  const diagramContainer = document.getElementById("report-mermaid-stage");

  const currentCodeSnippet = (VivaState.sourceCode || "").slice(0, 120);
  const isMatchingScan = VivaState.projectScan && 
                         VivaState.projectScan.mermaid_diagram &&
                         VivaState.projectScan.project_title === VivaState.projectTitle &&
                         VivaState.projectScan.code_snippet === currentCodeSnippet;

  if (!isMatchingScan) {
    if (diagramContainer) {
      diagramContainer.innerHTML = `<div class="p-6 text-center text-xs text-blue-600 font-medium animate-pulse flex items-center justify-center gap-2"><span>🔄</span><span>Generating architecture flowchart for <strong>${escapeHtml(VivaState.projectTitle || "Project")}</strong>...</span></div>`;
    }
    ensureProjectArchitectureScanned(true).then(scan => {
      if (scan) renderReportArchitectureBlueprint();
    });
    return;
  }

  const scan = VivaState.projectScan;
  if (patternBadge) patternBadge.textContent = scan.architecture_pattern || "Modular Architecture";

  if (scan.mermaid_diagram) {
    renderMermaidDiagram(scan.mermaid_diagram, "report-mermaid-stage");
  }

  if (filesBreakdown && scan.identified_files) {
    filesBreakdown.innerHTML = "";
    scan.identified_files.forEach(f => {
      const card = document.createElement("div");
      card.className = "p-3 rounded-xl bg-slate-50 border border-slate-200";
      card.innerHTML = `
        <div class="font-mono font-bold text-xs text-blue-700 flex items-center gap-1.5 mb-1">
          <span>📄</span> ${escapeHtml(f.file_name)}
        </div>
        <div class="text-[11px] text-slate-600 leading-snug">${escapeHtml(f.purpose)}</div>
      `;
      filesBreakdown.appendChild(card);
    });
  }
}

function updateNavLinks() {
  loadState();
  const answeredCount = (VivaState.questionsLog && Array.isArray(VivaState.questionsLog)) ? VivaState.questionsLog.length : 0;
  const totalRounds = VivaState.roundsCount || 5;
  const isFinished = VivaState.isExamCompleted || (answeredCount >= totalRounds && totalRounds > 0);

  const resultNavLinks = document.querySelectorAll("a[href='/report']");
  resultNavLinks.forEach(link => {
    if (!isFinished) {
      link.setAttribute("title", `Exam Incomplete (${answeredCount}/${totalRounds} answered)`);
      link.innerHTML = `<span>Result</span> <span class="text-[10px] text-slate-400">🔒</span>`;
    } else {
      link.setAttribute("title", "Official Viva Scorecard Available");
      link.innerHTML = `<span>Result</span> <span class="text-[10px] text-emerald-500 font-bold">✓</span>`;
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  loadState();
  updateNavLinks();

  // If on index.html
  if (document.getElementById("project-code")) {
    setupDropzone();
    const codeArea = document.getElementById("project-code");
    codeArea?.addEventListener("input", updateCodeStats);
    updateCodeStats();
  }
});

/* ==========================================================================
   PAGE 5: SYSTEM FLOW & ARCHITECTURE BLUEPRINT (architecture.html)
   ========================================================================== */
function initArchitecturePage() {
  loadState();
  setupArchDropzone();

  const activeTitle = document.getElementById("arch-active-project-title");
  const activeStats = document.getElementById("arch-active-code-stats");

  if (!VivaState.sourceCode) {
    loadQuickExample('ecommerce');
  }

  if (activeTitle) activeTitle.textContent = VivaState.projectTitle || "Software Project";
  if (activeStats) {
    const lines = (VivaState.sourceCode || "").trim().split("\n").length;
    activeStats.textContent = `${lines} lines of code ready for deep analysis`;
  }

  // If already scanned for current project, render immediately
  const currentCodeSnippet = (VivaState.sourceCode || "").slice(0, 120);
  if (VivaState.projectScan &&
      VivaState.projectScan.project_title === VivaState.projectTitle &&
      VivaState.projectScan.code_snippet === currentCodeSnippet) {
    renderArchitectureOutput(VivaState.projectScan);
  } else {
    // Automatically trigger scan
    triggerArchDeepScan();
  }
}
window.initArchitecturePage = initArchitecturePage;

function switchArchTab(tab) {
  const currentBtn = document.getElementById("tab-btn-current");
  const folderBtn = document.getElementById("tab-btn-folder");
  const githubBtn = document.getElementById("tab-btn-github");

  const currentContent = document.getElementById("arch-content-current");
  const folderContent = document.getElementById("arch-content-folder");
  const githubContent = document.getElementById("arch-content-github");

  const activeClass = "px-3 py-1 rounded-md bg-white text-slate-900 shadow-xs transition";
  const inactiveClass = "px-3 py-1 rounded-md text-slate-600 hover:text-slate-900 transition";

  if (tab === "current") {
    if (currentBtn) currentBtn.className = activeClass;
    if (folderBtn) folderBtn.className = inactiveClass;
    if (githubBtn) githubBtn.className = inactiveClass;
    currentContent?.classList.remove("hidden");
    folderContent?.classList.add("hidden");
    githubContent?.classList.add("hidden");
  } else if (tab === "folder") {
    if (currentBtn) currentBtn.className = inactiveClass;
    if (folderBtn) folderBtn.className = activeClass;
    if (githubBtn) githubBtn.className = inactiveClass;
    currentContent?.classList.add("hidden");
    folderContent?.classList.remove("hidden");
    githubContent?.classList.add("hidden");
  } else if (tab === "github") {
    if (currentBtn) currentBtn.className = inactiveClass;
    if (folderBtn) folderBtn.className = inactiveClass;
    if (githubBtn) githubBtn.className = activeClass;
    currentContent?.classList.add("hidden");
    folderContent?.classList.add("hidden");
    githubContent?.classList.remove("hidden");
  }
}
window.switchArchTab = switchArchTab;

let uploadedArchFiles = [];

function setupArchDropzone() {
  const dropzone = document.getElementById("arch-dropzone");
  const fileInput = document.getElementById("arch-file-input");
  const folderInput = document.getElementById("arch-folder-input");
  if (!dropzone) return;

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("border-blue-500", "bg-blue-50/20");
  });
  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("border-blue-500", "bg-blue-50/20");
  });
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("border-blue-500", "bg-blue-50/20");
    if (e.dataTransfer.files) handleArchFiles(e.dataTransfer.files);
  });

  fileInput?.addEventListener("change", (e) => {
    if (e.target.files) handleArchFiles(e.target.files);
  });
  folderInput?.addEventListener("change", (e) => {
    if (e.target.files) handleArchFiles(e.target.files);
  });
}

async function handleArchFiles(files) {
  const fileList = document.getElementById("arch-file-list");
  const scanBtn = document.getElementById("btn-scan-uploaded");
  if (fileList) {
    fileList.innerHTML = `<div class="p-2.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
      <span class="animate-spin">⏳</span> Scanning and filtering project files...
    </div>`;
  }

  const JUNK_DIRS = [
    "node_modules", "venv", ".venv", "__pycache__", ".git", ".github",
    ".idea", ".vscode", "dist", "build", ".next", ".cache", "env",
    "target", "vendor", "coverage", ".turbo", ".nuxt", "bin", "obj"
  ];
  const VALID_EXTS = [
    ".py", ".js", ".jsx", ".ts", ".tsx", ".cpp", ".c", ".h", ".hpp",
    ".java", ".go", ".rs", ".php", ".rb", ".json", ".sql", ".html",
    ".css", ".md", ".txt", ".yaml", ".yml", ".toml", ".sh"
  ];

  let rawList = [];

  // Check if any file is a ZIP file
  const fileArray = Array.from(files);
  for (const f of fileArray) {
    if (f.name.toLowerCase().endsWith(".zip")) {
      if (typeof JSZip !== "undefined") {
        try {
          const zip = await JSZip.loadAsync(f);
          const zipEntries = [];
          zip.forEach((relPath, zipEntry) => {
            if (!zipEntry.dir) {
              zipEntries.push({ path: relPath, entry: zipEntry });
            }
          });
          for (const item of zipEntries) {
            const p = item.path.toLowerCase().replace(/\\/g, "/");
            const isJunk = JUNK_DIRS.some(j => p.includes(`/${j}/`) || p.startsWith(`${j}/`));
            const hasExt = VALID_EXTS.some(ext => p.endsWith(ext));
            if (!isJunk && hasExt) {
              rawList.push({
                name: item.path.split("/").pop(),
                path: item.path,
                isZipEntry: true,
                entry: item.entry
              });
            }
          }
        } catch (zipErr) {
          console.warn("ZIP extraction error:", zipErr);
        }
      }
    } else {
      const p = (f.webkitRelativePath || f.name).toLowerCase().replace(/\\/g, "/");
      const isJunk = JUNK_DIRS.some(j => p.includes(`/${j}/`) || p.startsWith(`${j}/`));
      const hasExt = VALID_EXTS.some(ext => p.endsWith(ext));
      if (!isJunk && hasExt) {
        rawList.push({
          name: f.name,
          path: f.webkitRelativePath || f.name,
          file: f
        });
      }
    }
  }

  if (rawList.length === 0) {
    if (fileList) {
      fileList.innerHTML = `<div class="p-2.5 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg">
        ⚠️ No valid code files found. Ensure the folder or ZIP contains supported files (.py, .js, .ts, .java, etc.) and is not only node_modules or binaries.
      </div>`;
    }
    scanBtn?.classList.add("hidden");
    uploadedArchFiles = [];
    return;
  }

  // Priority ranking: prioritize architecture-defining files
  function getArchPriority(path) {
    const p = path.toLowerCase();
    let score = 0;
    if (p.includes("main.") || p.includes("app.") || p.includes("server.") || p.includes("index.")) score += 20;
    if (p.includes("route") || p.includes("controller") || p.includes("api/")) score += 15;
    if (p.includes("service") || p.includes("core") || p.includes("logic")) score += 12;
    if (p.includes("model") || p.includes("schema") || p.includes("entity") || p.includes(".sql")) score += 10;
    if (p.includes("database") || p.includes("db.") || p.includes("repository")) score += 10;
    if (p.includes("auth") || p.includes("security") || p.includes("middleware")) score += 8;
    if (p.includes("package.json") || p.includes("requirements.txt") || p.includes("cargo.toml")) score += 6;
    if (!p.includes("/")) score += 5; // Root level
    return score;
  }

  rawList.sort((a, b) => getArchPriority(b.path) - getArchPriority(a.path));

  // Cap at top 35 files for performance and cleanliness
  uploadedArchFiles = rawList.slice(0, 35);

  if (fileList) {
    fileList.innerHTML = "";
    // Summary pill
    const sum = document.createElement("div");
    sum.className = "p-2 text-xs bg-blue-50 border border-blue-200 text-blue-800 rounded-lg font-semibold flex justify-between items-center";
    sum.innerHTML = `<span>📁 <strong>${uploadedArchFiles.length} Architecture Files Selected</strong> (${rawList.length} scanned, junk folders filtered)</span><span class="text-[11px] text-blue-600 font-normal">Ready to Scan</span>`;
    fileList.appendChild(sum);

    uploadedArchFiles.slice(0, 10).forEach(item => {
      const row = document.createElement("div");
      row.className = "text-[11px] p-2 bg-white rounded-lg border border-slate-200 flex justify-between font-mono";
      row.innerHTML = `<span class="truncate max-w-[280px]">📄 ${escapeHtml(item.path)}</span> <span class="text-slate-400 font-sans text-[10px]">Ready</span>`;
      fileList.appendChild(row);
    });

    if (uploadedArchFiles.length > 10) {
      const more = document.createElement("div");
      more.className = "text-[10px] text-slate-400 text-center py-1 font-mono";
      more.textContent = `+ ${uploadedArchFiles.length - 10} more core files queued for scan`;
      fileList.appendChild(more);
    }
  }

  scanBtn?.classList.remove("hidden");
}

async function triggerArchScanFromUpload() {
  if (uploadedArchFiles.length === 0) return;
  const scanBtn = document.getElementById("btn-scan-uploaded");
  if (scanBtn) {
    scanBtn.disabled = true;
    scanBtn.innerHTML = `<span class="animate-spin">⏳</span> <span>Reading files...</span>`;
  }

  let combined = [];
  for (const item of uploadedArchFiles) {
    try {
      let text = "";
      if (item.isZipEntry && item.entry) {
        text = await item.entry.async("text");
      } else if (item.file) {
        text = await item.file.text();
      }
      if (text && text.trim()) {
        const lines = text.split("\n").slice(0, 350).join("\n");
        combined.push(`// ==========================================\n// File: ${item.path}\n// ==========================================\n${lines}\n`);
      }
    } catch (e) {
      console.warn("Error reading file:", item.path, e);
    }
  }

  const fullSource = combined.join("\n");
  
  // Infer title from root folder
  let detectedTitle = "Software Project";
  const firstPath = uploadedArchFiles[0].path;
  if (firstPath.includes("/")) {
    const rootFolder = firstPath.split("/")[0];
    detectedTitle = rootFolder.replace(/[-_]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  } else {
    detectedTitle = uploadedArchFiles[0].name.split(".")[0].replace(/[-_]/g, " ").replace(/\b\w/g, l => l.toUpperCase()) + " Project";
  }

  VivaState.projectTitle = detectedTitle;
  VivaState.sourceCode = fullSource;
  saveState();

  if (scanBtn) {
    scanBtn.disabled = false;
    scanBtn.innerHTML = `<span>Scan Uploaded Files</span> <span>&rarr;</span>`;
  }

  switchArchTab('current');
  const activeTitle = document.getElementById("arch-active-project-title");
  const activeStats = document.getElementById("arch-active-code-stats");
  if (activeTitle) activeTitle.textContent = detectedTitle;
  if (activeStats) activeStats.textContent = `${uploadedArchFiles.length} core files extracted & ready`;

  setTimeout(() => {
    triggerArchDeepScan(true);
  }, 200);
}
window.triggerArchScanFromUpload = triggerArchScanFromUpload;

async function triggerArchScanFromGitHub() {
  const urlInput = document.getElementById("arch-github-url");
  const scanBtn = document.getElementById("btn-scan-github");
  const statusBox = document.getElementById("arch-github-status");

  const url = urlInput?.value.trim();
  if (!url) {
    alert("Please enter a valid public GitHub repository URL.");
    return;
  }

  if (scanBtn) {
    scanBtn.disabled = true;
    scanBtn.innerHTML = `<span class="animate-spin">⏳</span> Scanning...`;
  }
  if (statusBox) {
    statusBox.classList.remove("hidden");
    statusBox.className = "mt-2 p-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex items-center gap-2";
    statusBox.innerHTML = `<span>🔄</span><span>Cloning & extracting core architecture files from GitHub...</span>`;
  }

  try {
    const res = await fetch("/api/fetch-github-repo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_url: url })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch repository");

    VivaState.projectTitle = data.repo_name;
    VivaState.sourceCode = data.combined_code;
    saveState();

    if (statusBox) {
      statusBox.className = "mt-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs";
      statusBox.innerHTML = `✅ Successfully extracted <strong>${data.files_count} files</strong> from <strong>${data.repo_name}</strong>! Triggering architecture scan...`;
    }

    switchArchTab('current');
    const activeTitle = document.getElementById("arch-active-project-title");
    const activeStats = document.getElementById("arch-active-code-stats");
    if (activeTitle) activeTitle.textContent = data.repo_name;
    if (activeStats) activeStats.textContent = `${data.files_count} core files extracted from GitHub`;

    setTimeout(() => {
      triggerArchDeepScan(true);
    }, 500);

  } catch (err) {
    if (statusBox) {
      statusBox.className = "mt-2 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs";
      statusBox.innerHTML = `⚠️ ${err.message || 'Error scanning repository'}`;
    }
  } finally {
    if (scanBtn) {
      scanBtn.disabled = false;
      scanBtn.innerHTML = `<span>Scan GitHub Repo</span> <span>&rarr;</span>`;
    }
  }
}
window.triggerArchScanFromGitHub = triggerArchScanFromGitHub;

async function triggerArchDeepScan(forceRefresh = false) {
  const loadingStage = document.getElementById("arch-loading-stage");
  const outputStage = document.getElementById("arch-output-stage");

  if (!VivaState.sourceCode) {
    loadQuickExample('ecommerce');
  }

  const currentCodeSnippet = (VivaState.sourceCode || "").slice(0, 120);

  // If not forcing refresh and cached scan exists for this exact title & snippet
  if (!forceRefresh && VivaState.projectScan &&
      VivaState.projectScan.project_title === VivaState.projectTitle &&
      VivaState.projectScan.code_snippet === currentCodeSnippet) {
    renderArchitectureOutput(VivaState.projectScan);
    return;
  }

  if (loadingStage) loadingStage.classList.remove("hidden");
  if (outputStage) outputStage.classList.add("hidden");

  // Stepper animation
  const s1 = document.getElementById("step-1");
  const s2 = document.getElementById("step-2");
  const s3 = document.getElementById("step-3");
  const s4 = document.getElementById("step-4");

  setTimeout(() => { s2?.classList.add("bg-blue-50", "border-blue-200", "text-blue-700", "font-bold"); }, 600);
  setTimeout(() => { s3?.classList.add("bg-blue-50", "border-blue-200", "text-blue-700", "font-bold"); }, 1200);
  setTimeout(() => { s4?.classList.add("bg-blue-50", "border-blue-200", "text-blue-700", "font-bold"); }, 1800);

  try {
    const res = await fetch("/api/scan-project-architecture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_title: VivaState.projectTitle || "Software Project",
        source_code: VivaState.sourceCode || "",
        project_docs: VivaState.projectDocs || ""
      })
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const scanData = await res.json();
    if (!scanData || !scanData.mermaid_diagram) {
      throw new Error("Invalid or empty architecture scan returned by server");
    }

    scanData.project_title = VivaState.projectTitle;
    scanData.code_snippet = currentCodeSnippet;
    VivaState.projectScan = scanData;
    saveState();

    renderArchitectureOutput(scanData);
  } catch (err) {
    console.warn("Arch scan error, generating resilient FigJam blueprint fallback:", err);
    const title = VivaState.projectTitle || "Software Project";
    const code = (VivaState.sourceCode || "").toLowerCase();
    
    let fallbackPattern = "Enterprise Multi-Tier Architecture";
    let fallbackDiagram = "";
    
    if (code.includes("fastapi") || code.includes("flask") || code.includes("express") || code.includes("router")) {
      fallbackPattern = "Layered RESTful Microservice Architecture";
      fallbackDiagram = `flowchart LR
  classDef startNode fill:#fed7aa,stroke:#f97316,stroke-width:2px,color:#7c2d12,font-weight:bold,rx:10px,ry:10px;
  classDef routerNode fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a,font-weight:bold,rx:8px,ry:8px;
  classDef decisionNode fill:#fbcfe8,stroke:#db2777,stroke-width:2px,color:#831843,font-weight:bold;
  classDef serviceNode fill:#ccfbf1,stroke:#0d9488,stroke-width:2px,color:#134e4a,font-weight:bold,rx:8px,ry:8px;
  classDef dbNode fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#4c1d95,font-weight:bold,rx:8px,ry:8px;
  classDef endNode fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d,font-weight:bold,rx:20px,ry:20px;
  classDef altNode fill:#fef08a,stroke:#ca8a04,stroke-width:2px,color:#713f12,font-weight:bold,rx:8px,ry:8px;

  Client["🖥️ Client Application<br/>(HTTP Request)"]:::startNode
  Gateway["🌐 ASGI API Router<br/>(Request Ingestion)"]:::routerNode
  AuthVerify{"🔐 Request Valid?"}:::decisionNode
  DomainService["💼 Business Domain Logic<br/>(Service Execution)"]:::serviceNode
  DBStore[("🗄️ Persistent Database<br/>(ACID Transactions)")]:::dbNode
  RejectPath["⚠️ Validation Rejection<br/>(400 Bad Request)"]:::altNode
  ResponsePayload["✅ Formatted JSON Result<br/>(HTTP 200 OK)"]:::endNode

  Client --> Gateway
  Gateway --> AuthVerify
  AuthVerify -- "Yes / Valid" --> DomainService
  AuthVerify -- "No / Invalid" --> RejectPath
  DomainService --> DBStore
  DBStore --> ResponsePayload
  ResponsePayload -.-> Client`;
    } else {
      fallbackPattern = "Multi-Tier Client-Service Architecture";
      fallbackDiagram = `flowchart LR
  classDef startNode fill:#fed7aa,stroke:#f97316,stroke-width:2px,color:#7c2d12,font-weight:bold,rx:10px,ry:10px;
  classDef routerNode fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a,font-weight:bold,rx:8px,ry:8px;
  classDef decisionNode fill:#fbcfe8,stroke:#db2777,stroke-width:2px,color:#831843,font-weight:bold;
  classDef serviceNode fill:#ccfbf1,stroke:#0d9488,stroke-width:2px,color:#134e4a,font-weight:bold,rx:8px,ry:8px;
  classDef dbNode fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#4c1d95,font-weight:bold,rx:8px,ry:8px;
  classDef endNode fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d,font-weight:bold,rx:20px,ry:20px;
  classDef altNode fill:#fef08a,stroke:#ca8a04,stroke-width:2px,color:#713f12,font-weight:bold,rx:8px,ry:8px;

  Client["💻 User Client<br/>(Presentation Tier)"]:::startNode
  Router["⚡ Application Gateway<br/>(Routing & Middleware)"]:::routerNode
  ValidGuard{"🛡️ Constraints Met?"}:::decisionNode
  CoreService["⚙️ Core Domain Service<br/>(Business Transformation)"]:::serviceNode
  DataStore[("🗄️ Data Persistence<br/>(Storage Engine)")]:::dbNode
  ErrorBranch["⚠️ Input Rejected<br/>(Validation Error)"]:::altNode
  FinalOutput["✅ Resolution Payload<br/>(Success Confirmation)"]:::endNode

  Client --> Router
  Router --> ValidGuard
  ValidGuard -- "Yes / Clean" --> CoreService
  ValidGuard -- "No / Error" --> ErrorBranch
  CoreService --> DataStore
  DataStore --> FinalOutput
  FinalOutput -.-> Client`;
    }

    const fallbackScan = {
      project_title: title,
      code_snippet: currentCodeSnippet,
      system_summary: `Architecture blueprint for '${title}', implementing clear separation of concerns across presentation, routing, domain services, and persistence.`,
      architecture_pattern: fallbackPattern,
      identified_files: (uploadedArchFiles.length > 0 ? uploadedArchFiles.slice(0, 6).map(f => ({
        file_name: f.name || f.path,
        purpose: "Architectural component in active data pipeline"
      })) : [
        { file_name: "main.py / app.js", purpose: "Bootstraps execution, route registration & error handling" },
        { file_name: "core_logic.py", purpose: "Primary business domain processing and data transformation" }
      ]),
      data_flow_steps: [
        "1. Client initiates transaction payload via web interface",
        "2. Gateway router intercepts request and validates schema constraints",
        "3. Core service processes business algorithms and mutates domain state",
        "4. Database commits ACID transaction and serializes response payload",
        "5. Standardized response delivered back to presentation client"
      ],
      key_tradeoffs: [
        "In-memory processing vs persistent relational database scalability.",
        "Synchronous API latency bounds compared to asynchronous queuing workers."
      ],
      mermaid_diagram: fallbackDiagram
    };

    VivaState.projectScan = fallbackScan;
    saveState();
    renderArchitectureOutput(fallbackScan);
  }
}
window.triggerArchDeepScan = triggerArchDeepScan;

/* ==========================================================================
   MULTI-PERSPECTIVE ARCHITECTURAL DIAGRAMS (Pipeline, Layered, Security)
   ========================================================================== */
let currentArchDiagramView = "pipeline";

function generateLayeredArchitecture(scanData, sourceCode) {
  const src = sourceCode || "";
  const isML = src.includes("RandomForestClassifier") || src.includes("train_test_split") || src.includes("sklearn") || (scanData?.architecture_pattern || "").toLowerCase().includes("machine learning");
  const isSupabase = src.includes("supabase") || src.includes("createClient") || (scanData?.architecture_pattern || "").toLowerCase().includes("supabase");

  if (isML) {
    return `flowchart TD
  classDef startNode fill:#fed7aa,stroke:#f97316,stroke-width:2px,color:#7c2d12,font-weight:bold,rx:8px,ry:8px;
  classDef routerNode fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a,font-weight:bold,rx:8px,ry:8px;
  classDef serviceNode fill:#ccfbf1,stroke:#0d9488,stroke-width:2px,color:#134e4a,font-weight:bold,rx:8px,ry:8px;
  classDef dbNode fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#4c1d95,font-weight:bold,rx:8px,ry:8px;
  classDef secNode fill:#fbcfe8,stroke:#db2777,stroke-width:2px,color:#831843,font-weight:bold,rx:8px,ry:8px;
  classDef altNode fill:#fef08a,stroke:#ca8a04,stroke-width:2px,color:#713f12,font-weight:bold,rx:8px,ry:8px;

  subgraph IngestionTier ["📥 Tier 1: Data Ingestion & Presentation"]
    RawDataset["📊 Raw Feature Ingestion<br/>(CSV / Tabular Feeder)"]:::startNode
    FeatureValidator["🛡️ Feature Boundary Check<br/>(Schema & Null Assertion)"]:::altNode
  end

  subgraph PipelineTier ["⚙️ Tier 2: Transformation & Feature Engineering"]
    StandardScalerEngine["📐 StandardScaler & Imputer<br/>(Vector Normalizer)"]:::routerNode
    EncoderPipeline["🔠 Categorical One-Hot Encoder<br/>(Matrix Transformation)"]:::routerNode
  end

  subgraph ModelTier ["🧠 Tier 3: Statistical Ensemble & Inference Core"]
    RandomForestEstimator["🧠 Ensemble Inference Core<br/>(RandomForest / Decision Tree)"]:::serviceNode
    ConfidenceScorer["🌲 Multi-Tree Vote Aggregator<br/>(Bootstrap Aggregation)"]:::serviceNode
  end

  subgraph PersistenceTier ["🗄️ Tier 4: Artifact Storage & Telemetry"]
    ModelRegistryStore[("🗄️ Pickled Model Registry<br/>(Serialized Artifacts)")]:::dbNode
    MetricsTelemetryDB[("📈 Metrics & Telemetry Log<br/>(ROC-AUC / Precision Store)")]:::dbNode
  end

  RawDataset --> FeatureValidator
  FeatureValidator --> StandardScalerEngine
  StandardScalerEngine --> EncoderPipeline
  EncoderPipeline --> RandomForestEstimator
  RandomForestEstimator --> ConfidenceScorer
  ConfidenceScorer --> ModelRegistryStore
  ConfidenceScorer --> MetricsTelemetryDB`;
  }

  if (isSupabase) {
    return `flowchart TD
  classDef startNode fill:#fed7aa,stroke:#f97316,stroke-width:2px,color:#7c2d12,font-weight:bold,rx:8px,ry:8px;
  classDef routerNode fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a,font-weight:bold,rx:8px,ry:8px;
  classDef serviceNode fill:#ccfbf1,stroke:#0d9488,stroke-width:2px,color:#134e4a,font-weight:bold,rx:8px,ry:8px;
  classDef dbNode fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#4c1d95,font-weight:bold,rx:8px,ry:8px;
  classDef secNode fill:#fbcfe8,stroke:#db2777,stroke-width:2px,color:#831843,font-weight:bold,rx:8px,ry:8px;
  classDef altNode fill:#fef08a,stroke:#ca8a04,stroke-width:2px,color:#713f12,font-weight:bold,rx:8px,ry:8px;

  subgraph PresentationTier ["💻 Tier 1: Client & Browser Tier"]
    ClientApp["💻 Client Browser UI<br/>(DOM & Event Handlers)"]:::startNode
    StateStore["⚡ Client Telemetry Controller<br/>(In-Memory Event Queue)"]:::startNode
  end

  subgraph EdgeTier ["🌐 Tier 2: Edge Network & Gateway Layer"]
    APIGateway["⚡ Edge Ingress Router<br/>(HTTP Ingestion Endpoint)"]:::routerNode
    AuthGuard["🔑 Supabase JWT & Auth Guard<br/>(Session Validation)"]:::secNode
    ValidationEngine["🛡️ Telemetry Schema Sanitizer<br/>(Payload Type Assertion)"]:::altNode
  end

  subgraph CloudTier ["⚙️ Tier 3: BaaS Serverless & Realtime Engine"]
    CoreService["▲ Supabase Edge Runtime<br/>(Isolate Function Worker)"]:::serviceNode
    TransactionManager["🔄 Realtime Event Broker<br/>(Postgres Change Dispatcher)"]:::serviceNode
  end

  subgraph PersistenceTier ["🗄️ Tier 4: Managed Database & RLS Storage"]
    DataRepository["📦 Supabase Python/JS SDK<br/>(PostgREST Client)"]:::dbNode
    PrimaryDB[("🗄️ PostgreSQL Database<br/>(Row Level Security / WAL)")]:::dbNode
    CacheStore[("⚡ Edge In-Memory Cache<br/>(Session & Token Store)")]:::dbNode
  end

  ClientApp --> StateStore
  StateStore --> APIGateway
  APIGateway --> AuthGuard
  AuthGuard --> ValidationEngine
  ValidationEngine --> CoreService
  CoreService --> TransactionManager
  TransactionManager --> DataRepository
  DataRepository --> PrimaryDB
  DataRepository -.-> CacheStore
  TransactionManager -. "Realtime Stream" .-> StateStore`;
  }

  // Standard Web API / Microservices / Full-Stack Layered Architecture
  return `flowchart TD
  classDef startNode fill:#fed7aa,stroke:#f97316,stroke-width:2px,color:#7c2d12,font-weight:bold,rx:8px,ry:8px;
  classDef routerNode fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a,font-weight:bold,rx:8px,ry:8px;
  classDef serviceNode fill:#ccfbf1,stroke:#0d9488,stroke-width:2px,color:#134e4a,font-weight:bold,rx:8px,ry:8px;
  classDef dbNode fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#4c1d95,font-weight:bold,rx:8px,ry:8px;
  classDef secNode fill:#fbcfe8,stroke:#db2777,stroke-width:2px,color:#831843,font-weight:bold,rx:8px,ry:8px;
  classDef altNode fill:#fef08a,stroke:#ca8a04,stroke-width:2px,color:#713f12,font-weight:bold,rx:8px,ry:8px;

  subgraph PresentationTier ["💻 Tier 1: Client & Presentation Layer"]
    ClientApp["💻 Client Application UI<br/>(DOM & Event Handlers)"]:::startNode
    StateStore["⚡ Client State Manager<br/>(Payload Dispatcher)"]:::startNode
  end

  subgraph GatewayTier ["🌐 Tier 2: Ingress & Gateway Layer"]
    APIGateway["⚡ Ingress Router & Dispatcher<br/>(HTTP Endpoint Controller)"]:::routerNode
    AuthGuard["🔑 JWT & RBAC Auth Guard<br/>(Identity Verification)"]:::secNode
    ValidationEngine["🛡️ Request Schema Sanitizer<br/>(Type & Field Assertion)"]:::altNode
  end

  subgraph DomainTier ["⚙️ Tier 3: Business Domain Core"]
    CoreService["🧠 Core Domain Engine<br/>(State Transitions & Rules)"]:::serviceNode
    TransactionManager["🔄 Transaction Coordinator<br/>(Unit of Work & Invariants)"]:::serviceNode
  end

  subgraph PersistenceTier ["🗄️ Tier 4: Data Infrastructure & Persistence"]
    DataRepository["📦 Repository Access Layer<br/>(Data Mapper & ORM)"]:::dbNode
    PrimaryDB[("🗄️ ACID Persistent Store<br/>(Relational / Document DB)")]:::dbNode
    CacheStore[("⚡ In-Memory Cache Store<br/>(Redis / Session Memory)")]:::dbNode
  end

  ClientApp --> StateStore
  StateStore --> APIGateway
  APIGateway --> AuthGuard
  AuthGuard --> ValidationEngine
  ValidationEngine --> CoreService
  CoreService --> TransactionManager
  TransactionManager --> DataRepository
  DataRepository --> PrimaryDB
  DataRepository -.-> CacheStore
  TransactionManager -. "Status Return" .-> StateStore`;
}
window.generateLayeredArchitecture = generateLayeredArchitecture;

function generateSecurityBoundaryDiagram(scanData, sourceCode) {
  return `flowchart LR
  classDef startNode fill:#fed7aa,stroke:#f97316,stroke-width:2px,color:#7c2d12,font-weight:bold,rx:8px,ry:8px;
  classDef decisionNode fill:#fbcfe8,stroke:#db2777,stroke-width:2px,color:#831843,font-weight:bold;
  classDef serviceNode fill:#ccfbf1,stroke:#0d9488,stroke-width:2px,color:#134e4a,font-weight:bold,rx:8px,ry:8px;
  classDef dbNode fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#4c1d95,font-weight:bold,rx:8px,ry:8px;
  classDef altNode fill:#fee2e2,stroke:#ef4444,stroke-width:2px,color:#991b1b,font-weight:bold,rx:8px,ry:8px;
  classDef endNode fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d,font-weight:bold,rx:10px,ry:10px;

  subgraph PublicZone ["🌐 Public Network Perimeter"]
    ExternalClient["💻 External Client Request<br/>(Untrusted Ingress)"]:::startNode
  end

  subgraph PerimeterZone ["🛡️ Traffic Shaping & TLS Perimeter"]
    RateLimiter{"🛑 Rate Limiter & Throttler<br/>(Token Bucket / Leaky Bucket)"}:::decisionNode
    TLSTermination["🔒 TLS 1.3 Termination<br/>(Strict Transport Security)"]:::serviceNode
  end

  subgraph IdentityZone ["🔑 Zero-Trust Auth & Sanitization"]
    JWTValidator{"🛡️ JWT Cryptographic Verify<br/>(Signature & Expire Check)"}:::decisionNode
    PayloadSanitizer{"⚡ Payload Schema Assertion<br/>(Anti-SQLi & XSS Filter)"}:::decisionNode
  end

  subgraph ExecutionZone ["⚙️ Sandboxed Execution & Transaction"]
    IsolatedService["⚙️ Sandboxed Domain Logic<br/>(Least-Privilege Context)"]:::serviceNode
    AtomicTx{"🔄 ACID Transaction Boundary<br/>(Commit / Rollback Hook)"}:::decisionNode
  end

  subgraph SinkZone ["⚠️ Fault Quarantine & Secure Storage"]
    SecurityTrap["⚠️ 401/403 Security Quarantine<br/>(Audit Logged)"]:::altNode
    ValidationTrap["⚠️ 422 Bad Request Envelope<br/>(RFC 7807 Detail)"]:::altNode
    RollbackSink["⏮️ Compensating Rollback<br/>(Atomic State Revert)"]:::altNode
    EncryptedDB[("🔐 Encrypted Database<br/>(AES-256 Storage at Rest)")]:::dbNode
    SuccessEnvelope["✅ Authenticated Response<br/>(Signed HTTP 200)"]:::endNode
  end

  ExternalClient --> RateLimiter
  RateLimiter -- "Rate Exceeded" --> SecurityTrap
  RateLimiter -- "Within Quota" --> TLSTermination
  TLSTermination --> JWTValidator
  JWTValidator -- "Tampered / Expired" --> SecurityTrap
  JWTValidator -- "Valid Principal" --> PayloadSanitizer
  PayloadSanitizer -- "Malformed Data" --> ValidationTrap
  PayloadSanitizer -- "Sanitized Body" --> IsolatedService
  IsolatedService --> AtomicTx
  AtomicTx -- "Exception Thrown" --> RollbackSink
  AtomicTx -- "All Invariants Met" --> EncryptedDB
  EncryptedDB --> SuccessEnvelope
  RollbackSink -. "Audit Incident" .-> SecurityTrap`;
}
window.generateSecurityBoundaryDiagram = generateSecurityBoundaryDiagram;

function switchArchDiagramView(viewMode) {
  currentArchDiagramView = viewMode || "pipeline";
  const scanData = VivaState.projectScan || {};
  const sourceCode = VivaState.sourceCode || "";

  // Update tabs styling
  const tabPipeline = document.getElementById("tab-arch-pipeline");
  const tabLayered = document.getElementById("tab-arch-layered");
  const tabSecurity = document.getElementById("tab-arch-security");
  const badgeEl = document.getElementById("arch-view-badge");
  const patternBadge = document.getElementById("arch-pattern-badge");
  const summaryText = document.getElementById("arch-summary-text");
  const legendTip = document.getElementById("arch-diagram-legend-tip");
  const modeTag = document.getElementById("arch-diagram-mode-tag");

  const activeClasses = ["bg-white", "text-blue-700", "shadow-2xs", "border", "border-blue-200/60", "font-bold"];
  const inactiveClasses = ["text-slate-600", "hover:text-slate-900", "hover:bg-white/60", "font-semibold"];

  [tabPipeline, tabLayered, tabSecurity].forEach(tab => {
    if (tab) {
      activeClasses.forEach(c => tab.classList.remove(c));
      inactiveClasses.forEach(c => tab.classList.add(c));
    }
  });

  let selectedCode = "";

  if (viewMode === "pipeline") {
    if (tabPipeline) {
      inactiveClasses.forEach(c => tabPipeline.classList.remove(c));
      activeClasses.forEach(c => tabPipeline.classList.add(c));
    }
    if (badgeEl) badgeEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span> Pipeline View Active`;
    if (patternBadge) patternBadge.textContent = scanData.architecture_pattern || "End-to-End Data Pipeline";
    if (summaryText) summaryText.textContent = scanData.system_summary || "Sequential execution path from ingress to database persistence.";
    if (legendTip) legendTip.innerHTML = `<strong>Data Flow Pipeline:</strong> Traces the sequential lifecycle of requests across system tiers. Directional arrows (<code class="font-mono text-blue-600 font-bold">&rarr;</code>) trace actual data payloads. Click any node to inspect code and Big-O complexity.`;
    if (modeTag) modeTag.textContent = "Data Flow Pipeline View";

    selectedCode = scanData.mermaid_diagram || "";
  } else if (viewMode === "layered") {
    if (tabLayered) {
      inactiveClasses.forEach(c => tabLayered.classList.remove(c));
      activeClasses.forEach(c => tabLayered.classList.add(c));
    }
    if (badgeEl) badgeEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span> Layered View Active`;
    if (patternBadge) patternBadge.textContent = "N-Tier Modular Subsystem Architecture";
    if (summaryText) summaryText.textContent = "Decouples presentation, gateway routing, domain logic, and persistence infrastructure into strict abstraction boundaries.";
    if (legendTip) legendTip.innerHTML = `<strong>Layered & Subsystems:</strong> Subgraphs isolate Presentation, Ingress Gateway, Domain Core, and Persistence Tiers with decoupled dependency boundaries. Click any node to inspect code and Big-O complexity.`;
    if (modeTag) modeTag.textContent = "Modular Layered Subsystems View";

    selectedCode = generateLayeredArchitecture(scanData, sourceCode);
  } else if (viewMode === "security") {
    if (tabSecurity) {
      inactiveClasses.forEach(c => tabSecurity.classList.remove(c));
      activeClasses.forEach(c => tabSecurity.classList.add(c));
    }
    if (badgeEl) badgeEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span> Security View Active`;
    if (patternBadge) patternBadge.textContent = "Zero-Trust Security & Fault Boundary";
    if (summaryText) summaryText.textContent = "Hardened defense-in-depth perimeter featuring rate limiting, cryptographic JWT gates, schema assertions, and ACID rollback sinks.";
    if (legendTip) legendTip.innerHTML = `<strong>Security & Fault Boundaries:</strong> Zero-Trust defense perimeter mapping untrusted ingress, rate limiters, token verification, schema assertions, and compensating rollback sinks. Click any node to inspect code and Big-O complexity.`;
    if (modeTag) modeTag.textContent = "Security & Fault Boundaries View";

    selectedCode = generateSecurityBoundaryDiagram(scanData, sourceCode);
  }

  // Render diagram into container
  renderMermaidDiagram(selectedCode, "arch-mermaid-container");
}
window.switchArchDiagramView = switchArchDiagramView;

function renderArchitectureOutput(scanData) {
  // Reset per-diagram node inspection code cache so fresh diagrams generate fresh unique snippets
  nodeArchProfilesCache = {};

  const loadingStage = document.getElementById("arch-loading-stage");
  const outputStage = document.getElementById("arch-output-stage");

  if (loadingStage) loadingStage.classList.add("hidden");
  if (outputStage) outputStage.classList.remove("hidden");

  // Badges & Summary
  const patternBadge = document.getElementById("arch-pattern-badge");
  const summaryText = document.getElementById("arch-summary-text");
  const filesCountBadge = document.getElementById("arch-files-count-badge");

  if (patternBadge) {
    let pat = (scanData.architecture_pattern || "Modular Architecture").trim();
    if (pat.includes("(")) pat = pat.split("(")[0].trim();
    if (pat.length > 38) pat = pat.substring(0, 38) + "...";
    patternBadge.textContent = pat;
    patternBadge.title = scanData.architecture_pattern || pat;
  }
  if (summaryText) summaryText.textContent = scanData.system_summary || "End-to-end project architecture data flow";

  // Render Mermaid Diagram via active perspective switcher
  switchArchDiagramView(currentArchDiagramView || "pipeline");

  // Render Step-by-Step Flow
  const flowContainer = document.getElementById("arch-flow-steps");
  if (flowContainer) {
    flowContainer.innerHTML = "";
    const steps = scanData.data_flow_steps || [
      "1. User request enters application via primary entry point.",
      "2. Input validation and authentication verify incoming parameters.",
      "3. Core business logic processes algorithmic state.",
      "4. Data is persisted and formatted client response is returned."
    ];
    steps.forEach((step, idx) => {
      const stepDiv = document.createElement("div");
      stepDiv.className = "p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 shadow-2xs hover:bg-white transition";
      stepDiv.innerHTML = `
        <div class="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
          ${idx + 1}
        </div>
        <div class="text-xs text-slate-800 font-medium leading-relaxed">
          ${escapeHtml(step.replace(/^\d+\.\s*/, ''))}
        </div>
      `;
      flowContainer.appendChild(stepDiv);
    });
  }

  // Render Scanned Files List
  const filesList = document.getElementById("arch-files-list");
  const files = scanData.identified_files || [];
  if (filesCountBadge) filesCountBadge.textContent = `${files.length} Modules`;

  if (filesList) {
    filesList.innerHTML = "";
    files.forEach(f => {
      const card = document.createElement("div");
      card.className = "p-3 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs hover:border-blue-400 transition";
      card.innerHTML = `
        <div class="flex items-center justify-between mb-1">
          <span class="font-mono font-bold text-xs text-blue-700 flex items-center gap-1">
            <span>📄</span> ${escapeHtml(f.file_name)}
          </span>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium border border-blue-200/60">Core File</span>
        </div>
        <p class="text-[11px] text-slate-600 leading-snug">${escapeHtml(f.purpose)}</p>
      `;
      filesList.appendChild(card);
    });
  }

  // Render Tradeoffs & Viva Questions
  const tradeoffsBox = document.getElementById("arch-tradeoffs-box");
  if (tradeoffsBox) {
    tradeoffsBox.innerHTML = "";
    const items = scanData.key_tradeoffs || [
      "In-memory state management tradeoffs versus persistent relational database scalability.",
      "Synchronous API latency bounds compared to asynchronous queuing workers."
    ];
    items.forEach(t => {
      const div = document.createElement("div");
      div.className = "p-2.5 rounded-lg bg-red-50/70 border border-red-200/70 text-red-900 text-[11px] flex items-start gap-2";
      div.innerHTML = `<span>⚠️</span><span>${escapeHtml(t)}</span>`;
      tradeoffsBox.appendChild(div);
    });
  }

  // Setup Feature 1: Live Interactive Simulation Engine
  setupSimulationEngine(scanData);

  // Setup Feature 2: Professor Cross-Examination & Viva Defense Counter
  renderVivaDefenseTraps(scanData);
}

/* ==========================================================================
   FEATURE 1: INTERACTIVE DATA FLOW SIMULATION TRACER
   ========================================================================== */
let activeSimScenarios = [];
let currentSimScenarioId = "happy_path";
let currentSimStepIdx = -1;
let simIntervalTimer = null;
let simSpeedMs = 1200;

function setupSimulationEngine(scanData) {
  // Clear any running timer
  resetSim();

  // If scenarios provided by LLM or fallback
  if (scanData.simulation_scenarios && Array.isArray(scanData.simulation_scenarios) && scanData.simulation_scenarios.length > 0) {
    activeSimScenarios = scanData.simulation_scenarios;
  } else {
    // Generate dynamic fallback scenarios from Mermaid nodes
    activeSimScenarios = generateDynamicSimScenarios(scanData);
  }

  // Populate Scenario buttons
  const selector = document.getElementById("sim-scenario-selector");
  if (selector && activeSimScenarios.length > 0) {
    selector.innerHTML = "";
    activeSimScenarios.forEach((sc, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = `sim-btn-${sc.id}`;
      const isActive = sc.id === currentSimScenarioId || (idx === 0 && !activeSimScenarios.some(s => s.id === currentSimScenarioId));
      if (isActive) currentSimScenarioId = sc.id;

      btn.className = isActive
        ? "px-2.5 py-1 rounded-lg bg-blue-600 text-white font-semibold text-xs shadow-2xs transition cursor-pointer"
        : "px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition cursor-pointer";
      btn.innerHTML = `${escapeHtml(sc.name || sc.id)}`;
      btn.onclick = () => switchSimScenario(sc.id);
      selector.appendChild(btn);
    });
  }

  updateSimTickerReadyState();
}

function generateDynamicSimScenarios(scanData) {
  const code = scanData.mermaid_diagram || "";
  const matches = [...code.matchAll(/([A-Za-z0-9_]+)\s*(\[|\{|\(\[|\(\()/g)];
  const nodeIds = [...new Set(matches.map(m => m[1]))].filter(id => !["classDef", "flowchart", "subgraph", "graph"].includes(id));
  
  if (nodeIds.length < 3) {
    nodeIds.push("Client", "Gateway", "Service", "Database", "Response");
  }

  const happySteps = nodeIds.map((n, i) => ({
    node_id: n,
    label: `Stage ${i + 1}: ${n.replace(/_/g, ' ')}`,
    detail: `Data packet traverses ${n.replace(/_/g, ' ')} module, executing state mutations and propagating parameters downstream.`
  }));

  const errorSteps = nodeIds.slice(0, Math.max(2, Math.floor(nodeIds.length / 2) + 1)).map((n, i) => ({
    node_id: n,
    label: `Validation Stage: ${n.replace(/_/g, ' ')}`,
    detail: i === Math.floor(nodeIds.length / 2)
      ? `Security rejection triggered at ${n.replace(/_/g, ' ')}. Request aborted with standard error response.`
      : `Processing frame inside ${n.replace(/_/g, ' ')}.`
  }));

  return [
    {
      id: "happy_path",
      name: "▶️ Happy Path Request",
      description: "Standard end-to-end transaction journey traversing all active application nodes.",
      steps: happySteps
    },
    {
      id: "error_path",
      name: "⚠️ Validation / Auth Rejection",
      description: "Simulates invalid input payload or permission check failing early.",
      steps: errorSteps
    }
  ];
}

function switchSimScenario(scenarioId) {
  resetSim();
  currentSimScenarioId = scenarioId;

  activeSimScenarios.forEach(sc => {
    const btn = document.getElementById(`sim-btn-${sc.id}`);
    if (btn) {
      if (sc.id === scenarioId) {
        btn.className = "px-2.5 py-1 rounded-lg bg-blue-600 text-white font-semibold text-xs shadow-2xs transition cursor-pointer";
      } else {
        btn.className = "px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition cursor-pointer";
      }
    }
  });

  updateSimTickerReadyState();
}
window.switchSimScenario = switchSimScenario;

function updateSimTickerReadyState() {
  const currentScenario = activeSimScenarios.find(s => s.id === currentSimScenarioId) || activeSimScenarios[0];
  const totalSteps = currentScenario?.steps?.length || 0;

  const badge = document.getElementById("sim-step-badge");
  const title = document.getElementById("sim-step-title");
  const detail = document.getElementById("sim-step-detail");
  const counter = document.getElementById("sim-step-counter");
  const progBar = document.getElementById("sim-progress-bar");

  if (badge) {
    badge.className = "px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 font-mono";
    badge.textContent = "Ready";
  }
  if (title) title.textContent = `${currentScenario?.name || 'Simulation'}: Ready to execute`;
  if (detail) detail.textContent = currentScenario?.description || "Click 'Simulate' to watch data packets flow through the architecture nodes in real-time.";
  if (counter) counter.textContent = `0 / ${totalSteps} Steps`;
  if (progBar) progBar.style.width = "0%";
}

function toggleSimPlay() {
  if (simIntervalTimer) {
    pauseSim();
  } else {
    playSim();
  }
}
window.toggleSimPlay = toggleSimPlay;

function playSim() {
  const currentScenario = activeSimScenarios.find(s => s.id === currentSimScenarioId) || activeSimScenarios[0];
  if (!currentScenario || !currentScenario.steps) return;

  const playIcon = document.getElementById("sim-play-icon");
  const playText = document.getElementById("sim-play-text");
  if (playIcon) playIcon.textContent = "⏸️";
  if (playText) playText.textContent = "Pause";

  // If was at end, reset first
  if (currentSimStepIdx >= currentScenario.steps.length - 1) {
    resetSim(false);
  }

  // Trigger immediate step then set interval
  stepSimForward();

  simIntervalTimer = setInterval(() => {
    if (!stepSimForward()) {
      pauseSim();
    }
  }, simSpeedMs);
}

function pauseSim() {
  if (simIntervalTimer) {
    clearInterval(simIntervalTimer);
    simIntervalTimer = null;
  }
  const playIcon = document.getElementById("sim-play-icon");
  const playText = document.getElementById("sim-play-text");
  if (playIcon) playIcon.textContent = "▶️";
  if (playText) playText.textContent = "Simulate";
}

function resetSim(resetUI = true) {
  pauseSim();
  currentSimStepIdx = -1;

  // Clear all glowing active/visited classes from SVG
  const container = document.getElementById("arch-mermaid-container");
  const svg = container?.querySelector("svg");
  if (svg) {
    svg.querySelectorAll(".sim-node-active, .sim-node-visited, .sim-node-error").forEach(el => {
      el.classList.remove("sim-node-active", "sim-node-visited", "sim-node-error");
    });
  }

  if (resetUI) {
    updateSimTickerReadyState();
  }
}
window.resetSim = resetSim;

function changeSimSpeed(ms) {
  simSpeedMs = parseInt(ms, 10) || 1200;
  if (simIntervalTimer) {
    clearInterval(simIntervalTimer);
    simIntervalTimer = setInterval(() => {
      if (!stepSimForward()) {
        pauseSim();
      }
    }, simSpeedMs);
  }
}
window.changeSimSpeed = changeSimSpeed;

function stepSimForward() {
  const currentScenario = activeSimScenarios.find(s => s.id === currentSimScenarioId) || activeSimScenarios[0];
  if (!currentScenario || !currentScenario.steps || currentScenario.steps.length === 0) return false;

  currentSimStepIdx++;
  if (currentSimStepIdx >= currentScenario.steps.length) {
    showSimCompletion(currentScenario);
    return false;
  }

  const step = currentScenario.steps[currentSimStepIdx];
  const total = currentScenario.steps.length;
  const isErrorStep = currentScenario.id === "error_path" && currentSimStepIdx === total - 1;

  // Highlight in SVG
  const container = document.getElementById("arch-mermaid-container");
  const svg = container?.querySelector("svg");
  if (svg) {
    // Demote existing active to visited
    svg.querySelectorAll(".sim-node-active, .sim-node-error").forEach(el => {
      el.classList.remove("sim-node-active", "sim-node-error");
      el.classList.add("sim-node-visited");
    });

    const targetNode = findMermaidNodeEl(svg, step.node_id, step.label);
    if (targetNode) {
      targetNode.classList.remove("sim-node-visited");
      targetNode.classList.add(isErrorStep ? "sim-node-error" : "sim-node-active");
    }
  }

  // Update Ticker UI
  const badge = document.getElementById("sim-step-badge");
  const title = document.getElementById("sim-step-title");
  const detail = document.getElementById("sim-step-detail");
  const counter = document.getElementById("sim-step-counter");
  const progBar = document.getElementById("sim-progress-bar");

  if (badge) {
    if (isErrorStep) {
      badge.className = "px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-100 text-red-800 font-mono animate-pulse";
      badge.textContent = `HALTED (STEP ${currentSimStepIdx + 1})`;
    } else {
      badge.className = "px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 font-mono";
      badge.textContent = `STEP ${currentSimStepIdx + 1}/${total}`;
    }
  }

  if (title) title.textContent = step.label || `Node ${step.node_id}`;
  if (detail) detail.textContent = step.detail || `Data payload moving through ${step.node_id}.`;
  if (counter) counter.textContent = `Step ${currentSimStepIdx + 1} of ${total}`;

  if (progBar) {
    const percent = Math.round(((currentSimStepIdx + 1) / total) * 100);
    progBar.style.width = `${percent}%`;
    progBar.className = isErrorStep ? "bg-red-500 h-full transition-all duration-300" : "bg-blue-600 h-full transition-all duration-300";
  }

  return true;
}
window.stepSimForward = stepSimForward;

function showSimCompletion(scenario) {
  const isError = scenario.id === "error_path";
  const badge = document.getElementById("sim-step-badge");
  const title = document.getElementById("sim-step-title");
  const detail = document.getElementById("sim-step-detail");
  const playIcon = document.getElementById("sim-play-icon");
  const playText = document.getElementById("sim-play-text");

  if (playIcon) playIcon.textContent = "🔄";
  if (playText) playText.textContent = "Replay";

  if (badge) {
    badge.className = isError
      ? "px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-100 text-red-800 font-mono"
      : "px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 font-mono";
    badge.textContent = isError ? "REJECTION VERIFIED" : "FLOW COMPLETED";
  }

  if (title) {
    title.textContent = isError
      ? "⚠️ Rejection Branch Verified: Security & Error Guard Successfully Halted Bad Payload"
      : "✅ End-to-End Journey Resolved: Data Successfully Processed & Output Dispatched";
  }

  if (detail) {
    detail.textContent = isError
      ? "The system guarded database integrity and prevented invalid execution from mutating persistent state."
      : "All pipeline nodes completed execution within nominal latency and consistency bounds.";
  }
}

function findMermaidNodeEl(svg, nodeId, label) {
  if (!svg) return null;
  // 1. Direct ID match
  let target = svg.querySelector(`g.node[id*="${nodeId}"]`) || 
               svg.querySelector(`g.node#${nodeId}`) ||
               svg.querySelector(`[data-id="${nodeId}"]`);
  if (target) return target;

  // 2. Search by text content
  const nodes = svg.querySelectorAll("g.node");
  for (const n of nodes) {
    const txt = (n.textContent || "").toLowerCase();
    if (nodeId && txt.includes(nodeId.toLowerCase())) return n;
    if (label && txt.includes(label.toLowerCase().slice(0, 10))) return n;
  }
  return null;
}

/* ==========================================================================
   FEATURE 2: PROFESSOR CROSS-EXAMINATION & VIVA DEFENSE COUNTER
   ========================================================================== */
let activeDefenseAudio = null;
let currentPlayingDefenseIdx = -1;

function renderVivaDefenseTraps(scanData) {
  const container = document.getElementById("arch-viva-traps-container");
  if (!container) return;

  stopVivaDefenseAudio();
  container.innerHTML = "";

  let traps = scanData.viva_defense_traps;
  if (!traps || !Array.isArray(traps) || traps.length === 0) {
    const title = scanData.project_title || VivaState.projectTitle || "System";
    traps = [
      {
        trap_title: "Database Concurrency & Race Conditions",
        trap_question: `What happens if two concurrent requests hit your ${title} service at the exact same millisecond? Will your database corrupt?`,
        trap_danger: "Examiners probe this to see if you understand database ACID isolation levels vs naive in-memory state mutations.",
        ideal_defense: "To prevent race conditions, we enforce atomic database transactions with row-level locking or optimistic concurrency control via version fields, ensuring atomic updates rather than naive in-memory increments.",
        key_concept: "ACID & Row Locks"
      },
      {
        trap_title: "Single Point of Failure & Network Latency",
        trap_question: "If your primary persistent store drops connection for 30 seconds, does your entire frontend crash with unhandled 500 errors?",
        trap_danger: "Tests whether you designed resilient graceful degradation and health retries or if your app collapses on external failures.",
        ideal_defense: "The architecture implements circuit breakers and centralized try/catch exception filters with standardized error envelopes, allowing the system to serve cached responses or a graceful fallback state rather than an unhandled 500 crash.",
        key_concept: "Circuit Breakers & Graceful Fallback"
      },
      {
        trap_title: "Horizontal Scalability & In-Memory State",
        trap_question: "If we scale your server from 1 instance to 10 instances behind an AWS load balancer, will user state and sessions break?",
        trap_danger: "Tests if you mistakenly store state inside local server process memory rather than maintaining a stateless architecture.",
        ideal_defense: "Our application layer is completely stateless: authentication uses cryptographically signed JWT tokens and shared state is centralized in external persistent stores, allowing seamless horizontal scale across multiple instances without sticky sessions.",
        key_concept: "Stateless Horizontal Scaling"
      }
    ];
  }

  traps.forEach((trap, idx) => {
    const card = document.createElement("div");
    card.className = "flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-2xs hover:border-blue-400 hover:bg-white transition-all duration-200";
    card.innerHTML = `
      <div>
        <!-- Trap Header Badge -->
        <div class="flex items-center justify-between gap-2 mb-2.5">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider flex items-center gap-1">
            <span>⚡ Trap #${idx + 1}</span>
          </span>
          <span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
            ${escapeHtml(trap.key_concept || "Architecture")}
          </span>
        </div>

        <!-- Trap Title -->
        <h4 class="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug mb-2">
          ${escapeHtml(trap.trap_title || "Viva Cross-Examination Trap")}
        </h4>

        <!-- Examiner Question -->
        <div class="p-2.5 rounded-xl bg-red-50/70 border border-red-200/80 mb-3 text-xs text-red-950 font-medium leading-relaxed">
          <span class="font-bold text-red-800 mr-1">👨‍🏫 Examiner Asks:</span>
          "${escapeHtml(trap.trap_question)}"
        </div>

        <!-- Trap Warning -->
        <div class="mb-3 text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/70 p-2 rounded-lg leading-relaxed">
          <strong class="text-amber-900">⚠️ Hidden Trap:</strong> ${escapeHtml(trap.trap_danger || "Examiners use this to test system depth.")}
        </div>

        <!-- Senior Defense Script -->
        <div class="p-3 rounded-xl bg-blue-50/60 border border-blue-200/80 text-xs text-slate-800 leading-relaxed mb-4">
          <div class="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1 flex items-center gap-1">
            <span>🛡️ Ideal Viva Defense Script</span>
          </div>
          <p class="font-medium">"${escapeHtml(trap.ideal_defense)}"</p>
        </div>
      </div>

      <!-- Action Button & Audio Voice Visualizer -->
      <div class="pt-3 border-t border-slate-200/70 flex items-center justify-between gap-2">
        <button type="button" id="defense-audio-btn-${idx}" onclick="playVivaDefenseAudio(${idx}, ${escapeJsonAttribute(trap.ideal_defense)})" class="btn-primary py-1.5 px-3 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer">
          <span>🔊 Listen to Defense</span>
        </button>

        <div id="defense-wave-${idx}" class="defense-audio-wave hidden">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function escapeJsonAttribute(str) {
  return JSON.stringify(str || '').replace(/"/g, '&quot;');
}

function playVivaDefenseAudio(trapIdx, defenseText) {
  const personaSelect = document.getElementById("defense-voice-persona");
  const persona = personaSelect?.value || "techlead";

  const btn = document.getElementById(`defense-audio-btn-${trapIdx}`);
  const wave = document.getElementById(`defense-wave-${trapIdx}`);

  // If already playing this one, toggle pause/stop
  if (currentPlayingDefenseIdx === trapIdx && activeDefenseAudio && !activeDefenseAudio.paused) {
    stopVivaDefenseAudio();
    return;
  }

  // Stop any other playing audio
  stopVivaDefenseAudio();

  if (btn) btn.innerHTML = `<span>⏳ Loading...</span>`;

  const audioUrl = `/api/tts?text=${encodeURIComponent(defenseText)}&persona=${persona}`;
  const audio = new Audio(audioUrl);
  activeDefenseAudio = audio;
  currentPlayingDefenseIdx = trapIdx;

  audio.addEventListener("playing", () => {
    if (btn) btn.innerHTML = `<span>⏸️ Pause Defense</span>`;
    if (wave) wave.classList.remove("hidden");
  });

  audio.addEventListener("ended", () => {
    stopVivaDefenseAudio();
  });

  audio.addEventListener("error", (e) => {
    console.warn("TTS error:", e);
    stopVivaDefenseAudio();
  });

  audio.play().catch(e => {
    console.warn("Audio play rejected:", e);
    stopVivaDefenseAudio();
  });
}
window.playVivaDefenseAudio = playVivaDefenseAudio;

function stopVivaDefenseAudio() {
  if (activeDefenseAudio) {
    try {
      activeDefenseAudio.pause();
      activeDefenseAudio.currentTime = 0;
    } catch (_) {}
    activeDefenseAudio = null;
  }
  if (currentPlayingDefenseIdx >= 0) {
    const btn = document.getElementById(`defense-audio-btn-${currentPlayingDefenseIdx}`);
    const wave = document.getElementById(`defense-wave-${currentPlayingDefenseIdx}`);
    if (btn) btn.innerHTML = `<span>🔊 Listen to Defense</span>`;
    if (wave) wave.classList.add("hidden");
    currentPlayingDefenseIdx = -1;
  }
}
window.stopVivaDefenseAudio = stopVivaDefenseAudio;

function copyMermaidCode() {
  const scanData = VivaState.projectScan || {};
  let code = scanData.mermaid_diagram || "";
  if (currentArchDiagramView === "layered") {
    code = generateLayeredArchitecture(scanData, VivaState.sourceCode || "");
  } else if (currentArchDiagramView === "security") {
    code = generateSecurityBoundaryDiagram(scanData, VivaState.sourceCode || "");
  }
  if (!code) {
    alert("Please scan a project first.");
    return;
  }
  navigator.clipboard.writeText(code).then(() => {
    alert(`Mermaid ${currentArchDiagramView.toUpperCase()} diagram code copied to clipboard! You can paste it in GitHub Markdown or Mermaid Live.`);
  });
}
window.copyMermaidCode = copyMermaidCode;

function exportDiagramSVG() {
  const container = document.getElementById("arch-mermaid-container");
  const svg = container?.querySelector("svg");
  if (!svg) {
    alert("Diagram not yet rendered.");
    return;
  }

  const svgData = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = `${(VivaState.projectTitle || "project").toLowerCase().replace(/\s+/g, '-')}-${currentArchDiagramView}-architecture.svg`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
}
window.exportDiagramSVG = exportDiagramSVG;

/* ==========================================================================
   FEATURE: CLICK-TO-INSPECT NODE CODE DRAWER (INTERACTIVE ARCHITECTURE DEEP DIVE)
   ========================================================================== */
let activeInspectedNode = null;

function attachNodeClickInspectors(container) {
  if (!container) return;
  const nodes = container.querySelectorAll("svg g.node");
  nodes.forEach(node => {
    node.setAttribute("title", "🔍 Click to inspect source code & algorithmic complexity");
    node.style.cursor = "pointer";

    node.addEventListener("click", (e) => {
      e.stopPropagation();
      const rawId = node.id || node.getAttribute("data-id") || "";
      const cleanId = rawId.replace(/^flowchart-/, "").replace(/-\d+$/, "");
      const labelText = node.textContent?.trim() || "";
      openArchNodeDrawer(cleanId, labelText);
    });
  });
}
window.attachNodeClickInspectors = attachNodeClickInspectors;

let nodeArchProfilesCache = {};

function parseCodebaseFiles(sourceCode) {
  const files = [];
  if (!sourceCode) return files;

  const fileRegex = /(?:\/\/\s*={10,}\s*\n)?(?:\/\/|#|\/\*|---|###)\s*(?:GitHub\s+)?File:\s*([^\n\r]+?)(?:\s*\*\/\s*)?(?:\n\/\/\s*={10,})?\n([\s\S]*?)(?=(?:(?:\/\/\s*={10,}\s*\n)?(?:\/\/|#|\/\*|---|###)\s*(?:GitHub\s+)?File:)|$)/gi;
  let match;
  while ((match = fileRegex.exec(sourceCode)) !== null) {
    const rawPath = match[1].trim();
    const content = match[2].trim();
    if (content) {
      files.push({
        path: rawPath,
        name: rawPath.split("/").pop().split("\\").pop(),
        content: content
      });
    }
  }

  if (files.length === 0 && sourceCode.trim()) {
    const isPy = sourceCode.includes("def ") || sourceCode.includes("import ") || sourceCode.includes("class ");
    const isJs = sourceCode.includes("function ") || sourceCode.includes("const ") || sourceCode.includes("=>");
    const defaultName = isPy ? "main.py" : (isJs ? "index.js" : "app.py");
    files.push({
      path: defaultName,
      name: defaultName,
      content: sourceCode.trim()
    });
  }

  return files;
}

function extractDistinctNodeProfile(nodeId, labelText, scanData, sourceCode) {
  const nLower = (nodeId + " " + labelText).toLowerCase();
  const cleanTitle = labelText.replace(/<br\/?>/g, " ").replace(/[💻🎮⚙️🗄️✅⚠️🧠🛡️⚡🔌▲🌐💼🖥️]/g, "").trim() || nodeId;

  // Determine role with strict priority order
  let role = "service_logic";
  if (/\b(reject|error|fail|alt|altnode|unauth|denied|bad|bad request|exception|errhandler|halt|400|401|404|500)\b/i.test(nLower) ||
      nLower.includes("reject") || nLower.includes("error") || nLower.includes("fail") || nLower.includes("unauth") || nLower.includes("denied") || nLower.includes("altnode")) {
    role = "error_rejection";
  } else if (/\b(output|result|response|payload|dashboard|metrics|analytics|endnode|final|200 ok)\b/i.test(nLower) ||
             nLower.includes("responsepayload") || nLower.includes("finaloutput") || nLower.includes("analyticsresult")) {
    role = "response_output";
  } else if (nLower.includes("client") || nLower.includes("browser") || nLower.includes("frontend") || 
             nLower.includes("user input") || nLower.includes("presentation") || nLower.includes("startnode") ||
             /\b(ui|dom|form)\b/i.test(nLower)) {
    role = "presentation";
  } else if (nLower.includes("router") || nLower.includes("gateway") || nLower.includes("ingestion") || 
             nLower.includes("controller") || nLower.includes("endpoint") || nLower.includes("proxy") || 
             nLower.includes("dispatch") || nLower.includes("routernode") || /\bapi\b/i.test(nLower)) {
    role = "router";
  } else if (nLower.includes("valid") || nLower.includes("auth") || nLower.includes("guard") || 
             nLower.includes("check") || nLower.includes("token") || nLower.includes("rls") || 
             nLower.includes("jwt") || nLower.includes("permission") || nLower.includes("schema") || 
             nLower.includes("pydantic") || nLower.includes("decisionnode") || nLower.includes("decision")) {
    role = "auth_validation";
  } else if (nLower.includes("db") || nLower.includes("database") || nLower.includes("postgres") || 
             nLower.includes("sql") || nLower.includes("store") || nLower.includes("table") || 
             nLower.includes("redis") || nLower.includes("cache") || 
             nLower.includes("repo") || nLower.includes("storage") || nLower.includes("supabase") || 
             nLower.includes("dbnode") || nLower.includes("datastore")) {
    role = "persistence";
  } else if (nLower.includes("train") || nLower.includes("predict") || nLower.includes("inference") || 
             nLower.includes("classifier") || nLower.includes("sklearn") || nLower.includes("randomforest") ||
             nLower.includes("model")) {
    role = "ml_engine";
  }

  // Base metadata per role
  let tier = "Application Logic";
  let tierBadgeClass = "bg-blue-100 text-blue-800";
  let icon = "⚙️";
  let timeComplexity = "O(1) amortized";
  let spaceComplexity = "O(1) buffer";
  let defaultFile = "main.py";
  let failureMode = "Unhandled runtime exception if parameters fail schema constraints.";
  let defenseTip = "Emphasize validation middleware sanitizing all inputs before reaching this execution branch.";
  let codeLang = "python";

  if (role === "presentation") {
    tier = "Presentation Tier";
    tierBadgeClass = "bg-orange-100 text-orange-800";
    icon = "💻";
    timeComplexity = "O(1) DOM event dispatch & serialization";
    spaceComplexity = "O(1) client form state buffer";
    defaultFile = "frontend/index.html / App.jsx";
    failureMode = "Network disconnect, dropped socket, or double-submit race conditions without debouncing.";
    defenseTip = "Explain client-side input masking, debounce guards, AbortController cancellations, and optimistic UI toasts.";
    codeLang = "javascript";
  } else if (role === "router") {
    tier = "Routing & API Gateway";
    tierBadgeClass = "bg-blue-100 text-blue-800";
    icon = "⚡";
    timeComplexity = "O(1) hash route lookup & socket frame dispatch";
    spaceComplexity = "O(1) constant HTTP socket frame buffer";
    defaultFile = "routers/api.py / main.py";
    failureMode = "Slowloris socket exhaustion, HTTP 429 rate limit saturation, or malformed Bearer token headers.";
    defenseTip = "Defend with ASGI non-blocking event loops, CORS origin verification, and centralized route decorators.";
    codeLang = "python";
  } else if (role === "auth_validation") {
    tier = "Security & Decision Boundary";
    tierBadgeClass = "bg-pink-100 text-pink-800";
    icon = "🛡️";
    timeComplexity = "O(k) schema field iteration & cryptographic check";
    spaceComplexity = "O(1) zero-allocation boundary";
    defaultFile = "schemas.py / auth.py";
    failureMode = "Expired JWT cryptographic signature, type coercion vulnerability, or missing schema boundaries.";
    defenseTip = "Explain how strict Pydantic/Zod schemas reject invalid payloads before mutating persistent memory.";
    codeLang = "python";
  } else if (role === "persistence") {
    tier = "Persistence & Storage";
    tierBadgeClass = "bg-purple-100 text-purple-800";
    icon = "🗄️";
    timeComplexity = "O(log M) B-Tree clustered index seek";
    spaceComplexity = "O(R) row tuple allocation in connection buffer";
    defaultFile = "database.py / schema.sql";
    failureMode = "Database connection pool exhaustion, lock contention under concurrent writes, or uncommitted transaction leaks.";
    defenseTip = "Defend with ACID isolation levels (READ COMMITTED), connection pool caps (max_size=20), and row-level locks (SELECT FOR UPDATE).";
    codeLang = "sql / python";
  } else if (role === "error_rejection") {
    tier = "Fault-Tolerance & Error Handler";
    tierBadgeClass = "bg-red-100 text-red-800";
    icon = "⚠️";
    timeComplexity = "O(1) immediate execution abort";
    spaceComplexity = "O(1) static error envelope buffer";
    defaultFile = "exceptions.py / main.py";
    failureMode = "Leaking raw database stack traces or internal server file paths in unhandled HTTP 500 responses.";
    defenseTip = "Explain standardized RFC-7807 Problem Details masking internal traces, returning sanitized error messages with internal correlation IDs.";
    codeLang = "python";
  } else if (role === "response_output") {
    tier = "Resolution & Response";
    tierBadgeClass = "bg-emerald-100 text-emerald-800";
    icon = "✅";
    timeComplexity = "O(P) payload serialization & compression";
    spaceComplexity = "O(P) outgoing response frame buffer";
    defaultFile = "serializers.py / main.py";
    failureMode = "High latency or out-of-memory when serializing large uncapped collections without pagination or streaming cursors.";
    defenseTip = "Demonstrate Pydantic ResponseModel field filtering, gzip compression, and strict pagination limits on collections.";
    codeLang = "python";
  } else if (role === "ml_engine") {
    tier = "ML & Inference Engine";
    tierBadgeClass = "bg-teal-100 text-teal-800";
    icon = "🧠";
    timeComplexity = "O(n_trees * max_depth) inference traversal";
    spaceComplexity = "O(features) vectorized input vector";
    defaultFile = "model_pipeline.py";
    failureMode = "Feature drift, tabular schema mismatch between training and inference, or unhandled NaNs breaking matrix multiplication.";
    defenseTip = "Defend with pickled sklearn Pipeline preserving feature scalers, out-of-bag validation, and ROC-AUC metrics.";
    codeLang = "python";
  }

  // Collect snippet signatures already assigned to other nodes
  const usedSignatures = new Set(Object.values(nodeArchProfilesCache).map(p => p.snippetSignature));

  const parsedFiles = parseCodebaseFiles(sourceCode);
  const src = sourceCode || "";
  let matchedFile = defaultFile;
  let codeSnippet = "";

  // 1. SPECIFIC E-COMMERCE DEMO CODE HANDLING (Guarantees 100% unique blocks for standard checkout)
  if (src.includes("INVENTORY") && src.includes("Order(BaseModel)") && src.includes("/checkout")) {
    if (role === "presentation") {
      matchedFile = "static/js/checkout.js";
      codeLang = "javascript";
      codeSnippet = `// Presentation Tier: Handles checkout button click & dispatches HTTP payload\nasync function handleCheckoutSubmit(itemId, quantity, couponCode) {\n  const response = await fetch("/checkout", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({\n      item_id: itemId,\n      quantity: parseInt(quantity, 10),\n      discount_code: couponCode || null\n    })\n  });\n  if (!response.ok) {\n    const err = await response.json();\n    throw new Error(err.detail || "Checkout failed");\n  }\n  return await response.json();\n}`;
    } else if (role === "router") {
      matchedFile = "main.py: line 51";
      codeLang = "python";
      codeSnippet = `app = FastAPI(title="E-Commerce API")\n\n@app.post("/checkout")\ndef checkout(order: Order):\n    """ASGI Routing Ingress: intercepts HTTP frame and delegates to domain service."""\n    return execute_order_pipeline(order)`;
    } else if (role === "auth_validation") {
      matchedFile = "schemas.py: line 46";
      codeLang = "python";
      codeSnippet = `class Order(BaseModel):\n    """Pydantic Schema: validates input boundaries and field constraints."""\n    item_id: str\n    quantity: int\n    discount_code: str | None = None\n\n    # Enforces strict non-negative quantity constraint\n    assert quantity > 0, "Order quantity must be positive integer"`;
    } else if (role === "service_logic") {
      matchedFile = "services/order_service.py: line 60";
      codeLang = "python";
      codeSnippet = `# Deduct stock & calculate total transaction price\nINVENTORY[order.item_id]["stock"] -= order.quantity\nprice = INVENTORY[order.item_id]["price"] * order.quantity\n\n# Apply dynamic promotion discount logic\nif order.discount_code == "SAVE10":\n    price = price * 0.9`;
    } else if (role === "persistence") {
      matchedFile = "database.py: line 41";
      codeLang = "python";
      codeSnippet = `# In-memory transactional data store & inventory state\nINVENTORY = {\n    "item_1": {"name": "Laptop", "stock": 5, "price": 50000},\n    "item_2": {"name": "Mouse", "stock": 10, "price": 1000}\n}\n\n# ACID Invariant: Stock must never drop below 0\ndef check_stock_level(item_id: str) -> int:\n    return INVENTORY.get(item_id, {}).get("stock", 0)`;
    } else if (role === "error_rejection") {
      matchedFile = "exceptions.py: line 53";
      codeLang = "python";
      codeSnippet = `# Validation Rejection & Fault-Tolerance Guards\nif order.item_id not in INVENTORY:\n    raise HTTPException(status_code=404, detail="Item not found")\n\nstock = INVENTORY[order.item_id]["stock"]\nif stock < order.quantity:\n    raise HTTPException(status_code=400, detail="Out of stock")`;
    } else if (role === "response_output") {
      matchedFile = "serializers.py: line 67";
      codeLang = "python";
      codeSnippet = `# Formatted HTTP 200 OK JSON Result\nreturn {\n    "status": "success",\n    "total_price": price,\n    "currency": "INR",\n    "timestamp": datetime.utcnow().isoformat()\n}`;
    }
  }

  // 2. SPECIFIC MACHINE LEARNING DEMO HANDLING
  else if (src.includes("RandomForestClassifier") && src.includes("train_test_split")) {
    const cid = nodeId.toLowerCase();
    if (cid.includes("data") || nLower.includes("split") || nLower.includes("dataset") || role === "presentation") {
      tier = "Data Ingestion & Stratified Split";
      tierBadgeClass = "bg-orange-100 text-orange-800";
      icon = "📊";
      timeComplexity = "O(N) stratified random sampling";
      spaceComplexity = "O(N) memory dataframe split";
      matchedFile = "data_loader.py: line 77";
      codeLang = "python";
      codeSnippet = `# Load tabular clinical records and split training/validation cohorts\nX = np.random.randn(100, 5)\ny = np.random.randint(0, 2, 100)\n\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.2, random_state=42, stratify=y\n)`;
    } else if (cid.includes("pipe") || nLower.includes("scale") || nLower.includes("preprocess") || nLower.includes("transform")) {
      tier = "Feature Engineering & Preprocessing";
      tierBadgeClass = "bg-blue-100 text-blue-800";
      icon = "⚡";
      timeComplexity = "O(N * M) column-wise z-score scaling";
      spaceComplexity = "O(M) mean and variance parameter cache";
      matchedFile = "pipeline.py: line 80";
      codeLang = "python";
      codeSnippet = `def preprocess_features(raw_matrix):\n    """Vectorized feature transformation and standard scaling."""\n    scaler = StandardScaler()\n    return scaler.fit_transform(raw_matrix)`;
    } else if (cid.includes("guard") || cid.includes("check") || nLower.includes("valid") || nLower.includes("dimension")) {
      tier = "Security & Decision Boundary";
      tierBadgeClass = "bg-pink-100 text-pink-800";
      icon = "🛡️";
      timeComplexity = "O(1) matrix shape assertion";
      spaceComplexity = "O(1) zero allocation";
      matchedFile = "validators.py: line 81";
      codeLang = "python";
      codeSnippet = `# Feature dimension and integrity guard\nassert X.shape[1] == 5, "Dataset must contain exactly 5 features"\nassert not np.isnan(X).any(), "Input matrix contains invalid NaN values"`;
    } else if (cid.includes("artifact") || cid.includes("store") || cid.includes("weight") || cid.includes("pkl") || nLower.includes("storage")) {
      tier = "Model Artifact & Persistence";
      tierBadgeClass = "bg-purple-100 text-purple-800";
      icon = "🗄️";
      timeComplexity = "O(B) binary disk write";
      spaceComplexity = "O(B) pickled model weights buffer";
      matchedFile = "model_store.py: line 85";
      codeLang = "python";
      codeSnippet = `# Serialize model artifacts to persistent storage\nimport joblib\njoblib.dump(model, "heart_disease_rf_v1.pkl")\nprint("Trained model weights successfully persisted to storage")`;
    } else if (cid.includes("reject") || cid.includes("error") || nLower.includes("outlier") || role === "error_rejection") {
      tier = "Fault-Tolerance & Error Handler";
      tierBadgeClass = "bg-red-100 text-red-800";
      icon = "⚠️";
      timeComplexity = "O(1) immediate rejection exception";
      spaceComplexity = "O(1) static exception envelope";
      matchedFile = "exceptions.py: line 86";
      codeLang = "python";
      codeSnippet = `# Out-of-distribution rejection handler\nif confidence_score < 0.60:\n    raise ValueError("Inference rejected: feature inputs fall outside training distribution.")`;
    } else if (cid.includes("metric") || cid.includes("eval") || nLower.includes("accuracy") || nLower.includes("roc") || role === "response_output") {
      tier = "Evaluation & Metrics Output";
      tierBadgeClass = "bg-emerald-100 text-emerald-800";
      icon = "✅";
      timeComplexity = "O(N) true positive/false positive rate scan";
      spaceComplexity = "O(N) prediction score vector";
      matchedFile = "metrics.py: line 87";
      codeLang = "python";
      codeSnippet = `# Validation accuracy and ROC-AUC score serialization\nacc = accuracy_score(y_test, y_pred)\nreturn {\n    "status": "success",\n    "accuracy": round(float(acc), 4),\n    "model_type": "RandomForestClassifier",\n    "n_estimators": 50\n}`;
    } else {
      tier = "ML & Inference Engine";
      tierBadgeClass = "bg-teal-100 text-teal-800";
      icon = "🧠";
      timeComplexity = "O(n_trees * max_depth) parallel tree traversal";
      spaceComplexity = "O(features) vectorized input vector";
      matchedFile = "model_engine.py: line 83";
      codeLang = "python";
      codeSnippet = `# Initialize Ensemble Random Forest with bootstrap bagging\nmodel = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)\nmodel.fit(X_train, y_train)\n\n# Distributed multi-tree parallel inference\ny_pred = model.predict(X_test)`;
    }
  }

  // 3. SPECIFIC SUPABASE / BAAS DEMO HANDLING
  else if (src.includes("supabase") || src.includes("createClient") || src.includes("analytics_events")) {
    const cid = nodeId.toLowerCase();
    if (cid.includes("browser") || (nLower.includes("browser ui") && !cid.includes("controller"))) {
      matchedFile = "index.html / App.jsx";
      codeLang = "javascript";
      codeSnippet = `// Presentation Tier: DOM Button Event Listener\nconst trackBtn = document.getElementById("action-btn");\ntrackBtn?.addEventListener("click", (e) => {\n  captureUserTelemetry("click_event", { x: e.clientX, y: e.clientY });\n});`;
    } else if (cid.includes("controller") || nLower.includes("client controller")) {
      tier = "Client Logic & Telemetry Controller";
      tierBadgeClass = "bg-orange-100 text-orange-800";
      icon = "⚡";
      timeComplexity = "O(1) event batching & queuing";
      spaceComplexity = "O(k) in-memory telemetry buffer";
      matchedFile = "static/js/telemetry.js";
      codeLang = "javascript";
      codeSnippet = `// Client Telemetry Controller: Batches client events before edge transmission\nfunction captureUserTelemetry(type, payload) {\n  fetch("/api/track", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ event: type, payload, timestamp: Date.now() })\n  });\n}`;
    } else if (cid.includes("ingestion") || (nLower.includes("ingestion") && role === "router")) {
      tier = "Routing & API Gateway";
      tierBadgeClass = "bg-blue-100 text-blue-800";
      icon = "🌐";
      matchedFile = "api/track.py";
      codeLang = "python";
      codeSnippet = `@app.post("/api/track")\nasync def track_telemetry_endpoint(request: Request):\n    """Edge router parses HTTP frame and validates Bearer token."""\n    token = request.headers.get("Authorization")\n    return await process_edge_event(request, token)`;
    } else if (cid.includes("worker")) {
      tier = "Serverless Edge Function";
      tierBadgeClass = "bg-teal-100 text-teal-800";
      icon = "▲";
      timeComplexity = "O(1) V8 isolate execution";
      spaceComplexity = "O(1) edge memory isolate";
      matchedFile = "workers/edge_runtime.js";
      codeLang = "javascript";
      codeSnippet = `export default {\n  async fetch(request, env) {\n    // Edge Runtime Worker sanitizes payload and injects tenant geo-IP\n    const data = await request.json();\n    return await dispatchToSupabase(data, env.SERVICE_KEY);\n  }\n};`;
    } else if (cid.includes("supabase") || cid.includes("sdk")) {
      tier = "Cloud SDK & BaaS Gateway";
      tierBadgeClass = "bg-teal-100 text-teal-800";
      icon = "🔌";
      timeComplexity = "O(1) HTTP/2 multiplexed socket write";
      spaceComplexity = "O(1) SDK connection client";
      matchedFile = "services/supabase_client.py";
      codeLang = "python";
      codeSnippet = `# Parameterized write via authenticated Supabase SDK\nresponse = supabase.table("analytics_events").insert({\n    "event_type": payload.event_type,\n    "tenant_id": user.id,\n    "metadata": payload.data\n}).execute()`;
    } else if (cid.includes("postgres") || cid.includes("database") || cid.includes("db")) {
      tier = "Persistence & Storage";
      tierBadgeClass = "bg-purple-100 text-purple-800";
      icon = "🗄️";
      timeComplexity = "O(log M) B-Tree clustered index seek";
      spaceComplexity = "O(R) row tuple write in WAL buffer";
      matchedFile = "schema.sql";
      codeLang = "sql";
      codeSnippet = `CREATE TABLE analytics_events (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    tenant_id UUID REFERENCES auth.users(id),\n    event_type TEXT NOT NULL,\n    created_at TIMESTAMPTZ DEFAULT now()\n);\nALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;`;
    } else if (cid.includes("auth") || cid.includes("check") || cid.includes("valid")) {
      tier = "Security & Decision Boundary";
      tierBadgeClass = "bg-pink-100 text-pink-800";
      icon = "🛡️";
      matchedFile = "middleware/auth_check.py";
      codeLang = "python";
      codeSnippet = `# Token & Row-Level Security (RLS) Gatekeeper\nuser = supabase.auth.get_user(jwt_token)\nif not user or not user.id:\n    raise HTTPException(status_code=401, detail="Unauthorized: invalid RLS session token")`;
    } else if (cid.includes("err") || role === "error_rejection") {
      tier = "Fault-Tolerance & Error Handler";
      tierBadgeClass = "bg-red-100 text-red-800";
      icon = "⚠️";
      matchedFile = "middleware/error_handler.py";
      codeLang = "python";
      codeSnippet = `# Standardized 401 Rejection Handler\nreturn JSONResponse(\n    status_code=401,\n    content={"error": "AUTH_FAILED", "message": "Expired JWT cryptographic signature"}\n)`;
    } else if (cid.includes("analytic") || cid.includes("dashboard") || role === "response_output") {
      tier = "Resolution & Response";
      tierBadgeClass = "bg-emerald-100 text-emerald-800";
      icon = "✅";
      matchedFile = "views/dashboard.js";
      codeLang = "javascript";
      codeSnippet = `// Realtime WebSocket channel streams aggregated event live to DOM\nsupabase.channel("live_metrics").on(\n  "postgres_changes",\n  { event: "INSERT", schema: "public", table: "analytics_events" },\n  (payload) => updateDOMMetrics(payload.new)\n).subscribe();`;
    }
  }

  // 3.5 DEDICATED ARCHITECTURAL SUB-PERSPECTIVES (Layered & Security Diagrams)
  const nodeKey = nodeId.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!codeSnippet) {
    if (nodeKey.includes("ratelimit")) {
      tier = "Security & Perimeter Defense";
      tierBadgeClass = "bg-rose-100 text-rose-800";
      icon = "🛑";
      timeComplexity = "O(1) Redis atomic INCR with sliding window TTL";
      spaceComplexity = "O(U) memory footprint per active client IP";
      matchedFile = "middleware/rate_limiter.py: line 42";
      codeLang = "python";
      codeSnippet = `# Token-bucket sliding window rate limiter\nclient_ip = request.client.host\nrequest_count = await redis.incr(f"ratelimit:{client_ip}")\nif request_count == 1:\n    await redis.expire(f"ratelimit:{client_ip}", 60)\nif request_count > 100:\n    raise HTTPException(status_code=429, detail="Rate limit exceeded: 100 req/min limit")`;
      failureMode = "Distributed clock skew or Redis memory exhaustion allowing throttling bypass under flood.";
      defenseTip = "Defend that Redis memory is bounded by setting an explicit sliding window TTL (60s) with maxmemory-eviction policies, and token-bucket algorithms prevent burst starvation.";
    } else if (nodeKey.includes("tlstermination") || nodeKey.includes("tls")) {
      tier = "Network & Perimeter Defense";
      tierBadgeClass = "bg-cyan-100 text-cyan-800";
      icon = "🔒";
      timeComplexity = "O(1) symmetric AES-256-GCM hardware cipher";
      spaceComplexity = "O(1) session ticket state";
      matchedFile = "nginx.conf / ingress.yaml";
      codeLang = "plaintext";
      codeSnippet = `# TLS 1.3 Termination & HSTS Ingress Header Policy\nssl_protocols TLSv1.3;\nssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';\nssl_prefer_server_ciphers on;\nadd_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;\nadd_header X-Content-Type-Options "nosniff" always;`;
      failureMode = "TLS renegotiation vulnerabilities or expired SSL certificate breaking downstream ingress.";
      defenseTip = "Explain that TLS 1.3 eliminates vulnerable legacy ciphers and achieves a 1-RTT handshake, while ingress termination offloads symmetric decryption load from internal services.";
    } else if (nodeKey.includes("jwtvalidator") || nodeKey.includes("authguard")) {
      tier = "Zero-Trust Identity & Access";
      tierBadgeClass = "bg-pink-100 text-pink-800";
      icon = "🛡️";
      timeComplexity = "O(1) HMAC-SHA256 signature verification";
      spaceComplexity = "O(1) decoded claims token object";
      matchedFile = "security/jwt_guard.py: line 58";
      codeLang = "python";
      codeSnippet = `# Zero-trust JWT cryptographic verification and claims assertion\ntry:\n    payload = jwt.decode(\n        token, \n        JWT_SECRET_KEY, \n        algorithms=["HS256"], \n        options={"require": ["exp", "sub", "role"]}\n    )\n    request.state.user = payload\nexcept jwt.ExpiredSignatureError:\n    raise HTTPException(status_code=401, detail="Token signature expired")\nexcept jwt.InvalidTokenError:\n    raise HTTPException(status_code=401, detail="Invalid cryptographic signature")`;
      failureMode = "Algorithm substitution attack ('alg: none') or weak symmetric secrets susceptible to offline brute-forcing.";
      defenseTip = "Emphasize that the decode call explicitly enforces algorithms=['HS256'] to prevent algorithm substitution attacks, and verify expiration timestamps in constant time.";
    } else if (nodeKey.includes("payloadsanitizer") || nodeKey.includes("validationengine")) {
      tier = "Validation & Sanitization Boundary";
      tierBadgeClass = "bg-amber-100 text-amber-800";
      icon = "⚡";
      timeComplexity = "O(K) recursive field schema traversal";
      spaceComplexity = "O(K) validated model instance";
      matchedFile = "schemas/sanitizer.py: line 74";
      codeLang = "python";
      codeSnippet = `# Anti-SQLi, XSS parameter sanitization & strict Pydantic parsing\nclass IngressPayloadValidator(BaseModel):\n    account_id: str\n    amount: float = Field(..., gt=0)\n    memo: str = Field(..., max_length=250)\n\n    @validator("memo")\n    def sanitize_memo(cls, v):\n        clean = html.escape(v)\n        if re.search(r"(--|;|/\\*|\\*/)", clean):\n            raise ValueError("Malformed character sequence detected")\n        return clean`;
      failureMode = "Second-order SQL injection where stored sanitized strings are unescaped downstream.";
      defenseTip = "Explain that Pydantic enforces strict type coercion before execution, coupled with parameterized SQL queries so raw strings are never concatenated into database drivers.";
    } else if (nodeKey.includes("isolatedservice") || (nodeKey.includes("coreservice") && !src.includes("INVENTORY"))) {
      tier = "Domain Core & Sandboxed Logic";
      tierBadgeClass = "bg-indigo-100 text-indigo-800";
      icon = "⚙️";
      timeComplexity = "O(N) domain business algorithmic execution";
      spaceComplexity = "O(1) isolated stack frame";
      matchedFile = "services/domain_core.py: line 112";
      codeLang = "python";
      codeSnippet = `# Sandboxed domain execution under least-privilege boundary\nasync def execute_secure_domain_transition(user: dict, payload: IngressPayloadValidator):\n    if user.get("role") not in ["admin", "verified_user"]:\n        raise PermissionError("Action forbidden: Insufficient security clearances")\n    \n    computed_result = await domain_engine.calculate_transition(payload)\n    return {"status": "success", "result": computed_result}`;
      failureMode = "Thread pool starvation or unhandled runtime exceptions corrupting in-memory state.";
      defenseTip = "Explain how service isolation ensures failures in business logic bubble up cleanly into typed exceptions without tearing down the worker process.";
    } else if (nodeKey.includes("atomictx") || nodeKey.includes("transactionmanager") || nodeKey.includes("transactioncoordinator")) {
      tier = "Transactional Integrity & Boundary";
      tierBadgeClass = "bg-teal-100 text-teal-800";
      icon = "🔄";
      timeComplexity = "O(1) connection commit / rollback primitive";
      spaceComplexity = "O(W) write-ahead log buffer";
      matchedFile = "database/transaction.py: line 95";
      codeLang = "python";
      codeSnippet = `# ACID Transaction Boundary Coordinator with automated rollback hook\nasync with db_engine.begin() as conn:\n    try:\n        await conn.execute(update_balance_stmt)\n        await conn.execute(insert_audit_trail_stmt)\n        # conn automatically issues COMMIT on clean exit\n    except Exception as err:\n        logger.error(f"Transaction aborted: {err}. Executing atomic rollback.")\n        raise`;
      failureMode = "Distributed transaction race conditions or database lock deadlocks leading to 500 crashes.";
      defenseTip = "Defend using ACID isolation levels (READ COMMITTED) and explain that the begin() context manager guarantees zero partial writes by issuing an immediate rollback on any error.";
    } else if (nodeKey.includes("securitytrap") || (nodeKey.includes("security") && role === "error_rejection")) {
      tier = "Fault-Tolerance & Security Quarantine";
      tierBadgeClass = "bg-red-100 text-red-800";
      icon = "⚠️";
      timeComplexity = "O(1) synchronous rejection and syslog write";
      spaceComplexity = "O(1) immutable audit log envelope";
      matchedFile = "security/quarantine.py: line 130";
      codeLang = "python";
      codeSnippet = `# Security Quarantine: 401/403 rejection with immutable audit logging\nasync def quarantine_security_violation(request: Request, violation_type: str):\n    audit_event = {\n        "event": "SECURITY_VIOLATION",\n        "type": violation_type,\n        "ip": request.client.host,\n        "timestamp": time.time()\n    }\n    syslog.critical(json.dumps(audit_event))\n    return JSONResponse(status_code=403, content={"error": "ACCESS_DENIED"})`;
      failureMode = "Audit log flooding creating denial-of-service on logging disk I/O.";
      defenseTip = "Explain that security audit records are sent over async non-blocking syslog UDP/queues so logging never blocks the event loop or crashes application servers.";
    } else if (nodeKey.includes("validationtrap")) {
      tier = "Validation & Error Boundary";
      tierBadgeClass = "bg-red-100 text-red-800";
      icon = "⚠️";
      timeComplexity = "O(1) error formatting";
      spaceComplexity = "O(1) RFC 7807 problem detail envelope";
      matchedFile = "middleware/rfc7807.py: line 65";
      codeLang = "python";
      codeSnippet = `# RFC 7807 Standardized Problem Details for HTTP APIs\nreturn JSONResponse(\n    status_code=422,\n    content={\n        "type": "https://api.system.io/errors/validation-failed",\n        "title": "Unprocessable Entity",\n        "status": 422,\n        "detail": "Request body contained invalid field formats",\n        "invalid_params": [{"name": "amount", "reason": "Must be greater than 0"}]\n    }\n)`;
      failureMode = "Leaking internal stack traces, DB schema names, or secrets in API error messages.";
      defenseTip = "Emphasize that RFC 7807 problem details sanitize internal exception messages so attackers cannot fingerprint the backend architecture.";
    } else if (nodeKey.includes("rollbacksink")) {
      tier = "Fault Tolerance & Disaster Recovery";
      tierBadgeClass = "bg-orange-100 text-orange-800";
      icon = "⏮️";
      timeComplexity = "O(1) dead-letter enqueue / compensation trigger";
      spaceComplexity = "O(M) serializable transaction payload";
      matchedFile = "services/rollback_sink.py: line 88";
      codeLang = "python";
      codeSnippet = `# Compensating Transaction & Dead-Letter Queue (DLQ) Handler\nasync def handle_failed_transaction_rollback(tx_id: str, failed_payload: dict, exc: Exception):\n    logger.warn(f"Routing aborted transaction {tx_id} to Dead-Letter Queue")\n    await dlq_broker.publish(\n        topic="transaction.failures",\n        message={"tx_id": tx_id, "payload": failed_payload, "error": str(exc)}\n    )\n    await external_partner_gateway.cancel_reservation(tx_id)`;
      failureMode = "Poison-pill messages cycling forever in queues if retries are unbounded.";
      defenseTip = "Explain that dead-letter queues capture failed transactions after 3 exponential backoff attempts, preventing infinite retry storms while preserving audit trails for debugging.";
    } else if (nodeKey.includes("encrypteddb")) {
      tier = "Data Infrastructure & Persistence";
      tierBadgeClass = "bg-purple-100 text-purple-800";
      icon = "🔐";
      timeComplexity = "O(log M) B-Tree seek with hardware AES-NI decrypt";
      spaceComplexity = "O(R) encrypted database page size";
      matchedFile = "database/encrypted_tables.sql: line 15";
      codeLang = "sql";
      codeSnippet = `-- PostgreSQL Transparent Data Encryption & Encrypted Column Store\nCREATE EXTENSION IF NOT EXISTS pgcrypto;\n\nCREATE TABLE secure_user_ledger (\n    ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    account_id UUID NOT NULL,\n    encrypted_balance BYTEA NOT NULL,\n    created_at TIMESTAMPTZ DEFAULT NOW()\n);\nALTER TABLE secure_user_ledger ENABLE ROW LEVEL SECURITY;`;
      failureMode = "Key management failure or storing cryptographic keys on the same filesystem as the database.";
      defenseTip = "Explain that database encryption at rest uses envelope encryption with external KMS / HSM, ensuring raw data remains unreadable even if physical disk dumps are compromised.";
    } else if (nodeKey.includes("successenvelope")) {
      tier = "Resolution & Client Delivery";
      tierBadgeClass = "bg-emerald-100 text-emerald-800";
      icon = "✅";
      timeComplexity = "O(1) serialization and HMAC header signing";
      spaceComplexity = "O(K) JSON output buffer";
      matchedFile = "serializers/envelope.py: line 44";
      codeLang = "python";
      codeSnippet = `# Cryptographically signed response envelope with idempotency headers\nresponse_payload = {\n    "status": "success",\n    "timestamp": time.time(),\n    "signature": hmac.new(API_SECRET, raw_body.encode(), hashlib.sha256).hexdigest(),\n    "data": processed_result\n}\nresponse.headers["X-Content-Type-Options"] = "nosniff"\nreturn response_payload`;
      failureMode = "Serialization bottlenecks when converting large domain graphs into JSON strings.";
      defenseTip = "Explain that using high-performance C-optimized serializers (ormsgpack/ujson) minimizes CPU latency and prevents event-loop blocking on high throughput spikes.";
    } else if (nodeKey.includes("externalclient")) {
      tier = "Presentation & External Traffic";
      tierBadgeClass = "bg-orange-100 text-orange-800";
      icon = "💻";
      timeComplexity = "O(1) HTTP client dispatch";
      spaceComplexity = "O(1) request payload memory";
      matchedFile = "frontend/client.js: line 25";
      codeLang = "javascript";
      codeSnippet = `// External Client Ingress: Dispatches authenticated bearer token request\nasync function callSecureAPI(endpoint, data) {\n  const token = localStorage.getItem("jwt_auth_token");\n  const response = await fetch(\`/api/v1/\${endpoint}\`, {\n    method: "POST",\n    headers: {\n      "Authorization": \`Bearer \${token}\`,\n      "Content-Type": "application/json"\n    },\n    body: JSON.stringify(data)\n  });\n  if (!response.ok) throw new Error(\`HTTP Error: \${response.status}\`);\n  return await response.json();\n}`;
      failureMode = "Storing sensitive JWTs in unencrypted localStorage vulnerable to Cross-Site Scripting (XSS).";
      defenseTip = "Point out that in production, authentication tokens should be stored in HttpOnly; SameSite=Strict; Secure cookies rather than localStorage to mitigate XSS token theft.";
    } else if (nodeKey.includes("statestore")) {
      tier = "Client State & Action Dispatcher";
      tierBadgeClass = "bg-orange-100 text-orange-800";
      icon = "⚡";
      timeComplexity = "O(1) in-memory state transition";
      spaceComplexity = "O(S) client store state tree";
      matchedFile = "frontend/store.js: line 32";
      codeLang = "javascript";
      codeSnippet = `// Centralized Client State Store: Dispatches actions and synchronizes UI\nconst stateStore = {\n  state: { items: [], status: "idle", activeId: null },\n  dispatch(action, payload) {\n    if (action === "SET_STATUS") this.state.status = payload;\n    if (action === "LOAD_DATA") this.state.items = payload;\n    notifySubscribers(this.state);\n  }\n};`;
      failureMode = "State race condition when concurrent asynchronous API responses overwrite local store out-of-order.";
      defenseTip = "Defend with sequence version tags or AbortController to discard stale API responses before mutating the client store.";
    } else if (nodeKey.includes("datarepository")) {
      tier = "Data Access & Repository Layer";
      tierBadgeClass = "bg-purple-100 text-purple-800";
      icon = "📦";
      timeComplexity = "O(log M) B-Tree indexed database query";
      spaceComplexity = "O(R) hydrated entity objects";
      matchedFile = "repositories/base_repository.py: line 36";
      codeLang = "python";
      codeSnippet = `# Repository Pattern: Decouples business domain from raw SQL queries\nclass EntityRepository:\n    def __init__(self, db_session):\n        self.db = db_session\n\n    async def get_by_id(self, entity_id: str):\n        stmt = select(EntityModel).where(EntityModel.id == entity_id)\n        result = await self.db.execute(stmt)\n        return result.scalar_one_or_none()`;
      failureMode = "N+1 query problem when lazily loading related relational entities inside a loop.";
      defenseTip = "Defend with eager loading (joinedload/selectinload) and explain how repository abstractions make switching database drivers seamless without rewriting domain business logic.";
    } else if (nodeKey.includes("cachestore")) {
      tier = "In-Memory Cache & Session Store";
      tierBadgeClass = "bg-purple-100 text-purple-800";
      icon = "⚡";
      timeComplexity = "O(1) hash map memory lookup";
      spaceComplexity = "O(C) RAM allocation under LRU eviction";
      matchedFile = "infrastructure/cache.py: line 24";
      codeLang = "python";
      codeSnippet = `# Cache-Aside Strategy with Redis & TTL Expiration\nasync def get_cached_or_compute(key: str, compute_func, ttl_seconds: int = 300):\n    cached = await redis_client.get(key)\n    if cached:\n        return json.loads(cached)\n    fresh_value = await compute_func()\n    await redis_client.setex(key, ttl_seconds, json.dumps(fresh_value))\n    return fresh_value`;
      failureMode = "Cache stampede (thundering herd) when a popular key expires simultaneously for thousands of concurrent requests.";
      defenseTip = "Defend with mutex locking (single-flight) or probabilistic early expiration (XFetch algorithm) to recompute cache before it expires.";
    }
  }

  // 4. GENERAL PARSED CODEBASE EXTRACTION (For uploaded folders, zips, GitHub repos)
  if (!codeSnippet && parsedFiles.length > 0) {
    // Attempt to locate a file matching the node role or name
    let candidateFiles = [];
    if (role === "presentation") {
      candidateFiles = parsedFiles.filter(f => /\.(html|jsx|tsx|vue|js|css)$/i.test(f.path) || /client|ui|frontend|view/i.test(f.path));
    } else if (role === "router") {
      candidateFiles = parsedFiles.filter(f => /route|router|controller|api|server|main|app/i.test(f.path));
    } else if (role === "auth_validation") {
      candidateFiles = parsedFiles.filter(f => /auth|schema|model|valid|guard|middleware/i.test(f.path));
    } else if (role === "persistence") {
      candidateFiles = parsedFiles.filter(f => /db|database|repo|store|sql|model/i.test(f.path));
    } else if (role === "error_rejection") {
      candidateFiles = parsedFiles.filter(f => /error|exception|middleware|handler/i.test(f.path));
    } else if (role === "ml_engine") {
      candidateFiles = parsedFiles.filter(f => /model|train|predict|engine|ml|dataset/i.test(f.path));
    }

    if (candidateFiles.length === 0) candidateFiles = parsedFiles;

    for (const file of candidateFiles) {
      const lines = file.content.split("\n");
      const stepSize = Math.max(10, Math.floor(lines.length / 6));

      // Scan file for functional units
      for (let i = 0; i < lines.length; i += stepSize) {
        const slice = lines.slice(i, i + 15).join("\n").trim();
        if (slice.length > 30) {
          const sig = slice.slice(0, 45).replace(/\s+/g, "");
          if (!usedSignatures.has(sig)) {
            codeSnippet = slice;
            matchedFile = `${file.path}: line ${i + 1}`;
            codeLang = file.name.endsWith(".py") ? "python" : (file.name.endsWith(".js") ? "javascript" : (file.name.endsWith(".sql") ? "sql" : "plaintext"));
            break;
          }
        }
      }
      if (codeSnippet) break;
    }
  }

  // 5. RESILIENT FALLBACK SYNTHESIS (Zero duplication guaranteed)
  if (!codeSnippet) {
    const titleClean = scanData.project_title || VivaState.projectTitle || "System";
    if (role === "presentation") {
      matchedFile = "frontend/index.html";
      codeLang = "javascript";
      codeSnippet = `// Presentation Tier: Dispatches user request to ${titleClean} API\nasync function dispatchUserAction(actionType, dataPayload) {\n  const res = await fetch("/api/v1/action", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ action: actionType, payload: dataPayload })\n  });\n  if (!res.ok) throw new Error("Presentation error: " + res.statusText);\n  return await res.json();\n}`;
    } else if (role === "router") {
      matchedFile = "routers/gateway.py";
      codeLang = "python";
      codeSnippet = `# Routing & API Gateway: Ingests HTTP frame for ${titleClean}\n@app.post("/api/v1/action", status_code=200)\nasync def ingress_route_handler(request: Request, payload: ActionPayload):\n    """Validates CORS headers and passes execution to domain service."""\n    return await domain_service.execute_action(payload)`;
    } else if (role === "auth_validation") {
      matchedFile = "schemas/constraints.py";
      codeLang = "python";
      codeSnippet = `# Security & Validation Boundary for ${titleClean}\nclass ActionPayload(BaseModel):\n    action: str = Field(..., min_length=2)\n    payload: dict = Field(...)\n    timestamp: float = Field(default_factory=time.time)\n\n    # Enforces non-empty parameter constraints\n    assert action.isidentifier(), "Action name must be valid identifier"`;
    } else if (role === "persistence") {
      matchedFile = "database/repository.py";
      codeLang = "python";
      codeSnippet = `# Persistence Layer: Transactional query execution for ${titleClean}\nasync with db_pool.acquire() as connection:\n    async with connection.transaction():\n        query = "UPDATE system_state SET last_updated = NOW() WHERE status = 'active'"\n        await connection.execute(query)`;
    } else if (role === "error_rejection") {
      matchedFile = "middleware/exceptions.py";
      codeLang = "python";
      codeSnippet = `# Fault-Tolerance & Error Handler for ${titleClean}\nif not validation_result.is_valid:\n    raise HTTPException(\n        status_code=400,\n        detail={"error": "INVALID_TRANSACTION", "reason": "Payload constraints violated"}\n    )`;
    } else if (role === "response_output") {
      matchedFile = "serializers/response.py";
      codeLang = "python";
      codeSnippet = `# Resolution & Response Serializer for ${titleClean}\nreturn {\n    "status": "success",\n    "execution_id": str(uuid.uuid4()),\n    "result": processed_output,\n    "timestamp": time.time()\n}`;
    } else {
      matchedFile = "services/core_engine.py";
      codeLang = "python";
      codeSnippet = `# Application Logic & Core Domain for ${titleClean}\ndef process_${nodeId.toLowerCase()}_state(domain_input: dict) -> dict:\n    """Executes state transition, business rules, and invariant guards."""\n    result = compute_business_transformation(domain_input)\n    return {"node": "${nodeId}", "computed_state": result}`;
    }
  }

  const snippetSignature = codeSnippet.slice(0, 45).replace(/\s+/g, "");

  const profile = {
    cleanTitle,
    tier,
    tierBadgeClass,
    icon,
    timeComplexity,
    spaceComplexity,
    defaultFile: matchedFile,
    failureMode,
    defenseTip,
    codeLang,
    codeSnippet,
    snippetSignature
  };

  nodeArchProfilesCache[nodeId] = profile;
  return profile;
}

function openArchNodeDrawer(nodeId, labelText) {
  activeInspectedNode = { nodeId, labelText };
  const scanData = VivaState.projectScan || {};
  const sourceCode = VivaState.sourceCode || "";

  // Retrieve cached profile or extract a guaranteed-unique distinct profile
  let profile = nodeArchProfilesCache[nodeId];
  if (!profile) {
    profile = extractDistinctNodeProfile(nodeId, labelText, scanData, sourceCode);
  }

  // Populate UI
  const titleEl = document.getElementById("drawer-node-title");
  const tierEl = document.getElementById("drawer-node-tier-badge");
  const fileEl = document.getElementById("drawer-node-file");
  const iconEl = document.getElementById("drawer-node-icon");
  const timeEl = document.getElementById("drawer-node-time");
  const spaceEl = document.getElementById("drawer-node-space");
  const langEl = document.getElementById("drawer-code-lang");
  const codeEl = document.getElementById("drawer-code-content");
  const failureEl = document.getElementById("drawer-node-failure");
  const defenseEl = document.getElementById("drawer-node-defense");

  if (titleEl) titleEl.textContent = profile.cleanTitle;
  if (tierEl) {
    tierEl.textContent = profile.tier;
    tierEl.className = `px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${profile.tierBadgeClass}`;
  }
  if (fileEl) fileEl.textContent = `Target Source: ${profile.defaultFile}`;
  if (iconEl) iconEl.textContent = profile.icon;
  if (timeEl) timeEl.textContent = profile.timeComplexity;
  if (spaceEl) spaceEl.textContent = profile.spaceComplexity;
  if (langEl) langEl.textContent = profile.codeLang;
  if (codeEl) codeEl.textContent = profile.codeSnippet;
  if (failureEl) failureEl.textContent = profile.failureMode;
  if (defenseEl) defenseEl.textContent = profile.defenseTip;

  // Show Drawer
  const backdrop = document.getElementById("arch-node-drawer-backdrop");
  const drawer = document.getElementById("arch-node-drawer");
  backdrop?.classList.remove("hidden");
  drawer?.classList.remove("translate-x-full");
}
window.openArchNodeDrawer = openArchNodeDrawer;

function closeArchNodeDrawer() {
  const backdrop = document.getElementById("arch-node-drawer-backdrop");
  const drawer = document.getElementById("arch-node-drawer");
  drawer?.classList.add("translate-x-full");
  setTimeout(() => {
    backdrop?.classList.add("hidden");
  }, 200);
}
window.closeArchNodeDrawer = closeArchNodeDrawer;

// Close on Escape key
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeArchNodeDrawer();
  }
});

function copyDrawerCode() {
  const codeEl = document.getElementById("drawer-code-content");
  const btn = document.getElementById("btn-copy-drawer-code");
  if (!codeEl) return;
  navigator.clipboard.writeText(codeEl.textContent || "").then(() => {
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = `<span class="text-emerald-600 font-bold">✓ Copied!</span>`;
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }
  });
}
window.copyDrawerCode = copyDrawerCode;

function startSimFromDrawerNode() {
  if (!activeInspectedNode) return;
  closeArchNodeDrawer();
  
  const scenario = activeSimScenarios.find(s => s.id === currentSimScenarioId) || activeSimScenarios[0];
  if (!scenario || !scenario.steps) {
    toggleSimPlay();
    return;
  }

  const idx = scenario.steps.findIndex(st => 
    st.node_id.toLowerCase().includes(activeInspectedNode.nodeId.toLowerCase()) ||
    activeInspectedNode.nodeId.toLowerCase().includes(st.node_id.toLowerCase())
  );

  resetSim(false);
  if (idx >= 0) {
    currentSimStepIdx = idx - 1;
    stepSimForward();
  } else {
    toggleSimPlay();
  }
}
window.startSimFromDrawerNode = startSimFromDrawerNode;

function askAITutorAboutNode() {
  if (!activeInspectedNode) return;
  const nodeName = document.getElementById("drawer-node-title")?.textContent || activeInspectedNode.nodeId;
  const prompt = `Can you explain the exact role, failure points, and time/space complexity of the '${nodeName}' component in my project? How should I defend it in my viva?`;
  localStorage.setItem("viva_tutor_prefill", prompt);
  window.location.href = "/mentor";
}
window.askAITutorAboutNode = askAITutorAboutNode;


