# Clinical Site Onboarding POC

This proof-of-concept implements the architecture described in the Technical Review & Architecture Specification for the next-gen clinical site onboarding workflow.

## Included behavior

- Site intake form to create a new onboarding request
- AI compliance evaluation using a rule-based RAG-style engine
- Exception routing when a site needs approval
- Adaptive Card style decision payload for approvers
- Immutable audit ledger with cryptographic signatures
- Approval or rejection workflow driven through the API
- Simple browser-based frontend to demonstrate the system end-to-end

## Run locally

```bash
npm install
npm start
```

Then open http://localhost:3001

## API highlights

- `GET /api/health`
- `POST /api/sites`
- `GET /api/sites`
- `POST /api/sites/:id/decision`
- `GET /api/audit-log`

## Architectural mapping

- Express API gateway: `server/index.js`
- Event-driven state handling: `server/store.js`
- AI compliance evaluation: `server/aiEngine.js`
- Browser UI: `public/index.html`
