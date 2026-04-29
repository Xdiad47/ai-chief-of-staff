import os
import logging
import base64
from email.message import EmailMessage
from typing import Optional, Any
from dotenv import load_dotenv
from googleapiclient.discovery import build
import google.auth
from google.adk.tools import FunctionTool

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_gmail_service() -> Any:
    """Get Gmail API service using Application Default Credentials."""
    try:
        credentials, project = google.auth.default(scopes=['https://www.googleapis.com/auth/gmail.send'])
        service = build('gmail', 'v1', credentials=credentials)
        return service
    except Exception as e:
        logger.error(f"Error initializing Gmail service: {e}")
        return None

def send_email(to: str, subject: str, body: str) -> bool:
    """Send a generic email using Gmail API."""
    try:
        service = get_gmail_service()
        if not service:
            return False
            
        message = EmailMessage()
        message.set_content(body)
        message["To"] = to
        message["From"] = "me"  # Uses the authenticated user's email
        message["Subject"] = subject

        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        create_message = {"raw": encoded_message}

        service.users().messages().send(userId="me", body=create_message).execute()
        return True
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        return False

def send_leave_approval_email(employee_email: str, employee_name: str, leave_date: str, status: str) -> bool:
    """Send an email regarding leave request status."""
    subject = f"Leave Request Update: {status}"
    body = f"Hello {employee_name},\n\nYour leave request for {leave_date} has been {status}.\n\nBest regards,\nAI Chief of Staff"
    return send_email(employee_email, subject, body)

def send_performance_summary_email(employee_email: str, employee_name: str, points: int, summary: str) -> bool:
    """Send an email regarding performance summary and points awarded."""
    subject = "Your Performance Summary"
    body = f"Hello {employee_name},\n\nYou have been awarded {points} points.\nSummary: {summary}\n\nKeep up the great work!\nBest regards,\nAI Chief of Staff"
    return send_email(employee_email, subject, body)

# Wrap as FunctionTool
send_email_tool = FunctionTool(send_email)
send_leave_approval_email_tool = FunctionTool(send_leave_approval_email)
send_performance_summary_email_tool = FunctionTool(send_performance_summary_email)

all_tools = [
    send_email_tool,
    send_leave_approval_email_tool,
    send_performance_summary_email_tool
]
