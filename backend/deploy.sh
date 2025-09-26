#!/bin/bash

PROJECT_ID="casebrief-ai-prod"

gcloud run deploy casebrief-backend --source . --platform managed --region us-central1 --allow-unauthenticated --set-env-vars PROJECT_ID=$PROJECT_ID

echo "Deployed to Cloud Run. Update frontend API_BASE to service URL."