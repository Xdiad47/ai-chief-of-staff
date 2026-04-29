import os
import logging
from typing import Optional
from google.cloud import storage
from google.adk.tools import FunctionTool
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BUCKET_NAME = "ai-chief-of-staff-policies"

def get_storage_client() -> storage.Client:
    """Get Google Cloud Storage client using Application Default Credentials."""
    return storage.Client()

def upload_policy_pdf(company_id: str, file_bytes: bytes, filename: str) -> str:
    """Uploads a policy PDF to GCS and returns a signed URL that expires in 1 hour."""
    try:
        client = get_storage_client()
        bucket = client.bucket(BUCKET_NAME)
        
        blob_path = f"{company_id}/{filename}"
        blob = bucket.blob(blob_path)
        
        blob.upload_from_string(file_bytes, content_type="application/pdf")
        
        # Generate a signed URL that expires in 1 hour (3600 seconds)
        signed_url = blob.generate_signed_url(expiration=3600, version="v4")
        
        return signed_url
    except Exception as e:
        logger.error(f"Error uploading policy PDF: {e}")
        return ""

def get_policy_text(company_id: str, filename: str) -> str:
    """Downloads a policy from GCS and returns its text content."""
    try:
        client = get_storage_client()
        bucket = client.bucket(BUCKET_NAME)
        
        blob_path = f"{company_id}/{filename}"
        blob = bucket.blob(blob_path)
        
        if blob.exists():
            # Basic conversion fallback, usually requires PDF parser like PyPDF2 or Document AI
            content_bytes = blob.download_as_bytes()
            try:
                # If it's pure text or markdown
                return content_bytes.decode('utf-8', errors='ignore')
            except Exception as decode_error:
                logger.error(f"Error decoding document text: {decode_error}")
                return str(content_bytes)
        return ""
    except Exception as e:
        logger.error(f"Error fetching policy text: {e}")
        return ""

# Wrap as FunctionTool
upload_policy_pdf_tool = FunctionTool(upload_policy_pdf)
get_policy_text_tool = FunctionTool(get_policy_text)

all_tools = [
    upload_policy_pdf_tool,
    get_policy_text_tool
]
