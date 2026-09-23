# Chatbot Clipboard Support and Support Grounding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit-send clipboard screenshot paste, safe assistant formatting, and verified dashboard-grounded support answers without regressing existing sales, vision, mobile, or localized flows.

**Architecture:** Keep the existing React widget and `/api/sales-chat` contract. Add small pure browser-safe modules for clipboard/attachment decisions and restricted response tokenization, then connect them to the widget and server validator. Use the existing `dashboardSupportMap` as the sole route/control evidence and preserve the current vision payload contract.

**Tech Stack:** React 19, Next/Vinext, TypeScript, Node test runner, OpenAI Chat Completions vision payload, CSS media queries, EN/TR/AR locale helpers.

**Spec:** `docs/superpowers/specs/2026-09-23-chatbot-clipboard-support-grounding-design.md`

## Global Constraints

- Preserve PNG, JPG, JPEG, WEBP support and the maximum 5 MB source image size.
- Preserve the single-image-per-turn contract unless existing behavior explicitly changes it.
- Pasting an image never submits; the customer must click Send or use the existing submit behavior.
- Text-only paste must continue through the browser default behavior without duplication.
- Do not inject arbitrary HTML, execute scripts, or introduce XSS.
- Only dashboard map evidence may produce dashboard routes or control instructions.
- Do not modify Hostinger environment variables, Render, DNS, or `samche-api-service`.
- Do not add unrelated untracked files to Git.

## Review Focus

- Clipboard image read failure must leave text and existing attachment state intact; test in Task 1.
- A pasted JPEG reported as `image/jpg` and a browser item with an empty/unsupported type must be handled deterministically; test in Task 1.
- An existing attachment must not be silently discarded during replacement; test in Task 1 and Task 3.
- Markdown-like text containing quoted attributes, comments, and script tags must stay inert text; test in Task 2.
- A screenshot follow-up must preserve image context while stating when tenant-specific evidence is missing; test in Task 4.

---

### Task 1: Pure clipboard and attachment contract

**Files:**
- Create: `lib/chat-attachment.mjs`
- Modify: `tests/vision-support-regression.test.mjs`
- Create: `tests/chat-attachment.test.mjs`

**Interfaces:**
- Produces `SUPPORTED_IMAGE_TYPES`, `MAX_CHAT_ATTACHMENT_BYTES`, `validateImageFile(file)`, `readImageFile(file, FileReaderCtor)`, and `extractClipboardImage(clipboardData)`.
- `validateImageFile` returns `{ ok: true, mimeType }` or `{ ok: false, reason: 'unsupported_format' | 'image_too_large' | 'invalid_image' }`.
- `readImageFile` resolves `{ name, mimeType, data, preview }` or rejects with the same reason.
- `extractClipboardImage` returns `{ kind: 'image', file }`, `{ kind: 'text' }`, or `{ kind: 'empty' }`; it never reads or mutates text clipboard data.

- [ ] **Step 1: Write failing tests**

