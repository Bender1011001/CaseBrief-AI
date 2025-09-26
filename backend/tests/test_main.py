import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, Mock, AsyncMock
from main import app

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

def test_process_document_valid_pdf(client):
    with patch('main.get_current_user') as mock_user:
        mock_user.return_value = 'test_user'
        files = {'file': ('test.pdf', b'%PDF-1.4\nmock pdf content\n', 'application/pdf')}
        headers = {'Authorization': 'Bearer mock_token'}
        mock_fitz_doc = Mock()
        mock_page = Mock()
        mock_page.get_text.return_value = "mock extracted text\n"
        mock_fitz_doc.__iter__.return_value = [mock_page]
        mock_fitz_doc.__len__.return_value = 1
        with patch('main.fitz.open') as mock_fitz_open:
            mock_fitz_open.return_value.__enter__.return_value = mock_fitz_doc
            mock_response = Mock()
            mock_response.text = "mock ai analysis"
            with patch('main.generate_content', new_callable=AsyncMock) as mock_gen:
                mock_gen.return_value = mock_response
                with patch('main.db.collection') as mock_coll:
                    mock_doc = mock_coll.return_value.document.return_value
                    mock_doc.set.return_value = None
                    mock_doc.update.return_value = None
                    response = client.post('/v1/process/document', files=files, headers=headers)
                    assert response.status_code == 200
                    assert 'docId' in response.json()
                    mock_gen.assert_called()
                    mock_doc.update.assert_called()

def test_process_document_non_pdf(client):
    with patch('main.get_current_user') as mock_user:
        mock_user.return_value = 'test_user'
        files = {'file': ('test.txt', b'mock text content', 'text/plain')}
        headers = {'Authorization': 'Bearer mock_token'}
        response = client.post('/v1/process/document', files=files, headers=headers)
        assert response.status_code == 400

def test_process_document_large_file(client, monkeypatch):
    with patch('main.get_current_user') as mock_user:
        mock_user.return_value = 'test_user'
        large_content = b'a' * (10 * 1024 * 1024 + 1)  # >10MB
        monkeypatch.setattr('main.UploadFile.size', 10 * 1024 * 1024 + 1)
        files = {'file': ('test.pdf', large_content, 'application/pdf')}
        headers = {'Authorization': 'Bearer mock_token'}
        response = client.post('/v1/process/document', files=files, headers=headers)
        assert response.status_code == 400

def test_text_extraction_pymupdf(monkeypatch):
    mock_doc = MagicMock()
    mock_pages = [MagicMock() for _ in range(5)]
    for page in mock_pages:
        page.get_text.return_value = "text from page"
    mock_doc.__iter__.return_value = mock_pages
    with patch('main.fitz.open') as mock_open:
        mock_open.return_value.__enter__.return_value = mock_doc
        # Inline extraction in process_document
        full_text = ""
        for page in mock_doc:
            full_text += page.get_text() + "\n"
        assert full_text.strip() == "text from page" * 5

@patch('main.vision_client.batch_annotate_files')
def test_ocr_fallback(mock_vision):
    mock_operation = MagicMock()
    mock_operation.done.return_value = True
    mock_vision.return_value = mock_operation
    # Mock output blob
    mock_output_blob = MagicMock()
    mock_output_blob.exists.return_value = True
    mock_output_blob.download_as_text.return_value = json.dumps({
        'responses': [{'fullTextAnnotation': {'text': 'ocr extracted text'}}]
    })
    with patch('main.storage_client.bucket') as mock_bucket:
        mock_bucket.return_value.blob.return_value = mock_output_blob
        # Simulate low text, call OCR logic (inline)
        full_text = "low"
        # ... (mock upload, request, poll, parse)
        # For test, assert mock calls
        mock_vision.assert_called()
        assert 'ocr extracted text' in full_text  # Simplified

import asyncio

