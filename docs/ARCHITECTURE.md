# Architecture

## High-Level Overview

CaseBrief AI follows a client-server architecture with real-time capabilities, leveraging serverless GCP services for scalability and security. The system is divided into frontend (user-facing React app) and backend (FastAPI API), connected via Firebase for authentication and Firestore for real-time data synchronization. PDFs are uploaded to the frontend, processed asynchronously in the backend using AI/ML services, and results are stored in Firestore for real-time updates in the UI. Exports are generated on-demand as DOCX files.

Key data flow:
- User authenticates via Firebase Auth.
- Uploads PDF to backend API (authenticated via Bearer token).
- Backend extracts text (PyMuPDF or Vision OCR), processes with Gemini multi-pass (facts extraction, legal analysis, synthesis), stores structured brief in Firestore under `/users/{uid}/documents/{docId}`.
- Frontend listens to Firestore changes for status updates (uploading -> processing -> completed).
- User edits brief locally in UI and exports to DOCX via backend.

This design ensures low latency for UI interactions, secure data isolation per user, and efficient scaling without managing servers.

## System Diagram

The following Mermaid diagram illustrates the high-level architecture and data flow:

```mermaid
graph TD
    A[User] -->|Login/Sign Up| B[Firebase Auth]
    B --> C[React Frontend]
    C -->|Upload PDF via Drag/Drop| D[FastAPI Backend /v1/process/document]
    D -->|Store PDF| E[Cloud Storage]
    D --> F[Text Extraction: PyMuPDF or Vision OCR]
    F --> G[Vertex AI Gemini Multi-Pass:<br/>1. Facts Extraction<br/>2. Legal Analysis<br/>3. Synthesis]
    G -->|Store Brief & Metadata| H[Firestore DB:<br/>/users/{uid}/documents/{docId}]
    H -->|Real-time onSnapshot| C
    C -->|View & Edit| I[Editor Component]
    I -->|Export Request| J[FastAPI Backend /v1/export/{docId}]
    J -->|Generate DOCX| K[Download Stream]
    K --> C

    style A fill:#f9f,stroke:#333
    style B fill:#bbf,stroke:#333
    style C fill:#bfb,stroke:#333
    style D fill:#fbf,stroke:#333
    style E fill:#ff9,stroke:#333
    style F fill:#ff9,stroke:#333
    style G fill:#ff9,stroke:#333
    style H fill:#9f9,stroke:#333
    style I fill:#bfb,stroke:#333
    style J fill:#fbf,stroke:#333
    style K fill:#bfb,stroke:#333
```

## Components

### Backend Components
- **FastAPI Server** ([`main.py`](../backend/main.py)): Handles API endpoints for processing and export. Initializes clients for Firestore, Storage, Vision, and Vertex AI using service account credentials.
- **PDF Processing Pipeline**: 
  - Text extraction with PyMuPDF for native PDFs; fallback to Vision API batch annotation for scanned documents (uploads to Google Storage temporarily).
  - AI Processing: Uses Vertex AI to call Gemini 1.5 Pro with structured prompts and tenacity for retries. Outputs JSON-structured brief (sections: facts, analysis, holding, etc.).
  - Storage: Brief metadata and content stored in Firestore; raw PDF in Storage with user-specific buckets.
- **Authentication**: Firebase Admin SDK verifies ID tokens from frontend requests.
- **Export Module**: Fetches brief from Firestore, constructs DOCX using python-docx with formatted sections (bold headings, paragraphs).

### Frontend Components
- **React App** ([`App.js`](../frontend/src/App.js)): Routes between Login, Dashboard, and Editor views.
- **State Management** ([`store.js`](../frontend/src/store.js)): Zustand store for auth state (onAuthStateChanged listener) and documents list (Firestore onSnapshot for real-time updates).
- **Key Components**:
  - [`Login.js`](../frontend/src/components/Login.js): Handles sign-up/login with Firebase Auth.
  - [`UploadArea.js`](../frontend/src/components/UploadArea.js): Drag-and-drop interface using react-dropzone, posts to backend API.
  - [`DocumentList.js`](../frontend/src/components/DocumentList.js): Displays user documents with status, navigates to Editor on completion.
  - [`Editor.js`](../frontend/src/components/Editor.js): Fetches full brief from Firestore, provides editable textareas, triggers export.
- **API Integration** ([`api.js`](../frontend/src/api.js)): Axios wrapper for backend calls, includes auth token in headers.

### Data Flow and Storage
- **Firestore Structure**: Documents organized as `/users/{userId}/documents/{docId}` with fields: `metadata` (title, status: 'uploading'|'processing'|'completed'|'error', createdAt), `brief` (JSON object with sections: facts, analysis, synthesis, etc.).
- **Real-time Updates**: Frontend subscribes to collection snapshots; backend updates status during processing (e.g., after extraction, after AI calls).
- **File Handling**: PDFs uploaded as multipart/form-data to backend, stored temporarily for OCR if needed, then optionally deleted post-processing. Exports streamed directly without persistent DOCX storage.
- **Error Handling**: Failures (e.g., AI quota exceeded) update status to 'error' in Firestore, with message for UI display.

## Security Considerations
- **Authentication**: All API endpoints require Bearer token verification using Firebase Admin. Frontend uses Firebase Auth for seamless integration.
- **Authorization Rules**: Firestore security rules restrict reads/writes to authenticated users only (e.g., `allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;`). No client-side access to GCP APIs.
- **Data Isolation**: User data segregated by UID in Firestore paths; Storage uses signed URLs (planned for V2) or direct backend mediation to prevent unauthorized access.
- **Secrets Management**: No API keys in code or client; service account JSON mounted as secret in Cloud Run. Environment variables for PROJECT_ID.
- **Input Validation**: PDF size limited to 10MB, content-type checked; AI prompts sanitized to prevent injection.
- **Compliance Notes**: Designed for legal data sensitivity; recommend enabling GCP audit logs and data residency in compliant regions (e.g., us-central1). For production, add rate limiting and input scanning for malware.