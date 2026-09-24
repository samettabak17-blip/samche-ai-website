# Help Center Knowledge Portal and Conversation Language Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a navigation-first, fully localized Help Center backed by the canonical 68-article registry and enforce latest-message language across every chatbot response and recovery path.

**Architecture:** Strengthen the existing registry adapter rather than introducing a second content source. Add presentation/statistics/search/grouping helpers in `lib/help-center/index.mjs`, consume them from the existing Help Center and Support clients, and resolve one authoritative `conversationLanguage` at each chat-turn boundary before provider, validation, recovery, persistence, and rendering work.

**Tech Stack:** Next.js 16, React 19, TypeScript, native Node test runner, CSS, existing `.mjs` registry and chat modules.

**Spec:** `docs/superpowers/specs/2026-09-25-help-center-knowledge-portal-language-lock-design.md`

## Global Constraints

- Preserve the existing single canonical 68-article registry; do not create a second content source.
- Count and expose only records with status `Published` and complete verification evidence.
- `siteLocale` controls UI chrome only; the resolved latest-message `conversationLanguage` controls chatbot replies and article recommendations.
- Preserve SMTP, OpenAI text and vision, screenshots, clipboard paste, chat persistence, fast opening, response reveal, Support Portal, pricing, feature comparison, SSR, weekly Dashboard sync, and infrastructure.
- Do not modify DNS, Render, Hostinger environment values, or `samche-api-service`.
- Do not claim public production success until the pushed revision is deployed and exercised live.
- Preserve unrelated tracked and untracked user files.

## Review Focus

- A record labeled `Published` but missing `verifiedOn`, source files, or review triggers must be excluded from totals and every public adapter; tested in Task 1.
- Search must compute the total before limiting results and must not duplicate a slug; tested in Task 2.
- One article that matches several category groups must render in exactly one deterministic group; tested in Task 2.
- A neutral follow-up may retain prior conversation language, while a detectable latest message must override both site and stored languages; tested in Task 4.
- Restored screenshot/article context must not override the latest message language or introduce duplicate article links; tested in Task 4.

---

### Task 1: Lock the canonical publication gate and statistics contract

**Files:**
- Modify: `lib/help-center/index.mjs`
- Modify: `tests/help-center-registry.test.mjs`

**Interfaces:**
- Produces: `getHelpCenterStats(locale = 'en', records?)`
- Produces: normalized localized article fields `articleType`, `articleTypeLabel`, and `categoryLabel`
- Preserves: `getHelpArticleStatistics(locale)` as a compatibility adapter

- [ ] **Step 1: Write failing statistics and publication-gate tests.** Add fixtures for `Draft`, `Retired`, `Unverified`, `Roadmap`, and superficially published records missing verification evidence. Assert exact totals, `totalCategories`, `byCategory`, `byStatus`, `byLocale`, and localized type/category labels.

```js
const stats = getHelpCenterStats('tr');
assert.equal(stats.totalPublished, 68);
assert.equal(stats.totalTroubleshooting, 50);
assert.equal(stats.totalCategories, 11);
assert.deepEqual(stats.byLocale, { en: 68, tr: 68, ar: 68 });
assert.equal(stats.byCategory.find((row) => row.slug === 'whatsapp-ai').count, 9);
assert.equal(filterPublishedHelpArticles([incompletePublished]).length, 0);
```

- [ ] **Step 2: Run the registry tests and verify expected failure.**

Run: `node --test tests/help-center-registry.test.mjs`

Expected: FAIL because `getHelpCenterStats`, the stricter publication gate, `totalCategories`, and normalized localized labels do not exist.

- [ ] **Step 3: Implement the strict publication predicate and normalized registry view.** Mark canonical records with `articleType` during composition based on membership in `troubleshootingArticles`; validate the verification evidence in one predicate; localize category and type through metadata maps; keep all current lookup and URL functions compatible.

