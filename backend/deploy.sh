#!/bin/bash
set -e

PROJECT_ID=${PROJECT_ID:-casebrief-ai-prod}

# Create secret if not exists (warn: secure service-account.json)
if ! gcloud secrets describe sa-key --project=$PROJECT_ID >/dev/null 2>&1; then
  echo "Creating secret sa-key from service-account.json (ensure file exists and secure)"
  gcloud secrets create sa-key --data-file=service-account.json --project=$PROJECT_ID
fi

gcloud run deploy casebrief-backend --source . --platform managed --region us-central1 --allow-unauthenticated --set-env-vars PROJECT_ID=$PROJECT_ID --set-secrets GOOGLE_APPLICATION_CREDENTIALS=sa-key:latest

echo "Deployed to Cloud Run. Update frontend REACT_APP_API_BASE to service URL."