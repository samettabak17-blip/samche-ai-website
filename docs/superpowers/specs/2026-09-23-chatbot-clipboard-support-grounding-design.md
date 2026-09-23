# Chatbot Clipboard Image Support and Support Answer Grounding

## Goal

Allow the chatbot composer to accept copied screenshots through the browser clipboard while preserving the existing single-image attachment contract, explicit-send behavior, mobile keyboard layout, and OpenAI vision route. Improve assistant message presentation and prevent support answers from inventing dashboard controls or claiming tenant-specific access.

## Scope

- Chatbot composer paste handling for PNG, JPG/JPEG, and WEBP images.
- Shared attachment validation for picker and clipboard inputs, including a 5 MB source limit.
- Compact preview, replacement feedback, removal, and image-plus-text submission.
- Safe restricted rendering of assistant Markdown-like text.
- Dashboard support grounding and regression tests.
- EN/TR/AR feedback strings needed by these flows.

Out of scope: Hostinger environment variables, Render, DNS, `samche-api-service`, unrelated sales/support forms, and provider or tenant configuration changes.

## Design

### Clipboard and attachment flow

The widget will listen for `paste` on the composer text input. It will inspect clipboard items only for image MIME types. If no supported image item exists, it will not prevent the browser default, so normal text paste and editing continue unchanged. If a supported image exists, the handler will prevent default, read the image as a data URL, validate its source type and byte size, and attach it without sending.

Picker and clipboard inputs will share one validation/read path. The existing contract remains one image per turn. When an image is already attached, a new valid image replaces it only through an explicit localized replacement notice; invalid input leaves the existing image intact. Clipboard read failures, unsupported types, and oversize images produce localized feedback. The existing compact preview and remove button remain the source of truth for attachment state.

### Message rendering

Assistant text will be rendered by a pure restricted parser that supports bold spans, inline code, paragraphs, line breaks, unordered lists, and ordered lists. It will emit React elements/text rather than setting HTML, so arbitrary tags and scripts cannot execute. The parser will preserve plain text for unsupported syntax and the raw response will remain the stored conversation value.

### Support grounding

The existing `dashboardSupportMap` remains the verification source. The five requested WhatsApp controls are treated as verified only where the map explicitly lists them: `Channels`, the affected WhatsApp channel, `Edit channel`, `Status`, `Assigned assistant`, and `Save changes`, with the map’s exact tenant-relative route. AI Visual settings remain implementation-managed and unverified.

The support prompt and output guard will distinguish verified dashboard controls, documented platform procedures, general diagnostics, and tenant-specific review. Unsupported menu/control claims are rejected or replaced with a grounded response. Screenshot answers may describe visible text and controls, but must identify missing evidence and never claim to have inspected tenant configuration.

### Verification

Tests will cover clipboard platform shortcuts through the browser event contract, text-only paste, invalid and oversized images, replacement, preview/removal source contracts, explicit-send behavior, vision payload routing, safe rendering/XSS resistance, dashboard verification/fabrication rejection, screenshot context preservation, and EN/TR/AR feedback. The full test suite, typecheck, lint, build, production HTTP smoke, and secret audit will be run before completion. Live browser verification will be reported separately from physical mobile-device testing.
