export const plans = [
  {
    slug: 'starter', name: 'STARTER',
    description: 'Single-site businesses that primarily need an intelligent website assistant.',
    monthly: 1790, setup: 2500, interactions: '5,000', yearly: 18258,
    cta: 'CHOOSE PLAN',
    features: ['Up to 2 Languages', '1 Web Chatbot (1 site)', 'Knowledge Intelligence', 'Page-aware Context', 'Basic Lead Capture', 'Human Handover', 'Standard Support'],
  },
  {
    slug: 'growth', name: 'GROWTH', badge: 'MOST POPULAR',
    description: 'Businesses adding WhatsApp AI, shared inbox capabilities and an external CRM or booking integration.',
    monthly: 3990, setup: 5000, interactions: '20,000', yearly: 40698,
    cta: 'CHOOSE GROWTH PLAN',
    features: ['Up to 3 Languages', 'Web Chatbot + WhatsApp AI', 'Advanced Knowledge Intelligence', '1 CRM OR Booking Integration', 'SamChe Shared Inbox', 'Lead Qualification & Routing', 'Up to 5 Team Users'],
  },
  {
    slug: 'business', name: 'BUSINESS',
    description: 'Companies requiring multiple AI channels, AI Guide, deeper intelligence, integrations, lead scoring, APIs and custom workflows.',
    monthly: 7990, setup: 9500, interactions: '50,000', yearly: 81498,
    cta: 'CHOOSE BUSINESS PLAN',
    features: ['Up to 5 Languages', 'Web + WA + AI Guide Channels', 'Entity-aware Intelligence', 'Up to 3 External Integrations', 'AI Lead Scoring', 'API Access & Custom Workflows', 'Up to 10 Team Users'],
  },
  {
    slug: 'enterprise', name: 'ENTERPRISE',
    description: 'Organizations requiring high-volume AI operations, multiple brands/sites, enterprise integrations and customized infrastructure.',
    monthly: 12500, setup: 20000, interactions: '100,000+', yearly: 127500,
    cta: 'CONTACT SALES', from: true,
    setupNote: 'based on scope',
    features: ['Custom AI Interactions limit', 'Multiple Brands/Sites', 'Extended Multilingual Support', 'ERP & Payment Integrations', 'Advanced Enterprise Controls', 'Dedicated Enterprise Support', 'Custom Data Retention'],
  },
];

export const addons = [
  { name: 'Enhanced AI Capability', price: 'AED 1,500/month', description: 'Additional capacity for use cases requiring complex analysis, advanced decision support, and advanced AI workflows.' },
  { name: 'AI Voice Receptionist', price: 'From AED 1,990/month', setup: 'AED 4,500 setup', description: 'Includes 300 inbound mins; extra use from AED 1.49/min.' },
  { name: 'Voice AI Pro', price: 'From AED 3,990/month', setup: 'AED 7,500 setup', description: 'Includes 1,000 inbound mins; extra use from AED 1.29/min.' },
];

export const addonNotes = [
  'Outbound AI Calling from AED 3.49/min.',
  'Launch pricing shown; final terms vary by telecom setup.',
  'Third-party messaging fees may apply and are billed separately.',
  'Setup costs vary by scope.',
];

export const productModules = [
  { name: 'Dashboard & Tenant Analytics', status: 'Available', description: 'Tenant overview pages surface workspace KPIs and date-filtered analytics.' },
  { name: 'AI Assistants', status: 'Available', description: 'Configure assistants and manage their product behavior within a tenant workspace.' },
  { name: 'Knowledge Intelligence', status: 'Available', description: 'Manage knowledge sources, processing state, and grounded retrieval previews.' },
  { name: 'Live Inbox', status: 'Available', description: 'Review conversations, reply as a team, and manage AI or human handling.' },
  { name: 'CRM & Pipeline', status: 'Available', description: 'Manage leads and pipeline records within the workspace.' },
  { name: 'AI Guide', status: 'Available', description: 'Configure customer-facing Guide experiences from the tenant dashboard.' },
  { name: 'Automation / Agentic AI', status: 'Roadmap / Upcoming', description: 'Planned product direction; no live automation engine is represented as available.' },
];

export const planInheritanceNotes = [
  'Core AI foundation',
  'Everything in Starter + growth capabilities',
  'Everything in Growth + advanced intelligence and integrations',
  'Everything in Business + enterprise scale and controls',
];

