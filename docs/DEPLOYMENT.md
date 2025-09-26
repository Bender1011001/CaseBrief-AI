# Deployment

Assumes Firebase project 'casebrief-ai-prod'; for custom, update firebase.json and .firebaserc.

CaseBrief AI is designed for serverless deployment on Google Cloud Platform, leveraging Cloud Run for the scalable backend and Firebase Hosting for the static frontend. This setup ensures automatic scaling, HTTPS by default, and integrated monitoring. Deployment scripts are provided for convenience: [`backend/deploy.sh`](../backend/deploy.sh) for the backend and [`frontend/deploy.sh`](../frontend/deploy.sh) for the frontend. CI/CD can be automated via Cloud Build using [`backend/cloudbuild.yaml`](../backend/cloudbuild.yaml).

Prerequisites: GCP project with billing enabled, APIs activated (Cloud Run, Firebase Hosting, Artifact Registry if using custom images), and service account with necessary roles (Cloud Run Admin, Firebase Admin). Follow [SETUP.md](SETUP.md) for initial configuration. Install the gcloud CLI and Firebase CLI.

## Backend Deployment (Cloud Run)

The backend is containerized with Docker and deployed to Cloud Run, which handles scaling from 0 to thousands of instances based on traffic. The Dockerfile builds a lightweight image with Python dependencies.

### Manual Deployment Steps

1. Build the Docker image:
   ```
   cd backend
   docker build -t gcr.io/YOUR_PROJECT_ID/casebrief-backend:latest .
   ```
   Replace `YOUR_PROJECT_ID` with your GCP project ID. This uses [`Dockerfile`](../backend/Dockerfile), which installs requirements and sets the entrypoint to `uvicorn main:app --host 0.0.0.0 --port $PORT`.

2. Push to Google Container Registry (or Artifact Registry):
   ```
   gcloud auth configure-docker
   docker push gcr.io/YOUR_PROJECT_ID/casebrief-backend:latest
   ```

3. Deploy to Cloud Run:
   ```
   gcloud run deploy casebrief-backend \
     --image gcr.io/YOUR_PROJECT_ID/casebrief-backend:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8000 \
     --memory 1Gi \
     --cpu 1 \
     --max-instances 10 \
     --set-env-vars PROJECT_ID=YOUR_PROJECT_ID,BUCKET_NAME=your-bucket \
     --set-secrets GOOGLE_APPLICATION_CREDENTIALS=sa-key:latest
   ```
   - `--allow-unauthenticated`: For MVP; restrict to authenticated in production via IAM.
   - `--set-secrets`: Mounts the service account JSON as a secret (create secret first: `gcloud secrets create sa-key --data-file=service-account.json`).
   - Outputs the service URL (e.g., https://casebrief-backend-abc123-uc.a.run.app).

4. Using the Provided Script:
   ```
   cd backend
   sh deploy.sh
   ```
   The script assumes `PROJECT_ID` in `.env`, authenticates via `gcloud auth login`, builds/pushes/deploys, and updates secrets. Customize if needed (e.g., region).

### Post-Deployment Configuration

- **CORS**: Already configured in FastAPI for the frontend domain; update `CORSMiddleware` origins in `main.py` for production URL.
- **HTTPS**: Cloud Run enforces HTTPS; redirect HTTP in frontend if needed.
- **Monitoring**: Enable Cloud Logging and Monitoring in GCP Console; set alerts for errors or high latency.
- **Scaling**: Min instances=0 for cost savings; auto-scales on requests. Vertex AI calls are billed per use.

Test: `curl https://your-service-url/health` should return `{"status": "healthy"}`.

## Frontend Deployment (Firebase Hosting)

The frontend is a static React build deployed to Firebase Hosting, which provides global CDN, custom domains, and automatic HTTPS.

### Manual Deployment Steps

1. Install and login to Firebase CLI:
   ```
   npm install -g firebase-tools
   firebase login
   ```

2. Configure the project (if not done):
   ```
   cd frontend
   firebase use --add your-firebase-project-id
   ```
   Select "Hosting" and set public directory to `build`.

3. Build the production bundle:
   ```
   npm run build
   ```
   This creates an optimized `build/` folder with minified JS/CSS.

4. Deploy:
   ```
   firebase deploy --only hosting
   ```
   Deploys to the default site (e.g., https://your-project-id.web.app). For custom site: `firebase target:apply hosting casebrief-ai-prod your-project-id`.

5. Using the Provided Script:
   ```
   cd frontend
   sh deploy.sh
   ```
   The script runs `npm run build` and `firebase deploy --only hosting:prod` (assumes site alias in `firebase.json`).

### Post-Deployment Configuration

- **API URL Update**: Set REACT_APP_API_BASE env var to the Cloud Run URL before building (e.g., export REACT_APP_API_BASE=https://casebrief-backend-abc123-uc.a.run.app/v1); loaded in api.js. Rebuild and redeploy.
- **Custom Domain**: In Firebase Console > Hosting, add domain (e.g., casebrief.ai) and verify DNS.
- **Firebase Config**: Ensure `firebase.json` and `.firebaserc` match your project (provided in repo).
- **Rewrites**: `firebase.json` includes rewrites for SPA routing: all paths to `/index.html`.

Access the live app at the hosting URL; test full workflow (login, upload, export).

## Production Notes

- **Security**: 
  - Backend: Remove `--allow-unauthenticated` and use Cloud Run IAM for Firebase service account invocation.
  - Frontend: Enable Firebase App Check to prevent unauthorized usage.
  - Secrets: Never commit service account JSON; use Cloud Secret Manager.
- **Costs**: Monitor in GCP Billing Console. Key costs: Cloud Run invocations (~$0.000024/100ms), Vertex AI (~$0.00025/1k chars), Firestore reads/writes (~$0.06/100k), Storage (~$0.02/GB). Free tier covers low usage; set budgets/alerts.
- **Performance**: Use us-central1 region for low latency; enable Cloud CDN for frontend assets. PDF processing latency: 10-60s depending on size/AI.
- **HTTPS and Compliance**: All traffic HTTPS; for legal data, enable data loss prevention (DLP) API scanning on uploads.
- **Rollback**: Cloud Run revisions allow easy rollback: `gcloud run services update casebrief-backend --image previous-tag`.
- **Environment Variables**: Set in Cloud Run console for prod/staging (e.g., different buckets).

## CI/CD

Automate deployments with Cloud Build, triggered on Git push to main.

- **Backend CI** (using [`cloudbuild.yaml`](../backend/cloudbuild.yaml)):
  ```
  steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/casebrief-backend:$COMMIT_SHA', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/casebrief-backend:$COMMIT_SHA']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    args:
    - run
    - deploy
    - casebrief-backend
    - --image=gcr.io/$PROJECT_ID/casebrief-backend:$COMMIT_SHA
    - --region=us-central1
    - --platform=managed
    - --allow-unauthenticated
  ```
  Trigger: Connect GitHub repo in Cloud Build > Triggers; push to main builds/deploys.

- **Frontend CI**: Use GitHub Actions or Firebase's integration. Example workflow in `.github/workflows/deploy.yml` (add if needed). For secrets, generate Firebase token: firebase login:ci, add FIREBASE_TOKEN to GitHub repo secrets.
  ```yaml
  name: Deploy Frontend
  on: [push]
  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with: { node-version: '18' }
      - run: cd frontend && npm ci && npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: your-project-id
  ```

For full CI/CD, add tests to pipelines (e.g., `pytest` before deploy). Use tags for releases (e.g., v1.0). Monitor with Cloud Operations Suite.

This deployment process gets the MVP live in minutes; scale as users grow.