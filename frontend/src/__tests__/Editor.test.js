import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Editor from '../components/Editor';
import { db } from '../firebase';
import * as api from '../api';

// Mock api and firestore
jest.mock('../api');
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  setDoc: jest.fn(),
}));

const mockSetDoc = require('firebase/firestore').setDoc;
const mockExportDoc = jest.fn();
api.exportDoc = mockExportDoc;

const mockDocId = 'test_doc_id';
const mockUser = { uid: 'test_uid' };
const mockToken = 'mock_token';

jest.mock('../store', () => ({
  useAuthStore: () => ({ user: mockUser, token: mockToken }),
}));

describe('Editor', () => {
  beforeEach(() => {
    mockExportDoc.mockClear();
    mockSetDoc.mockClear();
    jest.clearAllMocks();
  });

  test('renders loading state', () => {
    render(<Editor docId={mockDocId} onClose={jest.fn()} />);
    expect(screen.getByText(/loading brief/i)).toBeInTheDocument();
  });

  test('renders brief and buttons', async () => {
    // Mock getDoc to return completed brief
    const mockDocSnap = {
      exists: () => true,
      data: () => ({ status: 'completed', brief: 'mock brief content' }),
    };
    jest.spyOn(require('firebase/firestore'), 'getDoc').mockResolvedValue(mockDocSnap);

    render(<Editor docId={mockDocId} onClose={jest.fn()} />);

    await screen.findByText('Editable Brief');
    expect(screen.getByRole('textbox')).toHaveValue('mock brief content');
    expect(screen.getByText('Download as .docx')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  test('handles textarea change', async () => {
    const mockDocSnap = {
      exists: () => true,
      data: () => ({ status: 'completed', brief: 'initial brief' }),
    };
    jest.spyOn(require('firebase/firestore'), 'getDoc').mockResolvedValue(mockDocSnap);

    render(<Editor docId={mockDocId} onClose={jest.fn()} />);

    const textarea = await screen.findByRole('textbox');
    await userEvent.type(textarea, '{enter}new text{enter}');
    expect(textarea).toHaveValue('initial brief\nnew text');
  });

  test('handles save click and calls setDoc', async () => {
    const user = userEvent.setup();
    const mockDocSnap = {
      exists: () => true,
      data: () => ({ status: 'completed', brief: 'brief to save' }),
    };
    jest.spyOn(require('firebase/firestore'), 'getDoc').mockResolvedValue(mockDocSnap);

    render(<Editor docId={mockDocId} onClose={jest.fn()} />);

    const saveButton = await screen.findByText('Save');
    await user.click(saveButton);

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(), // doc ref
      { brief: 'brief to save' },
      { merge: true }
    );
  });

  test('handles export click and calls exportDoc', async () => {
    const user = userEvent.setup();
    const mockDocSnap = {
      exists: () => true,
      data: () => ({ status: 'completed', brief: 'brief' }),
    };
    jest.spyOn(require('firebase/firestore'), 'getDoc').mockResolvedValue(mockDocSnap);

    render(<Editor docId={mockDocId} onClose={jest.fn()} />);

    const exportButton = await screen.findByText('Download as .docx');
    await user.click(exportButton);

    expect(mockExportDoc).toHaveBeenCalledWith(mockToken, mockDocId);
  });

  test('shows error on fetch failure', async () => {
    jest.spyOn(require('firebase/firestore'), 'getDoc').mockRejectedValue(new Error('fetch error'));

    render(<Editor docId={mockDocId} onClose={jest.fn()} />);

    await screen.findByText('Error fetching brief: fetch error');
  });

  test('handles incomplete document', async () => {
    const mockDocSnap = {
      exists: () => true,
      data: () => ({ status: 'processing' }),
    };
    jest.spyOn(require('firebase/firestore'), 'getDoc').mockResolvedValue(mockDocSnap);

    render(<Editor docId={mockDocId} onClose={jest.fn()} />);

    expect(await screen.findByText('Document not yet completed.')).toBeInTheDocument();
  });
});