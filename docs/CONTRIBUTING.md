# Contributing

Thank you for your interest in contributing to CaseBrief AI! This project welcomes contributions from the community to improve functionality, documentation, security, and scalability. As an open-source MVP under the MIT License, we aim to foster collaborative development while maintaining high standards for code quality, security, and user experience.

Contributions can include bug fixes, new features, documentation updates, test additions, or performance optimizations. Before starting, review this guide, the [README.md](README.md), and the guiding principles: Security by Design, User-Centricity, and Scalability.

## Developer Guidelines

To contribute effectively:

- **Fork and Branch**: 
  - Fork the repository on GitHub.
  - Clone your fork: `git clone https://github.com/your-username/casebrief-ai.git`.
  - Create a feature branch: `git checkout -b feature/your-feature-name` (e.g., `feature/pdf-preview`).
  - Keep branches small and focused on one change.

- **Code Style**:
  - **Python (Backend)**: Use Black for formatting (`pip install black; black .`). Follow PEP 8; type hints preferred. Lint with flake8: `pip install flake8; flake8 backend/`.
  - **JavaScript (Frontend)**: Use ESLint and Prettier (`npm install --save-dev eslint prettier`). Run `npm run lint` before commit. Follow Airbnb style guide.
  - No hard-coded secrets (API keys, credentials); use environment variables or secrets management.

- **Testing**:
  - Add unit tests for new/changed code (see [TESTING.md](TESTING.md)).
  - Run full suite: Backend `pytest tests/ -v`, Frontend `npm test`.
  - Aim for >80% coverage; use mocks for GCP/Firestore to keep tests fast and free.
  - For integration changes, include manual verification steps.

- **Documentation**:
  - Update relevant docs in `/docs/` for any changes (e.g., new endpoints in [BACKEND.md](BACKEND.md)).
  - Use consistent Markdown: ## Headings, ```language blocks, tables for APIs.
  - Reference code with clickable links, e.g., [`main.py`](../backend/main.py).

- **Security**:
  - Scan for vulnerabilities: Backend `pip install safety; safety check`, Frontend `npm audit`.
  - No client-side GCP API exposure; proxy through backend.
  - Test auth rules and input validation (e.g., PDF sanitization).
  - Report security issues privately via GitHub Security tab (not in public issues).

- **Commit Messages**:
  - Use conventional commits: `feat: add PDF preview`, `fix: resolve OCR timeout`, `docs: update setup guide`.
  - Keep messages concise (<72 chars line); reference issues if applicable.

## Pull Request Process

1. **Prepare Your Changes**:
   - Ensure code passes linting and tests.
   - Update `CHANGELOG.md` if major (add if missing).
   - Rebase on main: `git fetch upstream; git rebase upstream/main`.

2. **Submit PR**:
   - Push branch: `git push origin feature/your-feature-name`.
   - Open PR on GitHub against `main` branch.
   - Title: Clear and descriptive, e.g., "feat: Implement PDF preview in Editor".
   - Description: Explain what/why/how; link related issues. Include screenshots for UI changes.
   - Reference docs updates if any.

3. **Review and Iteration**:
   - PRs are reviewed for quality, security, and alignment with MVP scope.
   - Address feedback; add commits to the branch.
   - Automated checks (lint/tests) must pass; CI via Cloud Build if enabled.

4. **Merge**:
   - Squash or rebase merge preferred.
   - After merge, delete branch.
   - Post-merge: Update docs if needed; test locally.

PRs are typically merged within 1-2 weeks; urgent fixes faster. No CLA required for MIT.

## Reporting Issues

- **Bugs**: Open an issue with:
  - Title: Concise, e.g., "Upload fails for PDFs >5MB".
  - Description: Steps to reproduce, expected vs. actual, environment (OS, browser, versions), screenshots/logs.
  - Label: `bug`, `help wanted` if seeking contributors.

- **Feature Requests**: Describe use case, benefits, and rough implementation. Label: `enhancement`.

- **Questions**: Use Discussions tab or Stack Overflow with "casebrief-ai" tag.

Search existing issues before opening. Triage labels: `good first issue` for beginners.

## Future Enhancements

The MVP (v1.0) covers core PDF-to-brief workflow. Planned for V2+:

- **UI/UX Improvements**:
  - PDF viewer integration (react-pdf) for preview before upload/processing.
  - Rich text editor (e.g., Quill or Draft.js) for formatted brief editing.
  - Mobile responsiveness and PWA support for offline uploads.

- **Backend Enhancements**:
  - Save edited briefs to Firestore (add update endpoint).
  - Advanced AI prompts tuned by legal SMEs; support for multiple models (e.g., Claude via API).
  - Multi-document batch processing and search/indexing in Firestore.
  - Signed URLs for direct Storage access (secure sharing).

- **Collaboration Features**:
  - Multi-user editing with real-time cursors (Firestore + Yjs).
  - Sharing links for briefs (view-only or collab, with auth).

- **Integrations and Scalability**:
  - Email notifications on completion (Cloud Functions).
  - API rate limiting and caching (Redis on Cloud Memorystore).
  - Analytics (Google Analytics) and usage monitoring.
  - Support for other formats (e.g., DOCX input via conversion).

- **Testing and DevOps**:
  - E2E tests with Cypress/Playwright.
  - Automated security scans in CI/CD.
  - Docker Compose for local GCP emulator stack.

Prioritize based on community feedback. See open issues labeled `enhancement` for starting points.

## License and Attribution

All contributions are under the MIT License (see [LICENSE](../LICENSE)). By contributing, you agree your work is licensed accordingly. Attribute original authors in commits.

We appreciate your help in making CaseBrief AI better—let's build secure, scalable legal AI tools together!

For questions, contact maintainers via GitHub issues.