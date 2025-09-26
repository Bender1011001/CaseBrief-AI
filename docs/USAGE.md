# User Guide

This guide provides end-to-end instructions for using CaseBrief AI to generate, edit, and export AI-powered legal case briefs from PDF documents. The application is designed for legal professionals, researchers, or students needing quick, structured summaries of case law. As an MVP (version 1.0), it focuses on core functionality with a simple, intuitive interface.

Before starting, ensure the application is deployed and accessible (see [DEPLOYMENT.md](DEPLOYMENT.md) for setup). Access the frontend via the Firebase Hosting URL (e.g., https://casebrief-ai.web.app). All user data is securely isolated per account, and processing uses Google's Gemini AI for accurate, multi-pass analysis.

## User Flow

Follow these steps to process a PDF and generate a brief:

1. **Access and Authenticate**:
   - Open the frontend URL in a modern browser (Chrome, Firefox, Safari recommended).
   - If not logged in, you'll see the Login page. Sign up with a new email and password (minimum 6 characters), or log in with existing credentials.
   - Upon success, you're redirected to the Dashboard. Sessions persist until logout or token expiry (typically 1 hour; auto-refresh handled).

2. **Upload a PDF**:
   - On the Dashboard, locate the Upload Area (drag-and-drop zone labeled "Drop PDF here or click to select").
   - Drag a PDF file (max 10MB) into the zone or click to browse. Only PDF files are accepted; others are rejected with a message.
   - Optionally, enter a title for the document.
   - Click "Upload" or drop to submit. The file is sent to the backend for processing.
   - A new entry appears in the Document List with status "Uploading" → "Processing" (real-time update).

3. **Monitor Processing**:
   - Processing takes 10-60 seconds depending on PDF size and content (text PDFs faster than scanned).
   - Watch the Document List for status changes: "Processing" (extraction and AI analysis) → "Completed" or "Error" (with message, e.g., "File too large").
   - No action needed; the AI automatically extracts text (or OCR for scanned docs), generates facts, analysis, and synthesis using Gemini.

4. **View and Edit the Brief**:
   - Once "Completed", click "View & Edit" on the document card in the list.
   - The Editor opens, displaying the generated brief in structured sections (e.g., Facts, Analysis, Holding, Synthesis) as editable text areas.
   - Review and modify the content locally (changes are not saved to the server in MVP).
   - Use the back button or close to return to Dashboard.

5. **Export the Brief**:
   - In the Editor, click "Export to DOCX".
   - The backend generates a formatted Word document (.docx) with bold headings and paragraphs.
   - The file downloads automatically (named like "docId.docx").
   - Open in Microsoft Word or compatible viewer to see styled sections (e.g., bullet lists for facts).

6. **Manage Documents**:
   - View all your documents on Dashboard; statuses are color-coded (e.g., green for completed).
   - Logout via the profile menu (top-right); data remains stored securely in your account.
   - To delete, contact support or use future features (not in MVP).

Example UI flow: Login → Dashboard (upload PDF) → Processing indicator → Editor (edit) → Download DOCX.

## Key Features

- **Real-time Status Updates**: Powered by Firestore, the UI instantly reflects backend progress without refreshing the page. No waiting in the dark—see exactly when your brief is ready.
- **Editable Briefs**: Post-generation, edit sections directly in the browser for personalization. Local changes allow quick tweaks before export.
- **Secure Authentication**: Email/password login via Firebase ensures only you access your briefs and uploads. Data is encrypted in transit (HTTPS) and at rest (GCP).
- **OCR Fallback for Scanned PDFs**: Automatically detects image-based PDFs and uses Google Vision AI to extract text, handling handwritten or low-quality scans.
- **AI-Powered Multi-Pass Generation**: Gemini analyzes in stages—facts first, then legal implications, finally a cohesive synthesis—for accurate, context-aware briefs.
- **Easy Export**: One-click DOCX download with professional formatting (headings, bullets), ready for printing or sharing.

## Limitations and Tips

As an MVP, CaseBrief AI prioritizes core functionality; some advanced features are planned for future versions.

- **No PDF Preview**: Uploaded files aren't viewable in the UI; upload blindly and trust the processing. Tip: Use descriptive titles.
- **Local Edits Only**: Changes in the Editor can be saved to Firestore via Save button; export captures current state. V2 will add advanced persistence.
- **Development API Exposure**: In local dev, API calls go directly to localhost; production proxies through backend for security. Always use deployed URLs.
- **Gemini Rate Limits**: GCP quotas apply (e.g., 60 queries/minute for Vertex AI). High-volume users may hit limits; monitor in GCP Console and request increases.
- **File Size/Format**: Strictly PDFs <10MB; larger files fail. For multi-page cases, split if needed.
- **No Multi-User Collaboration**: Briefs are single-user; sharing via exported DOCX.
- **Browser Compatibility**: Best on desktop; mobile upload works but editing is touch-optimized minimally.
- **Cost Awareness**: Each process incurs minor GCP fees (AI/Storage); free tier suffices for occasional use. Track in billing dashboard.

## Best Practices

- Start with text-based PDFs for fastest results; test OCR with a sample scanned doc.
- Use clear, complete case PDFs (full opinions) for best AI accuracy.
- For errors, check [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
- Report issues or suggest features via [CONTRIBUTING.md](CONTRIBUTING.md).

CaseBrief AI streamlines legal research—upload, wait, edit, export. For developer insights, see other docs.