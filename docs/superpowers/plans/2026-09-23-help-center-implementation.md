# SamChe AI Help Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a production-ready EN/TR/AR Help Center with verified articles, shared search, permanent article URLs, and grounded support-chat retrieval.

**Architecture:** A typed registry in `lib/help-center/` is the only source for published article content, search, support results, article pages, sitemap entries, and chatbot source excerpts. The existing dashboard map remains the authority for navigation and capability boundaries; the chatbot receives bounded article excerpts and returns validated article references.

**Tech Stack:** React 19, Vinext/Next-compatible app routes, TypeScript/TSX, ES modules, Node test runner, existing locale and support components, existing OpenAI JSON-schema service.

**Spec:** `docs/superpowers/specs/2026-09-23-help-center-design.md`

## Global Constraints

- Publish only dashboard evidence marked `implemented_customer_accessible` and the verified Support Portal entry.
- Every published article must contain complete EN/TR/AR content and source verification metadata.
- Draft, Needs Review, unverified, and implementation-managed records never appear in public search, related links, sitemap, or chatbot context.
- Preserve `/support`, SMTP delivery, sales/support behavior, screenshot attachments, visualViewport/mobile chat, pricing, SSR, and EN/TR/AR direction handling.
- Do not modify `samche-api-service`, Render, DNS, or Hostinger environment variables.
- Never fabricate dashboard routes, controls, screenshots, tenant state, tickets, or article URLs.

## Review Focus

- A Turkish or Arabic query must rank the same verified article without English fallback; test in the registry and route UI.
- A query naming an unpublished or implementation-managed capability must return a clear gap state and no operational article; test publication filtering and chatbot context.
- A provider response containing an unknown `articleRefs` slug must be sanitized without changing support or screenshot behavior; test service validation.
- A screenshot follow-up must retain its image context while adding article retrieval; test the existing vision regression with article context.
- A stale dashboard path must be identifiable through `sourceFiles`, `sourceRoutes`, and `reviewTriggers`; test the audit inventory shape.

---

### Task 1: Registry, audit inventory, and multilingual article corpus

**Files:**
- Create: `lib/help-center/article-types.mjs`
- Create: `lib/help-center/articles.mjs`
- Create: `lib/help-center/index.mjs`
- Create: `docs/help-center-verification-inventory.md`
- Test: `tests/help-center-registry.test.mjs`

**Interfaces:**
- `getPublishedArticles(locale): LocalizedArticle[]`
- `getArticleBySlug(slug, locale): LocalizedArticle | null`
- `getCategoryBySlug(categorySlug, locale): LocalizedCategory | null`
- `searchHelpArticles(query, locale, options?): SearchResult[]`
- `getHelpArticleSources(query, locale, limit?): HelpArticleSource[]`
- `getHelpCoverageInventory(): CoverageInventory`

- [ ] **Step 1: Write failing registry tests.** Assert 16 verified customer-accessible map entries are covered, unpublished gap records exist for Contacts/Integrations/AI Visual/AI Voice, every published record has `en`, `tr`, and `ar`, all article links are stable, and source references point to dashboard files/routes.
- [ ] **Step 2: Run `node --test tests/help-center-registry.test.mjs` and verify the missing registry functions fail.**
- [ ] **Step 3: Implement typed records.** Add stable slugs and complete EN/TR/AR content for overview/analytics, assistants, channels, Web Chat Experience, WhatsApp AI, AI Guide, Knowledge Base, Knowledge Intelligence, approvals, conversations, human handoff, Leads, Pipeline, Team, Settings/account, and Support Portal. Add multiple getting-started/configuration/troubleshooting records where the module needs them, with exact navigation labels from `dashboardSupportMap` and no invented controls. Add unpublished gap records with `status`, reason, and support boundary.
- [ ] **Step 4: Implement publication filtering, locale fallback rejection, source metadata, search token normalization, aliases for Turkish/Arabic terms and known errors, and deterministic ranking (title exact match > error/keyword > summary > body).** Do not silently substitute English for missing required translations.
- [ ] **Step 5: Write the verification inventory** listing audited modules, published article slugs per module, tested scenarios, implementation-managed gaps, and review triggers.
- [ ] **Step 6: Run the registry tests and verify all pass.**

### Task 2: Help Center routes and reading experience

**Files:**
- Create: `app/help/page.tsx`
- Create: `app/help/category/[category]/page.tsx`
- Create: `app/help/article/[slug]/page.tsx`
- Create: `app/components/help-center.tsx`
- Modify: `app/globals.css`
- Test: `tests/help-center-routes.test.mjs`

**Interfaces:**
- `HelpCenterHome({ locale })`
- `HelpCategoryPage({ categorySlug, locale })`
- `HelpArticlePage({ slug, locale })`

