import os
import logging
import datetime
from google.cloud import storage
from google.oauth2 import service_account
from google.adk.tools import FunctionTool
from dotenv import load_dotenv
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "ai-chief-of-staff-policies")
SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), "../ai-chief-of-staff-494407-be8bc9d3c126.json")
def get_storage_client() -> storage.Client:
    if os.path.exists(SERVICE_ACCOUNT_FILE):
        credentials = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE)
        return storage.Client(credentials=credentials)
    return storage.Client()
def upload_policy_pdf(company_id: str, file_bytes: bytes, filename: str) -> str:
    try:
        client = get_storage_client()
        bucket = client.bucket(BUCKET_NAME)
        blob_path = f"{company_id}/{filename}"
        blob = bucket.blob(blob_path)
        blob.upload_from_string(file_bytes, content_type="application/pdf")
        if os.path.exists(SERVICE_ACCOUNT_FILE):
            signing_credentials = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE)
            signed_url = blob.generate_signed_url(
                expiration=datetime.timedelta(hours=1),
                version="v4",
                credentials=signing_credentials
            )
        else:
            signed_url = f"gs://{BUCKET_NAME}/{blob_path}"
        logger.info(f"✅ Uploaded {filename} for company {company_id}")
        return signed_url
    except Exception as e:
        logger.error(f"Error uploading policy PDF: {e}")
        return ""
def get_policy_text(company_id: str, filename: str) -> str:
    try:
        client = get_storage_client()
        bucket = client.bucket(BUCKET_NAME)
        blob_path = f"{company_id}/{filename}"
        blob = bucket.blob(blob_path)
        if blob.exists():
            content_bytes = blob.download_as_bytes()
            try:
                return content_bytes.decode('utf-8', errors='ignore')
            except Exception as decode_error:
                logger.error(f"Error decoding document text: {decode_error}")
                return str(content_bytes)
        return ""
    except Exception as e:
        logger.error(f"Error fetching policy text: {e}")
        return ""
upload_policy_pdf_tool = FunctionTool(upload_policy_pdf)
get_policy_text_tool = FunctionTool(get_policy_text)
all_tools = [upload_policy_pdf_tool, get_policy_text_tool]
