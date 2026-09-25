# 🎓 VivaAI — College Viva & Project Defense Prep Tool

<p align="center">
  <strong>College project submit kar diya par viva me professor ke samne phat rahi hai? VivaAI aapke code ko scan karta hai, interactive system flow diagram banata hai, aur real voice me viva lekar aapko tough questions ke liye prepare karta hai.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Google%20Gemini-Flash-4285F4?style=flat-square&logo=google&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/Voice-Edge--TTS-0078D4?style=flat-square" alt="Edge-TTS" />
  <img src="https://img.shields.io/badge/Flowchart-Mermaid.js-FF3670?style=flat-square&logo=mermaid&logoColor=white" alt="Mermaid" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

---

## 🧐 Asli Problem Kya Hai? (Why We Built This)

Engineering college me aksar yeh hota hai:
1. **Code to chal jata hai, par viva me bura haal hota hai**: Students project bana lete hain (ya YouTube/ChatGPT se dekhkar banate hain), lekin jab external examiner poochta hai:
   - *"Do concurrent requests ek saath aayi to tumhara database corrupt kyu nahi hoga?"*
   - *"Is function ka worst-case Time aur Space Complexity kya hai?"*
   - *"Agar network fail ho gaya to user ko kya dikhega?"*
   To mostly students blank ho jaate hain.
2. **Boring Static Architecture Diagrams**: File me ek basic PNG diagram laga dete hain jiska live code execution se koi lena-dena nahi hota.

**VivaAI** is pure viva anxiety ko khatam karta hai. Ye aapke project ko scan karke ek **live visual data flow diagram** banata hai, examiner ke **hidden traps** pehle hi bata deta hai, aur **real AI voice** ke sath viva mock practice karwata hai.

---

## 🗺️ System Flow Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │                      VivaAI.Pro                        │
                    └───────────────────────────┬────────────────────────────┘
                                                │
       ┌──────────────────┬─────────────────────┼────────────────────┬─────────────────┐
       ▼                  ▼                     ▼                    ▼                 ▼
 ┌───────────┐    ┌────────────────┐     ┌─────────────┐      ┌─────────────┐    ┌───────────┐
 │  / (Home) │    │ /architecture  │     │    /viva    │      │   /report   │    │  /mentor  │
 │ Project   │    │ Interactive    │     │ Live Voice  │      │ Scorecard & │    │ AI Viva   │
 │ Upload    │    │ Flow Tracer    │     │ Examination │      │ Gap Radar   │    │  Copilot  │
 └───────────┘    └────────────────┘     └─────────────┘      └─────────────┘    └───────────┘
