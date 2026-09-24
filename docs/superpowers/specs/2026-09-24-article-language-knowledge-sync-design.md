# Article Presentation, Conversation Language, and Dashboard Knowledge Sync

## Goal

Remove duplicate Help Center article references, enforce latest-message language continuity across every chatbot fallback, and add a deterministic weekly workflow for detecting verified SamChe Dashboard knowledge changes without publishing speculative documentation.

## Scope and constraints

- Preserve the existing OpenAI chatbot, Vision/screenshot handling, clipboard paste, chat persistence, Help Center search, support delivery, pricing, SSR, and mobile behavior.
- Change only chatbot article presentation, language persistence/fallback behavior, Help Center metadata needed by that flow, and repository knowledge-sync tooling/tests.
- Do not modify Hostinger variables, DNS, Render, or `samche-api-service`.
- Preserve unrelated untracked files.
- No automatic merge or automatic publication of unverified content.

## Design

### 1. One structured article presentation

`articleRefs` remains the only source of Help Center recommendations. The response pipeline will sanitize Help Center markdown links from assistant body text so a provider cannot produce a second visible article-link presentation. The restricted markdown parser will continue to render safe non-article formatting, while article references are rendered by a dedicated recommendation block below the assistant body.

The recommendation block will use localized labels:

- Turkish: `İlgili Yardım Makaleleri`
- English: `Related Help Articles`
- Arabic: a professional Arabic equivalent

Each verified row will use the published Help Center registry for its localized title, optional summary, and canonical URL. Invalid, unpublished, retired, unverified, placeholder, or non-Help-Center references will be discarded before rendering. Internal links will retain native anchor semantics and same-tab navigation while preserving normal browser open-in-new-tab behavior.

### 2. Strict conversation language context

The persisted session contract will distinguish `siteLocale` from `conversationLanguage`. Existing sessions using `locale` will be migrated compatibly. The client will detect the language of every new user message and use it as the highest-priority language for response validation and all fallback paths. The stored conversation language is used only when a new message cannot reasonably be detected.

This priority applies to provider failure, schema/validator failure, network failure, article-link recovery, support fallback, sales fallback, and attachment/screenshot fallback. English is not a default when the latest message is Turkish or Arabic.

### 3. Broken-link recovery

Recovery intent detection will recognize Turkish, English, and Arabic link/article failure phrases. The response will retain the most recent verified article reference, re-emit its canonical localized URL through the structured recommendation block, and continue the relevant troubleshooting steps directly in the conversation. If no verified reference exists, it will still provide localized direct steps without a dead-end link.

### 4. Deterministic weekly knowledge audit

Add a repository-local Node workflow with an explicit evidence input. It will accept a Dashboard source/evidence directory or normalized evidence snapshot, normalize customer-facing routes, labels, controls, permissions, channels, plan dependencies, implementation-managed areas, and roadmap notes, then compare the evidence against `lib/support-dashboard-map.mjs`, the Help Center registry, and `docs/samche-dashboard-support-knowledge.md`.

The audit report will classify each difference as `ADDED`, `CHANGED`, `REMOVED`, `IMPLEMENTATION-MANAGED`, `ADMIN-ONLY`, `ROADMAP`, or `UNVERIFIED`, and will produce impact sections for the support map, chatbot grounding, Help Center articles, search keywords, article links, EN/TR/AR translations, troubleshooting flows, and regression tests.

The default workflow is report-first. It may update only deterministic, verified affected metadata when the evidence explicitly supports the change. `ROADMAP` and `UNVERIFIED` findings are marked `Needs Review`; they cannot update published articles or chatbot grounding automatically. The workflow runs tests after any verified update and emits a scoped change report suitable for review or a PR.

### 5. Shared knowledge source

The chatbot will continue retrieving verified support facts from the structured Dashboard map and Help Center registry at request time. New or changed behavior will be represented in those shared sources rather than embedded as a second giant static prompt. Article verification metadata will include publication/retirement state and last-verified information where the existing registry model supports it.

## Data flow

1. User message enters the chat client.
2. Latest message language is detected and stored as `conversationLanguage`.
3. Provider response is validated and sanitized; article refs are filtered against published registry entries.
4. Help Center markdown links are removed from assistant body presentation.
5. The widget renders the localized body plus one structured article recommendation block.
6. Session persistence stores site locale and conversation language separately.
7. Weekly audit compares explicit Dashboard evidence to shared verified support sources and emits classified impacts.

## Error handling and safety

- Invalid article references never become clickable elements.
- Missing localized article content must not silently substitute an unverified translation; the reference is omitted or marked for review according to registry state.
- Provider, validator, network, and recovery failures use the latest detected language.
- Audit failures stop update/publish steps and preserve a `Needs Review` report.
- No workflow command pushes or merges automatically.

## Verification

Add regression coverage for single article presentation, raw/placeholder URL removal, published structured refs, all three language locks, all fallback paths, refresh persistence, site/conversation locale separation, retired/unverified article exclusion, and audit classification/metadata. Run the full test suite, typecheck, lint, build, the local production HTTP smoke test, and a browser smoke flow for TR/EN/AR article navigation and link recovery.

## Open operational boundary

Public production verification requires deployment by the hosting workflow and is outside this change until a deployed environment is available. The repository workflow must report this boundary rather than claiming public production verification.
