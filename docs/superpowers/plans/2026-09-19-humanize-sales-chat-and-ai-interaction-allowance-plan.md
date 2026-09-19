# Humanize Sales Chat and Explain AI Interaction Allowances Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make continuous sales-chat conversations human, language-consistent, field-aware, interruption-safe, and regression-tested; add a complete bilingual AI interaction allowance explanation before pricing add-ons.

**Architecture:** Keep the existing server/provider contract and client persistence boundary. Add deterministic state-aware guardrails around provider output and use shared pricing/FAQ data rendered by the existing PricingTable and PlatformFAQ components. Keep copy and values in shared data/localization modules so Pricing and Platform stay consistent.

**Tech Stack:** Node.js ESM tests, Next/Vinext React/TypeScript, shared `.mjs` site data/localization, CSS, ESLint, TypeScript compiler, Git.

**Spec:** `docs/superpowers/specs/2026-09-19-humanize-sales-chat-and-ai-interaction-allowance-design.md`

## Global Constraints

- Latest user-message language controls the current reply; UI locale and prior-turn language are not authoritative.
- Known fields are merged authoritatively and are never re-asked; explicit negatives, including `aiGuideNeed = false`, remain authoritative.
- The assistant answers product and demo interruptions before resuming qualification and asks at most one useful next question.
- Demo scheduling, confirmation, email, provider-failure, and neutral retry protections remain unchanged.
- The exact multi-turn sales sequence is tested as one continuous conversation.
- The allowance explanation appears below the main pricing/plan section and before Platform Add-ons.
- AI interactions are distinguished from model tokens, website visits, human-only inbox activity, and Voice AI usage.
- No rollover guarantee, automatic overage billing, automatic suspension, fair-use policy, or token conversion is invented.
- Pricing and Platform pages use the same shared FAQ source.
- The six explanation cards stack without horizontal overflow in English and Arabic.
- Do not modify `samche-api-service`, Render, Hostinger environment variables, DNS, or deploy Hostinger.
- Preserve the unrelated untracked mobile-audit plan and commit only scoped changes.

## Review Focus

- A continuous conversation that answers channels after industry/country must not re-ask either field and must ask only one new question; cover in Task 1.
- A provider response in the wrong language must be rejected or safely replaced using the latest message language, regardless of UI locale; cover in Task 1.
- An explicit `aiGuideNeed = false` must survive later merges and must not become a pending question; cover in Task 1.
- Product and demo interruptions must be answered before qualification and must never create booking/email claims; cover in Task 1.
- Arabic pricing copy and RTL/mobile layout must expose all six allowance concepts without horizontal overflow; cover in Tasks 2 and 3.

---

### Task 1: Harden human sales-chat state and add the continuous regression

**Files:**
- Modify: `server/sales-chat-service.mjs`
- Modify: `lib/samche-sales-assistant.mjs`
- Modify: `lib/samche-sales-chat-client.mjs` only if the state handoff needs the authoritative merge/pending-field contract
- Test: `tests/sales-chat-bounded-fix.test.mjs`
- Test: `tests/website-sales-chat-service.test.mjs`

**Interfaces:**
- Consumes: existing `createInitialSalesState`, `generateSalesTurn`, `resolveSalesChatTurn`, and `createSalesChatService` contracts.
- Produces: a continuous-turn path where `state.lead` is monotonically merged, explicit boolean negatives persist, `pendingQualificationField` excludes known fields, latest input language controls replies, and interruptions are handled before one optional follow-up question.

- [ ] **Step 1: Write the failing continuous regression test**

Add one test that drives the exact sequence through the real client/server boundary. Use a deterministic provider fixture that returns structured replies and extracted fields for each turn, while asserting the request body sent on every turn. Assert after turn 3 that the reply is English, mentions both website and WhatsApp, does not repeat industry/channels, contains only one question, and differs from the prior qualification wording. Assert turn 4 answers employee-replacement capability before resuming. Assert turns 5–10 persist monthly volume, CRM integration, lead qualification, English/Arabic languages, `aiGuideNeed === false`, and `teamUsers === '3'`; assert those fields are never requested again. Assert turn 11 stores preferred date/time only and contains no booking, confirmation, scheduling, or email promise.

```js
test('continuous human sales sequence preserves fields, language, interruptions, and one-question pacing', async () => {
  // Drive all 11 user messages through resolveSalesChatTurn and the real service boundary.
  // Assert each request's leadState/pending field and each returned reply before moving to the next turn.
});
```

- [ ] **Step 2: Run the focused regression and verify it fails for the missing behavior**

Run: `node --test tests/sales-chat-bounded-fix.test.mjs tests/website-sales-chat-service.test.mjs`

