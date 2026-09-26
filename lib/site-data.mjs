export const plans = [
  {
    slug: 'starter', name: 'STARTER',
    description: 'Single-site businesses that primarily need an intelligent website assistant.',
    monthly: 1790, setup: 2500, interactions: '5,000', yearly: 18258,
    cta: 'CHOOSE PLAN',
    supportLevel: '24/7 AI + Business Hours Email',
    implementationLabel: 'One-Time Implementation & Onboarding',
    implementationNote: 'AI configuration, knowledge setup and launch',
    supportEntitlements: [
      '24/7 AI Support',
      'Human Email Support — Business Hours',
      'Support Portal',
    ],
    features: ['Up to 2 Languages', '1 Web Chatbot (1 site)', 'Knowledge Intelligence', 'Page-aware Context', 'Basic Lead Capture', 'Human Handover', '24/7 AI + Business Hours Email'],
  },
  {
    slug: 'growth', name: 'GROWTH', badge: 'MOST POPULAR',
    description: 'Businesses adding WhatsApp AI, shared inbox capabilities, scoped Instagram DM AI and an external CRM or booking integration.',
    monthly: 3990, setup: 5000, interactions: '20,000', yearly: 40698,
    cta: 'CHOOSE GROWTH PLAN',
    supportLevel: '24/7 AI + Email & WhatsApp',
    implementationLabel: 'One-Time Implementation & Onboarding',
    implementationNote: 'Multi-channel setup, WhatsApp AI and integration onboarding',
    supportEntitlements: [
      '24/7 AI Support',
      'Email + WhatsApp Human Support — Business Hours',
      'Priority Support',
      'Support Portal',
    ],
    features: ['Up to 3 Languages', 'Web Chatbot + WhatsApp AI', 'Instagram DM AI — By scope', 'Advanced Knowledge Intelligence', '1 CRM OR Booking Integration', 'SamChe Shared Inbox', 'Lead Qualification & Routing', '24/7 AI + Email & WhatsApp', 'Up to 5 Team Users'],
  },
  {
    slug: 'business', name: 'BUSINESS',
    description: 'Companies requiring multiple AI channels, AI Guide, deeper intelligence, integrations, lead scoring, APIs and custom workflows.',
    monthly: 7990, setup: 9500, interactions: '50,000', yearly: 81498,
    cta: 'CHOOSE BUSINESS PLAN',
    supportLevel: '24/7 AI + Expanded Priority Support',
    implementationLabel: 'One-Time Implementation & Onboarding',
    implementationNote: 'Advanced AI configuration, workflows and integration setup',
    supportEntitlements: [
      '24/7 AI Support',
      'Priority Email + WhatsApp Human Support',
      'Expanded Priority Support',
      'Support Portal',
    ],
    features: ['Up to 5 Languages', 'Web + WA + Instagram DM AI + AI Guide Channels', 'Entity-aware Intelligence', 'Up to 3 External Integrations', 'AI Lead Scoring', 'API Access & Custom Workflows', '24/7 AI + Expanded Priority Support', 'Up to 10 Team Users'],
  },
  {
    slug: 'enterprise', name: 'ENTERPRISE',
    description: 'Advanced AI automation for organizations requiring visual AI, voice AI, multi-brand scale and deeper operational control.',
    monthly: 12500, setup: 20000, interactions: '100,000+', yearly: 127500,
    cta: 'CONTACT SALES', from: true,
    supportLevel: '24/7 AI + 24/7 Critical Human Support + Dedicated Advisor',
    implementationLabel: 'Enterprise Implementation',
    implementationNote: 'Multimodal AI, voice, visual and enterprise integration implementation',
    supportEntitlements: [
      '24/7 AI Support',
      '24/7 Human Support for Critical Issues',
      'Priority Email + WhatsApp',
      'Dedicated Customer Advisor',
      'Enterprise Support Portal',
    ],
    features: ['Instagram DM AI + advanced/custom setup', '200 AI Visual Generations / Month', 'AI Voice Receptionist · 300 Inbound Min · 2 Concurrent Calls', 'Multiple Brands / Sites', 'Extended Multilingual Support', 'Advanced Enterprise Controls', '24/7 AI + 24/7 Critical Human Support + Dedicated Advisor', 'Custom Data Retention'],
  },
];

