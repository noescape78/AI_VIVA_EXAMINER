# VivaAI — Interactive Viva Prep & Code Architecture Simulator

<p align="center">
  <strong>Analyze your codebase, simulate viva cross-examinations, and trace end-to-end data flow before viva day.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Google%20Gemini-Flash-4285F4?style=flat-square&logo=google&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/Voice-Microsoft%20Edge--TTS-0078D4?style=flat-square" alt="Edge-TTS" />
  <img src="https://img.shields.io/badge/Diagrams-Mermaid.js-FF3670?style=flat-square&logo=mermaid&logoColor=white" alt="Mermaid" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

---

## Overview

In technical project defenses and college vivas, examiners often ask questions beyond the basic features:
- *"What happens if two concurrent requests hit this function simultaneously?"*
- *"Where is the single point of failure in your architecture?"*
- *"What is the worst-case time complexity, and how do you handle unhandled exceptions?"*

**VivaAI** gives students a realistic practice environment. It ingests your project code, compiles a visual architecture flow diagram, simulates common viva traps with neural voice audio, and tests your understanding with oral viva questions.

---

## System Flow Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │                      VivaAI.Pro                        │
                    └───────────────────────────┬────────────────────────────┘
                                                │
       ┌──────────────────┬─────────────────────┼────────────────────┬─────────────────┐
       ▼                  ▼                     ▼                    ▼                 ▼
 ┌───────────┐    ┌────────────────┐     ┌─────────────┐      ┌─────────────┐    ┌───────────┐
 │  / (Home) │    │ /architecture  │     │    /viva    │      │   /report   │    │  /mentor  │
 │ Project   │    │ Interactive    │     │ Live Oral   │      │ Scorecard & │    │ AI Viva   │
 │ Ingestion │    │ Flow Tracer    │     │ Examination │      │ Gap Radar   │    │  Copilot  │
 └───────────┘    └────────────────┘     └─────────────┘      └─────────────┘    └───────────┘