```js
function isFullyVerifiedPublished(article) {
  return article?.verification?.status === 'Published'
    && Boolean(article.verification.verifiedOn)
    && article.verification.sourceFiles?.length > 0
    && article.verification.reviewTriggers?.length > 0;
}
```

- [ ] **Step 4: Implement `getHelpCenterStats()` and compatibility alias.** Compute all values from the supplied records or canonical records after the same publication gate. Do not count localized UI labels or maintain component-level counters.

- [ ] **Step 5: Run the registry tests and verify green.**

Run: `node --test tests/help-center-registry.test.mjs`

Expected: PASS with 68 published, 50 troubleshooting, 11 categories, and complete EN/TR/AR coverage.

### Task 2: Add search totals, category grouping, and localized presentation helpers

**Files:**
- Modify: `lib/help-center/index.mjs`
- Modify: `tests/help-center-registry.test.mjs`
- Modify: `tests/help-center-routes.test.mjs`

**Interfaces:**
- Produces: `searchHelpArticleResults(query, locale, { offset = 0, limit = 20 })`
- Produces: `getCategoryArticleGroups(categorySlug, locale)`
- Preserves: `searchHelpArticles(query, locale, { limit })`

- [ ] **Step 1: Write failing search and grouping tests.** Assert the result total is computed before slicing, range values are correct, each result has localized category/type labels and an excerpt, category groups are localized, and every category article slug appears exactly once.

```js
const search = searchHelpArticleResults('WhatsApp', 'tr', { limit: 2 });
assert.ok(search.total > search.items.length);
assert.deepEqual([search.start, search.end], [1, 2]);
assert.ok(search.items.every((item) => item.categoryLabel && item.articleTypeLabel));
const grouped = getCategoryArticleGroups('whatsapp-ai', 'tr');
assert.equal(new Set(grouped.flatMap((group) => group.articles.map((item) => item.slug))).size, 9);
```

- [ ] **Step 2: Run focused tests and verify expected failure.**

Run: `node --test tests/help-center-registry.test.mjs tests/help-center-routes.test.mjs`

Expected: FAIL because the new summary and grouping helpers do not exist.

- [ ] **Step 3: Implement the search summary adapter.** Score all eligible canonical articles, sort and de-duplicate them, then apply offset/limit. Return zero-based empty range for no matches and one-based visible ranges otherwise. Delegate the old `searchHelpArticles()` function to `.items`.

- [ ] **Step 4: Implement deterministic category grouping.** Use article kind, category, issue type, plan/applicability, and implementation boundary metadata to assign each article to the first matching presentation group. Localize group headings with a fixed EN/TR/AR presentation map.

- [ ] **Step 5: Run focused tests and verify green.**

Run: `node --test tests/help-center-registry.test.mjs tests/help-center-routes.test.mjs`

Expected: PASS with exact totals and one-time grouping.

### Task 3: Rebuild Help Center and Support presentation as a knowledge portal

**Files:**
- Modify: `app/components/help-center.tsx`
- Modify: `app/components/support-portal.tsx`
- Modify: `app/globals.css`
- Modify: `tests/help-center-routes.test.mjs`
- Modify: `tests/help-center-support-integration.test.mjs`
- Modify: `tests/chat-panel-responsiveness.test.mjs`

**Interfaces:**
- Consumes: `getHelpCenterStats`, `searchHelpArticleResults`, `getCategoryArticleGroups`, and normalized localized article records
- Preserves: `/help`, `/help/category/[category]`, `/help/article/[slug]`, `/support`, and existing form submission behavior

- [ ] **Step 1: Write failing source-contract tests.** Assert three summary metrics, category directory, compact article rows, localized result count/range, category groups, documentation metadata, notice blocks, Ask SamChe AI, Contact Support, Support Portal count line, and responsive/RTL CSS. Assert no article UI interpolates `article.category` directly.

```js
assert.match(component, /statistics\.totalCategories/);
assert.match(component, /resultsFor/);
assert.match(component, /help-article-row/);
assert.doesNotMatch(component, />\{article\.category\}</);
assert.match(css, /\[dir=['"]rtl['"]\]/);
```

