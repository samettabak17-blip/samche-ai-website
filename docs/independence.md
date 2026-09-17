# Repository Independence

The website runtime owns its own Node server, `/api/health`, `/api/sales-chat`, and `/api/contact` endpoints. The migrated sales-chat service uses only website commercial facts from `lib/site-data.mjs` and the server-side OpenAI HTTP boundary.

Migrated website-specific logic:

- strict sales-chat response schema and enum validation
- server-owned capability flags with scheduling, confirmation, and email disabled
- scheduling/email claim sanitizer and safe preference-only rewrite
- provider timeout/failure handling
- bounded context and rate limiting

Not migrated and not referenced at runtime:

- platform tenant APIs, CRM APIs, Knowledge Intelligence APIs
- Render services, Render PostgreSQL, workers, or background jobs
- `samche-api-service` source, package, database, or environment

The frontend uses the same-origin `/api/sales-chat` endpoint. Contact/demo requests use `/api/contact` and require the website-only `CONTACT_WEBHOOK_URL` to be configured in Hostinger.
