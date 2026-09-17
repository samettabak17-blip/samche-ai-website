import { filterSalesActionsForLead, hasUnsafeSalesClaim } from './samche-sales-assistant.mjs';

export const CHAT_STORAGE_KEY = 'samche_ai_chat_v1';
export const LEAD_HANDOFF_KEY = 'samche:website-chat-lead';
const VERSION = 1;
const leadFields = ['name','email','company','industry','country','website','mainGoal','channels','products','languages','integrations','volume','likelyPlan','recommendedPlan','preferredPlan','timeline','contactPreference','demoInterest','preferredDemoDate','preferredDemoTime','teamUsers','leadQualification','budget','apiWorkflow','apiAccessNeed','customWorkflowNeed','aiGuideNeed','externalIntegrations','aiLeadScoring'];
const stateFields = ['lead','intent','turns','lastQuestion','qualificationStage','commercialIntent','summaryReadiness','pendingQualificationField','lastPendingQuestion','offTopicTurns'];
const allowedRoles = new Set(['assistant', 'user']);
const allowedActionTypes = new Set(['link', 'demo', 'whatsapp']);
const allowedDemoUrls = new Set(['https://demo.samchecompany.com/', 'https://rehber.samchecompany.ae/']);
function sanitizeLead(lead) {
  if (!lead || typeof lead !== 'object') return lead;
  return Object.fromEntries(leadFields.filter((key) => Object.hasOwn(lead, key)).map((key) => [key, lead[key]]));
}

function sanitizeChatSession(value) {
  if (!value || typeof value !== 'object') return value;
  const sourceState = value.state && typeof value.state === 'object' ? value.state : {};
  const state = Object.fromEntries(stateFields
    .filter((key) => Object.hasOwn(sourceState, key))
    .map((key) => [key, key === 'lead' ? sanitizeLead(sourceState.lead) : sourceState[key]]));
  return {
    version: value.version,
    messages: Array.isArray(value.messages)
      ? value.messages.filter((message) => !(message?.role === 'assistant' && hasUnsafeSalesClaim(message.text)))
      : value.messages,
    state,
    actions: filterSalesActionsForLead(state.lead, value.actions || []),
    open: value.open,
    ...(value.locale === undefined ? {} : { locale: value.locale }),
    ...(value.sessionId === undefined ? {} : { sessionId: value.sessionId }),
  };
}

function validLead(lead) {
  return Boolean(lead && typeof lead === 'object'
    && leadFields.every((key) => Object.hasOwn(lead, key))
    && Array.isArray(lead.channels) && lead.channels.every((item) => typeof item === 'string')
    && Array.isArray(lead.products) && lead.products.every((item) => typeof item === 'string')
    && Object.entries(lead).every(([, value]) => typeof value === 'string' || typeof value === 'boolean' || Array.isArray(value)));
}

export function validateChatSession(value) {
  value = sanitizeChatSession(value);
  if (!value || value.version !== VERSION || !Array.isArray(value.messages) || !validLead(value.state?.lead)) return null;
  if (!['COLD','WARM','HOT'].includes(value.state.intent) || !Number.isInteger(value.state.turns) || value.state.turns < 0 || typeof value.state.lastQuestion !== 'string') return null;
  if (value.state.qualificationStage !== undefined && typeof value.state.qualificationStage !== 'string') return null;
  if (value.state.commercialIntent !== undefined && !['COLD','WARM','HOT'].includes(value.state.commercialIntent)) return null;
  if (value.state.summaryReadiness !== undefined && typeof value.state.summaryReadiness !== 'boolean') return null;
  if (value.state.pendingQualificationField !== undefined && (typeof value.state.pendingQualificationField !== 'string' && value.state.pendingQualificationField !== null)) return null;
  if (value.state.lastPendingQuestion !== undefined && typeof value.state.lastPendingQuestion !== 'string') return null;
  if (value.state.offTopicTurns !== undefined && (!Number.isInteger(value.state.offTopicTurns) || value.state.offTopicTurns < 0 || value.state.offTopicTurns > 3)) return null;
  if (!value.messages.every((message) => message && allowedRoles.has(message.role) && typeof message.text === 'string' && message.text.length <= 6000 && typeof message.time === 'string' && (message.title === undefined || typeof message.title === 'string'))) return null;
  if (!Array.isArray(value.actions) || !value.actions.every((action) => action && typeof action.label === 'string' && allowedActionTypes.has(action.type)
    && (action.type !== 'link' || allowedDemoUrls.has(action.href)))) return null;
  if (typeof value.open !== 'boolean') return null;
  if (value.locale !== undefined && !['en', 'ar'].includes(value.locale)) return null;
  if (value.sessionId !== undefined && (typeof value.sessionId !== 'string' || value.sessionId.length > 120)) return null;
  return {
    version: VERSION, messages: value.messages, state: value.state, actions: value.actions, open: value.open,
    ...(value.locale === undefined ? {} : { locale: value.locale }),
    ...(value.sessionId === undefined ? {} : { sessionId: value.sessionId }),
  };
}

function safeStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}

export function loadChatSession(storage) {
  storage ??= safeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return null;
    return validateChatSession(sanitizeChatSession(JSON.parse(raw)));
  } catch { return null; }
}

export function saveChatSession(storage, session) {
  storage ??= safeStorage();
  if (!storage || !session) return false;
  try {
    const value = sanitizeChatSession({ ...session, version: VERSION });
    if (!validateChatSession(value)) return false;
    storage.setItem(CHAT_STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch { return false; }
}

export function clearChatSession(storage) {
  storage ??= safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(CHAT_STORAGE_KEY);
    storage.removeItem(LEAD_HANDOFF_KEY);
  } catch { /* A storage denial must not crash or block a clean in-memory session. */ }
}
