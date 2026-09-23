# SamChe AI Help Center Design

## Goal

Create a public, searchable, multilingual Help Center at `/help` backed by one verified article registry shared with `/support` search and the OpenAI support chatbot.

## Evidence boundary

The dashboard audit on 2026-09-23 covered `C:\Users\smttb\Documents\samche-api-service\dashboard` and the router, sidebar, feature components, and API route guards. The registry may publish only verified customer-accessible controls and procedures from that audit. The public site must not claim tenant-specific state, provider credentials, a customer-facing Integrations route, an AI Visual settings switch, an AI Voice settings route, or a standalone Contacts route.

## Published scope

The registry will cover the 16 map entries marked `implemented_customer_accessible`, including the supported portal and analytics/overview entries. Duplicate conceptual coverage may share an article where the route and evidence are the same. It will also contain clearly marked, unpublished records for the three implementation-managed areas and the one unverified CRM Contacts entry so gaps remain visible to maintainers without entering search results.

Every published article contains complete English, Turkish, and Arabic content, verification references, last-verified date, plan and permission boundaries, prerequisites, exact navigation, steps, expected result, common problems, troubleshooting, and related article slugs. Screenshots are referenced only when existing approved assets are available; otherwise the article states that screenshot collection is pending.

## Architecture

`lib/help-center/` owns typed article data, category data, publication filtering, locale selection, token normalization, typo aliases, and deterministic ranking. Article pages and the support portal consume those pure functions. The chatbot service receives a bounded set of published article excerpts and URLs selected from the current user message; its strict response schema returns only valid article slugs, which the website resolves to canonical localized URLs.

Article IDs and slugs are stable. Draft, Needs Review, and unpublished entries are excluded from search, related links, sitemap, metadata, and chatbot context. Article feedback is an honest local interaction only; no server persistence is claimed.

## Routes and SEO

- `/help` — search, browse categories, popular and recently verified articles.
- `/help/category/[category]` — category index.
- `/help/article/[slug]` — localized article with breadcrumbs, contents, related links, and feedback.
- `/support` — existing support form plus the same Help Center search and links.

Published routes provide localized metadata, canonical URLs, structured headings, and sitemap entries. Unpublished content is never indexed.

## Chatbot contract

The server adds `helpArticles` to provider context as bounded source material and accepts `articleRefs` containing only known published slugs. Validation drops unknown slugs and the final response renders canonical Help Center links. The support prompt requires grounded navigation from the dashboard map or retrieved article, preserves screenshot evidence and multi-turn state, and states when evidence is insufficient.

## Verification workflow

Each article stores `verification.status`, `verifiedOn`, `sourceFiles`, `sourceRoutes`, and `reviewTriggers`. A maintainer can identify affected articles when dashboard route labels, controls, permissions, plans, or source files change. Tests enforce full locale coverage, publication filtering, source references, route validity, and no unsupported navigation.