export const platformFeatureGroups = [
  {
    label: 'AI Channels',
    rows: [
      { label: 'Web Chatbot', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'WhatsApp AI', values: ['Not included', 'Included', 'Included', 'Included'] },
      { label: 'AI Guide', values: ['Not included', 'Not included', 'Included', 'Included'] },
      { label: 'Page-aware Website Context', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Human Handover', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Multiple Websites / Brands', values: ['Not included', 'Not included', 'Not included', 'Included'] },
      { label: 'AI Voice Receptionist', values: ['Add-on', 'Add-on', 'Add-on', 'Add-on / By scope'] },
    ],
  },
  {
    label: 'Knowledge & Intelligence',
    rows: [
      { label: 'Knowledge Intelligence', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Advanced Knowledge Intelligence', values: ['Not included', 'Included', 'Included', 'Included'] },
      { label: 'Page-aware Context', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Entity-aware Intelligence', values: ['Not included', 'Not included', 'Included', 'Included'] },
      { label: 'Business document / approved knowledge ingestion', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Conversation-derived knowledge recommendations', values: ['By scope', 'By scope', 'By scope', 'By scope'] },
    ],
  },
  {
    label: 'CRM & Lead Management',
    rows: [
      { label: 'Basic Lead Capture', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Lead Qualification', values: ['Not included', 'Included', 'Included', 'Included'] },
      { label: 'Lead Routing', values: ['Not included', 'Included', 'Included', 'Included'] },
      { label: 'SamChe Shared Inbox', values: ['Not included', 'Included', 'Included', 'Included'] },
      { label: 'AI Lead Scoring', values: ['Not included', 'Not included', 'Included', 'Included'] },
      { label: 'CRM Integration', values: ['Not included', '1 CRM OR Booking Integration', 'Included within up to 3 external integrations', 'Custom / By scope'] },
    ],
  },
  {
    label: 'Integrations & Automation',
    rows: [
      { label: 'Booking Integration', values: ['Not included', '1 CRM OR Booking Integration', 'Included within up to 3 external integrations', 'Custom / By scope'] },
      { label: 'External Integrations', values: ['Not included', '1 CRM OR Booking Integration', 'Up to 3', 'Custom'] },
      { label: 'API Access', values: ['Not included', 'Not included', 'Included', 'Included'] },
      { label: 'Custom Workflows', values: ['Not included', 'Not included', 'Included', 'Included / By scope'] },
      { label: 'ERP Integrations', values: ['Not included', 'Not included', 'By scope', 'Included / By scope'] },
      { label: 'Payment Integrations', values: ['Not included', 'Not included', 'By scope', 'Included / By scope'] },
      { label: 'Agentic AI / Skills / Actions / Workflow Engine', values: ['Roadmap', 'Roadmap', 'Roadmap / By scope', 'Roadmap / By scope'], note: 'Roadmap / By scope is not a live standard subscription capability.' },
    ],
  },
  {
    label: 'Team & Operations',
    rows: [
      { label: 'Team Users', values: ['Standard access', 'Up to 5', 'Up to 10', 'Custom'] },
      { label: 'Shared Inbox', values: ['Not included', 'Included', 'Included', 'Included'] },
      { label: 'Human Handover', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Dedicated Support', values: ['Not included', 'Not included', 'Not included', 'Included'] },
      { label: 'Advanced Controls', values: ['Not included', 'Not included', 'Not included', 'Included'] },
      { label: 'Custom Data Retention', values: ['Not included', 'Not included', 'Not included', 'Custom'] },
    ],
  },
  {
    label: 'Usage & Language',
    rows: [
      { label: 'Monthly AI Interactions', values: ['5,000 / month', '20,000 / month', '50,000 / month', '100,000+ / month'] },
      { label: 'Languages', values: ['Up to 2', 'Up to 3', 'Up to 5', 'Extended / Custom'] },
      { label: 'Websites / Brands', values: ['1 website', 'By scope', 'By scope', 'Multiple'] },
      { label: 'External Integrations', values: ['0', '1 CRM OR Booking', 'Up to 3', 'Custom'] },
      { label: 'Support Level', values: ['Standard', 'Standard', 'Standard', 'Dedicated'] },
    ],
  },
];

export const planComparisonRows = platformFeatureGroups.flatMap((group) => group.rows);

export const interactionAllowanceCards = [
  { title: 'Monthly Allowance', body: 'Starter includes 5,000 interactions / month, Growth 20,000 interactions / month, Business 50,000 interactions / month, and Enterprise 100,000+ interactions / month / custom scope.' },
  { title: 'What Counts', body: 'An interaction is an AI-powered customer interaction processed through enabled SamChe AI channels such as Web Chatbot, WhatsApp AI and AI Guide. It is not the same as an OpenAI or Gemini token, a page view, or ordinary human-only inbox activity.' },
  { title: 'Voice AI', body: 'Voice AI has separate usage-based pricing and is not silently deducted from the standard interaction allowance unless the commercial agreement explicitly says otherwise.' },
  { title: 'Higher Usage', body: 'Interaction allowances are defined per billing period. Any rollover or custom usage arrangement is subject to the commercial agreement. If usage approaches the allowance, SamChe AI can recommend a higher plan or custom usage arrangement; no automatic overage billing is implied.' },
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
  const amount = `${plan.from ? 'From ' : ''}AED ${plan.setup.toLocaleString('en-US')}`;
  return `${amount} one-time${plan.setupNote ? ` ${plan.setupNote}` : ''}`;
}
