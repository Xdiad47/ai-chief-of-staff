import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from dotenv import load_dotenv
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
from agents.orchestrator import orchestrator

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Shared in-memory session service (swap for DatabaseSessionService in production)
_session_service = InMemorySessionService()
APP_NAME = "ai-chief-of-staff"


async def run_agent(company_id: str, employee_id: str, message: str) -> dict:
    """
    Runs the orchestrator agent with the given message.
    Manages sessions per employee so conversation history is preserved within a session.
    Returns a dict with 'reply' and 'agent_used' fields.
    """
    session_id = f"{company_id}_{employee_id}"

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

        # Build the user message content
        user_content = Content(
            role="user",
            parts=[Part(text=f"[company_id={company_id}] [employee_id={employee_id}] {message}")]
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
        logger.error(f"Error running agent for employee {employee_id}: {e}")
        return {
            "reply": "I'm sorry, something went wrong. Please try again shortly.",
            "agent_used": "orchestrator",
        }
