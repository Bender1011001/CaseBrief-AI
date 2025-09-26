#!/bin/bash

npm run build

firebase use casebrief-ai-prod

firebase deploy --only hosting

echo "Deployed to Firebase Hosting. Access at https://casebrief-ai-prod.web.app"