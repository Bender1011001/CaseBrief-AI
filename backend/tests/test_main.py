import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, Mock
from main import app

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

def test_process_document_valid_pdf(client, monkeypatch):
    files = {'file': ('test.pdf', b'%PDF-1.4\nmock pdf content\n', 'application/pdf')}
    data = {'user_id': 'test_user'}
    mock_fitz_doc = Mock()
    mock_page = Mock()
    mock_page.get_text.return_value = "mock extracted text"
    mock_fitz_doc[0] = mock_page
    mock_fitz_doc.__len__.return_value = 1
    with patch('main.fitz.open') as mock_fitz_open:
        mock_fitz_open.return_value.__enter__.return_value = mock_fitz_doc
        mock_response = Mock()
        mock_response.text = "mock ai analysis"
        with patch('main.model.generate_content') as mock_gen:
            mock_gen.return_value = mock_response
            with patch('main.db') as mock_db:
                mock_db.set.return_value = None
                mock_db.update.return_value = None
                response = client.post('/process-document', files=files, data=data)
                assert response.status_code == 200
                assert 'docId' in response.json()

def test_process_document_non_pdf(client):
    files = {'file': ('test.txt', b'mock text content', 'text/plain')}
    data = {'user_id': 'test_user'}
    response = client.post('/process-document', files=files, data=data)
    assert response.status_code == 400

def test_process_document_large_file(client):
    large_content = b'a' * (10 * 1024 * 1024 + 1)  # >10MB
    files = {'file': ('test.pdf', large_content, 'application/pdf')}
    data = {'user_id': 'test_user'}
    response = client.post('/process-document', files=files, data=data)
    assert response.status_code == 400

def test_text_extraction_pymupdf(monkeypatch):
    mock_doc = MagicMock()
    mock_pages = [MagicMock() for _ in range(5)]
    for page in mock_pages:
        page.get_text.return_value = "text from page"
    mock_doc.__iter__.return_value = mock_pages
    with patch('main.fitz.open') as mock_open:
        mock_open.return_value.__enter__.return_value = mock_doc
        from main import extract_text_from_pdf  # Assuming this function exists in main.py
        full_text = extract_text_from_pdf('mock_path.pdf')
        assert full_text == "text from page" * 5

@patch('main.vision_client.batch_annotate_files')
def test_ocr_fallback(mock_vision, monkeypatch):
    mock_response = MagicMock()
    mock_response.full_text_annotation = MagicMock()
    mock_response.full_text_annotation.text = "ocr extracted text"
    mock_vision.return_value = [mock_response]
    low_text = "insufficient text"  # Assume threshold check
    from main import do_ocr_fallback  # Assuming this function exists in main.py
    updated_text = do_ocr_fallback(low_text, 'mock_gcs_uri')
    assert updated_text == "ocr extracted text"
    mock_vision.assert_called_once()

@patch('main.model.generate_content')
def test_ai_analysis(mock_gen):
    mock_response = MagicMock()
    mock_response.text = '{"brief": "mock legal brief analysis"}'
    mock_gen.return_value = mock_response
    from main import analyze_document  # Assuming this function exists in main.py
    result = analyze_document("mock document text")
    assert "mock legal brief analysis" in result
    mock_gen.assert_called_once()

def test_export_valid_doc(client, monkeypatch):
    doc_id = "test_doc_id"
    with patch('main.db.get') as mock_get:
        mock_doc = {"status": "completed", "brief": "mock brief", "full_text": "mock text"}
        mock_get.return_value = mock_doc
        with patch('main.generate_docx') as mock_docx:  # Assuming docx generation function
            mock_docx.return_value = b"mock docx binary content"
            response = client.get(f'/export/{doc_id}')
            assert response.status_code == 200
            assert response.headers['content-type'] == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

def test_export_not_found(client):
    response = client.get('/export/nonexistent_doc_id')
    assert response.status_code == 404

def test_export_not_completed(client, monkeypatch):
    doc_id = "test_doc_id"
    with patch('main.db.get') as mock_get:
        mock_doc = {"status": "processing"}
        mock_get.return_value = mock_doc
        response = client.get(f'/export/{doc_id}')
        assert response.status_code == 400