Test the supported types, `image/jpg` normalization, 5 MB boundary, unsupported type, empty clipboard, image item extraction, text-only classification, and read failure. Use small fake `File`-like objects and a deterministic fake `FileReader`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test tests/chat-attachment.test.mjs`

Expected: FAIL because `lib/chat-attachment.mjs` does not exist.

- [ ] **Step 3: Implement the minimal pure helper**

Use `file.type`, `file.size`, and `FileReader.readAsDataURL`. Strip the data URL prefix into `data`, preserve a preview data URL, normalize `image/jpg` to `image/jpeg`, and return localized-independent reason codes for the UI.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `node --test tests/chat-attachment.test.mjs`

Expected: all attachment tests pass.

- [ ] **Step 5: Commit the focused unit**

Run: `git add lib/chat-attachment.mjs tests/chat-attachment.test.mjs tests/vision-support-regression.test.mjs; git commit -m "test: define chatbot clipboard attachment contract"`

Expected: one scoped commit; if Git index permissions still block writes, record the exact blocker and continue without staging unrelated files.

### Task 2: Restricted assistant response renderer

**Files:**
- Create: `lib/restricted-markdown.mjs`
- Modify: `app/components/samche-chat-widget.tsx`
- Modify: `app/globals.css`
- Create: `tests/restricted-markdown.test.mjs`

**Interfaces:**
- Produces `parseRestrictedMarkdown(source)` returning an array of serializable block tokens: `{ type: 'paragraph' | 'ul' | 'ol', children: InlineToken[][] }` with inline `{ type: 'text' | 'bold' | 'code' | 'break', value?: string }`.
- The parser accepts plain text and the supported Markdown subset only; it never returns HTML.

- [ ] **Step 1: Write failing parser tests**

Cover bold text, inline code, paragraphs, explicit line breaks, ordered and unordered lists, plain text preservation, escaped punctuation, raw HTML text, `<script>` text, and JavaScript URL text.

- [ ] **Step 2: Run parser tests and verify RED**

Run: `node --test tests/restricted-markdown.test.mjs`

Expected: FAIL because the parser module does not exist.

- [ ] **Step 3: Implement the restricted tokenizer**

Split lines into paragraphs and contiguous list blocks. Parse only `**bold**`, `` `code` ``, and line breaks. Treat all other angle-bracket content as literal text. Do not use `dangerouslySetInnerHTML` or an HTML parser.

- [ ] **Step 4: Run parser tests and verify GREEN**

Run: `node --test tests/restricted-markdown.test.mjs`

Expected: all parser and injection tests pass.

- [ ] **Step 5: Connect the renderer to assistant bubbles**

Add a small React renderer in the widget that maps tokens to `<p>`, `<ul>`, `<ol>`, `<strong>`, `<code>`, and text nodes. Render user messages as plain text. Keep the stored message string unchanged.

- [ ] **Step 6: Add narrow-screen styles and test source contracts**

Style list indentation, paragraph spacing, code wrapping, and `overflow-wrap:anywhere` for assistant bubbles. Add source assertions that assistant bubbles use the restricted renderer and contain no `dangerouslySetInnerHTML`.

- [ ] **Step 7: Commit the renderer**

Run: `git add lib/restricted-markdown.mjs app/components/samche-chat-widget.tsx app/globals.css tests/restricted-markdown.test.mjs; git commit -m "feat: render assistant support replies safely"`

### Task 3: Widget clipboard integration and localized UX

**Files:**
- Modify: `app/components/samche-chat-widget.tsx`
- Modify: `lib/samche-localization.mjs`
- Modify: `tests/site-contract.test.mjs`
- Modify: `tests/samche-localization.test.mjs`
- Create: `tests/chat-widget-clipboard-contract.test.mjs`

**Interfaces:**
- Widget paste handler calls `extractClipboardImage(event.clipboardData)` and `readImageFile`, then routes the result through the existing attachment state.
- The existing `selectAttachment(file)` behavior remains the picker entry point and uses the shared helper.

- [ ] **Step 1: Write failing source-contract tests**

Assert the widget listens for paste on the composer input, calls `preventDefault` only for image clipboard data, keeps `setInput`/native text paste available, does not call `ask` from paste, shows preview/remove controls, and sends attachment plus current text only from submit. Assert EN/TR/AR strings exist for unsupported format, oversize, clipboard failure, and replacement.

- [ ] **Step 2: Run contract tests and verify RED**

Run: `node --test tests/chat-widget-clipboard-contract.test.mjs tests/samche-localization.test.mjs`

Expected: FAIL because the paste handler and new localization keys are absent.

- [ ] **Step 3: Implement the shared widget flow**

Register a React `onPaste` handler on the text input. On a valid image, prevent default, read/validate, and set the attachment. On text-only clipboard data, return without preventing default. On errors, set a locale-specific message and preserve any existing attachment. When a valid new image replaces an existing image, keep the new image and announce the replacement in the localized status message.

- [ ] **Step 4: Preserve explicit-send behavior**

Ensure paste never calls `ask`, never clears `input`, and never opens the picker. Keep the existing submit button/Enter path. Ensure a submit sends the current text and image once, then clears the attachment as the existing code does.

- [ ] **Step 5: Run focused integration contracts and verify GREEN**

Run: `node --test tests/chat-widget-clipboard-contract.test.mjs tests/samche-localization.test.mjs tests/vision-support-regression.test.mjs`

Expected: all focused tests pass, including the existing vision model payload tests.

- [ ] **Step 6: Commit the widget integration**

Run: `git add app/components/samche-chat-widget.tsx lib/samche-localization.mjs tests/site-contract.test.mjs tests/samche-localization.test.mjs tests/chat-widget-clipboard-contract.test.mjs; git commit -m "feat: support clipboard screenshots in chatbot composer"`

### Task 4: Support grounding and screenshot context regression

**Files:**
- Modify: `server/sales-chat-service.mjs`
- Modify: `lib/support-dashboard-map.mjs` only if audit finds an entry inconsistent with verified documentation
- Modify: `tests/vision-support-regression.test.mjs`
- Modify: `tests/samche-support-and-implementation.test.mjs`

**Interfaces:**
- The service continues to expose `validateChatAttachment`, `validateSalesLlmOutput`, and `createSalesChatService` with the current request/response contract.
- Grounding validation consumes the existing `dashboardSupportMap`; it must not invent a second route registry.

- [ ] **Step 1: Write failing grounding tests**

Assert the map explicitly verifies `Channels`, `WhatsApp channel`, `Edit channel`, `Status`, `Assigned assistant`, and `Save changes`; assert the route is `/app/:tenantId/channels`; assert unverified AI Visual settings remain null/implementation-managed; assert provider replies naming fabricated controls are rejected; assert a screenshot reply can retain visible order/channel context and says when tenant-specific configuration is not visible.

- [ ] **Step 2: Run grounding tests and verify RED**

Run: `node --test tests/vision-support-regression.test.mjs tests/samche-support-and-implementation.test.mjs`

Expected: at least one new assertion fails against the current prompt/validator behavior, especially exact control evidence or raw Markdown safety in returned support text.

- [ ] **Step 3: Implement map-driven guardrails**

Build validation from the verified map entry rather than adding broad banned-word substitutions. Preserve the existing explicit AI Visual rejection. Update the system prompt to classify verified controls, documented procedures, general diagnostics, and tenant-specific review, and remove any wording that treats unverified tenant configuration as inspected.

- [ ] **Step 4: Run grounding tests and verify GREEN**

Run: `node --test tests/vision-support-regression.test.mjs tests/samche-support-and-implementation.test.mjs`

Expected: all grounding and screenshot-context tests pass.

- [ ] **Step 5: Commit the server guardrails**

Run: `git add server/sales-chat-service.mjs lib/support-dashboard-map.mjs tests/vision-support-regression.test.mjs tests/samche-support-and-implementation.test.mjs; git commit -m "fix: ground support answers in verified dashboard controls"`

### Task 5: Full verification and delivery

**Files:**
- Modify only files already listed above if verification reveals a scoped defect.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: exit code 0 with zero failures.

- [ ] **Step 2: Run typecheck, lint, build, and production HTTP smoke**

Run: `npx tsc --noEmit`; `npm run lint`; `npm run build`; `npm run test:production-http`

Expected: each command exits 0. Record any pre-existing failure separately by command and test name.

- [ ] **Step 3: Run the repository secret audit**

Use the repository’s existing audit script if present; otherwise inspect tracked files with a non-mutating secret scan that excludes `.git`, `node_modules`, `.next`, `dist`, and generated build artifacts. Do not print secret values.

- [ ] **Step 4: Verify the live browser flow**

Start the production-like app using the existing project scripts, open the chatbot in the available browser, verify the attachment preview/removal and explicit-send behavior, and exercise text paste if clipboard injection is available. Report live browser verification separately from physical iPhone testing; do not claim physical device coverage.

- [ ] **Step 5: Audit the diff and unrelated files**

Run: `git status --short`; `git diff --check`; `git diff --stat`; inspect the final diff. Leave the pre-existing untracked `docs/superpowers/plans/2026-09-18-mobile-responsive-audit.md` and `tsconfig.tsbuildinfo` untouched and uncommitted.

- [ ] **Step 6: Commit and push the scoped implementation**

After verification, stage only the implementation/spec/plan files created or modified for this task, commit with a single final delivery commit if prior focused commits were not possible, and push normally to `origin main` without force. Report the exact commit SHA and push result; if Git permissions/network prevent this, report the exact blocker.
