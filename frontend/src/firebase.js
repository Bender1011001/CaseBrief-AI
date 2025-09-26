import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "casebrief-ai-prod.firebaseapp.com",
  projectId: "casebrief-ai-prod",
  storageBucket: "casebrief-ai-uploads.appspot.com",
  messagingSenderId: "123",
  appId: "1:123:web:abc"
}; // Replace with actual from Firebase console

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;