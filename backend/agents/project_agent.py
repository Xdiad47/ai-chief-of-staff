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

project_agent = LlmAgent(
    name="project_agent",
    model="gemini-2.5-flash",
    tools=_tools,
    description="Specialist agent that tracks project status, deadlines, and priorities, and sends proactive reminders.",
    instruction=(
        "You are the Project Management Agent. "
        "You track project status, deadlines, priorities and send reminders. "
        "When called: "
        "1) Get all projects using get_projects, "
        "2) Identify overdue or high-priority projects, "
        "3) Send reminder emails to relevant employees using send_email, "
        "4) Report project status clearly with priority levels: HIGH, MEDIUM, LOW. "
        "Always include deadlines and current status in your responses."
    ),
)