Expected: FAIL because the current provider contract does not enforce the continuous known-field/pending-question invariants and the current pricing/FAQ contracts do not yet match the requested copy.

- [ ] **Step 3: Add deterministic field normalization and merge guardrails**

Implement a small pure helper in `lib/samche-sales-assistant.mjs` or the existing state module boundary that:

1. accepts existing lead state and extracted provider fields;
2. ignores null/empty unknown values for already-known fields;
3. preserves booleans, including `false`;
4. unions array fields without duplicates;
5. returns the merged lead plus a known-field set used to reject re-asking.

Update pending-field handling so a provider-requested field is cleared when the merged lead already has a valid value, including `aiGuideNeed === false`, `teamUsers`, `volume`, `integrations`, `leadQualification`, and `languages`. Keep the existing allowed field contract and action capabilities unchanged.

- [ ] **Step 4: Strengthen server prompt/enforcement around latest language and one-question flow**

Update `SYSTEM_PROMPT`, context construction, and response enforcement in `server/sales-chat-service.mjs` so the latest `userMessage` is the only language authority, prior language/intent is context only, known fields are listed as unavailable for questioning, and the response must contain at most one useful question. Keep interrupt handling first, then append at most one non-duplicate pending question. Preserve the exact neutral provider error response and existing demo safety sanitizer.

- [ ] **Step 5: Run the focused tests and verify they pass**

Run: `node --test tests/sales-chat-bounded-fix.test.mjs tests/website-sales-chat-service.test.mjs`

Expected: PASS with the continuous sequence and all existing safety/provider-failure tests green.

- [ ] **Step 6: Refactor only after green**

Remove duplicated known-field checks, keep the merge helper pure and named by behavior, and rerun the same focused tests.

- [ ] **Step 7: Commit the sales-chat scope**

```powershell
git add server/sales-chat-service.mjs lib/samche-sales-assistant.mjs lib/samche-sales-chat-client.mjs tests/sales-chat-bounded-fix.test.mjs tests/website-sales-chat-service.test.mjs
git commit -m "fix: humanize sales chat qualification flow"
```

### Task 2: Replace allowance data and shared FAQ content with complete bilingual source text

**Files:**
- Modify: `lib/site-data.mjs`
- Modify: `lib/samche-localization.mjs`
- Modify: `app/components/platform-faq.tsx`
- Test: `tests/site-contract.test.mjs`
- Test: `tests/samche-localization.test.mjs`

**Interfaces:**
- Consumes: existing `interactionAllowanceCards`, `addons`, `platformFaqItems`, and `t()`/localization conventions.
- Produces: six shared allowance cards with exact approved values/copy concepts and one shared FAQ item rendered by both Pricing and Platform.

- [ ] **Step 1: Write failing source-contract tests**

Extend `tests/site-contract.test.mjs` to assert that the allowance source contains six cards titled `Monthly Allowance`, `What Counts`, `What Does Not Count`, `Voice AI Usage`, `Higher Usage`, and `Billing Period`; exact plan values; explicit distinctions from OpenAI/Gemini tokens, website visits, setup fees, and human-only inbox activity; separate Voice AI wording; higher-usage recommendation; and no automatic overage/suspension/rollover guarantee. Assert `platformFaqItems` contains the exact allowance question and answer and that both page/component contracts still use `PlatformFAQ`.

Extend `tests/samche-localization.test.mjs` to assert Arabic translations for all six titles and all required concepts, including Voice AI, higher usage, billing period, and FAQ answer.

- [ ] **Step 2: Run the focused contract tests and verify red**

Run: `node --test tests/site-contract.test.mjs tests/samche-localization.test.mjs`

Expected: FAIL on the missing six-card names/copy, incomplete Arabic strings, and missing shared allowance FAQ item.

- [ ] **Step 3: Implement the shared English source data**

Replace the current four allowance cards with six structured cards. Use the supplied allowances exactly: Starter `5,000`, Growth `20,000`, Business `50,000`, Enterprise `100,000+` AI interactions per month. State that qualifying usage is associated with enabled Web Chatbot, WhatsApp AI, and AI Guide conversations without claiming every plan includes every channel. Preserve the existing Voice AI add-on values and add the supplied separate-usage explanation. State billing-period and commercial-agreement conditions without inventing rollover or overage behavior.

Add the required question and answer to the shared FAQ array in `app/components/platform-faq.tsx`; do not add a second page-specific FAQ list.

- [ ] **Step 4: Add complete Arabic localization**

Add translation keys for every new title, subtitle, card body, allowance value phrase, Voice AI note, higher-usage note, billing-period note, and FAQ question/answer using the existing localization lookup pattern. Keep the English source strings as keys and Arabic values as complete, natural sentences.

