# Hostinger Deployment

This repository is an independent SamChe AI public website. It does not depend on `samche-api-service`, Render, Render PostgreSQL, or platform workers.

## Hostinger Web App settings

- Product: Business Web Hosting → Deploy Web App (Node.js)
- Node version: 22.x (the `engines.node` range is `>=22.13.0`)
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Health check: `https://YOUR_DOMAIN/api/health`

The application listens on `process.env.PORT` and serves the built website from `dist/client`.

## Environment variable names

Add these in Hostinger’s environment variables section. Do not commit values here or in GitHub.

- `NODE_ENV=production`
- `PORT` (Hostinger may provide this automatically)
- `OPENAI_API_KEY` (required for natural sales-chat provider responses)
- `OPENAI_MODEL` (optional; defaults to `gpt-4o-mini`)
- `CONTACT_WEBHOOK_URL` (required to forward contact/demo requests to the chosen website-specific provider)
- `SUPPORT_EMAIL_API_URL` (HTTPS endpoint for a dedicated server-side email adapter)
- `SUPPORT_EMAIL_API_TOKEN` (server-side bearer token for that adapter)
- `SUPPORT_EMAIL_FROM` (verified sender address at the selected email service)

The support adapter sends a JSON `POST` with `to: "support@samchecompany.com"`, `from`, `replyTo`, `subject`, a structured plain-text `text` body, and an optional base64 `attachment` (`name`, `mimeType`, `data`). The configured adapter must send the attachment to the mailbox and return a successful HTTP status with `{ "accepted": true, "recipient": "support@samchecompany.com" }` only after the email service accepts the entire message. A generic `CONTACT_WEBHOOK_URL` response does not satisfy this contract. Until these values are configured and an actual message is received, `/api/support` returns an unavailable response and the form shows a localized failure message. Do not configure these values in browser-facing variables.

No `VITE_*` variable contains a provider key. The browser calls same-origin `/api/sales-chat` and `/api/contact`.

## Custom domain

Add the domain in Hostinger, use the DNS records Hostinger provides, wait for SSL issuance, then verify `/api/health` and the website routes. DNS is not changed by this repository setup.

## GitHub deployment

Connect the private `samchecompany/samche-ai-website` repository, branch `main`, and configure the build/start commands above. Store secrets only in Hostinger, never in GitHub files or frontend environment variables.

## Rollback

Redeploy the previous known-good `main` commit from Hostinger’s deployment history. If the provider is unavailable, the website remains available and `/api/sales-chat` returns a safe temporary-unavailable response; it does not invent a booking or email action.
