# Dependency Security Remediation Implementation Plan

> **Execution note:** Carry out each task with test-first evidence and stop on any unexplained production behavior change.

**Goal:** Remove all safely remediable dependency advisories while preserving the current Vinext/Node production application.

**Architecture:** Keep Next 16, Vite 8, React 19.2, Vinext beta, and Cloudflare tooling on their existing release lines. Update direct parents first, allow compatible transitive patches to resolve naturally, and use an override only when the parent ranges explicitly permit it and the full suite proves compatibility.

**Tech stack:** Node 22+ contract, npm lockfile v3, Next 16 types, Vinext/Vite SSR, React Server Components, Node test runner, ESLint, TypeScript.

---

### Task 1: Add the failing dependency security contract

**Files:**
- Create: `tests/dependency-security.test.mjs`
- Modify: `package.json`

1. Add assertions for direct safe versions and every locked occurrence of Next, Sharp, fast-uri, js-yaml, Vite, Vinext, React/RSC, Cloudflare plugin, Wrangler, and known compatible transitive patches.
2. Assert that image optimization stays disabled and screenshot upload contracts continue to allow PNG/JPEG/WEBP but not AVIF.
3. Run the new test against the vulnerable lockfile and capture the expected failure.

### Task 2: Apply minimal direct parent upgrades

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

1. Upgrade Next and `eslint-config-next` to 16.3.6.
2. Align React, React DOM, and `react-server-dom-webpack` at 19.2.8.
3. Upgrade Vinext to beta.12, Vite to 8.3.1, Cloudflare Vite plugin to 1.60.1, Wrangler to 4.140.0, and Drizzle Kit only to the compatible 0.31.11 patch.
4. Refresh fast-uri, js-yaml, and other flagged transitives only within parent-declared ranges.
5. Add no override unless the lock tree proves one is necessary.

### Task 3: Re-audit and resolve only evidenced survivors

**Files:**
- Modify only when justified: `package.json`, `package-lock.json`
- Update: `docs/superpowers/specs/2026-09-25-dependency-security-remediation-design.md`

1. Run production and full audits.
2. Map every survivor to its exact parent and runtime reachability.
3. Use a compatible override or safe parent patch only when supported by declared ranges and tests; otherwise retain and document the advisory with exploitability and planned fix.

### Task 4: Validate application compatibility

**Files:**
- Modify only if a failing compatibility test proves a necessary fix.

1. Run full tests, typecheck, lint, and build.
2. Start the built production server and run the production HTTP smoke suite plus explicit routes, 404, RSC, API boundaries, and static asset checks.
3. Exercise screenshot/clipboard/vision regression tests and verify Help Center counts and strict EN/TR/AR tests remain green.
4. Run a secret audit and inspect the final diff for unrelated changes.

### Task 5: Commit and publish the security branch

1. Record before/after audit summaries and all remaining advisories in the security design/report.
2. Commit only the scoped dependency, tests, documentation, and strictly necessary compatibility files.
3. Push `codex/security-dependency-remediation` normally without force and do not merge.

