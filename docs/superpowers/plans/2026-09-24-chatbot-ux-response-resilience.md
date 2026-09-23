# SamChe Chatbot UX and Response Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make SamChe chatbot replies feel human, render safely, and continue helping through provider failures and support follow-ups.

**Architecture:** Keep the current widget/client/server architecture. Add pure helper boundaries for localized status/fallback copy and canonical markdown links, make the client append a grounded fallback on failure, and let the widget animate only the presentation layer while persisting complete messages.

**Tech Stack:** Next.js/React, TypeScript, ES modules, Node test runner, existing restricted markdown and Help Center registry.

**Spec:** `docs/superpowers/specs/2026-09-24-chatbot-ux-response-resilience-design.md`

## Global Constraints

- Preserve pricing, plan entitlements, SMTP, support portal, demo email delivery, OpenAI text/vision architecture, Help Center registry, dashboard grounding, SSR, and mobile keyboard fixes.
- Only published Help Center slugs may become article links.
- No fabricated settings, tickets, live transfers, or unsupported controls.
- EN/TR/AR copy must remain natural and RTL-safe.

## Review Focus

- “doğrulanmış makale yetersiz” after a suggested article: client fallback keeps the topic and gives direct steps.
- Provider/validator/network failure during support: a useful localized assistant message is appended instead of an error-only row.
- Article refs contain an unpublished or malformed slug: no unsafe/arbitrary anchor is rendered.
- Arabic numbered/bulleted content: direction and spacing remain readable.
- Long assistant replies with reduced motion: reveal is stable, cancellable, and does not slide or jump.

### Task 1: Safe message formatting and localization helpers

**Files:**
- Modify: `lib/restricted-markdown.mjs`
- Modify: `lib/samche-localization.mjs`
- Test: `tests/restricted-markdown.test.mjs`
- Test: `tests/samche-localization.test.mjs`

**Interfaces:**
- `parseRestrictedMarkdown(source, options)` produces safe text/bold/code/break/link tokens; link targets are supplied by the caller and are never inferred from arbitrary URLs.
- `getSalesProcessingStatus(input, state)` returns localized contextual copy for EN/TR/AR.

- [ ] Write failing tests for canonical article-link tokens, list/paragraph preservation, no arbitrary URL token, and localized WhatsApp/AI Guide/support processing copy.
- [ ] Run the focused tests and confirm they fail for the missing behavior.
- [ ] Implement the smallest parser/localization changes while preserving existing token shapes for current callers.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Context-aware fallback and support follow-up continuity

**Files:**
- Modify: `lib/samche-sales-chat-client.mjs`
- Modify: `lib/samche-sales-assistant.mjs` only where the existing pure intent/context helpers are insufficient
- Test: `tests/sales-chat-bounded-fix.test.mjs`

**Interfaces:**
- `buildSalesFallbackReply({ locale, input, messages, state, articleRefs })` returns a localized grounded reply string.
- `resolveSalesChatTurn(...)` always appends an assistant reply on provider failure and sets `usedFallback: true`, while preserving prior state and actions.

- [ ] Write failing tests for provider failure, article-insufficient Turkish follow-up, where-to-click follow-up, and screenshot-context fallback.
- [ ] Run those tests and confirm the old error-only behavior fails them.
- [ ] Implement context detection and localized fallback replies using only verified support wording and existing dashboard/help article evidence.
- [ ] Run the focused client tests and confirm they pass.

### Task 3: Widget reveal, status indicator, and verified link rendering

**Files:**
- Modify: `app/components/samche-chat-widget.tsx`
- Modify: `app/globals.css`
- Test: `tests/chat-widget-clipboard-contract.test.mjs` or a new `tests/chat-widget-rendering-contract.test.mjs` for source-level contracts

**Interfaces:**
- The widget keeps full assistant text in `messages`; `revealedAssistantIds`/timer state only controls visible presentation.
- Article links are rendered from `message.articleRefs` after published-slug filtering and use `/help/article/<slug>`.

- [ ] Write failing source-contract tests for localized status selection, progressive reveal state, canonical links, and no error-only rendering.
- [ ] Run them and confirm failure.
- [ ] Implement a stable typing bubble, cancellable progressive reveal, safe token-to-element renderer, and CSS transitions that avoid slide/jump behavior.
- [ ] Run focused UI contract tests and confirm pass.

### Task 4: Full verification and delivery

**Files:**
- Modify only the files above plus tests and design/plan documents.

- [ ] Run the full test suite.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `npm run test:production-http` if the production server can be started in the repository environment.
- [ ] Review `git diff` and confirm no pricing, entitlements, SMTP, or unrelated content changes.
- [ ] Commit the scoped changes and push to `origin/main`.