- [ ] **Step 2: Run UI contract tests and verify expected failure.**

Run: `node --test tests/help-center-routes.test.mjs tests/help-center-support-integration.test.mjs tests/chat-panel-responsiveness.test.mjs`

Expected: FAIL because the current Help Center uses article grids, lacks category/search totals and exposes internal category slugs.

- [ ] **Step 3: Replace the Help Center copy map with complete portal copy.** Add localized metric labels, result phrases, range copy, group headings, type labels, updated/verified labels, Ask AI text, and support copy. Remove mixed-language phrases such as Turkish “müşteri-facing” and generic English `Support` where natural localized wording is required.

- [ ] **Step 4: Implement homepage IA and compact rows.** Render search first, three metrics, category directory, verified popular troubleshooting, recently verified, getting started, Ask AI, and Contact Support. Resolve all rows through normalized presentation fields and locale-preserving URLs.

- [ ] **Step 5: Implement category and search result views.** Render result totals/ranges and category groups as single-column compact rows with localized type/date metadata and clear arrows. Never render all 68 items on initial homepage load.

- [ ] **Step 6: Improve article documentation layout.** Localize breadcrumb/category/type; render plan/date, contents, steps, notes/warnings, unique related rows, feedback, Ask AI, and Contact Support.

- [ ] **Step 7: Add the compact Support Portal count line.** Use `getHelpCenterStats(locale).totalPublished`; preserve the search and form behavior exactly.

- [ ] **Step 8: Implement responsive and RTL styling.** Use two-column category layout on desktop, one column on mobile, compact single-column rows, logical properties, safe wrapping, and no fixed widths that can overflow 320 pixels.

- [ ] **Step 9: Run UI contract tests and verify green.**

Run: `node --test tests/help-center-routes.test.mjs tests/help-center-support-integration.test.mjs tests/chat-panel-responsiveness.test.mjs`

Expected: PASS with no raw category/type labels in visible UI contracts.

### Task 4: Enforce latest-message conversation language on every chat path

**Files:**
- Modify: `lib/samche-sales-chat-client.mjs`
- Modify: `server/sales-chat-service.mjs`
- Modify: `app/components/samche-chat-widget.tsx`
- Modify: `tests/chatbot-response-resilience.test.mjs`
- Modify: `tests/website-sales-chat-service.test.mjs`
- Modify: `tests/samche-chat-persistence.test.mjs`

**Interfaces:**
- Produces: one turn-level conversation-language resolver with latest-message precedence
- Consumes: current message text, previous conversation language only for neutral text, and site locale only for a new neutral conversation
- Preserves: provider payload, vision attachments, persistence schema compatibility, progressive reveal, and action handling

- [ ] **Step 1: Write failing matrix tests before changing chat code.** For TR, EN, and AR, exercise provider failure, HTTP failure, malformed JSON, validator failure, safe salvage, timeout/abort, broken article, insufficient article, screenshot follow-up, generic support recovery, and restored state. Assert the assistant message language and article-title language always match the latest message.

```js
for (const scenario of scenarios) {
  const result = await resolveSalesChatTurn({ ...scenario, locale: opposingSiteLocale });
  assert.equal(result.messages.at(-1).language, scenario.expectedLanguage);
  assert.match(result.messages.at(-1).text, scenario.expectedLocalizedPattern);
}
```

- [ ] **Step 2: Run chat tests and verify which uncovered paths fail.**

Run: `node --test tests/chatbot-response-resilience.test.mjs tests/website-sales-chat-service.test.mjs tests/samche-chat-persistence.test.mjs`

Expected: at least the new neutral-language/timeout/salvage/restored-state assertions fail, proving the coverage gap before implementation.

- [ ] **Step 3: Centralize client turn-language resolution.** Resolve `conversationLanguage` once from the newest text and previous conversation language. Pass that resolved value into the provider request as `inputLanguage`, every recovery call, reply validation, article lookup, stored user/assistant messages, and returned turn state. Do not re-run a site-locale-first resolver inside fallback functions.

