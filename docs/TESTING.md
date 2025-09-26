# Testing

CaseBrief AI includes unit and integration tests for both backend and frontend to ensure reliability, security, and functionality. Tests cover core workflows: authentication, PDF processing (with mocks for cloud services), real-time updates, UI interactions, and export. Backend tests use pytest with mocking for GCP APIs to avoid costs and dependencies. Frontend tests use Jest and React Testing Library (RTL) for component rendering and user events. Integration testing is primarily manual due to the distributed nature (local servers + cloud services), but can be automated with tools like Cypress in future iterations.

Run tests in development mode after setup (see [SETUP.md](SETUP.md)). Tests are isolated and do not require a running backend/frontend unless specified for integration.

## Backend Testing

Backend tests are located in [`tests/test_main.py`](../backend/tests/test_main.py) and use pytest for unit testing API endpoints, processing logic, and error handling. Mocks are applied for GCP clients (Firestore, Storage, Vision, Vertex AI) using `unittest.mock` and `pytest-mock` to simulate responses without actual API calls.

### Running Backend Tests

1. Install test dependencies (included in `requirements.txt` or add `pip install pytest pytest-mock` if needed):
   ```
   cd backend
   pip install -r requirements.txt
   ```

2. Run all tests:
   ```
   pytest tests/ -v
   ```
   - `-v`: Verbose output showing test names and results.
   - Expected output: All tests pass (e.g., 10 passed in 0.5s).

3. Run specific tests or with coverage:
   ```
   pytest tests/test_main.py::test_process_valid_pdf -v
   ```

### Test Coverage

- **Valid/Invalid PDF Handling**: Tests upload endpoints with mock files; verifies docId return, status updates, and 413 for large files (>10MB).
- **Text Extraction**: Mocks PyMuPDF extraction; tests fallback to OCR with mocked Vision response (e.g., simulates low-text PDF triggering batch annotate).
- **AI Processing**: Mocks Vertex AI predictions with sample JSON outputs for each pass (facts, analysis, synthesis); tests tenacity retries on simulated failures.
- **Firestore Integration**: Mocks `db.collection().document().set()` and `update()`; verifies brief storage and status progression.
- **Export Functionality**: Mocks doc fetch and docx generation; tests StreamingResponse with correct headers and content-type.
- **Authentication**: Tests dependency injection; 401 on invalid tokens, successful uid extraction.
- **Error Cases**: OCR quota exceeded, AI timeout, unauthorized access to foreign docId.

Example test snippet (from `test_main.py`):
```python
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

@patch('main.aiplatform.gapic.PredictionServiceClient')
@patch('main.vision.ImageAnnotatorClient')
@patch('main.db')
def test_process_valid_pdf(mock_db, mock_vision, mock_ai, auth_header):
    # Mock file upload
    with open('test_sample.pdf', 'rb') as f:
        response = client.post("/v1/process/document", files={"file": ("test.pdf", f, "application/pdf")}, headers=auth_header)
    assert response.status_code == 200
    assert "docId" in response.json()
    mock_db.collection().document().set.assert_called()  # Verifies storage
```

Tests run quickly (<1s) and are cost-free due to mocks. For end-to-end, see Integration Testing.

## Frontend Testing

Frontend tests are in `src/__tests__/`, using Jest for assertions and RTL for rendering/shallow testing components without full DOM. Tests focus on rendering, user interactions (e.g., form submissions, drops), and state changes. No real API calls; mocks Axios and Firebase with `jest.mock`.

### Running Frontend Tests

1. Install dependencies (includes Jest/RTL):
   ```
   cd frontend
   npm install
   ```

2. Run all tests:
   ```
   npm test
   ```
   - Watches files in watch mode (press 'a' to run all, 'p' for pattern).
   - Coverage report in terminal and `coverage/lcov-report/index.html`.

3. Run specific test:
   ```
   npm test Login.test.js
   ```

### Test Coverage

- **`App.test.js`** ([`src/__tests__/App.test.js`](../frontend/src/__tests__/App.test.js)): Tests App renders without crashing; conditional views (Login if unauth, Dashboard if auth).
- **`Login.test.js`** ([`src/__tests__/Login.test.js`](../frontend/src/__tests__/Login.test.js)): Simulates form inputs, button clicks; mocks Firebase auth calls to verify success/error states, redirects.
- **Component Tests**: 
  - UploadArea: Tests dropzone accepts PDF, rejects others; mocks Axios post on drop.
  - DocumentList: Renders list from mock store; clicks navigate to Editor.
  - Editor: Renders brief sections; textarea edits update local state; export mocks blob download.
- **State Management**: Tests Zustand stores init with mocks for onAuthStateChanged and onSnapshot; verifies documents array updates.
- **API Integration**: Mocks axios calls in `api.js`; tests processDocument returns docId, exportDocument creates download link.

Example test (Login.test.js):
```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import Login from '../components/Login';
import { auth } from '../firebase';

jest.mock('firebase/auth');

test('handles login success', async () => {
  const mockUser = { uid: '123' };
  signInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
  
  render(<Login />);
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password' } });
  fireEvent.click(screen.getByRole('button', { name: /login/i }));
  
  await waitFor(() => expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'test@example.com', 'password'));
  // Assert redirect or state change
});
```

Add more tests as features expand (e.g., error toasts, loading spinners). Coverage goal: >80%.

## Integration Testing

Integration tests verify the full stack: frontend -> backend -> GCP mocks. Due to cloud dependencies, use mocks where possible or run with minimal real services (e.g., local Firestore emulator).

### Manual Integration Testing

1. Start backend and frontend:
   ```
   # Terminal 1: Backend
   cd backend
   uvicorn main:app --reload

   # Terminal 2: Frontend
   cd frontend
   npm start
   ```

2. Test workflow:
   - Login with test email/password (create user if needed via UI).
   - Upload a sample PDF (use a text-based one first; for OCR, a scanned image PDF).
   - Verify real-time status in Dashboard (processing -> completed).
   - Click "View & Edit" on completed doc; edit text in Editor.
   - Export: Download DOCX and verify content (open in Word: sections formatted).
   - Logout and attempt unauthorized access (should redirect/401).

3. Mock Gemini for Cost-Free Testing:
   - In backend, temporarily patch Vertex AI to return fixed JSON (e.g., in test mode via env var).
   - Use sample PDFs from `tests/data/` (add if needed).

For automated integration:
- Use Playwright or Cypress: Script browser actions (login, upload, export).
- Run GCP emulators: `gcloud emulators firestore start` and update firebase.js to point to emulator.

Common checks: No console errors, correct HTTP statuses, Firestore data integrity (query console).

## Coverage Reports

- **Backend**:
  ```
  pip install pytest-cov
  pytest --cov=backend tests/ --cov-report=html
  ```
  Opens `htmlcov/index.html` with line-by-line coverage.

- **Frontend**:
  ```
  npm test -- --coverage --watchAll=false
  ```
  Generates `coverage/lcov-report/index.html`; aim for high component coverage.

Run coverage before PRs. If coverage drops below 80%, investigate. For security testing, use tools like Bandit (Python) or ESLint security plugin (JS), though not automated here.

This testing suite ensures the MVP is robust; expand with E2E and load tests for production.