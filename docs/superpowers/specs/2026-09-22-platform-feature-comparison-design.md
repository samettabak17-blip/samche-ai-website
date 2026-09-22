# Platform Feature Comparison Design

## Goal

Make the public SamChe AI plans accurately reflect cumulative product capability, with Enterprise materially differentiated by visual AI, controlled voice AI, multi-brand operation, and advanced controls. Preserve every approved price, setup fee, annual price, and existing non-pricing product behavior.

This document is the complete authority for the plan entitlements and commercial boundaries in this website task. Implementation must not depend on conversation history.

## Source of Truth

`lib/site-data.mjs` remains the single source for English plan cards, plan inheritance, comparison rows, add-on cards, usage explanations, and comparison notes. `app/components/pricing-table.tsx` renders this data. The English strings remain exact localization keys in `lib/samche-localization.mjs`, which supplies Turkish and Arabic equivalents.

## Plan Model and Strict Inheritance

Plans strictly inherit from lower plans:

1. Starter: Core AI foundation.
2. Growth: Everything in Starter plus growth capabilities.
3. Business: Everything in Growth plus advanced intelligence and integrations.
4. Enterprise: Everything in Business plus multimodal AI, voice AI, visual AI, multi-brand scale, and advanced controls.

The deterministic inheritance rule is:

- Growth inherits every Starter capability whose value is `Included`.
- Business inherits every Growth capability whose value is `Included`.
- Enterprise inherits every Business capability whose value is `Included`.
- A higher plan may upgrade an inherited capability, for example `Included` to `Advanced`, `Enterprise scale`, or `Custom scale`.
- A higher plan must never downgrade an inherited `Included` capability to `Not included`.
- Automated tests must fail if implementation data violates these inheritance rules.

Enterprise public positioning is: “Advanced AI automation for organizations requiring visual AI, voice AI, multi-brand scale and deeper operational control.” Turkish and Arabic must express the same meaning naturally.

## Immutable Pricing

The following plan prices, setup fees, annual prices, and standard interaction allowances are authoritative and immutable in this task:

| Plan | Monthly | Setup | Yearly | Standard interactions/month |
| --- | --- | --- | --- | --- |
| Starter | AED 1,790/month | AED 2,500 | AED 18,258/year | 5,000 |
| Growth | AED 3,990/month | AED 5,000 | AED 40,698/year | 20,000 |
| Business | AED 7,990/month | AED 9,500 | AED 81,498/year | 50,000 |
| Enterprise | From AED 12,500/month | From AED 20,000 | From AED 127,500/year | 100,000+ |

The following voice add-on pricing is also authoritative and immutable in this task:

| Voice offer | Monthly price | Setup | Included usage | Additional usage |
| --- | --- | --- | --- | --- |
| AI Voice Receptionist | From AED 1,990/month | AED 4,500 | 300 inbound minutes | Extra from AED 1.49/min |
| Voice AI Pro | From AED 3,990/month | AED 7,500 | 1,000 inbound minutes | Extra from AED 1.29/min |
| Outbound AI Calling | From AED 3.49/min | — | — | Usage-based |

## Comparison Architecture

The comparison is one table organized into the following eight sections: Core Channels; Knowledge & Intelligence; CRM & Lead Management; Integrations & Automation; AI Visual; AI Voice; Team & Operations; and Usage & Language.

The authoritative entitlement matrix follows. Labels and values may use approved concise localized equivalents for responsive presentation, but their commercial meaning must not change.

### A. Core Channels

| Feature | Starter | Growth | Business | Enterprise |
| --- | --- | --- | --- | --- |
| Web Chatbot | Included | Included | Included | Included |
| WhatsApp AI | Not included | Included | Included | Included |
| AI Guide | Not included | Not included | Included | Included |
| Human Handover | Included | Included | Included | Included |
| Shared Inbox | Not included | Included | Included | Included |
| Omnichannel Conversation Context | Basic | Included | Advanced | Enterprise scale |

### B. Knowledge & Intelligence

