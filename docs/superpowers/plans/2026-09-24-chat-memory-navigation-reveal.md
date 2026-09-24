# Persistent Chat Memory, Navigation, and Reveal Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Preserve the complete safe SamChe chat context across navigation and refresh, make opening non-blocking, improve internal navigation where the runtime supports it, and slightly slow the existing adaptive reveal without changing product behavior.

**Architecture:** Extend the existing versioned `lib/samche-chat-persistence.mjs` contract with bounded message metadata, locale, context timestamp, and safe derived image/article context. Keep the widget mounted and move restoration into a non-blocking microtask while avoiding focus, scroll, or viewport work until the panel is actually open. Keep the existing native-link fallback because Vinext’s current Link runtime is known to fail in production, and add regression coverage for the contract rather than replacing SSR with a client shell.

**Tech Stack:** React/TSX, Vinext/Next-compatible routing, browser localStorage, Node test runner, existing markdown and sales-state helpers.

**Spec:** User request: persistent chat memory + instant chat open + fast site navigation + refined AI reveal.

## Global Constraints

- Do not modify pricing, plan entitlements, SMTP, provider routing, infrastructure, Render, DNS, Hostinger variables, or `samche-api-service`.
- Never persist secrets, provider diagnostics, raw OpenAI payloads, or raw image/base64 attachment data.
- Preserve SSR document responses, article URLs, sitemap/canonical behavior, EN/TR/AR, visualViewport, safe-area, attachment, and reduced-motion behavior.
- Keep the existing safe sales/support validation and tenant-access boundary unchanged.
- Leave `docs/superpowers/plans/2026-09-18-mobile-responsive-audit.md` untouched.

## Review Focus

- A stored v1 session must migrate or fail safely without losing a valid new session: covered by persistence migration tests.
- A refresh must retain support/sales state, locale, timestamps, article references, and derived image context but never the raw image: covered by persistence round-trip tests.
- Opening must not wait for storage parsing, focus, smooth scrolling, or visualViewport measurement: covered by widget source/behavior contract tests.
- Internal navigation must not break SSR or article links if client routing is unavailable: covered by internal-link contract and production smoke tests.
- Reveal tuning must keep first content fast, long responses bounded, markdown intact, and reduced motion immediate: covered by reveal timing and existing markdown tests.

### Task 1: Extend Safe Chat Persistence

**Files:**
- Modify: `lib/samche-chat-persistence.mjs`
- Test: `tests/samche-chat-persistence.test.mjs`

**Interfaces:**
- `saveChatSession(storage, session)` accepts optional `lastActiveAt`, `context`, `locale`, and message `articleRefs`/`imageContext`.
- `loadChatSession(storage)` returns the validated versioned session or `null`.
- `clearChatSession(storage)` removes all chat session keys.

- [ ] Write failing tests for version 2 round-trip, all three locales, context fields, article refs, timestamp, image-derived context without `data`/`preview`, invalid/expired data, and new-chat clearing.
- [ ] Run `node --test tests/samche-chat-persistence.test.mjs` and confirm the new assertions fail against version 1.
- [ ] Add bounded schema sanitization and a version 2 migration path; retain only safe derived context and cap lengths/counts.
- [ ] Run the focused persistence tests, then the existing persistence tests, and confirm green.

### Task 2: Make Widget Restoration and Opening Non-Blocking

**Files:**
- Modify: `app/components/samche-chat-widget.tsx`
- Modify: `app/globals.css` only if the measured open contract needs a reduced-motion or visibility adjustment.
- Test: `tests/chat-panel-responsiveness.test.mjs`

**Interfaces:**
- The panel stays mounted and changes `open` synchronously from the launcher event.
- Persistence hydration happens independently of the opening state and never gates composer controls.

- [ ] Add failing assertions that restoration is not in the click path, opening does not focus or smooth-scroll before the next frame, and the panel retains reduced-motion behavior.
- [ ] Run the focused panel test and confirm the new assertions fail.
- [ ] Move focus/scroll/visualViewport work behind an open-state effect scheduled after paint, keep lightweight persistence restoration in a microtask, and preserve current keyboard/mobile behavior.
- [ ] Add a localized New Chat label/action in the existing menu and ensure it clears persisted state plus derived context while keeping the fresh greeting.
- [ ] Run focused panel and persistence tests.

### Task 3: Navigation Contract and Safe Prefetch

**Files:**
- Modify: `app/components/internal-link.tsx` only if runtime capability detection supports it without breaking SSR.
- Modify: `tests/site-contract.test.mjs` or create `tests/internal-navigation.test.mjs`.
- Test: `tests/production-http-smoke.test.mjs` if route behavior requires an additional assertion.

**Interfaces:**
- Internal links preserve normal anchor semantics, target/download behavior, SEO URLs, and same-origin fallback.

- [ ] Add a failing contract test for prioritized same-origin navigation and preserved external/new-tab behavior.
- [ ] Verify the current Vinext runtime behavior before changing it; if client navigation is not safely available, retain native anchors and document the reason in the implementation rather than risking SSR.
- [ ] If supported, add only capability-guarded same-origin prefetch/navigation; otherwise keep the proven native path and add `rel`/prefetch-safe hints only where they do not alter behavior.
- [ ] Run route, Help Center, and production document smoke tests.

### Task 4: Refine Adaptive Reveal

**Files:**
- Modify: `lib/chat-reveal.mjs`
- Modify: `app/components/samche-chat-widget.tsx` only if reveal styling needs a single stable wrapper.
- Test: `tests/chat-reveal.test.mjs`

**Interfaces:**
- `getRevealProfile(text)` returns adaptive `chunkSize`, `firstChunkDelayMs`, and bounded `durationMs`.
- `getRevealedText(text, elapsedMs, options)` preserves markdown source text and returns the full text for reduced motion.

- [ ] Add failing timing tests for the revised short, medium, long, first-chunk, and reduced-motion targets.
- [ ] Run the focused reveal tests and confirm failure against the current faster profile.
- [ ] Increase short/medium/long durations modestly, keep word-group chunks and the long-response cap at 3.5 seconds, and avoid per-word DOM animation or fake network delay.
- [ ] Run reveal, markdown, link/list, and widget regression tests.

### Task 5: Full Verification and Delivery

**Files:**
- No additional production files.

- [ ] Run full tests, typecheck, lint, build, production HTTP smoke, and secret audit.
- [ ] Measure available production/browser timings without claiming physical-device verification.
- [ ] Review `git diff --check` and stage only scoped files.
- [ ] Commit the implementation and push normally to `origin/main`; keep the pre-existing audit plan untracked.