```

---

## 🚀 Saare Features Ka Detail Breakdown

| Page | Route | Kya Kaam Karta Hai? | Asli Highlight |
| :--- | :--- | :--- | :--- |
| **System Flow Canvas** | `/architecture` | Project ka live data flow aur architecture blueprint | FigJam pastel flowchart, Step-by-step token tracer, Click-to-inspect code drawer |
| **Oral Viva Room** | `/viva` | Real voice me professor jaisa mock viva exam | Microsoft Edge-TTS voice, Mic input (STT), Examiner animated avatar, Anti-cheat tab monitor |
| **Viva Scorecard** | `/report` | Exam ke baad detailed analysis aur marksheet | Authorship Confidence Meter (Bluff detector), Topic-wise gap radar, 60s flashcards |
| **AI Viva Mentor** | `/mentor` | Doubt solving aur personal practice lounge | Kisi bhi function ka simple explanation aur tricky follow-up questions |
| **Project Setup** | `/` | Codebase ingestion (Folder, ZIP, ya GitHub) | 1-Click ready-made demo projects, Auto junk filter (`node_modules`, `venv` skip) |

---

### 1. 🌐 Interactive System Flow & Architecture Tracer (`/architecture`)
Ye is project ka sabse solid feature hai jo professors aur judges ko sabse zyada pasand aata hai:

- 🎮 **Step-by-Step Flow Tracer (Live Simulation)**:
  - **Happy Path Flow**: User request kaise Client se chalkar API Gateway $\rightarrow$ Validation Guard $\rightarrow$ Domain Service $\rightarrow$ Database Commit $\rightarrow$ Response tak jaati hai, har step visually pulse hokar trace hota hai.
  - **Error Rejection Path**: Agar malicious ya invalid input payload aaye, to validation layer use database tak pahunchne se pehle hi kaise block karta hai (HTTP 400/401).
  - **Simulation Controls**: Play, Pause, Step Forward, Replay, aur 1x / 1.5x / 2x speed controls with live payload data ticker.

- 🥊 **Professor Cross-Examination & Viva Defense Counter**:
  - Examiners viva me jo tricky traps poochte hain (jaise Database Race Conditions, Connection Pool Exhaustion, Single Point of Failure).
  - Saath me **Senior Defense Script** milti hai — exact technical words jo viva me bolne se examiner impress ho jaye.
  - **Audio Voice Feature**: Microsoft Edge-TTS se real professor voice me defense sun sakte ho with live animated audio waves!

- 🔍 **Click-to-Inspect Node Code Drawer**:
  - Flowchart ke **kisi bhi node** par click karo, right side se drawer slide hokar khulega.
  - **Zero Code Repetition**: Har node ka apna unique code snippet dikhega (Client ka alag, Gateway ka alag, Auth ka alag, Database ka alag).
  - Node ki accurate **Time Complexity**, **Space Complexity**, aur runtime failure point dikhata hai.

---

### 2. 🎙️ Live Oral Viva Room (`/viva`)
Aapke code ke hisaab se customized questions generate hote hain real viva style me:

| Examiner Persona | Role | Focus Areas | Question Style |
| :--- | :--- | :--- | :--- |
| **Dr. Sharma** | Strict External Examiner | Big-O Complexity, Edge cases, Memory leaks | Serious, deep technical grilling |
| **Vikram Rao** | Industry Tech Lead | Scalability, Concurrency, Database locks | Practical architecture questions |
| **Prof. Ananya** | Friendly Internal Guide | Core fundamentals, Logic flow, Concepts | Patient, step-by-step guidance |

- **Voice-to-Voice Interaction**: Examiner bolkar question poochta hai, aur aap microphone se bolkar (ya type karke) answer de sakte ho.
- **Anti-Cheat Tab Monitor**: Agar viva ke dauran student doosre tab me jakar Google ya ChatGPT search karne ki koshish kare, to system use detect karke report me flag karta hai.

---

### 3. 📊 Viva Scorecard & Authorship Radar (`/report`)
- 🕵️‍♂️ **Code Authorship / Bluff Detector**: Calculate karta hai ki student ne code sach me khud samjhkar likha hai ya bina samjhe copy-paste kiya hai.
- 🎯 **Knowledge Gap Radar**: Topic-wise graph dikhata hai ki aap Concurrency me weak ho, Error Handling me strong ho, ya Complexity me revision chahiye.
- ⚡ **60-Second Flashcards**: Viva me ghusne se pehle quick revision ke bullet points.

---

## 🛠️ Tech Stack

| Component | Technology | Kyu Use Kiya? |
| :--- | :--- | :--- |
| **Backend** | Python 3.10+, FastAPI | High speed, modern async request handling |
| **Server** | Uvicorn + WatchFiles | Auto-reload ke sath production ASGI server |
| **Primary AI** | Google Gemini Flash | Sub-second latency (1 second se kam me response) |
| **Backup AI** | OpenRouter Free Pool | Agar Gemini key fail ho to automatic fallback |
| **Voice Synthesis** | Microsoft Edge-TTS | 100% Free, realistic human voice (no API key needed) |
| **Flowchart Engine** | Mermaid.js v11 | Dynamic SVG flow diagrams client-side par render |
| **ZIP Handling** | JSZip (Browser) | ZIP aur Folders se junk files (`node_modules`, `venv`) direct filter |
| **Design** | Tailwind CSS | Clean, modern SaaS white UI theme |

---

## ⚡ Setup Kaise Karein? (Simple 4 Steps)

### Step 1: Repo Clone Karein
```bash
git clone https://github.com/noescape78/AI_VIVA_EXAMINER.git
cd AI_VIVA_EXAMINER
```

### Step 2: Dependencies Install Karein
```bash
pip install -r requirements.txt
```

### Step 3: API Key Setup Karein
`.env.example` file ko copy karke `.env` banayein:
```bash
copy .env.example .env
```
*(Mac / Linux user: `cp .env.example .env`)*

`.env` file open karein aur apni Google Gemini API key daalein:
```env
GEMINI_API_KEYS=your_gemini_key_here
PORT=8000
```
> *Note: Agar aapke paas API key nahi bhi hai ya internet chala gaya, tab bhi tension nahi — isme built-in deterministic offline blueprints hain jo bina ruke smoothly chalte hain!*

### Step 4: Server Start Karein
```bash
python app.py
```
Ab browser me open karein: **[http://localhost:8000](http://localhost:8000)**

---

## 📂 Project Structure

```
AI_VIVA_EXAMINER/
├── index.html              # Landing page, Project upload & 1-click samples
├── architecture.html       # System flow tracer, Viva traps & Code inspector drawer
├── viva.html               # Live oral viva chamber with voice & avatar
├── report.html             # Detailed scorecard, Authorship meter & Flashcards
├── mentor.html             # AI Viva Copilot doubt resolution room
├── app.py                  # FastAPI backend with multi-key AI auto-rotation
├── requirements.txt        # Python libraries list
├── .env.example            # Environment variables template
├── sample_projects/        # Ready-made demo projects for instant testing
│   ├── ecommerce_checkout.py
│   ├── disease_prediction_ml.py
│   └── jwt_auth_service.js
└── static/
    ├── css/style.css       # Clean styling, pulsing nodes & audio equalizer waves
    └── js/app.js           # Flow simulation engine, voice STT/TTS & drawer code
```

---

## 📜 License
MIT License ke under free aur open-source hai.
