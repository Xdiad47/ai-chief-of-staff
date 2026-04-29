import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from tools.firestore_tool import all_tools as firestore_tools
from tools.gmail_tool import all_tools as gmail_tools
from tools.calendarific_tool import all_tools as calendarific_tools
from tools.storage_tool import all_tools as storage_tools
from agents.leave_agent import leave_agent
from agents.performance_agent import performance_agent
from agents.hr_policy_agent import hr_policy_agent
from agents.project_agent import project_agent

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Combine all tools from all tool files
_all_tools = (
    firestore_tools +
    gmail_tools +
    calendarific_tools +
    storage_tools
)

orchestrator = LlmAgent(
    name="orchestrator",
    model="gemini-2.0-flash",
    tools=_all_tools,
    sub_agents=[leave_agent, performance_agent, hr_policy_agent, project_agent],
    description="Master orchestrator agent — the AI Chief of Staff that understands employee requests and routes them to the right specialist agent.",
    instruction=(
        "You are the AI Chief of Staff — the master orchestrator for a company's intelligent workplace assistant. "
        "You understand employee requests and route them to the right specialist agent: "
        "1) Leave requests, balance checks → delegate to leave_agent, "
        "2) Performance points, appraisals, bonuses → delegate to performance_agent, "
        "3) Company policy questions, HR rules, regulations → delegate to hr_policy_agent, "
        "4) Project status, deadlines, priorities → delegate to project_agent. "
        "For each request, identify the employee's company_id and employee_id from context, "
        "then delegate to the appropriate sub-agent with full context. "
        "Always respond in a friendly, professional tone."
    ),
)
