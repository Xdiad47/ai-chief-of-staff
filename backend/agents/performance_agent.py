import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from tools.firestore_tool import all_tools as firestore_tools
from tools.gmail_tool import all_tools as gmail_tools

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Combine all tools needed by this agent
_tools = firestore_tools + gmail_tools

performance_agent = LlmAgent(
    name="performance_agent",
    model="gemini-2.5-flash",
    tools=_tools,
    description="Specialist agent that tracks employee performance, awards points, checks appraisal eligibility, and sends performance summaries.",
    instruction=(
        "You are the Performance Management Agent. "
        "You track employee performance, award points for achievements, check appraisal eligibility, "
        "and send proactive performance summaries. "
        "When called: "
        "1) Get current employee points using get_employee_points, "
        "2) Award points using award_performance_points with clear reason, "
        "3) If points exceed 100, trigger appraisal eligibility email using send_performance_summary_email, "
        "4) Send weekly performance summary emails proactively. "
        "Always be encouraging and specific about what earned the points."
    ),
)
