"""
RAG Service — HR Policy PDF retrieval via GCS.

Downloads policy PDFs directly from GCS using the storage client so there is
no signed-URL expiry to worry about. Falls back to signed_url only for legacy
Firestore documents that predate the gcs_path field.

Only the FAISS vectorstore is cached, keyed by policy document ID.
"""
import logging
import os
import tempfile
import requests
from google.cloud import firestore
from google.cloud import storage as gcs
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS

logger = logging.getLogger(__name__)
db = firestore.Client()

BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "ai-chief-of-staff-policies")

# Cache: { company_id: { "vectorstore": FAISS, "last_policy_id": str } }
_vector_cache: dict = {}


def _fetch_fresh_policy(company_id: str) -> tuple[dict | None, str | None]:
    """
    Fetches policy metadata fresh from Firestore every time — never cached.
    Returns (policy_dict, policy_doc_id).
    """
    try:
        docs = list(
            db.collection(f"companies/{company_id}/policies")
            .limit(1)
            .stream()
        )
        if not docs:
            return None, None
        doc = docs[0]
        return doc.to_dict(), doc.id
    except Exception as e:
        logger.error(f"_fetch_fresh_policy error for {company_id}: {e}")
        return None, None


def build_vectorstore(company_id: str, force_rebuild: bool = False):
    """
    Downloads the policy PDF and builds/caches a FAISS vectorstore.

    Prefers gcs_path (permanent, no expiry) over signed_url (legacy, 1h expiry).
    Only rebuilds when the Firestore policy doc ID changes or force_rebuild=True.
    """
    policy_data, policy_id = _fetch_fresh_policy(company_id)
    if not policy_data or not policy_id:
        logger.warning(f"No policy document found for company {company_id}")
        return None

    cached = _vector_cache.get(company_id)
    if cached and not force_rebuild and cached.get("last_policy_id") == policy_id:
        logger.info(f"Using cached vectorstore for {company_id}")
        return cached["vectorstore"]

    try:
        gcs_path = policy_data.get("gcs_path")

        if gcs_path:
            # Direct GCS download — no expiry, works indefinitely
            storage_client = gcs.Client()
            bucket = storage_client.bucket(BUCKET_NAME)
            blob = bucket.blob(gcs_path)
            pdf_bytes = blob.download_as_bytes()
            logger.info(f"Downloaded policy via GCS path: {gcs_path}")
        else:
            # Legacy fallback: signed URL (expires 1h after upload)
            signed_url = policy_data.get("signed_url")
            if not signed_url:
                logger.error(f"No gcs_path or signed_url in policy doc for {company_id}")
                return None
            resp = requests.get(signed_url, timeout=30)
            if resp.status_code == 403:
                logger.error(
                    f"Signed URL expired for {company_id}. "
                    "Admin must re-upload the policy PDF — "
                    "new uploads automatically store gcs_path."
                )
                return None
            resp.raise_for_status()
            pdf_bytes = resp.content
            logger.info(f"Downloaded policy via legacy signed URL for {company_id}")

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name

        pages = PyPDFLoader(tmp_path).load()
        chunks = RecursiveCharacterTextSplitter(
            chunk_size=1000, chunk_overlap=200
        ).split_documents(pages)

        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        vectorstore = FAISS.from_documents(chunks, embeddings)

        _vector_cache[company_id] = {
            "vectorstore": vectorstore,
            "last_policy_id": policy_id,
        }
        logger.info(f"Vectorstore built for {company_id}: {len(chunks)} chunks")
        return vectorstore

    except Exception as e:
        logger.error(f"build_vectorstore error for {company_id}: {e}")
        return None


def query_policy(company_id: str, question: str, k: int = 4) -> str:
    """
    Main interface for hr_policy_agent. Runs similarity search and returns top chunks.
    """
    vectorstore = build_vectorstore(company_id)
    if not vectorstore:
        return (
            "No HR policy documents are available for your company. "
            "Please ask your admin to upload the policy PDF."
        )
    try:
        docs = vectorstore.similarity_search(question, k=k)
        if not docs:
            return "No relevant policy information found for your question."
        return "\n\n---\n\n".join(doc.page_content for doc in docs)
    except Exception as e:
        logger.error(f"query_policy error: {e}")
        return f"Error searching policy documents: {str(e)}"
