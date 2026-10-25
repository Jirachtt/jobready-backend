# JobReady

Thai resume review and interview practice using React/Vite and Node.js/Express.

## Core workflow

- Upload a text-based PDF (up to 5 MB / 50 pages), or paste and correct its text.
- Compare the resume with a job description. Basic mode reports deterministic keyword coverage, not a hiring probability.
- Practice five technical or behavioral questions, revise an answer, and retain progress in the same browser tab.
- Review feedback, see a clearly labelled sample answer, finish a summary, and download practice notes.
- AI mode is opt-in. If Gemini is unavailable, the app explicitly uses basic keyword/checklist tools and never invents assessment scores.

## Run locally

Use Node.js 22 or later. In `backend`, run `npm ci`, copy `.env.example` to `.env` if AI is needed, and run `npm start`. In `frontend`, run `npm ci` and `npm run dev`. The Vite development proxy sends `/api` to `http://127.0.0.1:8000`.

## Deployment configuration

Backend: root directory `backend`, build `npm ci`, start `npm start`. Set `GEMINI_API_KEY` only on the backend and optionally `GEMINI_MODEL` (default `gemini-3.5-flash-lite`). `ALLOWED_ORIGINS` accepts comma-separated exact frontend origins. Keep the existing frontend origin `https://jobready-frontend-044r.onrender.com`.

Frontend: root directory `frontend`, build `npm ci && npm run build`, publish `dist`. Set `VITE_API_URL=https://jobready-backend-49l8.onrender.com`; it is a public API address, never an API secret. Retain the SPA rewrite from `public/_redirects`.

No paid plan, new API key, or billing upgrade is required by the code. Actual AI availability depends on the configured provider key, model access, quota and provider terms. Basic mode works without an AI key.

## Validation

Backend: `node --test test/workflow.test.js`. Tests cover deterministic matching, Java versus JavaScript, provider failure/invalid output, AI consent, PDF size/signature validation, exact CORS origins, and the complete API workflow. Frontend: `npm run build`. Browser verification also covers five answers, revision, reload recovery, summary, and notes download using synthetic information.

## Limits and data handling

This is a practice tool, not an automated hiring decision or certified ATS evaluator. Keyword coverage and AI coaching are not probabilities of employment. Text-only input cannot establish a person's voice confidence or personality. Scanned PDFs need OCR or pasted text; OCR is not included. Documents are processed in server memory, not stored in an application database. Practice state is kept in sessionStorage in the current tab and can be cleared. Opting into Gemini sends the supplied text to Google for processing under the provider's policies. The app does not provide accounts, cross-device history, or a production authentication service.
