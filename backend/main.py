import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import auth, chat, admin, employee

app = FastAPI(
    title="AI Chief of Staff API",
    description="Backend API for AI Chief of Staff powered by FastAPI and Gemini 2.0 Flash",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
