# InterviewAI — AI Mock Interview Platform

A production-grade, full-stack AI Mock Interview Platform. Candidates have a real-time **voice** conversation with an AI interviewer that listens, adapts, follows up based on actual answers, and generates a detailed feedback report.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL (raw `pg` driver) |
| Auth | JWT + bcrypt |
| Conversation | LangGraph.js (stateful graph with Postgres checkpointing) |
| LLM | OpenAI GPT-4o-mini / GPT-4o |
| Voice | Vapi (Custom LLM mode) |

---

## Local Setup (5 commands)

### Prerequisites
- Node.js 18+
- PostgreSQL running locally
- OpenAI API key
- Vapi account (API key + public key + webhook secret)

### 1. Create the database and run migrations

```bash
createdb mock_interview_db
psql -d mock_interview_db -f backend/migrations/001_init.sql
```

### 2. Configure environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Fill in: DATABASE_URL, JWT_SECRET, LLM_API_KEY, VAPI_API_KEY, VAPI_WEBHOOK_SECRET

# Frontend
cp frontend/.env.example frontend/.env
# Fill in: VITE_VAPI_PUBLIC_KEY (from Vapi dashboard)
```

### 3. Install dependencies and start both servers

```bash
# Terminal 1 — Backend
cd backend && npm install && npm run dev

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
```

App runs at: **http://localhost:5173**  
API runs at: **http://localhost:4000**

---

## Vapi Configuration

1. Go to [Vapi Dashboard](https://dashboard.vapi.ai)
2. Create a new assistant with **Custom LLM** mode
3. Set the Custom LLM URL to: `http://your-backend-url/api/voice/webhook`
4. Copy your **Public Key** → `VITE_VAPI_PUBLIC_KEY` in frontend `.env`
5. Copy your **API Key** → `VAPI_API_KEY` in backend `.env`
6. Set a **Webhook Secret** → `VAPI_WEBHOOK_SECRET` in backend `.env`

> For local development, use [ngrok](https://ngrok.com) to expose your backend:  
> `ngrok http 4000` → use the HTTPS URL as your Vapi webhook URL

---

## Architecture

```
Vapi (STT + TTS + Call Transport)
       │
       │ POST /api/voice/webhook (OpenAI-compatible format)
       ▼
Backend (Express)
  └── voiceWebhookController
        └── interviewGraph.processCandidateTurn(sessionId, message)
              ├── answerEvaluator (classifies: strong/weak/vague)
              ├── followUpRouter (conditional routing)
              │   ├── probe → questionGenerator (same topic)
              │   ├── advance → difficultyAdjuster → questionGenerator
              │   └── close → closingNode
              └── Postgres checkpointer (saves state per session)
```

### Key Design Decisions

- **No global error handler** — every controller method handles its own try/catch
- **Postgres checkpointer** — LangGraph state persisted per session so each Vapi webhook call resumes exactly where it left off
- **No hardcoded questions** — every AI turn is generated live from transcript + state
- **No text chat** — voice only, end to end

---

## API Reference

```
POST   /api/auth/signup            { name, email, password }
POST   /api/auth/login             { email, password } → { token }
GET    /api/auth/me                → current user (JWT required)
PATCH  /api/auth/me                { jobRole, experienceLevel }

POST   /api/sessions               { interviewType } → session + Vapi call config
GET    /api/sessions               → list of past sessions
GET    /api/sessions/:id           → session detail + transcript
POST   /api/sessions/:id/end       → end session, trigger feedback generation

POST   /api/voice/webhook          → Vapi custom-LLM endpoint (no JWT)
POST   /api/voice/event            → Vapi lifecycle events

GET    /api/feedback/:sessionId    → feedback report
POST   /api/feedback/:sessionId/generate → trigger report generation
```

---

## Project Structure

```
project-root/
├── frontend/          # React 18 + Vite
│   └── src/
│       ├── pages/     # 7 pages
│       ├── components/ # VoiceCallControls, SessionCard, ProtectedRoute
│       ├── context/   # AuthContext
│       └── lib/       # apiClient, vapiClient
│
├── backend/           # Node.js + Express
│   └── src/
│       ├── config/    # db, env
│       ├── models/    # Raw SQL data access
│       ├── services/
│       │   ├── conversationEngine/  # LangGraph graph + nodes
│       │   ├── voiceService.js      # All Vapi API calls
│       │   └── feedbackService.js
│       ├── controllers/  # Local try/catch, no next(err)
│       └── routes/
│
└── README.md
```
