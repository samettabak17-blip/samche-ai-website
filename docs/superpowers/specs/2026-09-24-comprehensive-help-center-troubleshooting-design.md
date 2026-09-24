# Comprehensive Help Center Troubleshooting Knowledge Base

## Goal

Expand the current 19-article SamChe AI Help Center into a substantially broader, evidence-backed troubleshooting knowledge base covering verified Dashboard workflows, safe implementation-managed boundaries, plan entitlements, multilingual retrieval, and weekly synchronization with the real Dashboard source.

The article count is not a target by itself. New public articles are created only when the Dashboard repository, support map, pricing/entitlement source, Help Center registry, or explicit implementation evidence supports the behavior.

## Current evidence baseline

- The website currently has 19 published Help Center articles.
- `lib/support-dashboard-map.mjs` contains 20 audited areas.
- 16 areas are verified customer-accessible.
- CRM Contacts is unverified as a standalone customer route.
- Integrations, AI Visual, and AI Voice are implementation-managed or lack verified customer-facing controls.
- The Dashboard source repository is available at `C:\Users\smttb\Documents\samche-api-service\dashboard` and is the primary route/control evidence source.
- `docs/samche-dashboard-support-knowledge.md`, `lib/support-dashboard-map.mjs`, the Help Center registry, and the pricing/entitlement source are supporting evidence sources.

## Scope and constraints

- Preserve existing Help Center routes, canonical article URLs, search, support form, SSR, EN/TR/AR direction handling, chatbot retrieval, and the article-link presentation policy.
- Preserve the OpenAI chatbot, Vision/screenshot support, clipboard image paste, chat persistence, response reveal, SMTP/support delivery, pricing, feature comparison, and mobile keyboard behavior.
- Do not modify Hostinger environment variables, DNS, Render, or `samche-api-service`.
- Do not publish generic SaaS instructions, fabricate Dashboard screens, or imply tenant inspection without authorized tenant data.
- Do not turn roadmap or unverified capabilities into operational documentation.
- Preserve unrelated untracked files.

## Article inventory model

Add a machine-readable inventory record for every candidate and published troubleshooting article:

```js
{
  id: 'whatsapp-ai-not-replying',
  slug: 'whatsapp-ai-not-replying',
  category: 'whatsapp-ai',
  productArea: 'WhatsApp AI',
  issueType: 'message_delivery',
  title: { en: '...', tr: '...', ar: '...' },
  summary: { en: '...', tr: '...', ar: '...' },
  symptoms: { en: ['...'], tr: ['...'], ar: ['...'] },
  appliesTo: { plans: ['growth', 'business', 'enterprise'], roles: ['tenant_admin'] },
  prerequisites: { en: '...', tr: '...', ar: '...' },
  navigation: { en: '...', tr: '...', ar: '...' },
  decisionTree: [{ question: { en: '...', tr: '...', ar: '...' }, yes: '...', no: '...' }],
  selfServiceSteps: [{ en: '...', tr: '...', ar: '...' }],
  interventionBoundary: { en: '...', tr: '...', ar: '...' },
  expectedResult: { en: '...', tr: '...', ar: '...' },
  commonCauses: { en: ['...'], tr: ['...'], ar: ['...'] },
  doNot: { en: ['...'], tr: ['...'], ar: ['...'] },
  supportChecklist: { en: ['...'], tr: ['...'], ar: ['...'] },
  keywords: { en: ['...'], tr: ['...'], ar: ['...'] },
  related: ['whatsapp-ai-setup'],
  verification: {
    status: 'Published',
    verifiedOn: '2026-09-24',
    sourceFiles: ['dashboard/src/features/channels/channels-page.tsx'],
    sourceRoutes: ['/app/:tenantId/channels'],
    reviewTriggers: ['route or control changes', 'plan entitlement changes']
  }
}
```

The schema must reject duplicate IDs/slugs, missing locales, missing source evidence, unsupported status values, invalid related slugs, incomplete verification metadata, and `Published` records marked `Needs Review`, `Roadmap`, or `Unverified`.

## Category coverage

The inventory will evaluate each category below against evidence and create only supported articles:

