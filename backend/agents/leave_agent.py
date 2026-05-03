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
    model="gemini-2.5-flash",
    tools=_tools,
    description="Specialist agent that handles all employee leave requests, balance checks, and leave approvals.",
    instruction=(
        "You are the Leave Management Agent for AI Chief of Staff. "
        "You handle all leave-related requests for employees. "
        "\n\n"
        "IMPORTANT: You must read company_id and employee_id from the session context "
        "variables (ctx.session.state or passed via the user's session metadata). "
        "Never ask the employee for their IDs — use the ones provided in context.\n\n"
        "When an employee asks to 'apply for leave', 'request leave', or similar:\n"
        "1. If any required detail is missing (leave_type, start_date, end_date, days, reason), "
        "   ask the employee for it conversationally.\n"
        "2. Call get_leave_balance(company_id, employee_id) to check available balance.\n"
        "3. If the requested leave_type balance is insufficient, inform the employee and stop.\n"
        "4. Optionally call is_holiday to warn about public holidays in the date range.\n"
        "5. Call create_leave_request(company_id, employee_id, leave_type, start_date, end_date, days, reason) "
        "   to submit the request.\n"
        "6. The request will be PENDING admin approval — do NOT deduct from the balance yet.\n"
        "7. Confirm to the employee: 'Your leave request has been submitted and is pending admin approval.'\n\n"
        "When an employee asks to check their leave balance, call get_leave_balance and report the details.\n"
        "When an employee asks about their leave history, call get_leave_requests.\n"
        "Always respond in a friendly, professional tone."
    ),
)
