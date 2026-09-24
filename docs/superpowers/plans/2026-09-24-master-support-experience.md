# SamChe AI Support Experience Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship registry-derived Help Center counts, strict latest-message TR/EN/AR chat behavior, grounded non-generic recovery, verified Dashboard expertise, persistent context, and measured fast navigation/chat UX.

**Architecture:** Extend the existing canonical registry with one statistics boundary and use the existing Dashboard map plus published article content to construct recovery answers. Persist `siteLocale` and `conversationLanguage` separately, keep the panel mounted and opening synchronous, and retain runtime-safe anchor prefetch plus adaptive word-group reveal.

**Tech Stack:** Next/Vinext, React 19, Node.js ES modules and test runner, TypeScript, localStorage, Playwright-compatible browser acceptance through the available browser UI.

**Spec:** `docs/superpowers/specs/2026-09-24-master-support-experience-design.md`

## Global Constraints

- Do not modify pricing, plan entitlements, SMTP, DNS, Render, Hostinger environment variables, infrastructure, or `samche-api-service`.
- The filtered canonical Help Center registry is the only public article source.
- The latest user-message language controls every chatbot response path.
- Never fabricate Dashboard controls, routes, tenant state, provider state, or tickets.
- Never persist raw screenshot/base64 data.
- Preserve SSR, SEO, canonical URLs, sitemap coverage, and raw document HTTP 200 responses.
- Commit only scoped files and push normally without force.

## Review Focus

- A new non-WhatsApp module support question must receive module-specific verified guidance, not the old generic fallback; covered in Task 2 recovery matrix tests.
- A short ambiguous follow-up after refresh must retain the persisted conversation language while a clear new language must replace it; covered in Task 3 migration and latest-message tests.
- A published-status lookalike such as Draft, Retired, Roadmap, or unverified must never change totals; covered in Task 1 injected-registry tests.
- An article body containing its own canonical URL must not duplicate its structured recommendation card; covered in Task 4 presentation tests.
- Chat opening must remain synchronous even with a large valid stored session and reduced motion; covered in Task 5 responsiveness tests and browser acceptance.

---

### Task 1: Canonical Article Statistics and Visible Counts

**Files:**
- Modify: `lib/help-center/index.mjs`
- Modify: `app/components/help-center.tsx`
- Modify: `app/globals.css`
- Test: `tests/help-center-registry.test.mjs`
- Test: `tests/help-center-routes.test.mjs`

**Interfaces:**
- Produces: `getHelpArticleStatistics(locale?) -> { totalPublished, totalTroubleshooting, categories }`.
- `categories` contains localized `{ slug, label, count }` rows derived from the filtered public collection.
- Consumed by: Help Center home and category views.

- [ ] **Step 1: Write failing statistics tests**

Add assertions that `totalPublished === getPublishedArticles('en').length`, `totalTroubleshooting` equals published records from the troubleshooting registry, category totals sum to `totalPublished`, every `getPublishedCategories()` count matches its statistic, and non-published fixture statuses are excluded by the exported pure statistics helper.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/help-center-registry.test.mjs tests/help-center-routes.test.mjs`

Expected: FAIL because `getHelpArticleStatistics` and the visible count summary do not exist.

- [ ] **Step 3: Implement the statistics boundary and localized UI**

Build statistics only from the already-filtered `published` collection and the published subset of `troubleshootingArticles`. Add compact EN/TR/AR copy for total verified articles and troubleshooting articles. Render the summary on `/help`, retain category-card counts, and add the current category count to category-page hero copy.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/help-center-registry.test.mjs tests/help-center-routes.test.mjs tests/help-center-inventory.test.mjs tests/help-center-troubleshooting.test.mjs`

Expected: all selected tests pass.

- [ ] **Step 5: Commit**

Commit message: `feat: show canonical help center article counts`

### Task 2: Grounded Recovery and Dashboard Expertise

**Files:**
- Modify: `lib/samche-sales-chat-client.mjs`
- Modify: `server/sales-chat-service.mjs`
- Modify: `lib/support-dashboard-map.mjs` only if a required verified field is missing
- Test: `tests/chatbot-response-resilience.test.mjs`
- Test: `tests/samche-support-and-implementation.test.mjs`
- Test: `tests/vision-support-regression.test.mjs`
- Test: `tests/help-center-chat-retrieval.test.mjs`

**Interfaces:**
- Produces: `buildGroundedSupportRecovery({ language, input, messages, state, articleRefs, attachment })` returning localized body plus canonical article refs.
- Consumes: `dashboardSupportMap`, `getArticleBySlug`, `getHelpArticleSources`, and persisted bounded context.
- `resolveSalesChatTurn` uses it for network, HTTP, malformed JSON, validator, empty-response, and safe-salvage failure paths.

- [ ] **Step 1: Write failing recovery matrix tests**

