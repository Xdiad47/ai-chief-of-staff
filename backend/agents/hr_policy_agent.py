import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from tools.rag_tool import query_policy_tool

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

hr_policy_agent = LlmAgent(
    name="hr_policy_agent",
    model="gemini-2.5-flash",
    tools=[query_policy_tool],
    description="Specialist agent that answers employee questions about company policies, rules, regulations, benefits, and procedures.",
    instruction=(
        "You are the HR Policy Assistant. When an employee asks "
        "about company policies, leave rules, benefits, or "
        "conduct guidelines — use the query_hr_policy tool with "
        "the company_id from context and the employee's question. "
        "Always cite which policy document your answer comes from. "
        "If no policy is found, tell the employee that no policy "
        "document has been uploaded yet."
    ),
)
