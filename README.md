# SamChe AI Website

Independent public SamChe AI website frontend and website-specific Node.js backend.

## Local development

- Node.js `>=22.13.0`
- `npm ci`
- `npm run dev` for the frontend preview
- `npm run build && npm start` for the production-shaped Node.js app

The browser calls the same-origin `/api/sales-chat` endpoint. Provider credentials are server-side environment variables only; see [Hostinger deployment](docs/hostinger-deployment.md).

This repository has no runtime dependency on the SamChe AI Platform API, Render, or `samche-api-service`. The migrated sales-chat service preserves the verified preference-only demo and provider-failure safety behavior. See [independence notes](docs/independence.md).
