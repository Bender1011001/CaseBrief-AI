import axios from 'axios';

const API_BASE = 'http://localhost:8000/v1';

export const processDocument = async (token, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return axios.post(`${API_BASE}/process/document`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const exportDoc = async (token, docId) => {
  const response = await axios.get(`${API_BASE}/export/${docId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `brief_${docId}.docx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const getIdToken = async (user) => (await user.getIdToken());