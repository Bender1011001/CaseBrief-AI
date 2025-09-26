# Phase 1: GCP Foundation Setup for CaseBrief AI

This guide provides detailed, step-by-step instructions for setting up the Google Cloud Platform (GCP) foundation for the CaseBrief AI project. It ensures a secure, scalable environment ready for backend and frontend development, with proper configurations for Firestore, Cloud Storage, APIs, and authentication. These steps focus on manual setup via the GCP Console or CLI, as automation via code is not feasible at this stage.

## Introduction

### Overview
This guide sets up the GCP foundation for CaseBrief AI, ensuring security, scalability, and integration readiness. It covers project creation, API enabling, Firestore configuration with security rules, Cloud Storage bucket setup, Gemini API key generation, and service account creation with necessary roles.

### Prerequisites
- A Google account with billing enabled (visit [GCP Billing](https://console.cloud.google.com/billing) to set up if needed).
- Access to the GCP Console at [console.cloud.google.com](https://console.cloud.google.com).
- Optional: Install the Google Cloud CLI (`gcloud`) for command-line operations. Follow the official installation guide at [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install). Authenticate with `gcloud auth login` and initialize with `gcloud init`.
- Basic familiarity with GCP concepts (e.g., projects, APIs, IAM). If you're new, refer to [GCP Documentation](https://cloud.google.com/docs).

### Estimated Time
1-2 hours, depending on familiarity with the console.

### Important Warnings
- Enable billing early to avoid API enablement issues.
- Secure all API keys and service account credentials: Never commit them to version control (e.g., Git). Use environment variables or Secret Manager for production.
- Choose regions carefully (e.g., `us-central1`) for consistency and to minimize latency/costs.
- Test configurations in a development project first if possible; this guide uses a production-like setup (`casebrief-ai-prod`).

## 2. Create a GCP Project

Create a new GCP project to host all resources. Use the name `casebrief-ai-prod` for consistency.

### Using the GCP Console
1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Click the project selector dropdown at the top (next to the Google Cloud logo).
3. Click **New Project**.
4. Enter **Project name**: `casebrief-ai-prod`.
5. Optionally, set **Organization** if applicable.
6. Click **Create**.
7. Once created, select the new project from the dropdown.
8. Enable billing:
   - Navigate to **Billing** in the left sidebar.
   - Click **Link a billing account** and select or create a billing account.
   - Confirm the linkage.

### Using the gcloud CLI (Alternative)
If you have the CLI installed:
```
gcloud projects create casebrief-ai-prod --set-as-default
```
- Replace `casebrief-ai-prod` with your desired ID if needed (must be unique).
- Link billing (replace `XXXX` with your billing account ID, found in the Billing console):
```
gcloud billing projects link casebrief-ai-prod --billing-account=XXXX
```

### Verification
- In the console: The project selector shows `casebrief-ai-prod`.
- CLI: Run `gcloud config get-value project` to confirm it outputs `casebrief-ai-prod`.

**Note**: If the project ID is taken, append a suffix (e.g., `casebrief-ai-prod-123`) and update references accordingly.

## 3. Enable Required APIs

Enable the APIs needed for IAM, Firestore, Storage, Vision, and Vertex AI. Firebase Authentication is enabled separately via the Firebase console.

### Using the GCP Console
1. In the GCP Console, navigate to **APIs & Services > Library** (search for "Library" in the top search bar).
2. Search for and enable each API:
   - **Identity and Access Management (IAM) API** (for service accounts and permissions).
   - **Cloud Firestore API** (for database operations).
   - **Cloud Storage API** (for file uploads).
   - **Cloud Vision API** (for image analysis).
   - **Vertex AI API** (for AI model integrations like Gemini).
3. For each, click **Enable**. Wait for confirmation (may take a few seconds).

For Firebase Authentication:
1. Go to [console.firebase.google.com](https://console.firebase.google.com).
2. Click **Add project** and select `casebrief-ai-prod` (or create a new one linked to it).
3. In the Firebase console, go to **Authentication** in the left sidebar.
4. Click **Get started**.
5. Under **Sign-in method**, enable **Email/Password** (or **Google** for OAuth). Configure as needed (e.g., enable email verification).

### Using the gcloud CLI (Alternative)
```
gcloud services enable iam.googleapis.com firestore.googleapis.com storage.googleapis.com vision.googleapis.com aiplatform.googleapis.com
```

### Verification
- Navigate to **APIs & Services > Enabled APIs & services**. Confirm all listed APIs appear as enabled.
- For Firebase: In the Firebase console, check that Authentication is enabled under **Authentication > Sign-in method**.

**Screenshot Note**: The Enabled APIs list should show green checkmarks for each service.

## 4. Configure Firestore Database

Set up Firestore in Native mode for structured data storage, with security rules restricting access to authenticated users' own data.

### Using the GCP Console
1. In the GCP Console, search for **Firestore** in the top search bar and select **Firestore Database**.
2. Click **Create database**.
3. Choose **Start in production mode** (enforces security rules).
4. Select **Native mode** (for advanced querying).
5. Choose location: **us-central1** (multi-region for reliability).
6. Click **Done**. Firestore will initialize.

Configure Security Rules:
1. In the Firestore console, go to the **Rules** tab.
2. Delete the default rules and paste the following:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
   - This allows only authenticated users to read/write their own documents under `/users/{userId}`.
3. Click **Publish** to deploy the rules.

### Using the gcloud CLI (Limited Support)
Firestore setup is primarily console-based; use the console for initial creation. Rules can be deployed via Firebase CLI if installed:
```
firebase deploy --only firestore:rules
```
(Requires Firebase project setup.)

### Verification
- In the **Rules** tab, click **Simulate** or check for "Rules are deployed successfully" (no errors).
- Optionally, create a test collection (e.g., `/users/test-user`) via the console and attempt access (requires authentication for full testing).
- Run `gcloud firestore databases list` to confirm the database exists in `us-central1`.

**Warning**: Test rules thoroughly before production to prevent unauthorized access.

## 5. Configure Cloud Storage

Create a bucket for uploads (e.g., case images), with uniform access control to simplify permissions.

### Using the GCP Console
1. In the GCP Console, navigate to **Cloud Storage > Browser** (search for "Storage").
2. Click **Create bucket**.
3. Enter **Bucket name**: `casebrief-ai-uploads` (must be globally unique; append suffix if needed).
4. Select **Location type**: Region, **Location**: `us-central1`.
5. **Storage class**: Standard (default for frequent access).
6. **Access control**: Uniform (bucket-level permissions).
7. **Encryption**: Google-managed (default).
8. **Advanced settings**: Ensure **Protect object lifecycle from deletion** is off unless needed.
9. Click **Create**.

Set Permissions:
1. In the bucket details, go to **Permissions** tab.
2. Confirm **Prevent public access** is enforced (default; toggle if needed but keep public access blocked for security).
3. Access files via signed URLs generated in the backend (not direct public links).

### Using the gcloud CLI (Alternative)
```
gsutil mb -l us-central1 -p casebrief-ai-prod gs://casebrief-ai-uploads/
```

### Verification
- In **Cloud Storage > Browser**, the bucket `casebrief-ai-uploads` appears.
- CLI: `gsutil ls gs://casebrief-ai-uploads/` (should list the bucket).
- Attempt to upload a test file via console (succeeds); check permissions deny public access.

**Note**: Backend code will handle uploads with authentication; do not expose direct bucket access.

## 6. API Keys & Service Accounts

Generate a Gemini API key and create a service account for backend access to GCP services.

### Gemini API Key
1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **Create API key** for Gemini 1.5 Pro (select the model if prompted).
4. Copy the key immediately (it won't be shown again).
5. Store securely:
   - In GCP Console: Go to **Security > Secret Manager**.
   - Click **Create secret**, Name: `gemini-api-key`, Value: `[paste your key]`.
   - Click **Create**. Grant access to the service account (see below).

**Security**: Never hardcode or commit the key. Use it via Secret Manager in production.

### Service Account for Backend
1. In the GCP Console, go to **IAM & Admin > Service accounts**.
2. Click **Create service account**.
3. **Service account name**: `casebrief-backend`.
4. **Service account ID**: Auto-generated (e.g., `casebrief-backend@casebrief-ai-prod.iam.gserviceaccount.com`).
5. **Description**: "Service account for CaseBrief AI backend access to Firestore, Storage, and Vision."
6. Click **Create and continue**.
7. Grant roles (search and add):
   - **Cloud Datastore User** (for Firestore read/write: `roles/datastore.user`).
   - **Storage Object Admin** (for Storage uploads: `roles/storage.objectAdmin`).
   - **Cloud Vision API User** (for image analysis: `roles/vision.user`).
   - **Vertex AI User** (for AI features: `roles/aiplatform.user`).
8. Click **Continue** > **Done**.
9. On the service accounts list, click the new account > **Keys** tab > **Add key** > **Create new key** > JSON.
10. Download the JSON file (e.g., `casebrief-backend-key.json`) and store securely (e.g., set environment variable or upload to Secret Manager).

### Using the gcloud CLI (Alternative)
Create the account:
```
gcloud iam service-accounts create casebrief-backend --display-name="Backend Service Account" --project=casebrief-ai-prod
```
Add roles (repeat for each):
```
gcloud projects add-iam-policy-binding casebrief-ai-prod --member="serviceAccount:casebrief-backend@casebrief-ai-prod.iam.gserviceaccount.com" --role="roles/datastore.user"
```
```
gcloud projects add-iam-policy-binding casebrief-ai-prod --member="serviceAccount:casebrief-backend@casebrief-ai-prod.iam.gserviceaccount.com" --role="roles/storage.objectAdmin"
```
```
gcloud projects add-iam-policy-binding casebrief-ai-prod --member="serviceAccount:casebrief-backend@casebrief-ai-prod.iam.gserviceaccount.com" --role="roles/vision.user"
```
```
gcloud projects add-iam-policy-binding casebrief-ai-prod --member="serviceAccount:casebrief-backend@casebrief-ai-prod.iam.gserviceaccount.com" --role="roles/aiplatform.user"
```
Create key:
```
gcloud iam service-accounts keys create casebrief-backend-key.json --iam-account=casebrief-backend@casebrief-ai-prod.iam.gserviceaccount.com --project=casebrief-ai-prod
```

### Verification
- In **IAM & Admin > IAM**, search for `casebrief-backend` and confirm roles are assigned.
- Test locally: Set `GOOGLE_APPLICATION_CREDENTIALS=path/to/casebrief-backend-key.json` and run a simple `gcloud` command (e.g., `gcloud firestore databases list`).
- For Gemini key: Use it in a test curl request to the API endpoint (see [Gemini Docs](https://ai.google.dev/gemini-api/docs)).

**Security**: Rotate keys periodically. Use least-privilege roles. For production, integrate with workload identity instead of JSON keys.

## 7. Next Steps

- Once complete, proceed to Phase 2: Backend development. Use the service account JSON for local testing by setting the environment variable `GOOGLE_APPLICATION_CREDENTIALS=path/to/casebrief-backend-key.json`.
- Integrate Firebase Auth with your backend for user management.
- For frontend, initialize a Firebase app with the project config.

### Troubleshooting
- **Billing not enabled**: APIs won't activate; check Billing console.
- **Region mismatch**: Ensure all resources (Firestore, Storage) use `us-central1` to avoid cross-region costs.
- **Permission denied**: Verify service account roles and authentication.
- **API key invalid**: Regenerate if exposed; check quotas in AI Studio.
- **Rules errors**: Use Firestore Rules Simulator for testing.
- Common CLI issues: Ensure `gcloud auth login` and project set correctly.

If issues persist, refer to [GCP Support](https://cloud.google.com/support) or community forums.

---

*Last updated: [Insert Date]. For updates, see project-guide.txt.*