export const addons = [
  { name: 'Enhanced AI Capability', price: 'AED 1,500/month', description: 'Additional capacity for use cases requiring complex analysis, advanced decision support, and advanced AI workflows.' },
  { name: 'AI Voice Receptionist', price: 'From AED 1,990/month', setup: 'AED 4,500 setup', description: 'Starter, Growth and Business add-on with 300 inbound minutes; extra use from AED 1.49/min. Enterprise includes the base 300-minute allowance and up to two concurrent AI calls and is not charged the base AED 1,990/month add-on fee.' },
  { name: 'Voice AI Pro', price: 'From AED 3,990/month', setup: 'AED 7,500 setup', description: 'Includes 1,000 inbound minutes; extra use from AED 1.29/min. Available as paid expansion for every plan, including Enterprise.' },
];

export const addonNotes = [
  'Outbound AI Calling from AED 3.49/min.',
  'Additional voice minutes, higher concurrency, Voice AI Pro, outbound calling and custom voice scope are paid expansions.',
  'No automatic voice overage billing is promised; additional usage follows an agreed usage-based or custom commercial arrangement.',
  'Launch pricing shown; final terms vary by telecom setup.',
  'Third-party messaging fees may apply and are billed separately.',
  'Setup costs vary by scope.',
];

export const productModules = [
  { name: 'Dashboard & Tenant Analytics', status: 'Available', description: 'Tenant overview pages surface workspace KPIs and date-filtered analytics.' },
  { name: 'AI Assistants', status: 'Available', description: 'Configure assistants and manage their product behavior within a tenant workspace.' },
  { name: 'Knowledge Intelligence', status: 'Available', description: 'Manage knowledge sources, processing state, and grounded retrieval previews.' },
  { name: 'Live Inbox', status: 'Available', description: 'Review conversations, reply as a team, and manage AI or human handling.' },
  { name: 'Instagram DM AI', status: 'Available by plan / scope', description: 'AI-powered Instagram messaging with qualification, CRM capture, internal notification, and controlled human intervention.' },
  { name: 'CRM & Pipeline', status: 'Available', description: 'Manage leads and pipeline records within the workspace.' },
  { name: 'AI Guide', status: 'Available', description: 'Configure customer-facing Guide experiences from the tenant dashboard.' },
  { name: 'Automation / Agentic AI', status: 'Roadmap / Upcoming', description: 'Planned product direction; no live automation engine is represented as available.' },
];

export const planInheritanceNotes = [
  'Core AI foundation',
  'Everything in Starter + growth capabilities',
  'Everything in Growth + advanced intelligence and integrations',
  'Everything in Business + multimodal AI, voice AI, multi-brand scale and advanced controls',
];

export const comparisonStateLegend = [
  { state: 'Included', description: 'Available within the plan' },
  { state: 'Not included', description: 'Not part of this plan' },
  { state: 'Add-on', description: 'Separately priced capability' },
  { state: 'By scope', description: 'Availability depends on project/integration scope' },
  { state: 'Custom', description: 'Configured according to commercial scope' },
  { state: 'Roadmap', description: 'Planned platform expansion, not a standard live entitlement' },
];

export const agenticExpansionNote = 'Custom Workflows are a current capability for configured automations and integrations. Agentic AI, Skills, Actions and the broader Workflow Engine remain roadmap capabilities, not standard live plan entitlements; separately scoped work does not grant the future product entitlement.';