- Account / Access: authentication boundaries, workspace selection, role changes, module access, and permission failures.
- Dashboard / Overview: loading, missing data, counts, navigation, and configuration visibility.
- Web Chatbot: appearance, response, language, page context, lead collection, handoff, installation, per-page behavior, delay, and stale knowledge.
- WhatsApp AI: channel status, incoming/outgoing delivery, Inbox visibility, entitlement, provider boundary, language, media, AI Visual boundary, context, handoff, reconnection, and support evidence.
- AI Guide: entitlement, loading, context, language, stale context, page/entity awareness, and verified links/embeds.
- Knowledge Intelligence: ingestion, processing, approval, retrieval, outdated/conflicting sources, recommendations, gaps, multilingual content, removal, and implementation-managed configuration.
- Conversations / Shared Inbox: visibility, duplicates, channel context, assignment, handoff, search, language/context, and escalation.
- CRM / Leads / Pipeline: lead creation/qualification/routing, status, missing pipeline items, CRM object distinctions, data mismatch, and verified integration boundaries.
- Integrations: plan availability, CRM/booking/API boundaries, limits, implementation ownership, and support evidence requirements without invented setup screens.
- AI Visual: Enterprise entitlement, 200 shared generations, catalog/context dependencies, no verified customer-facing switch where applicable, and support boundaries; distinguish image understanding from generation.
- AI Voice: entitlement, 300 inbound minutes and 2 concurrent calls only where authoritative, implementation ownership, included versus Pro scope, outbound/overage boundaries, and reporting checklist.
- Team / Permissions: role limits, user limits, admin-only controls, and action access.
- Plans / Entitlements: visibility, cumulative plan capabilities, channel/feature limits, language/interaction/visual/voice usage, and support-channel boundaries.
- Support / Service: request submission, evidence checklist, screenshots, plan support options, AI versus human support boundary.
- Billing / Usage: only explicitly verified interaction, visual, voice, annual/monthly, setup, onboarding, and overage behavior.

## Article quality and publication gate

Every published troubleshooting article includes:

- problem title and localized summary
- symptoms
- audience and applicable plans
- prerequisites
- exact verified Dashboard route and control names where available
- step-by-step checks
- self-service boundary
- SamChe intervention boundary
- expected result
- common causes
- explicit `What not to do`
- Support contact trigger and evidence checklist
- related articles
- last verified date
- source files/routes and verification status

An article is `Published` only when the feature/control/plan behavior and all EN/TR/AR public content are verified. Otherwise it remains `Needs Review` and is excluded from public search, chatbot retrieval, and article recommendations. Removed behavior becomes `Retired` or `Needs Review` and is excluded from retrieval.

## Decision trees

High-volume families use structured decision trees rather than flat prose. WhatsApp, Web Chatbot, Knowledge Intelligence, Conversations, CRM, AI Visual, and AI Voice articles must separate plan eligibility, route/control availability, user-visible state, scope of impact, provider/implementation ownership, and escalation requirements.

## Registry and module structure

Keep existing registry consumers stable while moving new records into category modules and a shared article factory/schema. The aggregator will expose the same published article/search/source APIs, plus inventory validation and issue-family metadata. Search keywords are localized and include only truthful variants such as WhatsApp/wp/chatbot, Turkish response-failure terms, knowledge/PDF/old-price terms, and CRM/lead/pipeline terminology.

## Chatbot retrieval

Every published troubleshooting record is searchable by symptom, feature name, Dashboard terminology, plan, common error phrase, and EN/TR/AR wording. Retrieval remains bounded and status-filtered. The provider receives verified article sources and Dashboard grounding; stale or unverified content is never silently promoted.

## Weekly sync compatibility

The weekly Dashboard audit consumes the inventory and returns affected article IDs, categories, source routes, plan metadata, keywords, translations, decision trees, and tests. Verified changes update only named records. Removed, roadmap, or unverified findings produce `Needs Review` and cannot regenerate or publish articles. The workflow emits a machine-readable and Markdown inventory/change report.

## Testing

Add regression coverage for:

- unique article IDs/slugs
- complete EN/TR/AR content for every published record
- source evidence and verification metadata
- exclusion of `Needs Review`, `Retired`, `Roadmap`, and `Unverified` records
- valid canonical article URLs
- retrieval by symptom, terminology, plan, and localized synonym
- entitlement accuracy and implementation-managed distinction
- retired article exclusion from search/sources/chatbot retrieval
- related article links
- inventory compatibility with weekly sync impact reports
- preservation of existing Help Center, support, chatbot, screenshot, persistence, and article-link behavior

Run the full website test suite, targeted Help Center tests, typecheck, lint, build, local production HTTP checks, and browser smoke tests for search, article links, and support retrieval. Public production verification remains pending deployment.

## Delivery sequence

1. Audit current Dashboard evidence and generate the complete candidate inventory.
2. Classify every candidate and map it to evidence before writing article content.
3. Implement the shared schema/factory and category modules.
4. Add verified EN/TR/AR article content and localized search keywords.
5. Update retrieval and weekly sync impact reporting.
6. Validate publication gates and exclusion behavior.
7. Run the full verification suite and report exact published counts and remaining gaps.
