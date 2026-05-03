import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
import time
import traceback
from collections import defaultdict
from fastapi import APIRouter, HTTPException
from models.employee import ChatMessage, ChatResponse
from services.agent_service import run_agent
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Rate Limiting ─────────────────────────────────────────────────────────────
# Simple in-process sliding-window rate limiter (20 req / 60 s per employee)
RATE_LIMIT = 20
WINDOW_SECONDS = 60

# { employee_id: [timestamp, ...] }
_request_log: dict = defaultdict(list)


def _check_rate_limit(employee_id: str) -> None:
    now = time.time()
    window_start = now - WINDOW_SECONDS
    # Purge timestamps outside the current window
    _request_log[employee_id] = [t for t in _request_log[employee_id] if t > window_start]

    if len(_request_log[employee_id]) >= RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. You can send at most {RATE_LIMIT} messages per minute.",
        )
    _request_log[employee_id].append(now)


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("", response_model=ChatResponse)
async def chat(body: ChatMessage):
    """
    Send a message to the AI Chief of Staff orchestrator.
    Rate limited to 20 requests per minute per employee.
    """
    _check_rate_limit(body.employee_id)

    try:
        result = await run_agent(
            company_id=body.company_id,
            employee_id=body.employee_id,
            message=body.message,
        )
        return ChatResponse(
            reply=result["reply"],
            agent_used=result.get("agent_used", "orchestrator"),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat endpoint error for employee {body.employee_id}: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to process your message. Please try again.")