- [ ] **Step 4: Make server response paths honor authoritative input language.** Validate the supplied current-message language against EN/TR/AR, re-detect only from the current message when needed, and thread it through provider prompt, salvage, validator, support recovery, timeout/network error, and response payload. Never choose previous assistant or site language over a detectable current message.

- [ ] **Step 5: Make widget persistence and rendering language-safe.** Keep `siteLocale` and `conversationLanguage` separate during hydrate, submit, refresh, and locale-switch events. Resolve article recommendation titles with the message/turn conversation language, de-duplicate slugs, and render the localized specific-title heading without raw Markdown URLs.

- [ ] **Step 6: Run chat tests and verify green.**

Run: `node --test tests/chatbot-response-resilience.test.mjs tests/website-sales-chat-service.test.mjs tests/samche-chat-persistence.test.mjs tests/restricted-markdown.test.mjs`

Expected: PASS for all response and recovery paths in TR, EN, and AR with unique canonical article links.

### Task 5: Run full automated validation and inspect the scoped diff

**Files:**
- Modify if necessary: `tests/production-http-smoke.test.mjs`
- Inspect: all scoped changed files

**Interfaces:**
- Produces: fresh evidence for tests, typecheck, lint, build, HTTP smoke, diff hygiene, and secret audit

- [ ] **Step 1: Run the full test suite.**

Run: `npm test`

Expected: all tests pass with the exact count recorded.

- [ ] **Step 2: Run static validation.**

Run: `npm run typecheck`; then `npm run lint`; then `git diff --check`.

Expected: exit 0 for each command; no lint errors or whitespace errors.

- [ ] **Step 3: Build and run production HTTP smoke.**

Run: `npm run build`; then `npm run test:production-http`.

Expected: production build and route smoke both exit 0.

- [ ] **Step 4: Run the scoped secret audit.** Inspect only tracked diff content and filenames for credential patterns (`API_KEY`, private keys, bearer tokens, passwords, SMTP secrets) while excluding documented placeholder names. Confirm no `.env` or infrastructure file is staged.

- [ ] **Step 5: Review requirements against the diff.** Confirm all final-report fields have evidence, all public labels are localized, 68/50/category totals still match, and unrelated untracked files remain untouched.

### Task 6: Perform local and live browser acceptance, then commit and push

**Files:**
- No planned source changes; browser-discovered defects return to the owning task with a failing regression test first

**Interfaces:**
- Consumes: built production application and, after push/deployment, `https://samche.ai`

- [ ] **Step 1: Start the built application on an unused local port.** Use the existing production start command and retain its process/session for browser checks.

- [ ] **Step 2: Exercise Help Center in EN, TR, and AR at every required width.** Check 320, 375, 390, 430, 768, 1024, 1440, and 1920 pixels for overflow, metric readability, category navigation, search usability, article rows, article pages, and AR RTL.

- [ ] **Step 3: Exercise strict chat sequences locally.** Run the three-turn WhatsApp → broken article → insufficient article sequence separately in TR, EN, and AR. Trigger provider/network failure where the local test harness supports it, and verify named unique article recommendations.

- [ ] **Step 4: Commit only scoped implementation changes.** Stage explicit Help Center, chat, test, CSS, and documentation paths; inspect the staged diff; commit with a scoped message. Do not stage existing unrelated plans, `.superpowers` state, or `tsconfig.tsbuildinfo`.

- [ ] **Step 5: Push normally without force.** Push the current named branch to its configured upstream. If rejected, stop and report rather than force-pushing.

- [ ] **Step 6: Verify public production only if the revision is deployed.** Open the live Help Center and repeat the EN/TR/AR language and responsive acceptance checks. If the pushed commit is not deployed or the live site is inaccessible, report `LIVE PRODUCTION: NOT VERIFIED` and name deployment as the blocker.
