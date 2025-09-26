import React, { useState } from 'react';
import Editor from './Editor';

export default function DocumentList({ documents }) {
  const [selectedDocId, setSelectedDocId] = useState(null);
  return (
    <div style={{ margin: '20px 0' }}>
      <h3>Your Documents</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {documents.map(doc => (
          <li key={doc.id} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
            <span>{doc.filename || 'Document'} - Status: {doc.status}</span>
            {doc.status === 'completed' && <button onClick={() => setSelectedDocId(doc.id)} style={{ marginLeft: '10px' }}>View & Edit</button>}
          </li>
        ))}
      </ul>
      {selectedDocId && <Editor docId={selectedDocId} onClose={() => setSelectedDocId(null)} />}
    </div>
  );
}