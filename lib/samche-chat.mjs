import { plans, productModules } from './site-data.mjs';
import { defaultSamcheChatConfig } from './samche-chat-config.mjs';

const samcheTopics = /samche|products?|web chatbot|whatsapp(?: ai)?|ai guide|knowledge intelligence|live inbox|crm|pipeline|pricing|prices?|cost|plans?|subscription|features?|capabilities|demo|assistants?|tenant|roadmap|automation|agentic|integration|interactions|api access|workflow/i;

export function isSamcheTopic(question) {
  return samcheTopics.test(question);
}

export function getSamcheChatReply(question, config = defaultSamcheChatConfig) {
  const text = question.trim();
  const scopeReply = `I can only help with ${config.product_scope} Ask me about one of those topics.`;
  if (!isSamcheTopic(text)) return scopeReply;
  if (/price|pricing|cost|plan|subscription|aed|interaction quota/i.test(text)) {
    const starter = plans[0];
    return `The Starter plan begins at AED ${starter.monthly.toLocaleString('en-US')}/month, with AED ${starter.setup.toLocaleString('en-US')} one-time setup and ${starter.interactions} AI interactions per month. Which customer channel are you looking to support?`;
  }
  if (/automation|agentic|roadmap/i.test(text)) {
    const status = productModules.find((module) => module.name === 'Automation / Agentic AI')?.status ?? 'Roadmap / Upcoming';
    return `Automation / Agentic AI is ${status}. It is not presented as a live capability. Current available modules include AI Assistants, Knowledge Intelligence, Live Inbox, CRM & Pipeline, and AI Guide.`;
  }
  if (/which product|right for me|choose a product/i.test(text)) {
    return 'I can recommend the right setup once I understand your customer journey. What type of business do you operate, and where do most enquiries arrive?';
  }
  if (/demo|web chatbot|whatsapp ai|ai guide/i.test(text)) {
    return 'Which SamChe AI experience would you like to see first: Web Chatbot, WhatsApp AI, AI Guide, or the full platform?';
  }
  if (/knowledge intelligence|knowledge|sources|retrieval/i.test(text)) {
    return 'Knowledge Intelligence lets teams manage knowledge sources, review processing status, and use grounded retrieval previews in the SamChe AI workspace.';
  }
  if (/live inbox|conversation|inbox|handover/i.test(text)) {
    return 'Live Inbox lets teams review conversations, reply as a team, and manage AI or human handling within the tenant workspace.';
  }
  if (/crm|pipeline|lead/i.test(text)) {
    return 'CRM & Pipeline supports managing leads and pipeline records within a SamChe AI workspace. The exact plan features are listed on the Pricing page.';
  }
  if (/product|assistant|platform|tenant|integration|api access|workflow|feature|capabilit|samche/i.test(text)) {
    return 'SamChe AI is a subscription-based multi-tenant SaaS platform with AI Assistants, Knowledge Intelligence, Live Inbox, CRM & Pipeline, and AI Guide. Automation / Agentic AI is Roadmap / Upcoming. Explore the Platform and Pricing pages for verified details.';
  }
  return scopeReply;
}

/** @param {string} question @param {{ endpoint?: string, fetchImpl?: typeof fetch }} [options] */
/** @param {string} question @param {{ endpoint?: string, fetchImpl?: typeof fetch, config?: typeof defaultSamcheChatConfig }} [options] */
export async function sendSamcheChatMessage(question, { endpoint, fetchImpl = fetch, config = defaultSamcheChatConfig } = {}) {
  if (!isSamcheTopic(question)) return getSamcheChatReply(question, config);
  if (!endpoint) return getSamcheChatReply(question, config);
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      question,
      scope: `Only answer questions about ${config.product_scope} Politely refuse unrelated questions. Do not invent capabilities; Automation / Agentic AI is Roadmap / Upcoming.`,
    }),
  });
  if (!response.ok) throw new Error('SamChe AI chat service is unavailable.');
  const data = await response.json();
  if (typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('SamChe AI chat service returned no answer.');
  return data.answer.trim();
}
