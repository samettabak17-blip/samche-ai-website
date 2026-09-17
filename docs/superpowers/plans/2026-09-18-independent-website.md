# Independent SamChe AI Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a private, independent Hostinger-ready SamChe AI website repository without runtime coupling to the platform API repository.

**Architecture:** Preserve the existing React/Vinext frontend while adding a small Node HTTP server that serves built assets and owns same-origin health, sales-chat, and contact endpoints. Copy only the website-specific sales-chat validator/service into the repository and keep all provider credentials server-side.

**Tech Stack:** React 19, TypeScript, Vinext/Vite build, Node.js 22+, Node built-in HTTP/fetch, OpenAI-compatible Chat Completions boundary.

**Spec:** Approved architectural design in the task conversation.

## Global Constraints

- Do not modify `C:\Users\smttb\Documents\samche-api-service`.
- Do not use `VITE_*` or browser-visible variables for provider secrets.
- Preserve UI, EN/AR, RTL, pricing, product cards, WhatsApp number `971506941372`, and safety behavior.
- Exclude secrets, `.env.local`, caches, build output, node_modules, and Codex state.
- Do not deploy Hostinger production, change DNS, or modify Render.

### Task 1: Clean migration and repository hygiene

**Files:** source copy, `.gitignore`, `.env.example`, documentation.

- [x] Copy only runtime source/assets/tests/config into the new path.
- [x] Exclude `.env.local`, node_modules, build/cache directories, and workspace state.
- [x] Add placeholder-only environment documentation and an independence record.

### Task 2: Independent website backend

**Files:** `server/server.mjs`, `server/sales-chat-service.mjs`, `server/sales-chat-commercial.mjs`, `app/components/samche-chat-widget.tsx`, `app/components/contact-form.tsx`.

- [x] Serve built assets and same-origin API routes from `process.env.PORT`.
- [x] Keep OpenAI access server-side and disable unsupported scheduling/email capabilities.
- [x] Route contact/demo data through the website-specific server boundary.

### Task 3: Self-contained regression coverage

**Files:** `tests/website-sales-chat-service.test.mjs`, `tests/sales-chat-bounded-fix.test.mjs`, `tests/site-contract.test.mjs`.

- [x] Replace all imports from `samche-api-service` with local copies.
- [x] Preserve fake scheduling/email, preference-only time, persistence, stale CTA, provider failure, and EN/AR coverage.
- [x] Remove assertions that require excluded workspace scripts.

### Task 4: Verification and release preparation

- [ ] Run full frontend/backend tests, typecheck, lint, and production build.
- [ ] Audit repository for secrets and forbidden runtime references.
- [ ] Initialize a fresh Git repository on `main`, inspect staged payload, commit, create a private GitHub repository, and push only `origin/main`.
