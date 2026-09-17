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

// Comparison values are limited to the approved plan feature lists above.
export const planComparisonRows = [
  { label: 'Languages', values: ['Up to 2 Languages', 'Up to 3 Languages', 'Up to 5 Languages', 'Extended Multilingual Support'] },
  { label: 'Custom AI Interactions Limit', values: ['—', '—', '—', 'Custom AI Interactions limit'] },
  { label: 'Web Chatbot', values: ['1 Web Chatbot (1 site)', 'Included', 'Included', '—'] },
  { label: 'WhatsApp AI', values: ['—', 'Included', 'Included', '—'] },
  { label: 'AI Guide', values: ['—', '—', 'Included', '—'] },
  { label: 'Knowledge Intelligence', values: ['Knowledge Intelligence', 'Advanced Knowledge Intelligence', 'Entity-aware Intelligence', '—'] },
  { label: 'Advanced Knowledge Intelligence', values: ['—', 'Included', '—', '—'] },
  { label: 'Entity-aware Intelligence', values: ['—', '—', 'Included', '—'] },
  { label: 'Page-aware context', values: ['Page-aware Context', '—', '—', '—'] },
  { label: 'Lead capture', values: ['Basic Lead Capture', '—', '—', '—'] },
  { label: 'Human Handover', values: ['Human Handover', '—', '—', '—'] },
  { label: 'Shared Inbox', values: ['—', 'SamChe Shared Inbox', '—', '—'] },
  { label: 'Lead qualification', values: ['—', 'Lead Qualification & Routing', '—', '—'] },
  { label: 'AI lead scoring', values: ['—', '—', 'AI Lead Scoring', '—'] },
  { label: 'CRM / Booking integration', values: ['—', '1 CRM OR Booking Integration', '—', '—'] },
  { label: 'External integrations', values: ['—', '—', 'Up to 3 External Integrations', 'ERP & Payment Integrations'] },
  { label: 'ERP / Payment integrations', values: ['—', '—', '—', 'ERP & Payment Integrations'] },
  { label: 'API access', values: ['—', '—', 'API Access', '—'] },
  { label: 'Custom workflows', values: ['—', '—', 'Custom Workflows', '—'] },
  { label: 'Team Users', values: ['—', 'Up to 5 Team Users', 'Up to 10 Team Users', '—'] },
  { label: 'Multiple brands / sites', values: ['—', '—', '—', 'Multiple Brands/Sites'] },
  { label: 'Enterprise controls', values: ['—', '—', '—', 'Advanced Enterprise Controls'] },
  { label: 'Support', values: ['Standard Support', '—', '—', 'Dedicated Enterprise Support'] },
  { label: 'Custom Data Retention', values: ['—', '—', '—', 'Custom Data Retention'] },
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
