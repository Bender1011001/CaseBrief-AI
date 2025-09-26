#!/bin/bash
set -e

if [ -z "$REACT_APP_API_BASE" ]; then
  echo "Error: Set REACT_APP_API_BASE to production URL (e.g., https://casebrief-backend-abc.a.run.app/v1)"
  exit 1
fi

npm run build

firebase use casebrief-ai-prod

firebase deploy --only hosting

echo "Deployed to Firebase Hosting. Access at https://casebrief-ai-prod.web.app"