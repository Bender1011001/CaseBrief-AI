import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { processDocument } from '../api';

export default function UploadArea({ token }) {
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file && file.name.endsWith('.pdf')) {
      try {
        await processDocument(token, file);
        alert('Document processing started! It will appear in your list shortly.');
      } catch (error) {
        alert('Upload failed: ' + error.response?.data || error.message);
      }
    } else {
      alert('Please select a valid PDF file.');
    }
  }, [token]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });
  return (
    <section style={{ border: '2px dashed #ccc', padding: '20px', margin: '20px 0', textAlign: 'center' }}>
      <div {...getRootProps()}>
        <input {...getInputProps()} />
        <p>{isDragActive ? 'Drop the PDF here...' : 'Drag & drop a PDF file here, or click to select'}</p>
      </div>
    </section>
  );
}