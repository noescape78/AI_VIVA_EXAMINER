# 🎓 VivaAI.Pro — Autonomous AI Viva Examiner & Architectural Flow Blueprint

> **Deep Code Ingestion • Live Visual System Flow Simulation • Professor Viva Traps & Voice Defense • Code Authorship Verification • Knowledge Gap Radar**

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com)
[![Google Gemini Flash](https://img.shields.io/badge/AI-Google%20Gemini%20Flash-4285F4.svg)](https://ai.google.dev/)
[![Microsoft Edge TTS](https://img.shields.io/badge/Voice-Microsoft%20Edge--TTS-0078D4.svg)](https://github.com/rany2/edge-tts)
[![Mermaid.js](https://img.shields.io/badge/Diagrams-Mermaid.js-ff3670.svg)](https://mermaid.js.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 💡 The Problem
In university viva exams, technical defenses, and code evaluation panels, examiners face two critical problems:
1. **The "ChatGPT / Copy-Paste" Epidemic**: Students present impressive projects but cannot explain how their code actually works under the hood or what happens when a race condition or edge case occurs.
2. **Static & Boring Architecture Diagrams**: Students draw dead PNG architecture diagrams that don't explain the runtime data journey, algorithmic complexity, or failure points.

## 🚀 The Solution: VivaAI.Pro
**VivaAI.Pro** is an autonomous, end-to-end oral defense and architecture analysis platform that ingests student codebases, renders an interactive system flow simulation, simulates ruthless professor cross-examinations with neural voice, and conducts realistic voice-to-voice oral viva defenses.

---

## 🌟 5 Pillar Multi-Page Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │                      VivaAI.Pro                        │
                    └───────────────────────────┬────────────────────────────┘
                                                │
       ┌──────────────────┬─────────────────────┼────────────────────┬─────────────────┐
       ▼                  ▼                     ▼                    ▼                 ▼
 ┌───────────┐    ┌────────────────┐     ┌─────────────┐      ┌─────────────┐    ┌───────────┐
 │  / (Home) │    │ /architecture  │     │    /viva    │      │   /report   │    │  /mentor  │
 │ Ingestion │    │ Flow Tracer &  │     │  Oral Room  │      │ Scorecard & │    │ AI Viva   │
 │ & Config  │    │ Viva Defense   │     │ & Proctor   │      │ Authorship  │    │  Copilot  │
 └───────────┘    └────────────────┘     └─────────────┘      └─────────────┘    └───────────┘
```

### 1. 🌐 Interactive System Flow & Architecture Blueprint (`/architecture`)
- **FigJam / Miro Visual Aesthetics**: Clean pastel nodes, bold dark headers, orthogonal connectors, and smooth pan/zoom canvas.
- **Interactive Flow Tracer Simulation**:
  - **Happy Path Scenario**: Traces nominal data packets through every pipeline stage with live payload tickers and animated glowing nodes.
  - **Error / Rejection Branch**: Simulates malicious or malformed payloads being intercepted and halted by security/validation guards before persistent state mutation.
  - **Playback Controls**: Step Forward, Play/Pause, Replay, and 1x / 1.5x / 2x speed throttles.
- **Professor Cross-Examination & Viva Defense Counter**:
  - Highlights top 3 hidden architectural traps professors love to probe (e.g. Concurrency race conditions, single-point-of-failure, connection pool exhaustion).
  - Provides a **Senior Defense Script** giving candidates the exact technical vocabulary to ace the question.
  - **Neural Voice Audio Playback**: Powered by Microsoft Edge-TTS with live animated equalizer waves.
- **Slide-Over Code & Architecture Inspector Drawer**:
  - Click **any node** in the diagram to slide out its dedicated inspector.
  - **100% Unique Source Code**: Multi-role parser extracts dedicated functions, schemas, or routes for every single node with zero repetition.
  - **Algorithmic Complexity**: Accurate Big-O Time and Space complexities for every component.
  - **Runtime Failure Point (Examiner Trap)** & **Senior Defense Strategy**.

### 2. 🎙️ Live Oral Viva Chamber (`/viva`)
- **Neural Voice-to-Voice Interaction**: AI examiners speak questions aloud using Microsoft Neural TTS; candidates answer via real-time speech recognition.
- **3 Distinct Examiner Personas**:
  - **Dr. Sharma (Strict External)**: Deep focus on Big-O, edge cases, and memory bounds.
  - **Vikram Rao (Industry Tech Lead)**: Concurrency, scalability, and system resilience.
  - **Prof. Ananya (Friendly Mentor)**: Conceptual fundamentals and encouraging feedback.
- **Animated Emotional Examiner Avatar**: Reactive SVG avatar shifts between listening, speaking, analyzing, and questioning states.
- **Anti-Cheat Tab Proctoring**: Detects and logs background tab switches during an active examination.

### 3. 📊 Official Viva Scorecard & Authorship Radar (`/report`)
- **Code Authorship / Bluff Detector**: Mathematically evaluates whether the student genuinely authored their submission or blind-copied it from an LLM.
- **Knowledge Gap Radar**: Visual bars identifying strengths and weaknesses across Concurrency, Architecture, Edge Cases, and Syntax.
- **60-Second Flashcards**: High-yield revision cards summarizing core mechanisms before viva day.

### 4. 🧠 AI Viva Copilot & Doubt Hub (`/mentor`)
- Pre-viva practice arena & personalized doubt resolution lounge where candidates can practice answering examiner follow-ups.

### 5. 📁 Multi-Source Project Ingestion (`/`)
- **1-Click Judge Samples**: Instant test drives with FastAPI E-Commerce, Scikit-Learn ML, and Node.js Web Auth.
- **Drag-and-Drop ZIP / Folder Upload**: Client-side unzipping via JSZip with automatic junk folder filtering (`node_modules`, `venv`, `.git`, `.next`, `dist`).
- **GitHub Repository Ingestion**: Ingests public repositories via GitHub API tree scans.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Framework** | **FastAPI (Python 3.10+)** | High-throughput asynchronous ASGI microservice |
| **Server Engine** | **Uvicorn + WatchFiles** | Production ASGI server with hot reloading |
| **Primary LLM** | **Google Gemini Flash** | Sub-second inference with dedicated dual-key auto-failover |
| **Fallback LLM** | **OpenRouter Multi-Key** | Free model pool (`inkling-small`, `llama-3.3`, `gemini-2.0`) |
| **Neural TTS** | **Microsoft Edge-TTS** | 100% Free, zero-API-key ultra-realistic voice synthesis |
| **Diagram Engine** | **Mermaid.js (v11)** | Dynamic SVG architectural flowchart compilation |
| **Archive Unpacker** | **JSZip (Client-Side)** | Zero-server-overhead ZIP extraction and sanitization |
| **Frontend Design** | **Tailwind CSS + Custom SaaS Theme** | Clean Linear/Stripe white aesthetic |

---

## ⚡ Quick Start Guide

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
Add your free API key (Google Gemini Flash or OpenRouter):
```env
GEMINI_API_KEYS=your-gemini-api-key-here
PORT=8000
```
> *Note: The system includes resilient built-in offline blueprints and deterministic fallbacks, ensuring the demo **NEVER crashes** even with no internet connection or depleted API quotas!*

### Step 4: Run the Application
```bash
python app.py
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser!

---

## 🛡️ Enterprise-Grade Reliability & Fault-Tolerance Architecture
- **Dual-Engine Auto-Failover**: Gemini Flash Key 1 $\rightarrow$ Gemini Flash Key 2 $\rightarrow$ OpenRouter Multi-Key $\rightarrow$ Deterministic Offline Engine.
- **Client-Side Archive Sanitization**: Drops gigabytes of `node_modules` and `venv` junk before processing, preventing memory spikes.
- **Guaranteed Node Uniqueness Engine**: Code snippet fingerprint cache ensures zero duplicate lines across architectural diagram nodes.

---

## 📜 License
Released under the [MIT License](LICENSE). Built with ❤️ for college viva preparation, technical defense mastery, and software engineering excellence.
