# VivaAI - Interactive Viva Prep & Code Architecture Simulator

An interactive tool built for engineering students to prepare for college viva exams and technical project defenses. It scans your codebase, generates an interactive system flow diagram, tests your understanding through voice-driven viva simulations, and points out architectural edge cases before your professor asks about them.

---

## What It Does

Most students build good projects but struggle during viva when professors ask deep technical questions like:
- *"What happens if two users trigger this action at the exact same millisecond?"*
- *"Why did you use this data structure or library instead of standard alternatives?"*
- *"What is the time complexity here, and where can this code fail at runtime?"*

VivaAI helps you practice for these exact questions before facing your examiner.

---

## Key Features

### 1. Interactive System Flow & Architecture Tracer (`/architecture`)
- Automatically generates a visual flow diagram of your project (UI -> API -> Validation -> Service -> Database -> Response).
- Lets you trace the data flow step-by-step for both normal requests ("Happy Path") and invalid inputs ("Rejection Path").
- Highlights common viva traps for your stack (like database race conditions, missing input checks, or unhandled exceptions).
- Click any node in the diagram to inspect its source code, Big-O time and space complexity, and failure modes.

### 2. Voice Viva Simulation (`/viva`)
- Simulates a real viva interview using voice (powered by Edge-TTS).
- Choose between different examiner styles:
  - **Dr. Sharma (Strict External)**: Focuses on algorithms, edge cases, and time/space complexity.
  - **Vikram Rao (Industry Tech Lead)**: Asks about scalability, database locks, and error handling.
  - **Prof. Ananya (Friendly Mentor)**: Focuses on core concepts and step-by-step logic.
- Answer using your microphone (Speech-to-Text) or by typing.

### 3. Performance Scorecard & Concept Review (`/report`)
- Evaluates your answers and rates how deeply you understand each part of your code.
- Shows which topics you need to revise (concurrency, complexity, error handling, etc.).
- Generates quick revision flashcards to review right before your exam.

### 4. AI Mentor Chat (`/mentor`)
- Practice follow-up questions or ask for simple explanations of tricky parts in your codebase.

### 5. Flexible Project Input (`/`)
- Upload your project folder or `.zip` file (junk like `node_modules` and `venv` is automatically filtered out).
- Paste a public GitHub repository link.
- Or test immediately with 1-click built-in examples (FastAPI E-Commerce, Scikit-Learn ML, or Node.js Auth).

---

## Tech Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn
- **AI Models**: Google Gemini Flash (fast sub-second responses) with OpenRouter fallback
- **Voice / Audio**: Microsoft Edge-TTS (free, no API key required)
- **Diagrams**: Mermaid.js
- **Frontend**: HTML5, Vanilla JavaScript, Tailwind CSS

---

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/noescape78/AI_VIVA_EXAMINER.git
cd AI_VIVA_EXAMINER
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Set up environment variables
Copy `.env.example` to `.env`:
```bash
copy .env.example .env
```
*(On Linux/macOS: `cp .env.example .env`)*

Add your Gemini API key (or OpenRouter key) in `.env`:
```env
GEMINI_API_KEYS=your-api-key-here
PORT=8000
```
> **Note**: Even if your API key runs out or internet is disconnected, the app has built-in offline fallbacks so the viva simulation and architecture diagrams continue to work smoothly.

### 4. Run the app
```bash
python app.py
```

Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

## License
MIT License
