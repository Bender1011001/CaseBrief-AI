import React from 'react';
import { useAuthStore } from '../store';
import UploadArea from './UploadArea';
import DocumentList from './DocumentList';

export default function Dashboard() {
  const { user, documents, token } = useAuthStore();
  return (
    <div style={{ padding: '20px' }}>
      <h2>Welcome, {user ? user.email : 'User'}</h2>
      <UploadArea token={token} />
      <DocumentList documents={documents} />
    </div>
  );
}