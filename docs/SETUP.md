# Setup & Prerequisites

## Local Development Prerequisites

To set up and run CaseBrief AI locally, ensure you have the following:

- **Node.js**: Version 18 or higher (for the React frontend). Download from [nodejs.org](https://nodejs.org/).
- **Python**: Version 3.11 or higher (for the FastAPI backend). Ensure pip is installed.
- **GCP Account**: A Google Cloud Platform account with billing enabled. You'll need to create a project and enable specific APIs.
- **Firebase Project**: A Firebase project linked to your GCP project for authentication and Firestore. Use the Firebase Console to set it up.
- **Git**: For cloning the repository.
- **Docker**: Optional but recommended for backend deployment testing (version 20+).
- **Additional Tools**: `uvicorn` (installed via pip), `npm` (comes with Node.js).

Verify installations:
```
node --version  # Should be >=18
python --version  # Should be >=3.11
pip --version
npm --version
```

## GCP and Firebase Configuration

Before running the application, configure your GCP and Firebase projects. This involves creating resources for Firestore, Cloud Storage, Vision API, and Vertex AI.

Follow the detailed initial setup guide in the root [setup.md](../setup.md) file, which covers:

- Creating a GCP project and enabling billing.
- Enabling required APIs: Cloud Firestore API, Cloud Storage API, Cloud Vision API, Vertex AI API.
- Setting up Firestore in Native mode (or Datastore if preferred).
- Creating a Cloud Storage bucket for PDF uploads (e.g., `casebrief-bucket`).
- Generating a service account key with roles: Firestore User, Storage Admin, Vision API User, Vertex AI User.
- Linking Firebase: Create a Firebase project in the console, add Android/iOS/Web apps if needed, enable Authentication (Email/Password provider), and set Firestore security rules to match the backend logic (e.g., user-specific access).

Download the service account JSON key file (e.g., `casebrief-ai-service-account.json`) and note your GCP Project ID.

For Firestore rules, start with:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/documents/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
Deploy rules via Firebase Console or CLI.

## Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
   This installs FastAPI, Uvicorn, google-cloud libraries, PyMuPDF, python-docx, firebase-admin, tenacity, and others.

3. Configure environment variables:
   ```
   cp .env.example .env
   ```
   Edit `.env` to set:
   - `PROJECT_ID=your-gcp-project-id`
   - Other variables as needed (e.g., `BUCKET_NAME=casebrief-bucket`).

4. Set the service account credentials:
   - Place your service account JSON key in the backend directory or a secure path.
   - Set the environment variable:
     ```
     set GOOGLE_APPLICATION_CREDENTIALS=path\to\casebrief-ai-service-account.json
     ```
     On Unix-like systems: `export GOOGLE_APPLICATION_CREDENTIALS=path/to/casebrief-ai-service-account.json`. On Windows: `set GOOGLE_APPLICATION_CREDENTIALS=path\to\casebrief-ai-service-account.json`.

5. Run the development server:
   ```
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   The API will be available at http://localhost:8000. Access interactive docs at http://localhost:8000/docs (Swagger) or http://localhost:8000/redoc. Verify: curl http://localhost:8000/health (should return {"status": "healthy"}).

Troubleshoot: If you encounter authentication errors, verify the service account roles and PROJECT_ID in `.env`.

## Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```
   This installs React, Zustand, Firebase SDK, Axios, React Dropzone, and testing libraries (Jest, React Testing Library).

3. Configure Firebase:
   - Go to the Firebase Console (https://console.firebase.google.com/), select your project.
   - In Project Settings > General > Your apps, add a Web app if not already done.
   - Copy the config object (apiKey, authDomain, projectId, etc.).
   - Create a `.env` file in the frontend root:
     ```
     REACT_APP_API_BASE=http://localhost:8000
     REACT_APP_FIREBASE_API_KEY=your_api_key_here
     REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
     REACT_APP_FIREBASE_PROJECT_ID=your-gcp-project-id
     REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage.appspot.com
     REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
     REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456
     ```
     Replace with actual values from Firebase console. Do not commit `.env` to version control (add to .gitignore).
   - The config in [`src/firebase.js`](../frontend/src/firebase.js) loads from these env vars automatically.
   - Enable Authentication: Go to Authentication > Sign-in method > Enable Email/Password.
   - Set Firestore rules as mentioned above to allow authenticated user access.

4. Run the development server:
   ```
   npm start
   ```
   The app will run on http://localhost:3000. It proxies API requests to http://localhost:8000 by default (configured in `package.json`).

## API Base URL Configuration

- **Development**: The frontend in [`src/api.js`](../frontend/src/api.js) uses `http://localhost:8000` as the base URL.
- **Production**: After deployment, update the `API_BASE` constant in `src/api.js` to the Cloud Run service URL (e.g., `https://casebrief-backend-abc123-uc.a.run.app`).
- For local testing with production-like setup, use ngrok or similar to expose localhost:8000 publicly and update the frontend accordingly.

Once both servers are running, you can authenticate, upload a PDF, and see real-time updates. Verify backend: curl -H "Authorization: Bearer your-token" http://localhost:8000/v1/process/document -F "file=@test.pdf". For full testing, refer to [TESTING.md](docs/TESTING.md).