# SDD ledger — plan: docs/superpowers/plans/2026-09-24-comprehensive-help-center-troubleshooting.md

## Setup

- Spec: `docs/superpowers/specs/2026-09-24-comprehensive-help-center-troubleshooting-design.md`
- Execution: Native, current branch `codex/fix-chatbot-article-links`
- Ruling: The provided bash helper cannot run in this Windows PowerShell environment; use the same per-plan ledger path manually and continue without changing product behavior.
- Pre-flight shared interfaces:
  - Task 1 → Task 3: registry schema/factory produces validated article records consumed by category modules.
  - Task 1 → Task 4: canonical published registry APIs are consumed by Help Center, support, sitemap, and chatbot surfaces.
  - Task 2 → Task 3: inventory evidence and coverage statuses constrain which category records may be Published.
  - Task 1/2/3 → Task 5: article IDs, statuses, evidence, and category matrix are consumed by weekly sync impact analysis.
  - Task 4 → Task 6: published-only route/search/sitemap behavior is validated in production smoke tests.

Task 1: complete (tests: `node --test tests/help-center-troubleshooting.test.mjs tests/help-center-registry.test.mjs` → 10/10 pass)
Task 2: complete (tests: `node --test tests/help-center-inventory.test.mjs` → 2/2 pass; generated inventory and 17-row coverage matrix)
Task 3: complete (tests: `node --test tests/help-center-troubleshooting.test.mjs tests/help-center-registry.test.mjs tests/help-center-chat-retrieval.test.mjs tests/help-center-routes.test.mjs` → 17/17 pass; 50 new troubleshooting records, 69 published total)
Task 4: complete (tests: `node --test tests/help-center-troubleshooting.test.mjs tests/chatbot-response-resilience.test.mjs` → 19/19 pass; canonical article presentation and structured localized chatbot recommendations)
