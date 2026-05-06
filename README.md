# 🤖 AI Chief of Staff

> An intelligent AI-powered workforce management platform — handling tasks, performance tracking, leave management, and employee operations through autonomous AI agents.

## 🌐 Live Demo

**Live at:** [https://ai-chief-of-staff-494407.web.app](https://ai-chief-of-staff-494407.web.app)

---

## 🚀 Features

- **AI Agents** — Autonomous agents for task assignment, performance evaluation, and workforce decisions
- **Task Management** — Create, assign, and track tasks across teams
- **Employee Dashboard** — Real-time employee performance and metrics
- **Leave Management** — Smart leave balance tracking and approvals
- **Admin Panel** — Full control over company operations and workforce analytics
- **Multi-Tenant SaaS** — Company-level onboarding with Firebase Auth and Firestore
- **Role-Based Access** — Admin and Employee roles with granular permissions

---

## 🛠️ Tech Stack

### Frontend
- **Next.js** (React Framework) — App Router, TypeScript
- **Firebase Hosting** — Static deployment via Firebase
- **Tailwind CSS** — Utility-first styling

### Backend
- **FastAPI** (Python) — High-performance REST API
- **Google Cloud Run** — Serverless backend deployment
- **Firebase Admin SDK** — Authentication & Firestore
- **AI Agents** — Powered by Google Gemini

### Infrastructure
- **Google Cloud Platform** — Cloud Run, Firebase, Firestore
- **Docker** — Containerised backend
- **Docker Compose** — Local development orchestration

---

## 📁 Project Structure

```
ai-chief-of-staff/
├── backend/          # FastAPI backend (Python)
│   ├── agents/       # AI agent implementations
│   ├── routers/      # API route handlers
│   ├── models/       # Pydantic data models
│   ├── services/     # Business logic & Firebase services
│   ├── tools/        # Agent tools
│   ├── main.py       # FastAPI entry point
│   └── Dockerfile    # Container config for Cloud Run
├── frontend/         # Next.js frontend (TypeScript)
│   ├── src/
│   │   └── app/      # App Router pages & components
│   └── firebase.json # Firebase Hosting config
├── agents/           # Shared agent definitions
├── tools/            # Shared tools
└── docker-compose.yml
```

---

## ⚙️ Local Development

### Prerequisites
- Node.js 18+
- Python 3.11+
- Firebase CLI
- Google Cloud CLI

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Backend runs at: `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:3000`

---

## ☁️ Deployment

| Service  | Platform            | Status |
|----------|---------------------|--------|
| Frontend | Firebase Hosting    | ✅ Live |
| Backend  | Google Cloud Run    | ✅ Live |
| Database | Google Firestore    | ✅ Live |
| Auth     | Firebase Auth       | ✅ Live |

---

## 📄 License

MIT © 2026 AI Chief of Staff