export const platformFeatureGroups = [
  {
    label: 'Core Channels',
    rows: [
      { label: 'Web Chatbot', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'WhatsApp AI', values: ['Not included', 'Included', 'Included', 'Included'] },
      { label: 'Instagram DM AI', values: ['Not included', 'By scope', 'Included', 'Included + advanced/custom setup'] },
      { label: 'AI Guide', values: ['Not included', 'Not included', 'Included', 'Included'] },
      { label: 'Human Handover', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Shared Inbox', values: ['Not included', 'Included', 'Included', 'Included'] },
      { label: 'Omnichannel Conversation Context', values: ['Basic', 'Included', 'Advanced', 'Enterprise scale'] },
    ],
  },
  {
    label: 'Knowledge & Intelligence',
    rows: [
      { label: 'Knowledge Intelligence', values: ['Included', 'Advanced', 'Advanced', 'Enterprise'] },
      { label: 'Page-aware Context', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Entity-aware Intelligence', values: ['Not included', 'Not included', 'Included', 'Included'] },
      { label: 'Approved Knowledge Workflow', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Conversation-derived Knowledge Recommendations', values: ['Not included', 'By scope', 'Included', 'Advanced'] },
      { label: 'Business Document / Knowledge Ingestion', values: ['Included', 'Included', 'Included', 'Enterprise scale'] },
    ],
  },
  {
    label: 'CRM & Lead Management',
    rows: [
      { label: 'Basic Lead Capture', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Lead Qualification', values: ['Basic', 'Included', 'Included', 'Advanced'] },
      { label: 'Lead Routing', values: ['Not included', 'Included', 'Included', 'Advanced'] },
      { label: 'AI Lead Scoring', values: ['Not included', 'Not included', 'Included', 'Advanced'] },
      { label: 'CRM Integration', values: ['Not included', '1 CRM or Booking integration', 'Up to 3 external integrations', 'Custom scale'] },
      { label: 'Booking Integration', values: ['Not included', '1 CRM or Booking integration', 'Up to 3 external integrations', 'Custom scale'] },
      { label: 'CRM & Pipeline', values: ['Not included', 'Included', 'Included', 'Advanced'] },
    ],
  },
  {
    label: 'Integrations & Automation',
    rows: [
      { label: 'External Integrations', values: ['Not included', '1', 'Up to 3', 'Custom scale'] },
      { label: 'API Access', values: ['Not included', 'Not included', 'Included', 'Included'] },
      { label: 'Custom Workflows', values: ['Not included', 'Not included', 'Included', 'Advanced'] },
      { label: 'ERP Integrations', values: ['Not included', 'Not included', 'By scope', 'Included / Custom scale'] },
      { label: 'Payment Integrations', values: ['Not included', 'Not included', 'By scope', 'Included / Custom scale'] },
      { label: 'Agentic AI', values: ['Roadmap', 'Roadmap', 'Roadmap / By scope', 'Roadmap / By scope'] },
      { label: 'Skills', values: ['Roadmap', 'Roadmap', 'Roadmap / By scope', 'Roadmap / By scope'] },
      { label: 'Actions', values: ['Roadmap', 'Roadmap', 'Roadmap / By scope', 'Roadmap / By scope'] },
      { label: 'Workflow Engine', values: ['Roadmap', 'Roadmap', 'Roadmap / By scope', 'Roadmap / By scope'] },
    ],
  },
  {
    label: 'AI Visual',
    rows: [
      { label: 'AI Visual Generation', values: ['Not included', 'Not included', 'Not included', 'Included'] },
      { label: 'Visual Product Personalization', values: ['Not included', 'Not included', 'Not included', 'Included'] },
      { label: 'Screenshot / Image Understanding', values: ['Not included', 'By scope', 'By scope', 'Included'] },
      { label: 'AI Visual Generations', values: ['—', '—', '—', '200 / month included'] },
    ],
  },
  {
    label: 'AI Voice',
    rows: [
      { label: 'AI Voice Receptionist', values: ['Add-on', 'Add-on', 'Add-on', 'Included'] },
      { label: 'Inbound Voice Minutes', values: ['Add-on', 'Add-on', 'Add-on', '300 min / month included'] },
      { label: 'Concurrent AI Calls', values: ['Add-on', 'Add-on', 'Add-on', '2 concurrent calls included'] },
      { label: 'Outbound AI Calling', values: ['Add-on', 'Add-on', 'Add-on', 'Add-on / By scope'] },
      { label: 'Voice AI Pro', values: ['Add-on', 'Add-on', 'Add-on', 'Upgrade / Add-on'] },
    ],
  },
  {
    label: 'Team & Operations',
    rows: [
      { label: 'Team Users', values: ['Core access', 'Up to 5', 'Up to 10', 'Custom'] },
      { label: 'Multiple Brands / Sites', values: ['Not included', 'Not included', 'By scope', 'Included'] },
      { label: 'Advanced Controls', values: ['Not included', 'Not included', 'Not included', 'Included'] },
      { label: 'Custom Data Retention', values: ['Not included', 'Not included', 'Not included', 'Custom'] },
      { label: 'Dedicated Support', values: ['Not included', 'Not included', 'Not included', 'Included'] },
    ],
  },
  {
    label: 'Usage & Language',
    rows: [
      { label: 'Monthly AI Interactions', values: ['5,000', '20,000', '50,000', '100,000+'] },
      { label: 'Languages', values: ['Up to 2', 'Up to 3', 'Up to 5', 'Custom'] },
      { label: 'AI Visual Generations', values: ['—', '—', '—', '200 / month'] },
      { label: 'Inbound Voice Minutes', values: ['Add-on', 'Add-on', 'Add-on', '300 / month'] },
      { label: 'Concurrent AI Calls', values: ['Add-on', 'Add-on', 'Add-on', '2'] },
    ],
  },
  {
    label: 'Support & Success',
    rows: [
      { label: '24/7 AI Support', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Human Email Support', values: ['Business Hours', 'Business Hours', 'Priority', 'Priority'] },
      { label: 'Human WhatsApp Support', values: ['Not included', 'Business Hours', 'Priority', 'Priority'] },
      { label: 'Support Portal', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Priority Support', values: ['Standard', 'Priority', 'Expanded Priority', 'Enterprise Priority'] },
      { label: '24/7 Critical Human Support', values: ['Not included', 'Not included', 'Not included', 'Included'] },
      { label: 'Dedicated Customer Advisor', values: ['Not included', 'Not included', 'Not included', 'Included'] },
    ],
  },
];

export const planComparisonRows = platformFeatureGroups.flatMap((group) => group.rows);

export const comparisonUsageNotes = [
  'Enterprise includes 200 AI Visual Generations per month; extra visual usage is available through an agreed usage-based or custom commercial arrangement.',
  'Enterprise includes 300 inbound AI voice minutes per month and up to two concurrent AI calls; extra minutes, higher concurrency, Voice AI Pro, and outbound calling are available separately through an agreed commercial arrangement.',
  'AI Voice Minutes and AI Visual Generations are separate from the standard monthly AI interaction allowance.',
];

export const interactionAllowanceCards = [
  { title: 'Monthly Allowance', body: 'Each plan includes a monthly allowance for AI-powered customer interactions across supported SamChe AI channels. Starter: 5,000 AI interactions / month. Growth: 20,000 AI interactions / month. Business: 50,000 AI interactions / month. Enterprise: 100,000+ AI interactions / month, with custom usage arrangements available based on scope.' },
  { title: 'What Counts', body: 'An AI interaction represents an AI-powered customer exchange processed through an enabled SamChe AI channel. Usage is associated with AI-powered customer conversations handled through the AI channels enabled in your plan, such as Web Chatbot, WhatsApp AI and AI Guide. It is not defined as exactly one message or a fixed token conversion.' },
  { title: 'What Does Not Count', body: 'AI interactions are not the same as OpenAI tokens, Gemini tokens, website visits, setup fees, ordinary human-only inbox activity, AI Visual Generations or AI Voice Minutes.' },
  { title: 'AI Visual Usage', body: 'Enterprise includes one shared pool of 200 AI Visual Generations per billing period across enabled AI Visual Generation and Visual Product Personalization experiences. Additional usage follows an agreed usage-based or custom commercial arrangement. No rollover is promised.' },
  { title: 'AI Voice Usage', body: 'Starter, Growth and Business use the paid AI Voice Receptionist add-on. Enterprise includes 300 inbound minutes per billing period and up to two concurrent AI calls and is not charged the base AED 1,990/month add-on fee. Additional minutes, higher concurrency, Voice AI Pro and outbound calling remain paid expansions.' },
  { title: 'Separate Usage Dimensions', body: 'Monthly AI Interactions, AI Visual Generations and AI Voice Minutes are three separate commercial usage dimensions. Visual generations and voice minutes are not deducted from the standard monthly AI interaction allowance. Concurrent AI Calls is a capacity limit, not a usage allowance.' },
  { title: 'Higher Usage', body: 'If usage approaches or exceeds an included allowance, SamChe AI can recommend a higher plan or an agreed usage-based or custom commercial arrangement. No automatic overage billing or suspension is promised.' },
  { title: 'Billing Period', body: 'Interaction, visual and voice allowances are defined per billing period. Any custom usage arrangement is subject to the commercial agreement. Higher plans combine larger interaction allowances with additional AI channels, integrations, intelligence features and team capabilities.' },
];

export const demoLinks = {
  webChatbot: 'https://demo.samchecompany.com/',
  whatsapp: 'https://wa.me/971506941372?text=Hello%2C%20I%20would%20like%20to%20try%20the%20SamChe%20AI%20demo.',
  aiGuide: 'https://rehber.samchecompany.ae/',
};

// Public screenshots from the existing SamChe AI product-marketing site.
export const productScreenshots = {
  knowledgeIntelligence: 'https://assets.zyrosite.com/6sHOHDwWhuom08YA/codex-gaprseli-29-aau-2026-06_36_18-fiSIMZROOsjCrYjR.png',
};

export function planFromSearch(search) {
  const value = new URLSearchParams(search).get('plan') || '';
  return plans.some((plan) => plan.slug === value) ? value : '';
}

export function yearlyPrice(plan) {
  return `${plan.from ? 'From ' : ''}AED ${plan.yearly.toLocaleString('en-US')} / year`;
}

export function monthlyPrice(plan) {
  return `${plan.from ? 'From ' : ''}AED ${plan.monthly.toLocaleString('en-US')} / month`;
}

export function setupPrice(plan) {
  return `${plan.from ? 'From ' : ''}AED ${plan.setup.toLocaleString('en-US')}`;
}
