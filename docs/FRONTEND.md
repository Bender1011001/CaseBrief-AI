# Frontend Documentation

## Overview

The frontend of CaseBrief AI is a single-page React application built with Create React App, providing an intuitive user interface for authentication, PDF upload, real-time document monitoring, brief editing, and export. It leverages Firebase for authentication and Firestore for real-time data synchronization, ensuring seamless updates without page refreshes. State management is handled by Zustand for simplicity and performance, avoiding the boilerplate of Redux.

The app runs on Node.js 18+ and uses modern JavaScript (ES6+). Dependencies are defined in [`package.json`](../frontend/package.json), including React 18, Firebase SDK v10, Zustand, Axios for API calls, React Dropzone for file uploads, and testing libraries (Jest, React Testing Library). The development server starts on http://localhost:3000, with built-in proxying to the backend at http://localhost:8000 for CORS-free development.

Key principles:
- **Real-time UX**: Firestore listeners update the document list instantly as backend processing progresses.
- **Security**: No GCP API keys exposed; all sensitive operations proxied through the authenticated backend.
- **Accessibility**: Basic ARIA labels and keyboard navigation in components; editable areas use semantic HTML.

The entry point is [`index.js`](../frontend/src/index.js), which renders [`App.js`](../frontend/src/App.js) into the DOM.

## Setup

Follow the general prerequisites in [SETUP.md](SETUP.md). Specific to frontend:

1. Install dependencies:
   ```
   cd frontend
   npm install
   ```

2. Configure Firebase in [`src/firebase.js`](../frontend/src/firebase.js):
   - Obtain config from Firebase Console (Project Settings > General > Config).
   - Replace the placeholder:
     ```javascript
     import { initializeApp } from 'firebase/app';
     import { getAuth } from 'firebase/auth';
     import { getFirestore } from 'firebase/firestore';

     const firebaseConfig = {
       apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
       authDomain: "casebrief-ai.firebaseapp.com",
       projectId: "your-gcp-project-id",
       storageBucket: "casebrief-ai.appspot.com",
       messagingSenderId: "123456789",
       appId: "1:123456789:web:abcdef123456"
     };

     const app = initializeApp(firebaseConfig);
     export const auth = getAuth(app);
     export const db = getFirestore(app);
     ```
   - Enable Email/Password in Authentication and set Firestore rules for user isolation.

3. Update API base URL in [`src/api.js`](../frontend/src/api.js) if not using local backend:
   ```javascript
   const API_BASE = process.env.NODE_ENV === 'production' 
     ? 'https://your-cloud-run-url.a.run.app' 
     : 'http://localhost:8000';
   ```

4. Run the app:
   ```
   npm start
   ```
   Open http://localhost:3000 in your browser. For production build: `npm run build`.

## State Management

Global state is managed with Zustand in [`store.js`](../frontend/src/store.js), providing reactive stores for authentication and user documents. This enables real-time updates and easy access across components.

```javascript
import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from './firebase';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  init: () => {
    onAuthStateChanged(auth, (user) => {
      set({ user, loading: false });
    });
  },
}));

export const useDocumentsStore = create((set, get) => ({
  documents: [],
  loading: false,
  init: (userId) => {
    if (!userId) return;
    set({ loading: true });
    const q = query(collection(db, `users/${userId}/documents`), where('status', '!=', 'deleted'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      set({ documents: docs, loading: false });
    });
    return unsubscribe;
  },
}));
```

- **Auth Store**: Listens to Firebase auth changes, sets `user` object (uid, email).
- **Documents Store**: Subscribes to Firestore collection for the user's documents. Updates `documents` array on status changes (e.g., from 'processing' to 'completed'). Components call `init(user.uid)` after login.
- Usage: `const { user } = useAuthStore(); const { documents } = useDocumentsStore();`

This setup ensures the UI reflects backend progress without polling.

## Components

The app uses functional components with hooks. Routing is implicit via conditional rendering in App.js (Login -> Dashboard -> Editor). Key components:

