# CaseBrief AI

## Overview

CaseBrief AI is a secure, scalable Minimum Viable Product (MVP) for generating AI-powered case briefs from legal PDF documents. It processes uploaded PDFs using a multi-pass approach with Google's Gemini model via Vertex AI: first extracting facts, then analyzing legal implications, and finally synthesizing a comprehensive brief. The application integrates Google Cloud Platform (GCP) services including Firestore for real-time data storage, Cloud Storage for file handling, Vision API for OCR on scanned documents, and Vertex AI for AI processing. Authentication is managed via Firebase Auth, ensuring user data isolation. The backend is built with FastAPI for efficient API handling, while the frontend uses React for an intuitive, real-time user interface supporting upload, editing, and export functionalities.

Guiding principles:
- **Security by Design**: Strict authentication rules, signed URLs for storage access, no exposure of API keys on the client side.
- **User-Centricity**: Intuitive UI with drag-and-drop upload, real-time status updates, and editable brief previews.
- **Scalability**: Deployed on Cloud Run for the backend and Firebase Hosting for the frontend, with auto-scaling capabilities.

This documentation consolidates all project aspects for developers and users. Version: 1.0 MVP. Assume access to a GCP project with billing enabled and a linked Firebase project.

## Quick Start

To get started quickly:

1. Clone the repository:
   ```
   git clone https://github.com/your-repo/casebrief-ai.git
   cd casebrief-ai
   ```

2. Follow GCP and Firebase setup instructions in [SETUP.md](docs/SETUP.md).

3. Set up the backend:
   ```
   cd backend
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env to set PROJECT_ID and other variables
   # Download service account key and set:
   set GOOGLE_APPLICATION_CREDENTIALS=path\to\your\service-account-key.json
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. Set up the frontend:
   ```
   cd frontend
   npm install
   # Update src/firebase.js with your Firebase project configuration from the console
   npm start
   ```
   The frontend will run on http://localhost:3000, proxying API calls to the backend at http://localhost:8000.

5. Run tests:
   ```
   # Backend tests
   cd backend
   pytest tests/ -v

   # Frontend tests
   cd frontend
   npm test
   ```

6. Deploy to production:
   ```
   # Backend (Cloud Run)
   cd backend
   sh deploy.sh

   # Frontend (Firebase Hosting)
   cd frontend
   sh deploy.sh
   ```

For detailed setup, testing, and deployment, refer to the respective documentation files.

## Project Structure

- `backend/`: Contains the FastAPI application, including [`main.py`](backend/main.py) for core logic, `requirements.txt` for dependencies, `Dockerfile` and `deploy.sh` for deployment, and `tests/` for unit tests.
- `frontend/`: React application source, including `src/` with components like [`Login.js`](frontend/src/components/Login.js), [`UploadArea.js`](frontend/src/components/UploadArea.js), state management in [`store.js`](frontend/src/store.js), API integration in [`api.js`](frontend/src/api.js), and tests in `src/__tests__/`.
- `docs/`: This folder with comprehensive project documentation.
- `mvp.html`: Static HTML for the minimal viable product demo.
- `setup.md`: Initial GCP project setup guide (referenced in [SETUP.md](docs/SETUP.md)).

## Tech Stack

- **Backend**: Python 3.11, FastAPI (API framework), PyMuPDF (PDF text extraction), python-docx (DOCX generation), google-cloud-firestore (database), google-cloud-storage (file storage), google-cloud-vision (OCR), google-cloud-aiplatform (Vertex AI Gemini), firebase-admin (auth verification), tenacity (retry logic).
- **Frontend**: React (UI framework), Zustand (state management), Firebase SDK (auth and Firestore), Axios (HTTP client), React Dropzone (file upload).
- **Database & Storage**: Firestore (real-time NoSQL database for user documents and briefs), Cloud Storage (PDF uploads and temporary OCR files).
- **Authentication**: Firebase Authentication (email/password).
- **AI/ML Services**: Google Cloud Vision API (OCR for scanned PDFs), Vertex AI (Gemini 1.5 Pro for multi-pass brief generation).
- **Deployment & CI/CD**: Docker (containerization), Google Cloud Run (backend hosting), Firebase Hosting (frontend), Cloud Build (CI via `cloudbuild.yaml`), Jest/pytest for testing.

## License

MIT License. See LICENSE for full text.