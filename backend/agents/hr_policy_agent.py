import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from tools.firestore_tool import all_tools as firestore_tools
from tools.storage_tool import all_tools as storage_tools

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Combine all tools needed by this agent
_tools = firestore_tools + storage_tools

hr_policy_agent = LlmAgent(
    name="hr_policy_agent",
    model="gemini-2.0-flash",
    tools=_tools,
    description="Specialist agent that answers employee questions about company policies, rules, regulations, benefits, and procedures.",
    instruction=(
        "You are the HR Policy Agent. "
        "You answer employee questions about company policies, rules, regulations, benefits, and procedures. "
        "When asked a question: "
        "1) Retrieve the relevant policy document using get_policy_text, "
        "2) Answer based strictly on the company's uploaded policy documents, "
        "3) If information is not found in the policy, clearly say so and suggest contacting HR directly. "
        "Never make up policies. Always cite which policy document your answer comes from."
    ),
)