- **`Login.js`** ([`src/components/Login.js`](../frontend/src/components/Login.js)): Handles user authentication.
  - Forms for sign-up and login using Firebase `createUserWithEmailAndPassword` / `signInWithEmailAndPassword`.
  - Error handling for invalid credentials; password reset link.
  - On success, sets auth state and redirects to Dashboard.
  - Example:
    ```javascript
    const handleLogin = async (email, password) => {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        setError('Invalid credentials');
      }
    };
    ```

- **`Dashboard.js`** ([`src/components/Dashboard.js`](../frontend/src/components/Dashboard.js)): Main user hub post-login.
  - Displays welcome message with user email.
  - Includes `UploadArea` for new PDFs and `DocumentList` for existing ones.
  - Uses `useDocumentsStore` for real-time list.

- **`UploadArea.js`** ([`src/components/UploadArea.js`](../frontend/src/components/UploadArea.js)): File upload interface.
  - React Dropzone for drag-and-drop or click-to-select PDF files (single, <10MB).
  - On drop, creates FormData, gets auth token from store, posts to backend `/v1/process/document` via Axios.
  - Shows upload progress; on success, adds to documents list (status 'processing').
  - Validation: File type PDF only, size check.
  - Example:
    ```javascript
    import { useDropzone } from 'react-dropzone';
    const onDrop = async (files) => {
      const formData = new FormData();
      formData.append('file', files[0]);
      try {
        await axios.post(`${API_BASE}/v1/process/document`, formData, {
          headers: { Authorization: `Bearer ${user.stsTokenManager.accessToken}` },
        });
      } catch (error) { /* handle */ }
    };
    const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1 });
    ```

- **`DocumentList.js`** ([`src/components/DocumentList.js`](../frontend/src/components/DocumentList.js)): Displays user's documents.
  - Maps over `documents` from store, showing title, status (with badges: Processing, Completed, Error), created date.
  - For completed docs, "View & Edit" button navigates to Editor (e.g., via React Router or state prop).
  - Filters/hides incomplete or error states with messages.

- **`Editor.js`** ([`src/components/Editor.js`](../frontend/src/components/Editor.js)): Brief viewing and editing.
  - Fetches full brief doc from Firestore using `getDoc` on mount (docId from props).
  - Renders sections in editable `<textarea>` elements (local state for edits; MVP doesn't save to Firestore).
  - "Export" button: GET to backend `/v1/export/{docId}`, downloads blob as DOCX.
  - Formatting: Displays JSON sections as structured text (e.g., bullets for facts).
  - Example export:
    ```javascript
    const handleExport = async (docId) => {
      const response = await axios.get(`${API_BASE}/v1/export/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${docId}.docx`;
      link.click();
    };
    ```

## API Integration

All backend communication is handled in [`api.js`](../frontend/src/api.js), a centralized Axios instance:

```javascript
import axios from 'axios';

const API_BASE = process.env.NODE_ENV === 'production' ? 'https://...' : 'http://localhost:8000';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');  // Or from store
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const processDocument = (file, title) => {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);
  return api.post('/v1/process/document', formData);
};

export const exportDocument = (docId) => api.get(`/v1/export/${docId}`, { responseType: 'blob' });

export default api;
```

- Tokens: Retrieved from Firebase user object (`user.getIdToken()`) or stored post-login.
- Error Handling: Global interceptor for 401 (redirect to login), 5xx (toast notifications).
- Proxy: In development, `package.json` includes `"proxy": "http://localhost:8000"` for seamless calls.

## Real-time Integration

Firestore integration provides live updates:
- After login, `useDocumentsStore.init(user.uid)` sets up `onSnapshot` listener on the user's documents collection.
- As the backend updates status (e.g., via `doc_ref.update({"status": "completed"})`), the snapshot fires, updating the Zustand store.
- Components re-render automatically (e.g., DocumentList shows new items or status changes).
- Unsubscribe on logout/component unmount to avoid memory leaks.
- Offline Support: Firestore SDK handles caching; UI shows loading states during reconnections.

For advanced real-time (e.g., collaborative editing in V2), consider Firestore's multi-user listeners.

This architecture ensures a responsive, secure frontend that scales with user growth. For testing, see [TESTING.md](TESTING.md).