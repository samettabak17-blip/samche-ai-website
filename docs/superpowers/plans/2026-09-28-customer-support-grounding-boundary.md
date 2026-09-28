# Customer Support Grounding Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep verified SamChe knowledge as the chatbot's internal grounding source while guaranteeing natural, latest-message-language customer answers that preserve the relevant conversation subject and never expose internal metadata or developer routes.

**Architecture:** Add an explicit customer-answer boundary around support grounding. Build retrieval queries from the current message plus recent relevant user context, pass the model a customer-safe projection of internal knowledge, and reject any generated support reply that leaks internal terminology or routes so the localized deterministic recovery can answer safely. Keep canonical article slugs internal and render only localized public article cards.

**Tech Stack:** Node.js ESM, Next.js/React, Node test runner, TypeScript, ESLint

**Spec:** `C:\Users\smttb\.codex\attachments\a4107a7f-557f-4a6c-86d1-879d15d30410\Yapıştırılan metin.txt`

## Global Constraints

- The latest user message determines the answer language: Turkish, English, or Arabic.
- Internal registry terms, classifications, source metadata, entitlement keys, developer routes, and placeholders such as `tenantId` must never appear in customer-visible replies.
- Retrieval remains grounded in published SamChe knowledge; unsupported features must not be invented.
- Ambiguous follow-ups inherit the immediately relevant user subject.
- Article recommendations must use canonical public URLs and localized human-readable titles.
- Do not modify unrelated Dashboard behavior.

## Review Focus

- A short follow-up after a named but unsupported channel must keep that channel subject without pretending the integration exists.
- A provider reply in the correct language that contains internal metadata must be rejected, not displayed.
- Common product words such as “Dashboard” must not override a more specific recent conversation subject.
- Localized article retrieval must not attach a WhatsApp article to an Instagram question merely because both mention messages.
- A neutral latest message must retain the established conversation language, while an explicit latest message in another language must switch.

---

### Task 1: Lock the observed multi-turn behavior with failing tests

**Files:**
- Modify: `tests/chatbot-response-resilience.test.mjs`
- Modify: `tests/help-center-chat-retrieval.test.mjs`
- Modify: `tests/website-sales-chat-service.test.mjs`

**Interfaces:**
- Consumes: `buildGroundedSupportRecovery`, `resolveConversationLanguage`, `createSalesChatService`
- Produces: regression coverage for Turkish, English, and Arabic two-turn Instagram connection cases, contextual retrieval, and provider leakage rejection

- [ ] **Step 1: Write the failing fallback tests** for the exact Turkish conversation and equivalent English and Arabic conversations. Assert language, Instagram context, a request for the exact error or screenshot, no unrelated article reference, and absence of all forbidden internal terms and `/app/` routes.
- [ ] **Step 2: Run the focused fallback test file** with `node --test tests/chatbot-response-resilience.test.mjs`; expect the new cases to fail on the existing internal headings/routes and stale Dashboard selection.
- [ ] **Step 3: Write the failing service tests** proving the retrieval query contains the prior user subject and that a provider reply containing internal metadata is not returned to the customer.
- [ ] **Step 4: Run the focused service test files** with `node --test tests/help-center-chat-retrieval.test.mjs tests/website-sales-chat-service.test.mjs`; expect failures because retrieval currently uses only `userMessage` and support output has no leakage gate.

### Task 2: Add the customer-safe grounding and response boundary

**Files:**
- Create: `lib/customer-support-grounding.mjs`
- Modify: `lib/help-center/index.mjs`
- Modify: `lib/samche-sales-chat-client.mjs`

**Interfaces:**
- Produces: `buildSupportRetrievalQuery({ userMessage, conversationHistory }) -> string`, `toCustomerGroundingPayload({ dashboardEntries, helpArticles }) -> object`, `containsInternalSupportLeak(reply) -> boolean`, and localized customer-safe recovery behavior
- Consumes: published localized Help Center records and the internal dashboard support map

- [ ] **Step 1: Implement the minimal contextual query helper** using the latest message and recent user messages, ordered so the immediate subject remains prominent.
- [ ] **Step 2: Implement the customer-safe payload projection** that omits internal paths, source files, verification dates/statuses, ownership/dependency/classification fields, and other diagnostic metadata while retaining customer-visible labels and supported actions.
- [ ] **Step 3: Implement the output leakage predicate** as a final invariant for internal terminology, placeholders, raw developer routes, and classification language. It must cause regeneration/fallback rather than word-by-word rewriting.
- [ ] **Step 4: Refactor deterministic recovery** to produce natural localized support prose, customer-visible navigation labels only, and an exact-error/screenshot question when knowledge is insufficient. Preserve relevant published article refs only.
- [ ] **Step 5: Run `node --test tests/chatbot-response-resilience.test.mjs`** and expect all fallback regressions to pass.

### Task 3: Enforce the boundary in the server generation contract

**Files:**
- Modify: `server/sales-chat-service.mjs`
- Modify: `tests/help-center-chat-retrieval.test.mjs`
- Modify: `tests/website-sales-chat-service.test.mjs`

**Interfaces:**
- Consumes: `buildSupportRetrievalQuery`, `toCustomerGroundingPayload`, `containsInternalSupportLeak`
- Produces: customer-safe provider context and support reply enforcement

- [ ] **Step 1: Change support retrieval** to use the contextual query for ambiguous follow-ups while keeping latest-message language for localized sources.
- [ ] **Step 2: Replace the raw dashboard/article objects in model context** with the customer-safe grounding projection and update the system contract to explicitly separate internal grounding from customer text.
- [ ] **Step 3: Reject leaking provider replies** in `enforceSupportResponse` and use the localized grounded recovery instead; keep canonical article refs filtered to published articles.
- [ ] **Step 4: Run `node --test tests/help-center-chat-retrieval.test.mjs tests/website-sales-chat-service.test.mjs`** and expect the contextual retrieval and leakage tests to pass.

### Task 4: Verify integration, production build, and live behavior

**Files:**
- Modify only if a verification failure identifies an in-scope defect.

**Interfaces:**
- Consumes: completed support boundary changes
- Produces: fresh verification evidence and deployment/live-test status

- [ ] **Step 1: Run relevant tests** with `node --test tests/chatbot-response-resilience.test.mjs tests/help-center-chat-retrieval.test.mjs tests/website-sales-chat-service.test.mjs`.
- [ ] **Step 2: Run the full suite** with `npm test`.
- [ ] **Step 3: Run typecheck** with `npm run typecheck`.
- [ ] **Step 4: Run lint** with `npm run lint`.
- [ ] **Step 5: Run the production build** with `npm run build`.
- [ ] **Step 6: Inspect deployment configuration and deploy only through the repository's existing authorized workflow; record the exact deployment result or blocker.**
- [ ] **Step 7: Exercise the exact two-turn Turkish conversation against the deployed public chatbot, then equivalent English and Arabic cases; record the visible answers and leakage assertions.**
- [ ] **Step 8: Review `git diff`, commit the scoped files with a `fix:` message, and report root cause, files, every verification result, deployment/live status, and commit hash.**