```

---

## Core Features

| View | Route | Primary Purpose | Key Highlights |
| :--- | :--- | :--- | :--- |
| **System Flow Canvas** | `/architecture` | Visual data flow & blueprint inspection | FigJam pastel diagram, step-by-step token tracer, click-to-inspect code drawer |
| **Oral Viva Room** | `/viva` | Realistic voice-driven viva defense | Microsoft Edge-TTS voice audio, microphone input, reactive avatar, anti-cheat tab monitor |
| **Viva Scorecard** | `/report` | Technical performance evaluation | Authorship confidence meter, topic-by-topic knowledge gap radar, 60s revision cards |
| **AI Viva Mentor** | `/mentor` | Doubt resolution & practice lounge | Code breakdown, complex algorithm explanation, customized follow-up practice |
| **Project Ingestion** | `/` | Codebase upload & scanner | 1-click preset samples (FastAPI, ML, Web Auth), ZIP/Folder upload with junk filter, GitHub import |

---

### 1. Interactive System Flow & Architecture Tracer (`/architecture`)

- **Step-by-Step Flow Tracer**:
  - **Happy Path**: Simulates a valid request traveling from Client $\rightarrow$ API Gateway $\rightarrow$ Validation Guard $\rightarrow$ Domain Service $\rightarrow$ Database $\rightarrow$ Response.
  - **Rejection Path**: Demonstrates how malformed payloads are caught and rejected by validation layers before reaching the database.
  - **Controls**: Play/Pause, Step Forward, Replay, and 1x / 1.5x / 2x speed toggles with a live payload ticker.

- **Professor Cross-Examination & Viva Defense Counter**:
  - Highlights top 3 hidden architectural traps professors frequently target (race conditions, connection pool limits, and single-point-of-failure).
  - Provides a **Senior Defense Script** with clear talking points.
  - **Audio Playback**: Uses Microsoft Edge-TTS with live animated equalizer sound waves.

- **Slide-Over Code & Complexity Inspector**:
  - Click any node on the canvas to inspect its source code.
  - **100% Unique Code Mapping**: Each node displays its specific function or schema rather than repeating the same file.
  - Displays accurate **Big-O Time Complexity**, **Space Complexity**, and runtime failure modes.

---

### 2. Live Oral Viva Chamber (`/viva`)

Experience realistic viva practice with three distinct examiner personas:

| Persona | Role | Focus Areas | Question Style |
| :--- | :--- | :--- | :--- |
| **Dr. Sharma** | Strict External | Data structures, Big-O complexity, edge cases | Probing, detailed, technical |
| **Vikram Rao** | Industry Tech Lead | Concurrency, scalability, database transactions | Practical, architecture-oriented |
| **Prof. Ananya** | Friendly Guide | Core fundamentals, code structure, business logic | Encouraging, guided, conceptual |

- **Speech-to-Text & Text-to-Speech**: Speak your answers into your microphone or type them manually.
- **Anti-Cheat Tab Monitor**: Logs background tab switching during the active exam session.

---

### 3. Viva Scorecard & Authorship Radar (`/report`)

- **Code Authorship Analysis**: Evaluates your conceptual mastery versus memorization to estimate genuine code understanding.
- **Knowledge Gap Breakdown**: Visual bars highlight strengths and weak spots across System Architecture, Concurrency, Algorithms, and Error Handling.
- **60-Second Revision Flashcards**: Quick summary cards to refresh key mechanisms before heading into your real exam.

---

## Tech Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Backend** | Python 3.10+, FastAPI | High-performance asynchronous API server |
| **Server Engine** | Uvicorn + WatchFiles | ASGI server with live reloading |
| **Language Models** | Google Gemini Flash | Sub-second question generation and evaluation |
| **Model Fallback** | OpenRouter Pool | Redundant multi-model backup (Llama 3.3, Gemini 2.0) |
| **Voice Synthesis** | Microsoft Edge-TTS | Realistic neural speech synthesis (free, no API key) |
| **Diagram Engine** | Mermaid.js v11 | Dynamic client-side flowchart compilation |
| **ZIP Extraction** | JSZip (Client-Side) | In-browser archive extraction with directory filtering |
| **UI Styling** | Tailwind CSS | Clean SaaS layout with pastel diagram cards |

---

## Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/noescape78/AI_VIVA_EXAMINER.git
cd AI_VIVA_EXAMINER
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure environment variables
Copy `.env.example` to `.env`:
```bash
copy .env.example .env
```
*(On Linux/macOS: `cp .env.example .env`)*

Add your Gemini API key (or OpenRouter key) in `.env`:
```env
GEMINI_API_KEYS=your-gemini-api-key-here
PORT=8000
```

> **Reliability Note**: The platform includes built-in offline blueprints and deterministic question fallbacks. Even if API limits are reached or network connectivity drops, the simulation and diagrams continue to operate without crashing.

### 4. Start the server
```bash
python app.py
```

Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

## Project Structure

```
AI_VIVA_EXAMINER/
├── index.html              # Project setup, file/zip upload & 1-click samples
├── architecture.html       # Flow tracer simulation, viva traps & node inspector
├── viva.html               # Live viva chamber with audio waveforms & avatar
├── report.html             # Scorecard, authorship meter & revision cards
├── mentor.html             # AI Viva Copilot doubt resolution lounge
├── app.py                  # FastAPI application with dual-key LLM failover
├── requirements.txt        # Python dependency manifest
├── .env.example            # Environment variable template
├── sample_projects/        # Built-in demo codebases
│   ├── ecommerce_checkout.py
│   ├── disease_prediction_ml.py
│   └── jwt_auth_service.js
└── static/
    ├── css/style.css       # Clean SaaS styling, pulse animations & equalizer bars
    └── js/app.js           # Flow simulation engine, voice controls & drawer logic
```

---

## License

This project is licensed under the [MIT License](LICENSE).
