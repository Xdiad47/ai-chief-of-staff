import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
import traceback
from datetime import date
from dotenv import load_dotenv
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
from google.cloud import firestore
from agents.orchestrator import orchestrator
from groq import AsyncGroq

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Groq fallback client — key may be GROQ_API_KEY or GROQ_AI_API_KEY
_groq_api_key = os.getenv("GROQ_API_KEY") or os.getenv("GROQ_AI_API_KEY")
groq_client = AsyncGroq(api_key=_groq_api_key)

# Shared in-memory session service (swap for DatabaseSessionService in production)
_session_service = InMemorySessionService()
APP_NAME = "ai-chief-of-staff"


def _build_employee_context(company_id: str, employee_id: str) -> str:
    """Fetches live employee data from Firestore and returns a context string."""
    try:
        db = firestore.Client()
        today = date.today().isoformat()

        # Employee profile
        profile_doc = db.collection(f"companies/{company_id}/employees").document(employee_id).get()
        profile = profile_doc.to_dict() or {}
        leave_balance = profile.get("leave_balance", {})

        # Tasks
        tasks = []
        for doc in db.collection(f"companies/{company_id}/employees/{employee_id}/tasks").stream():
            t = doc.to_dict() or {}
            tasks.append(t)

        # Leave history
        leaves = []
        for doc in db.collection(f"companies/{company_id}/employees/{employee_id}/leaves").stream():
            l = doc.to_dict() or {}
            leaves.append(l)

        task_lines = "\n".join([
            f"- [{t.get('status','open').upper()}] {t.get('title','Untitled')} | "
            f"Priority: {t.get('priority','N/A')} | "
            f"Due: {t.get('due_date','N/A')} | "
            f"Est: {t.get('estimated_hours','N/A')}h"
            for t in tasks
        ]) or "No tasks assigned."

        leave_lines = "\n".join([
            f"- {l.get('leave_type','').title()} leave: {l.get('start_date','')} to {l.get('end_date','')} "
            f"({l.get('days',0)} days) [{l.get('status','').upper()}]"
            for l in leaves
        ]) or "No leave records."

        return (
            f"=== EMPLOYEE CONTEXT (live from Firestore) ===\n"
            f"Today's date: {today}\n\n"
            f"EMPLOYEE PROFILE:\n"
            f"- Name: {profile.get('name', 'Unknown')}\n"
            f"- Department: {profile.get('department', 'N/A')}\n"
            f"- Performance Points: {profile.get('performance_points', 0)}\n"
            f"- Leave Balance: Annual={leave_balance.get('annual', 0)} days, "
            f"Sick={leave_balance.get('sick', 0)} days, "
            f"Casual={leave_balance.get('casual', 0)} days\n\n"
            f"TASKS ({len(tasks)} total):\n{task_lines}\n\n"
            f"LEAVE HISTORY ({len(leaves)} records):\n{leave_lines}\n"
            f"=== END CONTEXT ===\n\n"
        )
    except Exception as e:
        logger.warning(f"Could not fetch employee context for {employee_id}: {e}\n{traceback.format_exc()}")
        return ""


async def run_agent(company_id: str, employee_id: str, message: str) -> dict:
    """
    Runs the orchestrator agent with the given message.
    Manages sessions per employee so conversation history is preserved within a session.
    Returns a dict with 'reply' and 'agent_used' fields.
    """
    session_id = f"{company_id}_{employee_id}"

    # Build full_message before try so it's always available in the except block
    employee_context = _build_employee_context(company_id, employee_id)
    full_message = (
        f"{employee_context}"
        f"[company_id={company_id}] [employee_id={employee_id}]\n\n"
        f"USER MESSAGE: {message}"
    )

    try:
        # Retrieve existing session or create a new one
        session = await _session_service.get_session(
            app_name=APP_NAME,
            user_id=employee_id,
            session_id=session_id,
        )
        if session is None:
            session = await _session_service.create_session(
                app_name=APP_NAME,
                user_id=employee_id,
                session_id=session_id,
            )

        # Build the runner
        runner = Runner(
            agent=orchestrator,
            app_name=APP_NAME,
            session_service=_session_service,
        )
        user_content = Content(
            role="user",
            parts=[Part(text=full_message)]
        )

        # Run the agent
        reply_text = ""
        agent_used = "orchestrator"

        async for event in runner.run_async(
            user_id=employee_id,
            session_id=session_id,
            new_message=user_content,
        ):
            if event.is_final_response() and event.content and event.content.parts:
                reply_text = event.content.parts[0].text or ""
                # Capture which sub-agent responded if available
                if hasattr(event, "author") and event.author:
                    agent_used = event.author

        return {
            "reply": reply_text,
            "agent_used": agent_used,
        }

    except Exception as e:
        logger.error(f"Error running agent for employee {employee_id}: {e}\n{traceback.format_exc()}")

        if "503" in str(e) or "UNAVAILABLE" in str(e):
            logger.warning("Gemini 503 — falling back to Groq")
            try:
                response = await groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": full_message}],
                    max_tokens=1024,
                )
                return {
                    "reply": response.choices[0].message.content,
                    "agent_used": "groq-fallback",
                }
            except Exception as groq_error:
                logger.error(f"Groq fallback also failed: {groq_error}")
                return {
                    "reply": "I'm sorry, AI services are temporarily busy. Please try again in a moment.",
                    "agent_used": "orchestrator",
                }

        return {
            "reply": "I'm sorry, something went wrong. Please try again shortly.",
            "agent_used": "orchestrator",
        }