- [ ] **Step 1: Add route contract tests** for home, category, article, missing slug, breadcrumbs, localized headings, related links, contents headings, and absence of unpublished articles.
- [ ] **Step 2: Run the route tests and verify they fail before routes/components exist.**
- [ ] **Step 3: Build the responsive Help Center UI.** Home includes prominent search, product/category cards, popular articles, Getting Started, Troubleshooting, recent guides, and Contact Support. Category pages show article cards. Article pages render H1/H2/H3, numbered steps, info/warning boxes, prerequisites, plan/permission boundaries, expected result, common problems, related links, last verified date, and an honest local helpful/not-helpful interaction.
- [ ] **Step 4: Add mobile/desktop/RTL styles** using the existing premium black/red/gold system with no x-overflow and direction-aware article layout.
- [ ] **Step 5: Run route tests and verify published links resolve.**

### Task 3: Shared search and `/support` integration

**Files:**
- Modify: `app/components/support-portal.tsx`
- Modify: `app/support/page.tsx`
- Modify: `app/components/site-header-navigation.tsx` if Help Center navigation is needed
- Modify: `app/sitemap.ts`
- Test: `tests/help-center-support-integration.test.mjs`

**Interfaces:**
- Support search calls `searchHelpArticles(query, locale)` and links to `/help/article/[slug]`.
- Sitemap consumes `getPublishedArticles('en')` and emits `/help`, category routes, and published article URLs only.

- [ ] **Step 1: Add failing tests** for shared support search results, no-result state, localized result text, article links, preserved support form fields/SMTP endpoint, sitemap inclusion, and unpublished exclusion.
- [ ] **Step 2: Run the integration tests and verify current inline cards fail the shared-source assertions.**
- [ ] **Step 3: Replace the inline `verifiedKnowledgeItems` filter** with the registry search while retaining the existing request form, attachment validation, and `/api/support` submission.
- [ ] **Step 4: Add `/help` navigation and sitemap entries** with canonical URLs and localized metadata.
- [ ] **Step 5: Run integration tests and verify support delivery tests remain green.**

### Task 4: Grounded chatbot article retrieval and links

**Files:**
- Modify: `server/sales-chat-service.mjs`
- Modify: `lib/samche-sales-chat-client.mjs` only if response parsing needs the new field
- Modify: `app/components/samche-chat-widget.tsx`
- Test: `tests/help-center-chat-retrieval.test.mjs`
- Extend: `tests/vision-support-regression.test.mjs`

**Interfaces:**
- Server context includes `helpArticles: HelpArticleSource[]`.
- Response schema includes `articleRefs: string[]`.
- Final response returns only published known slugs; client renders each as a localized `/help/article/...` link.

- [ ] **Step 1: Add failing tests** for WhatsApp/Web Chat/knowledge queries retrieving the correct article, article content being present in provider context, unknown refs being removed, no article for insufficient evidence, and screenshot follow-up preserving `imageContext` plus article refs.
- [ ] **Step 2: Run the focused tests and verify the current provider schema has no article context/reference support.**
- [ ] **Step 3: Import the pure registry search into the service, add bounded source excerpts and URLs to context, extend the strict JSON schema with `articleRefs`, and sanitize refs against published slugs.** Keep commercial validators, dashboard-map grounding, provider fallback, and support state behavior unchanged.
- [ ] **Step 4: Add prompt rules requiring article references only when the retrieved source supports the answer, exact dashboard paths only from map/article evidence, and explicit insufficiency when evidence is absent.**
- [ ] **Step 5: Render article links in assistant messages and preserve mobile attachment/vision behavior.**
- [ ] **Step 6: Run focused chatbot and vision tests, then the full existing chat suite.**

### Task 5: Documentation workflow, scenario coverage, and final validation

**Files:**
- Modify: `docs/help-center-verification-inventory.md`
- Create: `tests/help-center-scenarios.test.mjs`
- Modify: `tests/production-http-smoke.test.mjs` if route coverage belongs there

- [ ] **Step 1: Add scenario tests** for every published module: retrieval, expected navigation, expected result, insufficient evidence behavior, and correct article URL. Include English, Turkish, Arabic, WhatsApp failure, Web Chat installation, assistant configuration, incorrect answers/outdated knowledge, conversation/handoff, CRM Leads/Pipeline, permissions/login, AI Visual and AI Voice gap responses.
- [ ] **Step 2: Run scenario tests and verify all published scenarios pass without fabricated paths.**
- [ ] **Step 3: Update the inventory** with exact article count, module coverage, scenario count, gaps, and review triggers.
- [ ] **Step 4: Run full tests, typecheck, lint, build, production HTTP smoke, and secret audit.**
- [ ] **Step 5: Review `git diff --check`, stage only scoped Help Center files, commit, push `main`, and verify the pushed SHA.**

## Final acceptance evidence

The final report must include published and verified article counts, categories, all 16 verified-entry coverage, the 3 implementation-managed gaps and 1 unverified gap, EN/TR/AR search, chatbot retrieval and screenshot scenario results, route/SEO/mobile status, full test count, typecheck/lint/build/production smoke/secret audit, commit SHA, push status, and any exact remaining blocker. Do not call the Help Center production-ready if any published article lacks a complete verified translation or if chatbot retrieval tests fail.
