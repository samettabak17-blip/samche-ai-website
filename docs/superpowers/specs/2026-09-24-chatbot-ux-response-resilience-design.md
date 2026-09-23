# SamChe Chatbot UX and Response Resilience Design

## Goal

Improve assistant message delivery, localized processing copy, safe markdown/link rendering, and support follow-up resilience without changing pricing, entitlements, infrastructure, or unrelated site content.

## Scope and constraints

- Preserve OpenAI text/vision architecture, Help Center registry, dashboard grounding, SSR, mobile keyboard behavior, SMTP, support portal, demo email delivery, pricing, and plan entitlements.
- Only published Help Center slugs may become article links; arbitrary model URLs are never rendered.
- Preserve the existing support context, screenshot attachment handling, and grounded dashboard paths.
- EN, TR, and AR require localized processing and fallback copy; Arabic remains RTL-safe.

## Design

1. `lib/restricted-markdown.mjs` remains the safe parser boundary and gains explicit link tokens only for canonical article references supplied by the application. Plain URLs and unknown URLs remain text. The widget renders tokens as React elements, including `strong`, `code`, `a`, paragraphs, lists, and line breaks.
2. `lib/samche-sales-chat-client.mjs` gains pure localized processing/fallback helpers and uses a context-aware fallback reply when provider, network, or contract validation fails. The fallback acknowledges the issue, gives concrete next steps based on the current support topic and prior article/screenshot context, and never claims unsupported transfer or ticket creation.
3. `app/components/samche-chat-widget.tsx` selects processing copy from the latest user message plus conversation state, shows a natural typing bubble while waiting, and reveals the returned assistant message progressively with a cancellable timer. The committed message remains the source of truth so persistence is not corrupted by animation.
4. `app/globals.css` provides stable message entry/reveal styling, readable list/paragraph/link treatment, and reduced-motion behavior without horizontal sliding or layout jumps.
5. Tests cover parser safety and formatting, localized copy, article-insufficient follow-up, provider fallback continuity, screenshot context, and all locales.

## Acceptance criteria

- No ordinary user turn ends with only a dead-end “try again” error.
- Article refs are clickable canonical `/help/article/<published-slug>` links with visible link styling.
- Bold, paragraphs, bullets, numbered steps, and line breaks render safely and readably.
- Processing copy is contextual and localized in EN/TR/AR.
- Support follow-ups retain context and remain grounded in verified dashboard/help content.
