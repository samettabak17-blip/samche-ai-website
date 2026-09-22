# Platform Feature Comparison Design

## Goal

Make the public SamChe AI plans accurately reflect cumulative product capability, with Enterprise materially differentiated by visual AI, controlled voice AI, multi-brand operation, and advanced controls. Preserve every approved price, setup fee, annual price, and existing non-pricing product behavior.

## Source of Truth

`lib/site-data.mjs` remains the single source for English plan cards, plan inheritance, comparison rows, add-on cards, usage explanations, and comparison notes. `app/components/pricing-table.tsx` renders this data. The English strings remain exact localization keys in `lib/samche-localization.mjs`, which supplies Turkish and Arabic equivalents.

## Plan Model

Plans strictly inherit from lower plans:

1. Starter: Core AI foundation.
2. Growth: Everything in Starter plus growth capabilities.
3. Business: Everything in Growth plus advanced intelligence and integrations.
4. Enterprise: Everything in Business plus multimodal AI, voice AI, visual AI, multi-brand scale, and advanced controls.

Prices, setup fees, annual prices, and standard interaction allowances remain unchanged:

| Plan | Monthly | Setup | Yearly | Standard interactions/month |
| --- | --- | --- | --- | --- |
| Starter | AED 1,790 | AED 2,500 | AED 18,258 | 5,000 |
| Growth | AED 3,990 | AED 5,000 | AED 40,698 | 20,000 |
| Business | AED 7,990 | AED 9,500 | AED 81,498 | 50,000 |
| Enterprise | From AED 12,500 | From AED 20,000 | From AED 127,500 | 100,000+ |

Enterprise public positioning is: “Advanced AI automation for organizations requiring visual AI, voice AI, multi-brand scale and deeper operational control.” Turkish and Arabic must express the same meaning naturally.

## Comparison Architecture

The four-column comparison remains a single table with all plans visible. It has no horizontal scrolling, carousel, or tabs. It is arranged as Core Channels; Knowledge & Intelligence; CRM & Lead Management; Integrations & Automation; AI Visual; AI Voice; Team & Operations; and Usage & Language.

The comparison must contain the exact user-supplied entitlement values. In particular:

- AI Visual Generation and Visual Product Personalization are Enterprise only.
- Screenshot / Image Understanding is By scope for Growth and Business, Included for Enterprise, and unavailable in Starter. Its surrounding explanation is limited to customer-provided screenshots/images, visible SamChe AI or product context, and enabled support/product experiences; it makes no general computer-vision claim.
- Enterprise includes 200 AI Visual Generations each month. It is not unlimited and no rollover is claimed.
- AI Voice Receptionist is a paid add-on for Starter, Growth, and Business; Enterprise includes the base entitlement of 300 inbound minutes per month and two concurrent AI calls.
- Enterprise remains eligible for paid Voice AI Pro, additional minutes, higher concurrency, and outbound calling. Outbound calling is an add-on/by-scope expansion for every plan.
- Agentic AI, Skills, Actions, and Workflow Engine always remain roadmap/by-scope direction rather than a standard live entitlement.

## Explanatory Copy

The comparison includes two controlled-usage notes:

1. Enterprise includes 200 AI Visual Generations per month; extra visual usage is available through custom arrangements.
2. Enterprise includes 300 inbound AI voice minutes per month and up to two concurrent AI calls; extra minutes, higher concurrency, and advanced outbound calling are available through Voice AI Pro or custom arrangements.

The AI Visual explanation is tenant- and product/catalog-driven, for example applying an approved product to a customer-provided image. It must not be wallpaper-specific. The usage explanation explicitly says that AI Voice minutes and AI Visual generations are separate from the standard monthly AI interaction allowance.

The voice add-on cards retain these prices: AI Voice Receptionist from AED 1,990/month plus AED 4,500 setup, 300 inbound minutes, excess from AED 1.49/min; Voice AI Pro from AED 3,990/month plus AED 7,500 setup, 1,000 inbound minutes, excess from AED 1.29/min; outbound calling from AED 3.49/min. Their copy explains the Enterprise base allowance is included rather than additionally billed, while paid expansion remains available.

## FAQ and Audit Scope

The FAQ includes localized answers for: Enterprise base voice inclusion, Enterprise AI Visual inclusion, and usage beyond Enterprise’s included voice/visual limits. It preserves the existing interaction question but avoids automatic-billing claims.

Audit public pricing, platform, homepage, security, site data, localization, and relevant sales-commercial data for claims that make Enterprise voice paid-only, make voice completely separate from Enterprise, omit visual AI, give visual AI to lower plans, make Business enterprise-only, or otherwise conflict with this model. Do not alter sales-chat logic, image attachment/vision routing, mobile chatbot, infrastructure, or backend services.

## Responsive and Localization Requirements

Mobile uses concise values such as No, Yes, Up to 3, 100K+, 200/mo, 300 min, and 2 calls—without giant pills or character-level word breaks. Turkish and Arabic fully translate new strings outside approved product and technical names. Arabic continues to render right-to-left.

## Verification

Tests must enforce prices, plan inheritance, exact visual and voice boundaries, commercial voice expansions, roadmap boundaries, separated usage dimensions, FAQ answers, mobile labels, and EN/TR/AR localization. Validation includes full tests, typecheck (or documented project equivalent if absent), lint, build, production-start smoke, secret audit, scoped commit, and normal push to `origin/main` without force.
