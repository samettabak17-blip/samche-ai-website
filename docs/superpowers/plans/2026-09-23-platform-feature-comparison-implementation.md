# Platform Feature Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the public four-plan comparison and related commercial copy from the approved entitlement matrix, with exact Enterprise visual/voice boundaries and complete EN/TR/AR coverage.

**Architecture:** Keep `lib/site-data.mjs` as the English commercial source of truth. The pricing renderer consumes only shared data, while the localization dictionary provides Turkish and Arabic equivalents and the existing tests verify the rendered/data contracts. Public homepage/platform copy may be corrected, but chat, backend, provider, attachment, and infrastructure paths remain untouched.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node.js test runner, CSS, JavaScript localization dictionaries.

**Spec:** `docs/superpowers/specs/2026-09-22-platform-feature-comparison-design.md`

## Global Constraints

- Preserve plan pricing exactly: Starter AED 1,790/month, AED 2,500 setup, AED 18,258/year; Growth AED 3,990/month, AED 5,000 setup, AED 40,698/year; Business AED 7,990/month, AED 9,500 setup, AED 81,498/year; Enterprise from AED 12,500/month, from AED 20,000 setup, from AED 127,500/year.
- Preserve voice pricing exactly: AI Voice Receptionist from AED 1,990/month plus AED 4,500 setup and 300 inbound minutes; Voice AI Pro from AED 3,990/month plus AED 7,500 setup and 1,000 inbound minutes; outbound calling from AED 3.49/min.
- `lib/site-data.mjs` owns plan cards, inheritance, comparison rows, add-on language, usage explanations, and comparison notes.
- The eight comparison groups and all 47 matrix rows/values must match the approved spec exactly.
- Enterprise has one shared pool of 200 visual generations per billing period across AI Visual Generation and Visual Product Personalization.
- Enterprise includes 300 inbound voice minutes per billing period and two concurrent calls; lower plans use paid add-ons and paid expansion remains available.
- Agentic AI, Skills, Actions, and Workflow Engine stay roadmap/by-scope; Custom Workflows remains a live capability.
- AI interactions, visual generations, and voice minutes are separate usage dimensions; concurrent calls are capacity, not usage.
- Keep all four plan columns visible on mobile without horizontal scrolling, carousels, tabs, or hidden columns.
- New public copy must have explicit Turkish and Arabic translations, with Arabic RTL preserved.
- Do not modify sales/support chat behavior, prompts, routing, provider validation, safe salvage, mobile chatbot implementation, attachments, vision routing, backend support logic, Hostinger, Render, DNS, or `samche-api-service`.
- Leave `docs/superpowers/plans/2026-09-18-mobile-responsive-audit.md` untouched.

## Review Focus

- Duplicate row labels in AI Visual/AI Voice and Usage & Language must retain both authoritative values instead of being collapsed by label-only test helpers.
- Mobile compact labels must preserve the semantic meaning of `Included / Custom scale`, `Upgrade / Add-on`, `200 / month`, `300 / month`, and concurrent-call capacity.
- Enterprise add-on copy must not imply the AED 1,990 base fee applies to the included Enterprise allowance.
- Roadmap-by-scope wording must not make future Agentic AI, Skills, Actions, or Workflow Engine appear live or bundled.
- Localization coverage must include dynamic shared-data values and FAQ/public-copy strings without English fallback in Turkish or Arabic.

---

### Task 1: Authoritative shared commercial data

**Files:**
- Modify: `tests/site-contract.test.mjs`
- Modify: `lib/site-data.mjs`
- Modify: `lib/site-data.d.ts`

**Interfaces:**
- Consumes: Exact matrix and commercial rules from the approved spec.
- Produces: `plans`, `addons`, `addonNotes`, `planInheritanceNotes`, `comparisonStateLegend`, `agenticExpansionNote`, `platformFeatureGroups`, `comparisonUsageNotes`, and `interactionAllowanceCards` for the renderer and localization coverage tests.

- [ ] **Step 1: Write failing exact-data regression tests**

Add literal expected group fixtures for all eight groups and 47 rows, then assert:

```js
assert.deepEqual(platformFeatureGroups, expectedPlatformFeatureGroups);
assert.deepEqual(platformFeatureGroups.map((group) => group.label), [
  'Core Channels', 'Knowledge & Intelligence', 'CRM & Lead Management',
  'Integrations & Automation', 'AI Visual', 'AI Voice', 'Team & Operations', 'Usage & Language',
]);
assert.match(plans.find((plan) => plan.slug === 'enterprise').description, /visual AI.*voice AI.*multi-brand.*operational control/i);
assert.deepEqual(comparisonUsageNotes, [
  'Enterprise includes 200 AI Visual Generations per month; extra visual usage is available through an agreed usage-based or custom commercial arrangement.',
  'Enterprise includes 300 inbound AI voice minutes per month and up to two concurrent AI calls; extra minutes, higher concurrency, Voice AI Pro, and outbound calling are available separately through an agreed commercial arrangement.',
  'AI Voice Minutes and AI Visual Generations are separate from the standard monthly AI interaction allowance.',
]);
```

