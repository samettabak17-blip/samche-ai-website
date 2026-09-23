import { plans, productModules, platformFeatureGroups } from '../lib/site-data.mjs';

export const dashboardModules = [
  { name: 'Dashboard / Overview', description: 'Workspace KPIs, date-filtered analytics, and recent activity.' },
  { name: 'AI Assistants', description: 'Configure business-specific assistants, tone, and behavior within tenant workspaces.' },
  { name: 'Channels', description: 'Manage Web Chatbot (embed code, appearance), WhatsApp AI (connection status), and AI Guide (guided journeys).' },
  { name: 'Knowledge Intelligence', description: 'Manage knowledge sources (PDF, DOCX, TXT, JPG, PNG), processing/indexing states, grounded retrieval preview, and approval workflows.' },
  { name: 'Conversations / Live Inbox', description: 'Channel conversations, team replies, human handover, take over from AI, and return handling to AI.' },
  { name: 'CRM & Pipeline', description: 'Leads list, contact information, qualification details, pipeline stages, and AI lead scoring.' },
  { name: 'Integrations', description: 'Connect supported CRM/booking systems (HubSpot, Pipedrive, Calendly, Make, Zapier, Webhooks, custom API) and manage API keys.' },
  { name: 'Settings & Team', description: 'Team user roles, workspace configuration, and plan usage.' },
];

export const supportTiers = {
  starter: {
    planName: 'STARTER',
    support: ['24/7 AI Support', 'Email Support — Business Hours', 'Support Portal'],
    channels: ['Web Chatbot (1 site)'],
    disallowedFeatures: ['WhatsApp AI', 'AI Guide', 'AI Visual Generation', 'Dedicated Customer Advisor', '24/7 Critical Human Support', 'WhatsApp Human Support'],
  },
  growth: {
    planName: 'GROWTH',
    support: ['24/7 AI Support', 'Email + WhatsApp Support — Business Hours', 'Priority Support', 'Support Portal'],
    channels: ['Web Chatbot', 'WhatsApp AI'],
    disallowedFeatures: ['AI Guide', 'AI Visual Generation', 'Dedicated Customer Advisor', '24/7 Critical Human Support'],
  },
  business: {
    planName: 'BUSINESS',
    support: ['24/7 AI Support', 'Priority Email & WhatsApp Support', 'Expanded Priority Support', 'Support Portal'],
    channels: ['Web Chatbot', 'WhatsApp AI', 'AI Guide'],
    disallowedFeatures: ['AI Visual Generation', 'Dedicated Customer Advisor', '24/7 Critical Human Support'],
  },
  enterprise: {
    planName: 'ENTERPRISE',
    support: ['24/7 AI Support', '24/7 Critical Human Support', 'Priority WhatsApp & Email', 'Dedicated Customer Advisor', 'Enterprise Support Portal'],
    channels: ['Web Chatbot', 'WhatsApp AI', 'AI Guide', 'Multiple Brands / Sites', 'AI Visual Generation (200/mo)', 'AI Voice Receptionist (300 min/mo, 2 concurrent calls)'],
    disallowedFeatures: [],
  },
};

export const commercialFacts = {
  plans: plans.map(({ slug, name, monthly, setup, yearly, interactions, features, supportLevel, supportEntitlements, implementationNote, from }) => ({
    slug, name, monthly, setup, yearly, interactions, features, supportLevel, supportEntitlements, implementationNote, from,
  })),
  products: [
    { name: 'Web Chatbot', status: 'Available' },
    { name: 'WhatsApp AI', status: 'Available' },
    ...productModules.filter((product) => product.name !== 'Dashboard & Tenant Analytics').map(({ name, status }) => ({ name, status })),
  ],
  dashboardModules,
  supportTiers,
  featureGroups: platformFeatureGroups,
};
