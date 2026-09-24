# SamChe AI Support Experience Release Design

## Intent

Deliver a production-ready public support experience that exposes trustworthy Help Center inventory, answers every valid SamChe product question in the language of the latest user message, remains grounded in verified Dashboard knowledge, and feels immediate across navigation, refresh, chat opening, and answer reveal.

## Scope

This release changes only the public website repository. It does not change pricing, plan entitlements, SMTP, DNS, Render, Hostinger environment variables, infrastructure, or `samche-api-service`.

The existing canonical Help Center registry, Dashboard support map, versioned chat persistence, mounted chat panel, internal-link prefetch, and adaptive word-group reveal remain the architectural foundations. The release closes verified gaps rather than replacing those systems.

## Canonical Help Center inventory

`lib/help-center/index.mjs` remains the single publication boundary. Public articles are the union of the base and troubleshooting registries after filtering for `verification.status === 'Published'`. Draft, Needs Review, Retired, unverified, roadmap-only, and unpublished entries never enter the public collection.

One derived statistics function will return:

- total published articles;
- total published troubleshooting articles;
- an article count for every published category.

The Help Center homepage will show total and troubleshooting counts without visual clutter. Category cards and category pages will show their registry-derived totals. Tests will compare every count against the filtered registry rather than hardcoded production values.

## Conversation language

Static interface language and conversational language are independent:

- `siteLocale` controls navigation, buttons, headings, and other static interface copy;
- `conversationLanguage` controls every chatbot response and processing indicator.

Every new user message is detected independently. A confidently detected Turkish, English, or Arabic message replaces the stored conversation language immediately. The latest message wins over the site locale and over older conversation state. When the latest message is linguistically ambiguous, the persisted conversation language is used.

The versioned persistence contract stores both fields and migrates older sessions that contain only `locale`. Language locking applies to normal provider output, provider failure, invalid JSON, contract validation failure, safe salvage, network/HTTP/timeout failure, article-link recovery, insufficient-article recovery, screenshot follow-up, support recovery, sales recovery, empty response, and refresh restoration.

## Grounded recovery

Generic retry-only messages are not valid support responses. Recovery is assembled from the latest message plus bounded persisted context:

- detected module and support issue;
- known plan and entitlement boundary;
- canonical published Help Center articles and their verified steps;
- `dashboardSupportMap` routes, labels, controls, permissions, dependencies, limitations, and implementation-managed boundaries;
- safe screenshot-derived summary and module;
- the most recent canonical article references.

For a verified module, recovery gives concrete verified steps and retains canonical article references. For an implementation-managed feature, recovery states that boundary and identifies the evidence Support needs. For an unverified control or tenant-specific state, recovery says it cannot verify the control or inspect the tenant and does not fabricate either. If no verified answer exists, it states exactly what is unknown and asks at most one evidence-focused question.

Broken-link recovery reuses the most recent published article reference, regenerates its localized canonical URL through structured article cards, and continues its relevant troubleshooting steps in chat. Insufficient-article recovery retrieves the referenced article and related verified articles, then provides a deeper sequence instead of repeating the link.

Screenshot follow-up separates visible evidence, verified documentation, and remaining investigation. Raw screenshot/base64 content is transient and never persisted.

## Article presentation and search

Structured `articleRefs` are the only visible article-link presentation in chat. Provider-authored Help Center markdown URLs and placeholder/external URLs are stripped or rendered as inert text, preventing duplicate links. Each published article appears at most once in the localized recommendation block.

Help Center and support search continue to use the canonical registry. Search considers localized title, summary, body, keywords, synonyms, known error wording, and product terminology. Results link directly to localized canonical article routes.

## Dashboard expertise and weekly sync

`lib/support-dashboard-map.mjs`, `docs/samche-dashboard-support-knowledge.md`, the canonical Help Center registry, and verified entitlement data remain the grounding sources. Customer-accessible modules expose verified navigation labels, routes, controls, permissions, plan applicability, expected behavior, symptoms, troubleshooting steps, boundaries, and relevant articles. Implementation-managed, admin-only, roadmap, removed, and unverified capabilities remain explicitly classified and cannot be promoted automatically.

The weekly audit stays report-first and identifies affected articles, chatbot retrieval, search terms, translations, tests, and article counts for verified changes.

## Performance and persistence

The mounted chat panel toggles visible state synchronously. Storage restoration, markdown work, viewport measurement, scrolling, and focus do not gate the launcher click or composer. The opening transition uses only short opacity, translate, and scale changes; reduced motion opens instantly; mobile input is not automatically focused.

Internal and Help Center links retain anchor semantics, same-tab navigation, locale continuity, prefetch on user intent, SSR documents, SEO metadata, canonical URLs, and sitemap coverage. The current runtime-safe native navigation remains in place unless browser verification proves a safe client transition path.

Persistence retains messages, sales/support mode, known plan, current issue, conversation language, article references, safe screenshot summary/module, qualification state, and open/closed state across route navigation, refresh, and close/reopen. Raw attachments are excluded.

Answer reveal remains word-group based with the first visible chunk around 80–150 ms, short answers around 250–500 ms, medium answers around 0.8–1.5 seconds, long answers no more than 3 seconds, and immediate rendering for reduced motion. The typing indicator disappears when reveal begins.

## Verification and release

Regression tests cover inventory counts and status exclusions; strict TR/EN/AR language across every response path; broken and insufficient article recovery; screenshot continuity; verified/unverified/implementation-managed Dashboard behavior; fake controls; plan boundaries; multilingual symptom search; canonical single-instance article links; persistence migration; mounted opening; navigation; and reveal timing.

Release validation requires full tests, typecheck, lint, build, production HTTP smoke, secret audit, and browser acceptance of the priority routes plus chat opening, persistence, locale separation, article navigation, and reduced-motion behavior. Only scoped files are committed and pushed normally without force.
