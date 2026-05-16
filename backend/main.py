import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from config import settings
from routers import auth, chat, admin, employee
from services.reminder_service import run_task_reminders_all_companies

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")


async def _daily_reminders():
    logger.info("[scheduler] Running daily task reminders...")
    from google.cloud import firestore as _firestore
    db = _firestore.Client()
    results = await run_task_reminders_all_companies(db)
    logger.info("[scheduler] Reminder run complete: %s", results)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run at 09:00 IST every day
    scheduler.add_job(_daily_reminders, CronTrigger(hour=9, minute=0))
    scheduler.start()
    logger.info("[scheduler] Task reminder scheduler started (daily 09:00 IST)")
    yield
    scheduler.shutdown()
    logger.info("[scheduler] Scheduler stopped")

app = FastAPI(
    title="AI Chief of Staff API",
    description="Backend API for AI Chief of Staff powered by FastAPI and Gemini 2.0 Flash",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://ai-chief-of-staff-494407.web.app",
        "https://ai-chief-of-staff-494407.firebaseapp.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,     prefix="/api/auth",     tags=["Auth"])
app.include_router(chat.router,     prefix="/api/chat",     tags=["Chat"])
app.include_router(admin.router,    prefix="/api/admin",    tags=["Admin"])
app.include_router(employee.router, prefix="/api/employee", tags=["Employee"])

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "message": "Welcome to AI Chief of Staff API",
        "project_id": settings.PROJECT_ID,
        "environment": settings.ENVIRONMENT,
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
