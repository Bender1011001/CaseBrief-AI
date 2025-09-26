# Backend Documentation

## Overview

The backend of CaseBrief AI is a FastAPI-based web service that handles PDF processing, AI-driven brief generation, and DOCX export. It exposes a RESTful API under the `/v1` prefix, secured with Firebase Authentication tokens. The service integrates deeply with GCP services for storage, database operations, OCR, and AI inference, ensuring secure and scalable operations without exposing sensitive credentials to the client.

Key features:
- Asynchronous PDF processing to avoid blocking the API.
- Multi-pass AI generation using Gemini for structured legal briefs.
- Real-time status updates via Firestore.
- Streaming responses for efficient file downloads.

Dependencies are listed in [`requirements.txt`](../backend/requirements.txt), including FastAPI, Uvicorn, Google Cloud client libraries, PyMuPDF for PDF parsing, python-docx for export, firebase-admin for auth, and tenacity for retry logic on AI calls. The application runs on Python 3.11+ and is containerized with Docker for deployment.

The main entry point is [`main.py`](../backend/main.py), which defines the FastAPI app, initializes GCP clients, and sets up routes and dependencies.

## API Endpoints

The backend provides two primary endpoints for the core workflow. All endpoints require authentication via a Bearer token in the `Authorization` header, verified using Firebase Admin SDK.

| Method | Path                  | Description                                      | Auth Required | Input                                                                 | Output                                      |
|--------|-----------------------|--------------------------------------------------|---------------|-----------------------------------------------------------------------|---------------------------------------------|
| POST   | /v1/process/document | Uploads a PDF, extracts text (with OCR fallback), processes with Gemini to generate a brief, and stores results in Firestore. Returns a document ID for tracking. | Yes (Bearer Token) | Multipart form-data: `file` (PDF, max 10MB). Optional: `title` (string). | JSON: `{"docId": "unique-id", "status": "processing"}` |
| GET    | /v1/export/{docId}   | Fetches the processed brief from Firestore and generates a downloadable DOCX file with formatted sections. | Yes (Bearer Token) | Path param: `docId` (string). Header: `Authorization`.                | StreamingResponse: DOCX binary file (Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document) with filename header. |

### Endpoint Details

- **POST /v1/process/document**:
  - Validates the uploaded file as a PDF (size <10MB, correct MIME type).
  - Creates a unique `docId` and initializes Firestore document with status 'uploading'.
  - Uploads PDF to Cloud Storage temporarily.
  - Extracts text using PyMuPDF; if text density is low (e.g., scanned document), triggers Vision API OCR by uploading to a processing bucket and running batch annotation.
  - Performs multi-pass AI processing (detailed in Code Walkthrough).
  - Updates Firestore with 'completed' status and structured brief JSON.
  - Example request (using curl):
    ```
    curl -X POST "http://localhost:8000/v1/process/document" \
         -H "Authorization: Bearer your-firebase-id-token" \
         -F "file=@sample.pdf" \
         -F "title=My Case"
    ```
  - Error responses: 401 (unauthorized), 413 (payload too large), 500 (processing failure, e.g., AI quota).

- **GET /v1/export/{docId}**:
  - Verifies user ownership of `docId` via Firestore query.
  - Retrieves brief sections from Firestore.
  - Constructs DOCX using python-docx: adds title, bold section headings (Facts, Analysis, etc.), and paragraphs.
  - Streams the file directly to the client.
  - Example request:
    ```
    curl -X GET "http://localhost:8000/v1/export/your-doc-id" \
         -H "Authorization: Bearer your-firebase-id-token" \
         --output brief.docx
    ```
  - Error responses: 404 (doc not found or not completed), 403 (unauthorized access).

Additional utility endpoints (for health checks or future expansion):
- GET /health: Returns `{"status": "healthy"}` (no auth required). Added in main.py for Cloud Run health checks.

CORS is configured in FastAPI to allow requests from the frontend origin (localhost:3000 in dev, production domain in deploy) using CORSMiddleware with allow_origins, credentials, methods, headers.

## Code Walkthrough

The backend logic is primarily in [`main.py`](../backend/main.py). Below is a structured overview of key components.

### Initialization and Dependencies
- **GCP Clients**: At startup, the app initializes clients using `GOOGLE_APPLICATION_CREDENTIALS`:
  ```python
  from google.cloud import firestore, storage, vision, aiplatform
  db = firestore.Client(project=PROJECT_ID)
  bucket = storage.Client().bucket(BUCKET_NAME)
  vision_client = vision.ImageAnnotatorClient()
  aiplatform.init(project=PROJECT_ID, location="us-central1")
  ```
  These are injected as dependencies in FastAPI routes.