Add direct assertions for the shared 200-generation pool, Enterprise voice inclusion, lower-plan add-ons, paid expansions, immutable pricing, roadmap values, and strict inheritance. Build the inheritance assertion from plan values but treat `Advanced`, `Enterprise`, `Enterprise scale`, and `Custom scale` as upgrades rather than downgrades.

- [ ] **Step 2: Run the focused data tests and verify RED**

Run: `node --test tests/site-contract.test.mjs`

Expected: FAIL because the eight-group exact matrix, `comparisonUsageNotes`, Enterprise entitlements, and revised usage copy do not yet exist.

- [ ] **Step 3: Implement the shared-data contract**

Update `lib/site-data.mjs` to:

- Preserve every locked numeric price.
- Update Enterprise positioning and feature bullets.
- Keep add-on prices unchanged while clarifying that Enterprise's base receptionist allowance is included without the base add-on fee.
- Replace `platformFeatureGroups` with the exact eight-group matrix.
- Add `comparisonUsageNotes` with the three controlled notes.
- Expand `interactionAllowanceCards` to describe the separate interaction, visual, and voice dimensions, the shared visual pool, the Enterprise base voice inclusion, paid expansion, and no automatic billing/rollover promises.
- Strengthen `agenticExpansionNote` so it distinguishes live Custom Workflows from roadmap products.

Update `lib/site-data.d.ts` with declarations for every shared export consumed by TypeScript.

- [ ] **Step 4: Run the focused data tests and verify GREEN**

Run: `node --test tests/site-contract.test.mjs`

Expected: PASS for the exact matrix and shared commercial-data contracts; any obsolete expectations in the same file are updated only where the approved spec supersedes them.

- [ ] **Step 5: Commit Task 1**

```powershell
git add tests/site-contract.test.mjs lib/site-data.mjs lib/site-data.d.ts
git commit -m "feat: define authoritative plan entitlement matrix"
```

### Task 2: Pricing renderer, FAQ, and responsive labels

**Files:**
- Modify: `tests/site-contract.test.mjs`
- Modify: `app/components/pricing-table.tsx`
- Modify: `app/components/platform-faq.tsx`
- Modify: `app/globals.css` only if the existing fixed table needs a scoped adjustment to keep all five columns readable.

**Interfaces:**
- Consumes: Task 1 shared data exports, especially `platformFeatureGroups` and `comparisonUsageNotes`.
- Produces: One accessible, four-plan comparison; compact mobile labels; controlled usage notes; the three required FAQ answers.

- [ ] **Step 1: Write failing renderer and FAQ contract tests**

Add tests that assert:

```js
assert.match(pricingTable, /comparisonUsageNotes\.map/);
for (const compact of ['200\/mo', '300 min', '2 calls', 'Yes · Custom', 'Upgrade']) {
  assert.ok(pricingTable.includes(compact), `missing compact label ${compact}`);
}
for (const question of [
  'Is AI Voice included in Enterprise?',
  'What is included with AI Visual Generation?',
  'What happens when Enterprise exceeds included voice or visual usage?',
]) assert.ok(platformFaqItems.some((item) => item.question === question));
```