- [ ] **Step 5: Run the focused contract tests and verify green**

Run: `node --test tests/site-contract.test.mjs tests/samche-localization.test.mjs`

Expected: PASS with exact allowances and no prohibited policy language.

- [ ] **Step 6: Commit the content scope**

```powershell
git add lib/site-data.mjs lib/samche-localization.mjs app/components/platform-faq.tsx tests/site-contract.test.mjs tests/samche-localization.test.mjs
git commit -m "feat: explain monthly AI interaction allowances"
```

### Task 3: Render the six-card explanation before add-ons and make it mobile-safe

**Files:**
- Modify: `app/components/pricing-table.tsx`
- Modify: `app/globals.css`
- Test: `tests/site-contract.test.mjs`

**Interfaces:**
- Consumes: `interactionAllowanceCards`, localization rendering conventions, and existing `PricingTable` layout.
- Produces: allowance explanation directly after the main plan/comparison section and before `.addons`, with readable EN/AR responsive cards.

- [ ] **Step 1: Write failing placement and responsive contract assertions**

Assert in `tests/site-contract.test.mjs` that `PricingTable` renders the allowance section before `<section className="addons"`, renders all six cards from shared data, includes an Arabic/localization path, and CSS defines a desktop grid plus a one-column mobile layout with no fixed/minimum horizontal width on the allowance cards.

- [ ] **Step 2: Run the focused test and verify red**

Run: `node --test tests/site-contract.test.mjs`

Expected: FAIL until the six-card titles, placement, and mobile CSS contracts are present.

- [ ] **Step 3: Implement the render structure**

Update `PricingTable` to render the existing shared allowance cards with a clear subtitle and six stable card elements. Keep the section immediately after the main plan/comparison content and immediately before the add-ons section. Render text through the existing localization mechanism so Arabic mode receives full translated content and remains RTL-compatible.

- [ ] **Step 4: Implement responsive premium styling**

Add scoped `.interaction-explanation` styles using the existing black/red/gold design tokens: two/three-column desktop grid, two-column tablet grid if space allows, and one-column mobile grid. Use `min-width: 0`, wrapping text, logical padding/alignment, and no horizontal scrolling or tiny fixed cards. Verify Arabic direction inherits correctly.

- [ ] **Step 5: Run the focused test and verify green**

Run: `node --test tests/site-contract.test.mjs`

Expected: PASS with placement, shared data, Arabic, and mobile contracts.

- [ ] **Step 6: Commit the UI scope**

```powershell
git add app/components/pricing-table.tsx app/globals.css tests/site-contract.test.mjs
git commit -m "feat: render responsive interaction allowance guide"
```

### Task 4: Full verification, secret audit, and scoped push

**Files:**
- Verify: all changed files and Git diff
- Preserve: unrelated `docs/superpowers/plans/2026-09-18-mobile-responsive-audit.md`

- [ ] **Step 1: Run the complete automated test suite**

Run: `npm test`

Expected: exit code 0 and all tests pass; record the exact count.

- [ ] **Step 2: Run typecheck, lint, and build**

Run: `npx tsc --noEmit`; `npm run lint`; `npm run build`

Expected: each exits 0 with no new warnings/errors.

- [ ] **Step 3: Run production-start smoke validation**

Start the production server with `npm run start`, request `/pricing`, `/platform`, and the sales-chat endpoint using a bounded local smoke check, then stop the process. Confirm the Pricing page contains the allowance heading and the server remains responsive. Do not contact Hostinger or external deployment services.

- [ ] **Step 4: Run a secret audit**

Run: `rg -n --hidden -g '!node_modules' -g '!.next' -g '!dist' -g '!build' "OPENAI_API_KEY|sk-[A-Za-z0-9]{20,}|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|api[_-]?key\s*[:=]" .`

Expected: no newly introduced secrets; report any pre-existing safe example/config matches separately.

- [ ] **Step 5: Review the diff and status**

Run: `git diff --check`; `git status --short`; `git diff HEAD~N --stat` using the actual scoped commit range. Confirm no `samche-api-service`, Render, Hostinger env, DNS, or unrelated mobile-audit plan changes are included.

- [ ] **Step 6: Push main to origin/main without force**

Run: `git push origin main`

Expected: normal push succeeds; no force flag is used.

- [ ] **Step 7: Report evidence**

Provide the requested PASS/FAIL matrix, exact test count, typecheck/lint/build/secret-audit results, changed-file list, commit SHA(s), push result, and `HOSTINGER REDEPLOY: NOT DONE`.