| Feature | Starter | Growth | Business | Enterprise |
| --- | --- | --- | --- | --- |
| Knowledge Intelligence | Included | Advanced | Advanced | Enterprise |
| Page-aware Context | Included | Included | Included | Included |
| Entity-aware Intelligence | Not included | Not included | Included | Included |
| Approved Knowledge Workflow | Included | Included | Included | Included |
| Conversation-derived Knowledge Recommendations | Not included | By scope | Included | Advanced |
| Business Document / Knowledge Ingestion | Included | Included | Included | Enterprise scale |

### C. CRM & Lead Management

| Feature | Starter | Growth | Business | Enterprise |
| --- | --- | --- | --- | --- |
| Basic Lead Capture | Included | Included | Included | Included |
| Lead Qualification | Basic | Included | Included | Advanced |
| Lead Routing | Not included | Included | Included | Advanced |
| AI Lead Scoring | Not included | Not included | Included | Advanced |
| CRM Integration | Not included | 1 CRM or Booking integration | Up to 3 external integrations | Custom scale |
| Booking Integration | Not included | 1 CRM or Booking integration | Up to 3 external integrations | Custom scale |
| CRM & Pipeline | Not included | Included | Included | Advanced |

### D. Integrations & Automation

| Feature | Starter | Growth | Business | Enterprise |
| --- | --- | --- | --- | --- |
| External Integrations | Not included | 1 | Up to 3 | Custom scale |
| API Access | Not included | Not included | Included | Included |
| Custom Workflows | Not included | Not included | Included | Advanced |
| ERP Integrations | Not included | Not included | By scope | Included / Custom scale |
| Payment Integrations | Not included | Not included | By scope | Included / Custom scale |
| Agentic AI | Roadmap | Roadmap | Roadmap / By scope | Roadmap / By scope |
| Skills | Roadmap | Roadmap | Roadmap / By scope | Roadmap / By scope |
| Actions | Roadmap | Roadmap | Roadmap / By scope | Roadmap / By scope |
| Workflow Engine | Roadmap | Roadmap | Roadmap / By scope | Roadmap / By scope |

### E. AI Visual

| Feature | Starter | Growth | Business | Enterprise |
| --- | --- | --- | --- | --- |
| AI Visual Generation | Not included | Not included | Not included | Included |
| Visual Product Personalization | Not included | Not included | Not included | Included |
| Screenshot / Image Understanding | Not included | By scope | By scope | Included |
| AI Visual Generations | — | — | — | 200 / month included |

### F. AI Voice

| Feature | Starter | Growth | Business | Enterprise |
| --- | --- | --- | --- | --- |
| AI Voice Receptionist | Add-on | Add-on | Add-on | Included |
| Inbound Voice Minutes | Add-on | Add-on | Add-on | 300 min / month included |
| Concurrent AI Calls | Add-on | Add-on | Add-on | 2 concurrent calls included |
| Outbound AI Calling | Add-on | Add-on | Add-on | Add-on / By scope |
| Voice AI Pro | Add-on | Add-on | Add-on | Upgrade / Add-on |

### G. Team & Operations

| Feature | Starter | Growth | Business | Enterprise |
| --- | --- | --- | --- | --- |
| Team Users | Core access | Up to 5 | Up to 10 | Custom |
| Multiple Brands / Sites | Not included | Not included | By scope | Included |
| Advanced Controls | Not included | Not included | Not included | Included |
| Custom Data Retention | Not included | Not included | Not included | Custom |
| Dedicated Support | Not included | Not included | Not included | Included |

### H. Usage & Language

| Feature | Starter | Growth | Business | Enterprise |
| --- | --- | --- | --- | --- |
| Monthly AI Interactions | 5,000 | 20,000 | 50,000 | 100,000+ |
| Languages | Up to 2 | Up to 3 | Up to 5 | Custom |
| AI Visual Generations | — | — | — | 200 / month |
| Inbound Voice Minutes | Add-on | Add-on | Add-on | 300 / month |
| Concurrent AI Calls | Add-on | Add-on | Add-on | 2 |

## AI Visual Commercial Entitlement and Counting Rule