Assert that all four plan headers remain in one table, `.comparison-scroll` does not enable horizontal scrolling, no plan column is hidden, and FAQ answers contain the exact 300-minute, two-call, shared-200, paid-expansion, and no-automatic-billing concepts.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test tests/site-contract.test.mjs`

Expected: FAIL because the controlled notes, new compact mappings, and required FAQ entries are not rendered yet.

- [ ] **Step 3: Implement the renderer and FAQ**

Update `pricing-table.tsx` to import and render `comparisonUsageNotes`, classify `Upgrade / Add-on` as paid expansion, and map authoritative values to concise mobile labels without altering desktop values. Keep the existing semantic table and all four plan columns.

Add the three exact FAQ concepts to `platform-faq.tsx`. Preserve the monthly interaction FAQ and revise language/brand answers only where the exact matrix supersedes old wording.

Change CSS only if needed to maintain the fixed five-column mobile table with normal word wrapping, no giant pills, and Arabic RTL-safe behavior.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `node --test tests/site-contract.test.mjs`

Expected: PASS for renderer, FAQ, and mobile comparison contracts.

- [ ] **Step 5: Commit Task 2**

```powershell
git add tests/site-contract.test.mjs app/components/pricing-table.tsx app/components/platform-faq.tsx app/globals.css
git commit -m "feat: render multimodal plan comparison"
```

### Task 3: EN/TR/AR localization and contradictory-copy correction

**Files:**
- Modify: `tests/samche-localization.test.mjs`
- Modify: `tests/site-contract.test.mjs`
- Modify: `lib/samche-localization.mjs`
- Modify: `app/page.tsx`
- Modify: `app/platform/page.tsx`
- Modify: `app/pricing/page.tsx` only if metadata/introduction needs the approved multimodal positioning.
- Inspect without changing unless contradictory: `app/security/page.tsx`

**Interfaces:**
- Consumes: Task 1 shared copy and Task 2 FAQ/UI strings.
- Produces: Explicit Turkish and Arabic translations for every active shared-data, FAQ, responsive, and corrected public-marketing string.

- [ ] **Step 1: Write failing localization and content-audit tests**

Extend shared-copy collection with `comparisonUsageNotes` and `platformFaqItems`. Add literal checks that the new section labels, visual/voice values, compact labels, Enterprise positioning, usage notes, and FAQ strings do not fall back to English in Turkish or Arabic.

Add public-copy assertions that:

```js
assert.match(home, /Custom Workflows.*live|live.*Custom Workflows/is);
assert.match(home, /Workflow Engine.*roadmap|roadmap.*Workflow Engine/is);
assert.match(platform, /Custom Workflows.*currently supported|currently supported.*Custom Workflows/is);
assert.doesNotMatch(activeCommercialCopy, /Enterprise[^.]{0,100}AI Voice[^.]{0,100}(paid-only|separately priced)/i);
```

The audit must operate on active plan/FAQ/page copy, not chat/server files or stale repository history.

- [ ] **Step 2: Run localization and site-contract tests and verify RED**

Run: `node --test tests/samche-localization.test.mjs tests/site-contract.test.mjs`

Expected: FAIL on missing translations and missing live-Custom-Workflows versus roadmap-Workflow-Engine public explanations.

- [ ] **Step 3: Implement translations and correct authorized public copy**

Add natural Turkish and Arabic translations for every new English key. Keep approved product/technical names where appropriate and preserve Arabic RTL behavior.

Update homepage/platform commercial copy to explicitly distinguish currently supported Custom Workflows from the roadmap Agentic AI, Skills, Actions, and Workflow Engine. Ensure Enterprise positioning reflects visual AI, included base voice, multi-brand scale, and deeper control without changing product behavior.

- [ ] **Step 4: Run localization and site-contract tests and verify GREEN**

Run: `node --test tests/samche-localization.test.mjs tests/site-contract.test.mjs`

Expected: PASS with no English fallback for active shared pricing/platform copy in Turkish or Arabic and no contradictory active commercial claims.

- [ ] **Step 5: Commit Task 3**

```powershell
git add tests/samche-localization.test.mjs tests/site-contract.test.mjs lib/samche-localization.mjs app/page.tsx app/platform/page.tsx app/pricing/page.tsx
git commit -m "feat: localize enterprise visual and voice entitlements"
```

### Task 4: Full validation, review, scoped commit range, and push

**Files:**
- Verify: all files changed since `b98a152443701da093bce43a2e09d533d9117789`
- Preserve: `docs/superpowers/plans/2026-09-18-mobile-responsive-audit.md`

**Interfaces:**
- Consumes: Tasks 1–3 implementation commits.
- Produces: Verified build and normal `origin/main` push with exact final evidence.

- [ ] **Step 1: Run the complete automated test suite**

Run: `npm test`

Expected: exit 0; record the exact passing test count.

- [ ] **Step 2: Run typecheck, lint, and build**

Run: `npx tsc --noEmit`; `npm run lint`; `npm run build`

Expected: each exits 0. Report any existing lint warning separately.

- [ ] **Step 3: Run bounded production-start smoke validation**

Start `npm run start` locally, request `/pricing` and `/platform`, verify HTTP 200 and the new comparison/FAQ copy, then stop the local process. Do not contact Hostinger or external deployment services.

- [ ] **Step 4: Run the secret audit**

Run:

```powershell
rg -n --hidden -g '!node_modules' -g '!.next' -g '!dist' -g '!build' "OPENAI_API_KEY|sk-[A-Za-z0-9]{20,}|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|api[_-]?key\s*[:=]" .
```

Expected: no newly introduced secrets; classify safe variable-name/config matches separately.

- [ ] **Step 5: Review the complete diff**

Run: `git diff --check b98a152443701da093bce43a2e09d533d9117789..HEAD`; inspect `git diff --stat` and `git status --short`.

Expected: only the implementation plan and authorized frontend/data/test files changed; no chat, server, backend, Hostinger, Render, DNS, `samche-api-service`, or mobile-audit plan changes.

- [ ] **Step 6: Request whole-change code review and fix Important/Critical findings with RED→GREEN tests**

Review the full range from approved spec commit to implementation HEAD against this plan and spec. Any accepted Important/Critical fix receives a failing regression test first, then a passing focused test and full suite.

- [ ] **Step 7: Push normally**

Run: `git push origin main`

Expected: normal push to `origin/main` succeeds; no force flag and no Hostinger redeploy.

- [ ] **Step 8: Report evidence**

Provide the requested PASS/FAIL matrix, exact test count, typecheck/lint/build/smoke/secret-audit evidence, changed files, final commit SHA, push result, `HOSTINGER REDEPLOY: NOT DONE`, and exact blockers if any.
