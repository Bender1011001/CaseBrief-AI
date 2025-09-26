# Troubleshooting

This guide addresses common issues encountered during setup, local development, usage, and deployment of CaseBrief AI. Issues are categorized by component. For persistent problems, check logs (GCP Console > Logging, browser console, or terminal output), verify prerequisites in [SETUP.md](SETUP.md), and ensure your GCP/Firebase projects are correctly configured. If unresolved, report via [CONTRIBUTING.md](CONTRIBUTING.md).

## Authentication Errors

Firebase Auth issues often stem from misconfiguration or token problems.

- **"Invalid login credentials" or "User not found"**:
  - Cause: Incorrect email/password or unenabled Email/Password provider.
  - Resolution: Verify credentials; in Firebase Console > Authentication > Sign-in method, enable Email/Password. Reset password via "Forgot Password" link if needed.
  
- **"Token expired" or 401 Unauthorized on API calls**:
  - Resolution: ... For refresh, see Firebase docs: https://firebase.google.com/docs/auth/web/manage-users#refresh_the_id_token.
  - Cause: Firebase ID token expired (1 hour default); not refreshed in frontend.
  - Resolution: In browser, clear cache and relogin. Check [`store.js`](../frontend/src/store.js) for `getIdToken()` calls; ensure Zustand store refreshes on expiry. For production, implement silent refresh with `onIdTokenChanged`.

- **"Permission denied" on Firestore reads/writes**:
  - Cause: Security rules mismatch (e.g., uid not matching path).
  - Resolution: Update Firestore rules in Console to `allow read, write: if request.auth.uid == userId;`. Test rules simulator. Restart frontend to reapply.

- **Cross-project mismatch**:
  - Cause: Firebase project ID differs from GCP PROJECT_ID.
  - Resolution: Ensure both use the same project; link via Firebase Console > Project Settings > Integrations > Google.

## Backend Errors (500 Internal Server)

Backend failures usually relate to GCP credentials, APIs, or environment setup.

- **"Service account not found" or authentication errors in logs**:
  - Cause: Missing or invalid `GOOGLE_APPLICATION_CREDENTIALS` JSON.
  - Resolution: Download fresh service account key from GCP IAM > Service Accounts. Set env var: `set GOOGLE_APPLICATION_CREDENTIALS=path\to\key.json` (Windows) or `export` (Unix). Verify roles: Firestore User, Storage Admin, Vision User, Vertex AI User. Restart uvicorn.

- **"API not enabled" (e.g., Vision or Vertex errors)**:
  - Cause: Required GCP APIs disabled.
  - Resolution: In GCP Console > APIs & Services > Library, enable: Cloud Vision API, Vertex AI API, Cloud Firestore API, Cloud Storage API. Wait 1-2 minutes for propagation.

- **"Quota exceeded" during processing**:
  - Cause: Free tier limits hit (e.g., 1000 Vision units/month).
  - Resolution: Check quotas in GCP Console > IAM & Admin > Quotas. Request increase or use text PDFs to avoid OCR. Monitor billing for overages.

- **PDF processing hangs or times out**:
  - Cause: Large file, network issues, or tenacity retries failing.
  - Resolution: Ensure PDF <10MB; test with small sample. Check backend logs for exceptions (e.g., `logging.error`). Increase timeout in FastAPI if needed.

- **Environment variable issues**:
  - Cause: `.env` not loaded or PROJECT_ID wrong.
  - Resolution: Verify `.env` contents; use `python -c "import os; print(os.getenv('PROJECT_ID'))"` to check. Reload uvicorn.

For detailed logs: Run with `--log-level debug` in uvicorn; check Cloud Logging post-deploy.

## Frontend Issues (No Real-time Updates)

UI problems often involve Firebase integration or network.