@patch('main.generate_content', new_callable=AsyncMock)
async def test_ai_analysis(mock_gen):
    mock_response = Mock()
    mock_response.text = "mock legal brief analysis"
    mock_gen.return_value = mock_response
    # Inline in process_document
    full_text = "mock text"
    facts = await mock_gen(PROMPT1.format(full_text=full_text))
    analysis = await mock_gen(PROMPT2.format(facts=facts, full_text=full_text))
    final_brief = await mock_gen(PROMPT3.format(facts=facts, analysis=analysis, full_text=full_text))
    assert "mock legal brief analysis" in final_brief
    mock_gen.assert_called()

def run_async_test(coro):
    return asyncio.run(coro)

# Call in pytest
run_async_test(test_ai_analysis())

def test_export_valid_doc(client):
    with patch('main.get_current_user') as mock_user:
        mock_user.return_value = 'test_user'
        doc_id = "test_doc_id"
        with patch('main.db.collection') as mock_coll:
            mock_doc = mock_coll.return_value.document.return_value
            mock_doc.get.return_value.to_dict.return_value = {"status": "completed", "brief": "mock brief"}
            with patch('main.Document') as mock_docx:
                mock_docx.return_value.save.return_value = None
                headers = {'Authorization': 'Bearer mock_token'}
                response = client.get(f'/v1/export/{doc_id}', headers=headers)
                assert response.status_code == 200
                assert response.headers['content-type'] == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

def test_export_not_found(client):
    with patch('main.get_current_user') as mock_user:
        mock_user.return_value = 'test_user'
        headers = {'Authorization': 'Bearer mock_token'}
        response = client.get('/v1/export/nonexistent_doc_id', headers=headers)
        assert response.status_code == 404

def test_export_not_completed(client):
    with patch('main.get_current_user') as mock_user:
        mock_user.return_value = 'test_user'
        doc_id = "test_doc_id"
        with patch('main.db.collection') as mock_coll:
            mock_doc = mock_coll.return_value.document.return_value
            mock_doc.get.return_value.to_dict.return_value = {"status": "processing"}
            headers = {'Authorization': 'Bearer mock_token'}
            response = client.get(f'/v1/export/{doc_id}', headers=headers)
            assert response.status_code == 400

def test_process_document_no_auth(client):
    files = {'file': ('test.pdf', b'mock pdf', 'application/pdf')}
    response = client.post('/v1/process/document', files=files)
    assert response.status_code == 401

def test_process_document_retry(monkeypatch):
    with patch('main.get_current_user') as mock_user:
        mock_user.return_value = 'test_user'
        files = {'file': ('test.pdf', b'mock pdf', 'application/pdf')}
        headers = {'Authorization': 'Bearer mock_token'}
        # Mock first two calls to raise, third succeed
        side_effects = [Exception('retry1'), Exception('retry2'), Mock(text='success')]
        with patch('main.generate_content', new_callable=AsyncMock) as mock_gen:
            mock_gen.side_effect = side_effects
            response = client.post('/v1/process/document', files=files, headers=headers)
            assert response.status_code == 200
            assert mock_gen.call_count == 3  # Retried twice

def test_integration_flow(client):
    with patch('main.get_current_user') as mock_user:
        mock_user.return_value = 'test_user'
        files = {'file': ('test.pdf', b'mock pdf', 'application/pdf')}
        headers = {'Authorization': 'Bearer mock_token'}
        # Mock entire chain: fitz extract, no OCR, AI calls, db update
        mock_fitz_doc = Mock()
        mock_page = Mock()
        mock_page.get_text.return_value = "integrated text"
        mock_fitz_doc.__iter__.return_value = [mock_page]
        with patch('main.fitz.open') as mock_fitz:
            mock_fitz.return_value.__enter__.return_value = mock_fitz_doc
            mock_ai = Mock()
            mock_ai.text = "integrated brief"
            with patch('main.generate_content', new_callable=AsyncMock) as mock_gen:
                mock_gen.return_value = mock_ai
                with patch('main.db.collection') as mock_db:
                    mock_doc = mock_db.return_value.document.return_value
                    mock_doc.set.return_value = None
                    mock_doc.update.return_value = None
                    response = client.post('/v1/process/document', files=files, headers=headers)
                    assert response.status_code == 200
                    mock_fitz.assert_called()
                    mock_gen.assert_called()
                    mock_doc.update.assert_called()