Cover Web Chatbot, WhatsApp AI, AI Guide, Knowledge Intelligence/approval, Conversations, CRM/Leads/Pipeline, Integrations, Team/Permissions, AI Visual, AI Voice, Support, plans, and billing. Assert verified routes/controls appear only where mapped; implementation-managed features say so; fake controls and tenant-state claims do not appear; plan boundaries are correct; a valid support question always receives either verified steps or an exact unknown/evidence request.

- [ ] **Step 2: Write failing article and screenshot recovery tests**

Assert broken-link recovery reuses the last published slug and includes direct troubleshooting; insufficient-article recovery incorporates referenced and related article steps without repeating a URL; screenshot follow-up labels visible evidence, verified documentation, and remaining investigation while retaining the image-derived module.

- [ ] **Step 3: Run tests and verify RED**

Run: `node --test tests/chatbot-response-resilience.test.mjs tests/samche-support-and-implementation.test.mjs tests/vision-support-regression.test.mjs tests/help-center-chat-retrieval.test.mjs`

Expected: FAIL on non-WhatsApp generic fallback, deeper article recovery, or explicit screenshot evidence separation.

- [ ] **Step 4: Implement minimal grounded recovery**

Select the mapped module by localized symptoms and prior context. Render verified customer steps, permissions/plan boundary, limitations, and at most one evidence question. Retrieve the most recent canonical article plus related published records for article follow-ups. Keep implementation-managed and unverified areas explicit. Remove generic retry-only support copy from both client and server recovery paths.

- [ ] **Step 5: Verify GREEN**

Run the four focused files above plus `tests/website-sales-chat-service.test.mjs`.

Expected: all selected tests pass.

- [ ] **Step 6: Commit**

Commit message: `feat: ground every support recovery path`

### Task 3: Strict Latest-Message Language and Persistent Separation

**Files:**
- Modify: `lib/samche-chat-persistence.mjs`
- Modify: `lib/samche-sales-chat-client.mjs`
- Modify: `server/sales-chat-service.mjs`
- Modify: `app/components/samche-chat-widget.tsx`
- Test: `tests/samche-chat-persistence.test.mjs`
- Test: `tests/chatbot-response-resilience.test.mjs`
- Test: `tests/website-sales-chat-service.test.mjs`
- Test: `tests/samche-localization.test.mjs`

**Interfaces:**
- Session v3 stores `siteLocale` and `conversationLanguage`; v1/v2 `locale` migrates to both fields.
- Every send detects the latest message language before setting processing copy or calling the provider.
- Clear-chat resets conversation language to the current site locale without clearing the independent site preference.

- [ ] **Step 1: Write failing v3 persistence and migration tests**

Round-trip all three languages; migrate v1/v2 `locale`; restore an ambiguous follow-up language; replace it after a clear TR/EN/AR message; preserve messages, mode, plan, issue, refs, screenshot summary/module, and qualification state; reject raw attachment fields.

- [ ] **Step 2: Write failing all-path language tests**

For TR, EN, and AR assert provider success, provider failure, validator failure, malformed JSON, HTTP/network failure, broken link, insufficient article, screenshot follow-up, empty response, and refresh restoration contain only the latest-message language except verified product/control names.

- [ ] **Step 3: Run tests and verify RED**

Run: `node --test tests/samche-chat-persistence.test.mjs tests/chatbot-response-resilience.test.mjs tests/website-sales-chat-service.test.mjs tests/samche-localization.test.mjs`

Expected: FAIL because the stored session exposes only `locale` and the widget does not keep a separate conversational language.

- [ ] **Step 4: Implement v3 language separation**

Add bounded migration, detect before the processing indicator, pass the resolved language through client/server validation and recovery, persist after every turn, and restore it independently of the site locale. Keep ambiguous-message fallback deterministic.

- [ ] **Step 5: Verify GREEN**

Run the four focused files above.

Expected: all selected tests pass.

- [ ] **Step 6: Commit**

Commit message: `feat: lock chat replies to latest message language`

### Task 4: Single Canonical Article Presentation and Multilingual Search

**Files:**
- Modify: `lib/restricted-markdown.mjs`
- Modify: `lib/help-center/index.mjs`
- Modify: `app/components/samche-chat-widget.tsx`
- Modify: `app/components/help-center.tsx`
- Test: `tests/restricted-markdown.test.mjs`
- Test: `tests/chatbot-response-resilience.test.mjs`
- Test: `tests/help-center-registry.test.mjs`
- Test: `tests/help-center-support-integration.test.mjs`

**Interfaces:**
- `articleRefs` is the sole visible article recommendation source.
- Canonical refs are deduplicated, filtered against the published registry, and rendered with localized title/summary/url.
- Search ranks localized body, keywords, synonyms, known error wording, and product terminology.

- [ ] **Step 1: Write failing duplicate-link and search tests**

