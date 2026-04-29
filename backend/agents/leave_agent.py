import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from tools.firestore_tool import all_tools as firestore_tools
from tools.gmail_tool import all_tools as gmail_tools
from tools.calendarific_tool import all_tools as calendarific_tools

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Combine all tools needed by this agent
_tools = firestore_tools + gmail_tools + calendarific_tools

leave_agent = LlmAgent(
    name="leave_agent",
    model="gemini-2.0-flash",
    tools=_tools,
    description="Specialist agent that handles all employee leave requests, balance checks, and leave approvals.",
    instruction=(
        "You are the Leave Management Agent for AI Chief of Staff. "
        "You handle all leave-related requests for employees. "
        "When an employee requests leave: "
        "1) Check their leave balance using get_leave_balance, "
        "2) Check if the requested date is a holiday using is_holiday, "
        "3) If balance is available and date is valid, approve by calling update_leave_balance with negative days, "
        "4) Create a leave request record using create_leave_request, "
        "5) Send confirmation email using send_leave_approval_email. "
        "Always respond with clear status and remaining balance."
    ),
)