- **Documents list not updating after upload**:
  - Cause: Firestore onSnapshot not firing or rules blocking.
  - Resolution: Open browser console; look for Firestore errors. Verify rules allow read for auth.uid. Ensure `useDocumentsStore.init(user.uid)` called post-login. Test query in Firestore Console.

- **Upload fails with CORS error**:
  - Cause: Backend not allowing frontend origin.
  - Resolution: In local dev, confirm proxy in `package.json`. For prod, update FastAPI CORS origins to include hosting URL (e.g., `https://casebrief-ai.web.app`). Restart backend.

- **"Network Error" on API calls**:
  - Cause: Backend not running or wrong API_BASE.
  - Resolution: Start uvicorn on port 8000; check `src/api.js` for correct base URL. Use browser Network tab to inspect requests (should be 200/201).

- **Components not rendering (e.g., blank Dashboard)**:
  - Cause: Firebase config invalid or auth listener failing.
  - Resolution: Validate `firebase.js` config from Console. Clear localStorage; relogin. Check console for JS errors.

- **Slow loading or infinite spinner**:
  - Cause: Poor network or large state.
  - Resolution: Ensure stable connection; optimize Zustand selectors. For production, enable React StrictMode only in dev.

## OCR Failures

Vision API issues for scanned PDFs.

- **"Low text detected but OCR returns empty"**:
  - Cause: PDF not image-based or Vision quota low.
  - Resolution: Test with known scanned PDF. Check Vision logs in GCP. Increase quota if needed. Fallback: Manually extract text externally.

- **"Batch annotate failed"**:
  - Cause: Storage upload error or invalid PDF.
  - Resolution: Verify bucket permissions (Storage Admin role). Ensure PDF is valid (open in Adobe). Check backend logs for blob upload exceptions.

Tip: Prefer text PDFs for MVP; OCR adds ~20s and cost.

## Deployment Issues

Cloud Run/Firebase problems.

- **"gcloud command not found" or auth errors**:
  - Cause: gcloud CLI not installed/logged in.
  - Resolution: Install from [cloud.google.com/sdk](https://cloud.google.com/sdk); run `gcloud init` and `gcloud auth login`. For scripts, ensure in PATH.

- **"Build failed" in Docker/Cloud Build**:
  - Cause: Missing dependencies or Dockerfile errors.
  - Resolution: Run `docker build .` locally to debug. Check `requirements.txt` for conflicts. View build logs in Cloud Build Console.

- **"Service unavailable" post-deploy**:
  - Cause: Cold start (min-instances=0) or secrets not mounted.
  - Resolution: Set min-instances=1 temporarily. Verify secret creation: `gcloud secrets versions access latest --secret=sa-key`. Check Cloud Run revisions.

- **Firebase deploy "Project not found"**:
  - Cause: Wrong project in `.firebaserc`.
  - Resolution: Run `firebase use --add your-project-id`; confirm in `firebase.json`.

- **CORS/HTTPS mismatch after deploy**:
  - Cause: API_BASE not updated.
  - Resolution: Set to Cloud Run URL in `api.js`, rebuild (`npm run build`), redeploy.

Region tip: Use us-central1 for all services to minimize latency.

## Cost and Monitoring

- **Unexpected charges**:
  - Cause: High-volume testing or unmonitored AI calls.
  - Resolution: Set budget alerts in GCP Billing > Budgets & Alerts (e.g., $10/month). Use mocks in tests. Free tier: 1M Firestore reads, 5GB Storage, limited AI.

- **High latency/costs**:
  - Cause: Inefficient prompts or large PDFs.
  - Resolution: Monitor in Cloud Monitoring > Dashboards. Optimize Gemini prompts in backend. Use cost explorer for breakdowns (Vertex ~70% of costs).

For advanced debugging, enable debug logging in Firebase (`firebase.firestore().settings({ experimentalForceLongPolling: true })`) or GCP (set log levels). Community support via GitHub issues at https://github.com/your-repo/casebrief-ai/issues.