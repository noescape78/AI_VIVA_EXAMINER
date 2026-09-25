# 🎓 VivaAI — Interactive Project Viva & Architecture Simulator

<p align="center">
  <strong>An interactive defense preparation tool for engineering students. It scans your project code, visualizes the end-to-end data flow, simulates viva questions using voice, and highlights edge cases before your professor asks about them.</strong>
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

## 💡 The Real Problem

In university project vivas and technical defenses, students often run into the same hurdles:
1. **The code works, but defending it is hard**: Students build projects using tutorials or AI assistants, but get stuck when external examiners ask deep questions:
   - *"What happens if two users hit this checkout button at the exact same millisecond?"*
   - *"Why did you pick this database/library instead of standard alternatives?"*
   - *"What is the worst-case Time and Space complexity here, and where can this code fail?"*
2. **Static architecture diagrams**: Traditional project reports usually contain a basic static image that does not explain how data actually moves through the system or where errors are caught.

**VivaAI** solves this. It scans your source code, generates an **interactive, step-by-step visual data flow diagram**, warns you about **examiner trap questions**, and lets you practice a **voice-driven mock viva** before your actual exam.

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

## 🚀 Key Features

| View | Route | What It Does | Key Highlights |
| :--- | :--- | :--- | :--- |
| **System Flow Canvas** | `/architecture` | Visual architecture blueprint & data flow tracer | FigJam pastel diagram, step-by-step token tracer, click-to-inspect code drawer |
| **Oral Viva Chamber** | `/viva` | Realistic mock viva with voice questions | Microsoft Edge-TTS voice audio, speech-to-text mic input, reactive avatar, tab-switch proctoring |
| **Viva Scorecard** | `/report` | Post-viva performance review and marksheet | Authorship confidence score (bluff detector), topic gap radar, 60s flashcards |
| **AI Viva Mentor** | `/mentor` | Personalized doubt-solving lounge | Plain-English code explanations and follow-up question practice |
| **Project Setup** | `/` | Codebase upload & scanner | 1-Click ready-made demos (FastAPI, ML, Web Auth), ZIP/Folder upload with junk filter |

---

### 1. 🌐 Interactive System Flow & Architecture Tracer (`/architecture`)

- 🎮 **Step-by-Step Flow Tracer (Live Simulation)**:
  - **Happy Path Flow**: Watch a normal request travel from Client $\rightarrow$ API Gateway $\rightarrow$ Validation Guard $\rightarrow$ Domain Service $\rightarrow$ Database $\rightarrow$ Response. Every step lights up with glowing rings and live payload data tickers.
  - **Error Rejection Path**: Simulates what happens when bad or unauthorized data arrives — showing how validation middleware rejects the request before it touches the database.
  - **Playback Controls**: Step Forward, Play/Pause, Replay, and 1x / 1.5x / 2x speed controls.

- 🥊 **Professor Cross-Examination & Viva Defense Counter**:
  - Uncovers the top 3 hidden traps examiners love to probe (such as race conditions, connection pool limits, and single points of failure).
  - Provides an **Ideal Defense Script** with clear talking points to answer confidently.
  - **Neural Voice Playback**: Listen to the defense spoken aloud using Microsoft Edge-TTS with animated sound wave visualizers.

- 🔍 **Click-to-Inspect Node Code Drawer**:
  - Click **any node** in the diagram to slide out its dedicated inspector.
  - **Zero Code Repetition**: Each node displays its own distinct code snippet (Client has frontend fetch, Gateway has routing, Auth has schema validation, Database has queries, etc.).
  - Shows accurate **Big-O Time Complexity**, **Space Complexity**, and runtime failure points.

---

### 2. 🎙️ Live Oral Viva Chamber (`/viva`)

Practice answering technical questions out loud with three realistic examiner styles:

| Examiner Persona | Role | Focus Areas | Question Style |
| :--- | :--- | :--- | :--- |
| **Dr. Sharma** | Strict External Examiner | Algorithms, Big-O complexity, edge cases, memory limits | Deep, probing, technical grilling |
| **Vikram Rao** | Industry Tech Lead | Scalability, concurrency, race conditions, error handling | Practical, architecture-oriented |
| **Prof. Ananya** | Friendly Guide | Core fundamentals, code structure, step-by-step logic | Encouraging, patient, conceptual |

- **Voice-to-Voice Interaction**: The examiner speaks questions aloud using Edge-TTS, and you can answer using your microphone (Web Speech API) or by typing.
- **Anti-Cheat Tab Monitor**: Tracks and logs if a student switches tabs during the viva session to search on Google or ChatGPT.

---

### 3. 📊 Viva Scorecard & Authorship Radar (`/report`)

- 🕵️‍♂️ **Code Authorship Meter**: Evaluates whether the candidate genuinely understands the code mechanics or is just guessing.
- 🎯 **Knowledge Gap Radar**: Visual breakdown showing which areas need review (Concurrency, Architecture, Error Handling, or Algorithmic Complexity).
- ⚡ **60-Second Flashcards**: Quick summary cards to revise critical points right before your actual viva.

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Framework** | Python 3.10+, FastAPI | High-speed asynchronous REST API |
| **Server Engine** | Uvicorn + WatchFiles | Production ASGI server with hot reloading |
| **Primary AI Model** | Google Gemini Flash | Fast sub-second responses for questions and evaluations |
| **Backup AI Model** | OpenRouter Free Pool | Automatic fallback pool (Llama 3.3, Gemini 2.0) |
| **Voice Synthesis** | Microsoft Edge-TTS | 100% Free, natural human voice (no API key required) |
| **Flowchart Engine** | Mermaid.js v11 | Client-side dynamic SVG flowchart rendering |
| **Archive Unpacker** | JSZip (Browser) | Extracts ZIPs in-browser while filtering junk folders (`node_modules`, `venv`) |
| **Frontend Styling** | Tailwind CSS | Clean, modern white SaaS layout with pastel node themes |

---

## ⚡ Quick Start Guide (4 Steps)

### Step 1: Clone the Repository
```bash
git clone https://github.com/noescape78/AI_VIVA_EXAMINER.git
cd AI_VIVA_EXAMINER
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
copy .env.example .env
```
*(On Linux/macOS: `cp .env.example .env`)*

Open `.env` and add your free Google Gemini API key:
```env
GEMINI_API_KEYS=your-gemini-api-key-here
PORT=8000
```
> **Note**: Even if your API key runs out or internet is disconnected, VivaAI has built-in offline fallbacks so the viva simulation and architecture diagrams continue to work smoothly.

### Step 4: Start the Server
```bash
python app.py
```

Open **[http://localhost:8000](http://localhost:8000)** in your browser!

---

## 📂 Project Structure

```
AI_VIVA_EXAMINER/
├── index.html              # Landing page, project upload & 1-click test samples
├── architecture.html       # Flow tracer simulation, viva traps & code inspector drawer
├── viva.html               # Live oral viva chamber with voice & reactive avatar
├── report.html             # Detailed scorecard, authorship meter & flashcards
├── mentor.html             # AI Viva Copilot doubt resolution lounge
├── app.py                  # FastAPI server with dual-key AI auto-failover
├── requirements.txt        # Python dependency manifest
├── .env.example            # Environment variables template
├── sample_projects/        # Built-in demo projects for instant testing
│   ├── ecommerce_checkout.py
│   ├── disease_prediction_ml.py
│   └── jwt_auth_service.js
└── static/
    ├── css/style.css       # Clean styling, glowing pulse nodes & audio equalizer waves
    └── js/app.js           # Flow simulation engine, voice STT/TTS & drawer code
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
