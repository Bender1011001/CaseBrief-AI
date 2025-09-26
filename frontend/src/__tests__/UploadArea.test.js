import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadArea from '../components/UploadArea';
import * as api from '../api';

// Mock api
jest.mock('../api');

const mockProcessDocument = jest.fn();
api.processDocument = mockProcessDocument;

const mockToken = 'mock_token';
const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

describe('UploadArea', () => {
  beforeEach(() => {
    mockProcessDocument.mockClear();
  });

  test('renders upload area', () => {
    render(<UploadArea token={mockToken} />);
    expect(screen.getByText(/drop pdf here/i)).toBeInTheDocument();
  });

  test('handles file drop and calls processDocument', async () => {
    const user = userEvent.setup();
    render(<UploadArea token={mockToken} />);

    // Mock drop event
    const dropZone = screen.getByTestId('dropzone'); // Assume data-testid="dropzone" in component
    await user.upload(dropZone, mockFile);

    expect(mockProcessDocument).toHaveBeenCalledWith(mockToken, mockFile);
  });

  test('shows error on non-PDF drop', async () => {
    const user = userEvent.setup();
    const mockNonPdf = new File(['content'], 'test.txt', { type: 'text/plain' });
    render(<UploadArea token={mockToken} />);

    const dropZone = screen.getByTestId('dropzone');
    await user.upload(dropZone, mockNonPdf);

    expect(screen.getByText(/only pdf files/i)).toBeInTheDocument();
    expect(mockProcessDocument).not.toHaveBeenCalled();
  });

  test('handles upload success', async () => {
    mockProcessDocument.mockResolvedValue({ data: { docId: 'test_id' } });
    const user = userEvent.setup();
    render(<UploadArea token={mockToken} />);

    const dropZone = screen.getByTestId('dropzone');
    await user.upload(dropZone, mockFile);

    expect(screen.getByText(/upload successful/i)).toBeInTheDocument();
  });

  test('handles upload error', async () => {
    mockProcessDocument.mockRejectedValue(new Error('upload failed'));
    const user = userEvent.setup();
    render(<UploadArea token={mockToken} />);

    const dropZone = screen.getByTestId('dropzone');
    await user.upload(dropZone, mockFile);

    expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
  });
});