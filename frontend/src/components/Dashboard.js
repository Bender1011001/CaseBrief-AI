import React from 'react';
import { useAuthStore } from '../store';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import UploadArea from './UploadArea';
import DocumentList from './DocumentList';

export default function Dashboard() {
  const { user, documents, token } = useAuthStore();
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  return (
    <div style={{ padding: '20px' }}>
      <h2>Welcome, {user ? user.email : 'User'}
        <button onClick={handleLogout} style={{ marginLeft: '10px', float: 'right' }}>Logout</button>
      </h2>
      <UploadArea token={token} />
      <DocumentList documents={documents} />
    </div>
  );
}