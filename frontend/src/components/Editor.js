import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store';
import { exportDoc } from '../api';

export default function Editor({ docId, onClose }) {
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuthStore();
  useEffect(() => {
    const fetchBrief = async () => {
      if (!user || !docId) return;
      try {
        const docRef = doc(db, `users/${user.uid}/documents`, docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.status === 'completed') {
            setBrief(data.brief || '');
          } else {
            setBrief('Document not yet completed.');
          }
        }
      } catch (error) {
        alert('Error fetching brief: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBrief();
  }, [docId, user]);
  const handleExport = () => {
    if (token && docId) {
      exportDoc(token, docId);
    }
  };
  if (loading) return <p>Loading brief...</p>;
  return (
    <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc' }}>
      <button onClick={onClose} style={{ float: 'right' }}>Close</button>
      <h3>Case Brief Editor</h3>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <h4>Editable Brief</h4>
          <textarea
            value={brief}
            onChange={e => setBrief(e.target.value)}
            rows={20}
            cols={60}
            placeholder="Brief content will load here..."
            style={{ width: '100%', padding: '10px' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <h4>Original PDF (V2 Feature)</h4>
          <p>PDF preview placeholder - to be implemented in future versions.</p>
        </div>
      </div>
      <button onClick={handleExport} style={{ marginTop: '10px' }}>Download as .docx</button>
    </div>
  );
}