Enterprise includes one shared pool of 200 AI Visual Generations per billing period. AI Visual Generation and Visual Product Personalization draw from the same pool; they are not separate allowances of 200 plus 200. One successfully generated final visual output counts as one visual generation. Failed provider attempts and rejected or invalid requests must not be presented commercially as successful generations.

Exact metering or enforcement implementation is outside this website task unless an existing backend meter already exists. The public website describes the commercial entitlement only. Additional visual usage is subject to a custom or usage-based commercial arrangement. No rollover is promised. AI Visual Generations are separate from the standard monthly AI interaction allowance.

Public-facing wording remains simple: “200 AI Visual Generations per month.” Marketing copy must not expose unnecessary metering implementation details.

The AI Visual explanation is tenant- and product/catalog-driven, for example applying an approved product to a customer-provided image. It must not be wallpaper-specific.

## Screenshot / Image Understanding Boundary

Screenshot / Image Understanding means analysis of customer-provided screenshots or images only within the tenant’s enabled SamChe AI support or product experiences. It is grounded in the tenant’s approved product, platform, and knowledge context where available and may be used for support, product guidance, and approved multimodal experiences. It is not an unrestricted general-purpose computer-vision or generic image-analysis service.

For Growth and Business, `By scope` means the capability may be enabled only through an explicitly agreed implementation scope. For Enterprise, it is included within the approved tenant use case.

## Live Custom Workflows and Roadmap Boundary

`Custom Workflows` is a currently supported plan capability for configured automations and integrations within the existing platform. It is live for the plan values shown in the authoritative matrix.

`Workflow Engine` is a planned broader platform capability and is not a standard live plan entitlement today. The same roadmap boundary applies to Agentic AI, Skills, and Actions.

For Agentic AI, Skills, Actions, and Workflow Engine, `Roadmap / By scope` means all of the following:

- The capability is not included as a standard live entitlement in any plan.
- It is a roadmap capability.
- Any separately scoped development or integration work must be contractually defined.
- Separately scoped custom work must not be marketed as receipt of the future Workflow Engine or other roadmap product entitlement.

Roadmap wording must never appear as `Included` or otherwise imply that the roadmap product is part of a current plan.

## Enterprise Voice Commercial Rule

Enterprise includes the base AI Voice Receptionist entitlement of 300 inbound minutes per billing period and up to two concurrent AI calls. An Enterprise customer is not charged the base AED 1,990/month AI Voice Receptionist add-on for those included limits.

Paid expansion remains available for:

- Minutes beyond the included allowance.
- Higher concurrency.
- Voice AI Pro.
- Outbound calling.
- Custom voice scope.

The site must not promise automatic overage billing. Additional usage must be described as subject to an agreed usage-based or custom commercial arrangement. The immutable voice pricing remains as defined in this specification.

## Separate Usage Dimensions

Monthly AI Interactions, AI Visual Generations, and AI Voice Minutes are three separate commercial usage dimensions. Enterprise includes:

- 100,000+ monthly AI interactions.
- 200 AI Visual Generations per billing period.
- 300 inbound AI voice minutes per billing period.

AI Visual Generations must not be deducted from the monthly AI interaction allowance. AI Voice Minutes must not be deducted from the monthly AI interaction allowance. Concurrent AI Calls is a capacity limit, not a usage allowance.

## Controlled Explanatory Copy

The comparison includes these controlled-usage notes:

1. Enterprise includes 200 AI Visual Generations per month; extra visual usage is available through an agreed usage-based or custom commercial arrangement.
2. Enterprise includes 300 inbound AI voice minutes per month and up to two concurrent AI calls; extra minutes, higher concurrency, Voice AI Pro, and outbound calling are available separately through an agreed commercial arrangement.
3. AI Voice Minutes and AI Visual Generations are separate from the standard monthly AI interaction allowance.

The voice add-on cards retain the immutable prices and allowances defined above. Their copy explains that the Enterprise base AI Voice Receptionist allowance is included rather than additionally billed, while paid expansion remains available.

## FAQ Contract

The FAQ must include the following concepts, with natural EN/TR/AR equivalents that preserve the exact commercial meaning:

**Is AI Voice included in Enterprise?**

Enterprise includes the base AI Voice Receptionist entitlement with 300 inbound minutes per month and up to 2 concurrent AI calls. Additional minutes, higher concurrency, Voice AI Pro, and outbound calling are available separately.

**What is included with AI Visual Generation?**

Enterprise includes one shared allowance of 200 AI Visual Generations per month across enabled AI Visual Generation and Visual Product Personalization experiences. Additional usage is available by agreed scope.

**What happens when Enterprise exceeds included voice or visual usage?**

Additional usage is handled through an agreed usage-based or custom commercial arrangement. The answer must not claim automatic billing, rollover, or suspension unless separately contracted.

The existing monthly AI interaction FAQ is preserved and aligned with the three separate usage dimensions.

## Audit-and-Correct Scope

Implementation must find and correct contradictory customer-facing commercial claims across relevant site surfaces. Relevant marketing and commercial content may be corrected when it conflicts with the authoritative plan structure, including:

- Pricing plan descriptions.
- Comparison rows.
- Enterprise highlights.
- Add-on descriptions.
- FAQ content.
- AI Voice explanations.
- AI Visual explanations.
- Interaction and usage explanations.
- Homepage, platform, and pricing commercial feature claims.
- Sales-facing static plan copy.
- Relevant site data and localization strings that supply these surfaces.

This includes correcting claims that make Enterprise voice paid-only, make voice completely separate from Enterprise, omit visual AI, give visual AI to lower plans, make Business capabilities Enterprise-only, violate strict inheritance, or otherwise conflict with this specification.

This task may update customer-facing commercial facts. It must not modify chatbot architecture or any of the following:

- Sales chat behavior.
- Sales or support prompts.
- Sales or support routing.
- Provider validation.
- Safe salvage logic.
- Mobile chatbot behavior and implementation.
- Screenshot attachment implementation.
- Vision routing implementation.
- Backend support logic.
- Hostinger configuration.
- Render configuration or services.
- DNS.
- `samche-api-service`.

## Responsive Requirements

The mobile comparison must keep `Feature | Starter | Growth | Business | Enterprise` visible simultaneously. It must not use horizontal scrolling, a carousel, tabs, or hidden plan columns.

Concise mobile values such as `No`, `Yes`, `Up to 3`, `100K+`, `200/mo`, `300 min`, and `2 calls` may be used where necessary without changing their commercial meaning. The interface must avoid giant pills and character-by-character word breaking.

## Localization Requirements

All new labels, values, notes, explanations, and FAQ content require complete English, Turkish, and Arabic coverage. Turkish and Arabic fully translate new strings outside approved product and technical names. Arabic continues to render right-to-left safely. Compact mobile labels also require localized equivalents.

## Verification

Regression tests must enforce:

- Immutable plan and voice add-on prices.
- The complete authoritative entitlement matrix.
- Strict plan inheritance, including failure on inherited-capability downgrades.
- Enterprise-only AI Visual Generation and Visual Product Personalization.
- The shared 200-generation visual allowance and its separation from interaction usage.
- Screenshot / Image Understanding plan boundaries and tenant-scoped explanation.
- Enterprise base voice inclusion, lower-plan add-on treatment, and paid expansion boundaries.
- The separate interaction, visual, and voice usage dimensions.
- Concurrent AI Calls as a capacity limit rather than a usage allowance.
- Live Custom Workflows versus roadmap Agentic AI, Skills, Actions, and Workflow Engine.
- Required FAQ answers without automatic billing, rollover, or suspension claims.
- Four-plan mobile visibility, concise labels, no horizontal scrolling, and no hidden columns.
- Complete EN/TR/AR localization and Arabic RTL-safe rendering.
- Audit-and-correct coverage for contradictory public commercial copy without changing protected chat, backend, or infrastructure behavior.

Implementation validation includes the full test suite, typecheck or documented project equivalent if absent, lint, build, production-start smoke, secret audit, a scoped implementation commit, and a normal push to `origin/main` without force.

This design-spec revision does not authorize implementation. Site implementation begins only after this revised specification is explicitly approved.