- **Authentication Dependency**: Uses `firebase_admin` to verify tokens:
  ```python
  import firebase_admin
  from firebase_admin import auth
  from fastapi import Depends, HTTPException

  def get_current_user(token: str = Header(None)):
      try:
          decoded = auth.verify_id_token(token.replace("Bearer ", ""))
          return decoded["uid"]
      except Exception:
          raise HTTPException(401, "Invalid token")
  ```
  Applied to protected routes: `Depends(get_current_user)`.

### Processing Endpoint (/v1/process/document)
- Saves uploaded file to a temporary local path or directly to Storage.
- **Text Extraction**:
  - Uses PyMuPDF (`fitz`) to extract text: `doc = fitz.open(stream=pdf_bytes); text = "".join(page.get_text() for page in doc)`.
  - Checks text length; if < threshold (e.g., 100 chars), falls back to OCR:
    - Uploads PDF to Storage (`blob = bucket.blob(f"ocr/{doc_id}.pdf"); blob.upload_from_file()`).
    - Runs Vision batch: `request = vision.BatchAnnotateFilesRequest(...)`; `response = vision_client.batch_annotate_files(request)`.
    - Extracts annotated text from response.

- **AI Multi-Pass with Gemini**:
  - Uses Vertex AI endpoint for Gemini 1.5 Pro: `model = aiplatform.gapic.PredictionServiceClient()`.
  - Three sequential passes with structured prompts (tenacity for retries on transient errors):
    1. **Facts Extraction**: Prompt: "Extract key facts from this case text: {text}. Output JSON: {'facts': ['bullet1', ...]}".
    2. **Analysis**: Prompt: "Analyze legal implications: {facts}. Output JSON: {'analysis': {'issue': '...', 'holding': '...'}}".
    3. **Synthesis**: Prompt: "Synthesize full brief: {facts} + {analysis}. Output JSON: {'synthesis': '...', 'summary': '...'}".
  - Combines outputs into a unified brief JSON structure.
  - Retries: `@retry(wait=wait_exponential(multiplier=1, min=4, max=10), stop=stop_after_attempt(3))`.

- **Storage and Update**:
  - Writes brief to Firestore: `doc_ref = db.collection(f"users/{uid}/documents").document(doc_id); doc_ref.set({"brief": brief_json, "status": "completed", ...})`.
  - Updates status incrementally (e.g., "extracting", "analyzing") for real-time UI feedback.
  - Cleans up temporary Storage files post-processing.

### Export Endpoint (/v1/export/{docId})
- Fetches document: `doc = db.collection(f"users/{uid}/documents").document(doc_id).get()`.
- If status != "completed", returns 400.
- Parses brief JSON sections.
- Generates DOCX:
  ```python
  from docx import Document
  docx = Document()
  docx.add_heading("Case Brief", 0)
  for section, content in brief["sections"].items():
      docx.add_heading(section.title(), level=1)
      if isinstance(content, list):
          for item in content:
              docx.add_paragraph(item, style="List Bullet")
      else:
          docx.add_paragraph(content)
  # Save to BytesIO and return StreamingResponse
  from fastapi.responses import StreamingResponse
  return StreamingResponse(io.BytesIO(docx_bytes), media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", headers={"Content-Disposition": f"attachment; filename={doc_id}.docx"})
  ```

Error handling uses FastAPI's exception handlers for 4xx/5xx responses, logging via `logging` module.

## Configuration

- **Environment Variables** (in `.env`):
  - `PROJECT_ID`: Your GCP project ID (required).
  - `BUCKET_NAME`: Cloud Storage bucket for PDFs/OCR (default: casebrief-ai-uploads).
  - `GEMINI_MODEL`: Gemini model name (default: gemini-1.5-pro).
  - `MAX_FILE_SIZE`: Upload limit in MB (hardcoded 10; env for future).
  - `TEXT_THRESHOLD`: Min chars for PyMuPDF vs. OCR (hardcoded 500; env for future).

- **Service Account JSON**: Required for GCP clients. Download from IAM & Admin > Service Accounts in GCP Console. Assign roles: `roles/datastore.user`, `roles/storage.admin`, `roles/vision.user`, `roles/aiplatform.user`. Set `GOOGLE_APPLICATION_CREDENTIALS` to the JSON path.

For production, use secret mounting in Cloud Run instead of local JSON files. Refer to [DEPLOYMENT.md](docs/DEPLOYMENT.md) for details, including gcloud secrets create and --set-secrets.