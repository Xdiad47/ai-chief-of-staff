import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from google.adk.tools import FunctionTool
from services.rag_service import query_policy


def query_hr_policy(company_id: str, question: str) -> str:
    """
    Search the company HR policy documents to answer
    employee questions about policies, rules, benefits,
    leave entitlements, code of conduct, etc.
    Returns the most relevant answer from uploaded PDFs.
    """
    return query_policy(company_id, question)


query_policy_tool = FunctionTool(func=query_hr_policy)