Assert a body containing a canonical article markdown URL plus the same `articleRef` renders one card and no body link; placeholder/external/raw URLs never become recommendations; duplicate refs collapse; localized known-error and synonym queries return the expected published article in EN/TR/AR.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/restricted-markdown.test.mjs tests/chatbot-response-resilience.test.mjs tests/help-center-registry.test.mjs tests/help-center-support-integration.test.mjs`

Expected: FAIL on duplicate body/card presentation or missing synonym coverage.

- [ ] **Step 3: Implement minimal sanitization, deduplication, and search enrichment**

Strip canonical Help Center markdown links from assistant body presentation when structured refs exist, preserve safe non-link markdown, and filter/deduplicate refs through `getPublishedArticlePresentation`. Extend registry scoring inputs only with verified localized registry fields.

- [ ] **Step 4: Verify GREEN**

Run the four focused files above plus Help Center route and sitemap tests.

Expected: all selected tests pass.

- [ ] **Step 5: Commit**

Commit message: `fix: keep article links canonical and unique`

### Task 5: Opening, Navigation, Persistence, and Reveal Performance

**Files:**
- Modify: `app/components/samche-chat-widget.tsx` only for measured blocking work
- Modify: `app/components/internal-link.tsx` only if browser measurement identifies a safe improvement
- Modify: `lib/chat-reveal.mjs` only if timing assertions are outside targets
- Modify: `app/globals.css` only for measured transition/accessibility gaps
- Test: `tests/chat-panel-responsiveness.test.mjs`
- Test: `tests/internal-navigation.test.mjs`
- Test: `tests/chat-reveal.test.mjs`
- Test: `tests/samche-chat-persistence.test.mjs`

**Interfaces:**
- Launcher updates `open` synchronously; mounted composer remains enabled.
- Internal links keep same-tab anchors and prefetch same-origin documents on intent.
- Reveal profile stays within the spec ranges and renders immediately for reduced motion.

- [ ] **Step 1: Extend measurable contract tests**

Assert storage parse/markdown/viewport/focus work is absent from the launcher click path, composer is not hydration-gated, panel remains mounted, transition properties/duration are bounded, reduced motion is instant, priority route/article links use the shared internal link, and reveal targets remain within the approved ranges.

- [ ] **Step 2: Run tests and determine RED or already-green evidence**

Run: `node --test tests/chat-panel-responsiveness.test.mjs tests/internal-navigation.test.mjs tests/chat-reveal.test.mjs tests/samche-chat-persistence.test.mjs`

Expected: tests either expose a concrete gap or document that the existing implementation already meets the contract. Do not change production code without a failing performance assertion.

- [ ] **Step 3: Implement only demonstrated fixes**

Move any blocking work behind paint/effects, keep native anchor semantics and user-intent prefetch, and tune only the measured transition/reveal values. Do not introduce an unsupported client router or synthetic measurement claims.

- [ ] **Step 4: Verify GREEN**

Run the four focused files and production HTTP smoke.

Expected: all selected tests pass and every priority route returns a document response.

- [ ] **Step 5: Commit when production files changed**

Commit message: `perf: keep chat and support navigation immediate`

### Task 6: Weekly Sync Impact, Full Validation, Browser Acceptance, and Delivery

**Files:**
- Modify: `lib/dashboard-knowledge-sync.mjs` only if impact fields are missing
- Modify: `scripts/dashboard-knowledge-audit.mjs` only if report output is incomplete
- Test: `tests/dashboard-knowledge-sync.test.mjs`
- Test: `tests/production-http-smoke.test.mjs`

**Interfaces:**
- Weekly report classifies `ADDED`, `CHANGED`, `REMOVED`, `IMPLEMENTATION-MANAGED`, `ADMIN-ONLY`, `ROADMAP`, and `UNVERIFIED` and lists affected articles, retrieval, search, translations, tests, and counts.

- [ ] **Step 1: Write and run any missing impact test RED**

Run: `node --test tests/dashboard-knowledge-sync.test.mjs`

Expected: if impact fields are missing, FAIL on the exact missing field; otherwise record the already-green evidence and leave production code unchanged.

- [ ] **Step 2: Implement only missing deterministic impact reporting and verify GREEN**

Run: `node --test tests/dashboard-knowledge-sync.test.mjs`

Expected: all sync tests pass and report mode remains non-publishing.

- [ ] **Step 3: Run full automated validation**

Run: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:production-http`, `git diff --check`, and a tracked-files secret-pattern audit that reports file names without printing secret values.

Expected: every command exits 0; test counts and any warnings are recorded exactly.

- [ ] **Step 4: Run browser acceptance and record real observations**

Start the production server and verify `/`, `/platform`, `/pricing`, `/help`, `/support`, `/security`, `/contact`, `/privacy`, one category, and one article. Verify Help Center counts, multilingual search, article navigation, chat opening/composer, close/reopen, route continuity, refresh restore, latest-language switching, structured article cards, and reduced motion. Use browser timing APIs for click-to-visible and click-to-interactive only when the browser surface makes them observable; do not invent numbers.

- [ ] **Step 5: Final scoped review and commit**

Review the diff against the specification, exclude all unrelated untracked files, and commit any remaining scoped tests/docs with message `test: verify production support experience`.

- [ ] **Step 6: Push normally**

Push the current branch to its existing upstream without force and record the commit SHA and push result.
