# Humanize Sales Chat and Explain AI Interaction Allowances

## Goal

Make the SamChe AI sales assistant behave like a natural B2B representative across continuous conversations, while making the Pricing page clearly explain monthly AI interaction allowances in English and Arabic.

## Scope and constraints

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

## Design

### Sales conversation state

The client sends the current lead state, pending field, recent conversation history, and latest message to the server. The server derives the latest input language independently for every turn. The prompt and deterministic server enforcement treat the merged lead state as authoritative, so a known or explicitly declined field cannot become the next question again.

Extracted fields are merged with existing state without replacing valid values with unknown/null values. Boolean negatives are preserved. The next field is selected from material product-fit, plan-fit, integration, implementation, or demo-readiness gaps, excluding known and recently answered fields. The model may answer an interruption and then resume with one concise question; it may not skip the interruption or emit a rigid questionnaire sequence.

### Pricing allowance explanation

The shared pricing component renders six structured cards from shared content directly after the pricing comparison and before add-ons:

1. Monthly Allowance — Starter 5,000; Growth 20,000; Business 50,000; Enterprise 100,000+ AI interactions per month.
2. What Counts — AI-powered customer exchanges through enabled channels such as Web Chatbot, WhatsApp AI, and AI Guide, without claiming universal channel availability or a one-message conversion.
3. What Does Not Count — explicitly separates interactions from OpenAI/Gemini tokens, website visits, setup fees, and human-only inbox activity.
4. Voice AI Usage — preserves separate usage-based Voice AI pricing and the supplied minute/setup values; voice minutes are not automatically deducted from standard interaction allowances unless a commercial agreement says so.
5. Higher Usage — recommends a higher plan or custom arrangement as usage approaches/exceeds the allowance, without promising automatic billing or suspension.
6. Billing Period — states that allowances are defined per billing period and rollover/custom allocation is subject to the commercial agreement; it also explains why higher plans differ.

The same content has complete Arabic translations through the existing localization mechanism and remains RTL-safe.

### FAQ

The shared FAQ data adds one allowance question and answer. Both Pricing and Platform continue to render the shared FAQ component; no page-specific duplicate FAQ data is introduced.

## Error and safety behavior

Provider failures continue to preserve the conversation state and show the neutral localized retry message. Unsafe demo claims are sanitized as before. Product capability answers cannot promise guaranteed employee replacement, ROI, or sales outcomes. Preferred date/time remains preference-only.

## Verification

Verification covers the continuous 11-turn regression, isolated state/language/safety edge cases, shared FAQ usage, exact allowance copy, EN/AR localization, responsive CSS contracts, full tests, typecheck, lint, build, production-start smoke validation, and secret audit. Only scoped repository changes are committed and pushed to `origin/main`; Hostinger is not redeployed.
