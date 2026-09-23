# SamChe Dashboard Support Knowledge

Audit date: 2026-09-23  
Audited repository: `C:\Users\smttb\Documents\samche-api-service\dashboard`  
Website support retrieval source: `lib/support-dashboard-map.mjs`

This document records the dashboard capabilities verified from the separate dashboard application's router, sidebar, feature components, and API route guards. The runtime assistant receives the structured map at request time; this document is the human-readable audit record.

## Verified customer-accessible modules

| Module | Dashboard label | Tenant-relative route | Verified scope |
|---|---|---|---|
| Dashboard Overview / Analytics | Overview | `/app/:tenantId/overview` | Date-filtered KPIs, conversation time series, channel distribution, recent conversations |
| AI Assistants | AI Assistants | `/app/:tenantId/assistants` | Create, inspect, activate/deactivate, edit, delete; model/system prompt are owner-only fields |
| Channels | Channels | `/app/:tenantId/channels` | Web Chat and WhatsApp channel records, status, assigned assistant, external channel ID |
| Web Chatbot | Web Chat Experience | `/app/:tenantId/channels/web-chat` | Widget setup, language, appearance, launcher, logo/avatar, site discovery, theme preview, integration details |
| AI Guide | Guide Experience | `/app/:tenantId/guide-experience` | Guide experience configuration and channel management |
| Knowledge Base | Knowledge Base | `/app/:tenantId/knowledge-base` | Text documents, assistant assignment, status, edit/delete |
| Knowledge Intelligence | Knowledge Intelligence | `/app/:tenantId/knowledge` | Sources, processing/indexing, visual/manual sources, assignment, reindex/archive, retrieval preview, profiles, recommendations, configurations |
| Knowledge Approvals | Knowledge Intelligence approval views | `/app/:tenantId/knowledge-base/candidates` and related routes | Evidence review and approve/reject/activate/rollback operations; no separate sidebar label verified |
| Conversations / Shared Inbox | Conversations | `/app/:tenantId/conversations/:channel` | WhatsApp, Web Chatbot, AI Guide views, filters, history, attachments, AI/human handling |
| Human Handoff | Conversations detail | `/app/:tenantId/conversations/:channel/:conversationId` | Take over, return to AI, pause/resume AI, typing state, close; role dependent |
| Leads | Leads | `/app/:tenantId/leads` | Filters, lead detail, assignment, stage, rescore, linked conversation |
| Pipeline | Pipeline | `/app/:tenantId/pipeline` | Deals linked to CRM contacts, stages, value, probability, owner, notes, move/edit/archive |
| Team Management | Team | `/app/:tenantId/team` | Tenant directory and roles; user management remains owner workflow |
| Account Settings | Settings | `/app/:tenantId/settings` | Account, selected tenant, plan/billing view, plan request/management, password change |

For permissions, dependencies, customer steps, limitations, and support-review boundaries, use the corresponding structured entry in `lib/support-dashboard-map.mjs`. The assistant must not claim to have inspected a tenant unless tenant data was actually retrieved through an authorized dashboard session.

## Explicit gaps and non-customer-facing areas

- Contacts: no standalone customer-facing Contacts route or sidebar entry was verified; contacts are used by Leads and Pipeline workflows.
- Integrations: no dedicated customer-facing Integrations route was verified. Provider credentials and implementation configuration remain implementation-team managed.
- AI Visual: no customer-facing AI Visual settings route or switch was verified. AI Visual Generation is Enterprise-only with 200 shared generations per billing period; tenant enablement, catalog/product context, and provider investigation may require implementation support.
- AI Voice: no customer-facing AI Voice route was verified. Enterprise includes the stated base entitlement; other plan availability is add-on/scope dependent.
- Agentic AI, Skills, Actions, and the broader Workflow Engine are roadmap capabilities in the audited product materials, not standard live dashboard controls.

## Support grounding rules

1. Treat screenshot-visible text and controls as evidence, then relate them to this verified map.
2. Give a navigation path only when `path` and the named control are present in the map.
3. Distinguish plan entitlement from tenant enablement and from implementation-managed setup.
4. Never invent a menu such as “Visual Settings”, “Data Integration”, “Training Data”, or QR re-authentication.
5. When a provider, credential, tenant, or administrator action is required, explain the boundary and direct the customer to the existing Support form according to the plan's support entitlement.
