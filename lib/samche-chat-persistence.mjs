import { filterSalesActionsForLead, hasUnsafeSalesClaim } from './samche-sales-assistant.mjs';

export const CHAT_STORAGE_KEY = 'samche_ai_chat_v2';
export const LEGACY_CHAT_STORAGE_KEY = 'samche_ai_chat_v1';
export const LEAD_HANDOFF_KEY = 'samche:website-chat-lead';
const VERSION = 2;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const leadFields = ['name','email','company','industry','country','website','mainGoal','channels','products','languages','integrations','volume','likelyPlan','recommendedPlan','preferredPlan','timeline','contactPreference','demoInterest','preferredDemoDate','preferredDemoTime','teamUsers','leadQualification','budget','apiWorkflow','apiAccessNeed','customWorkflowNeed','aiGuideNeed','externalIntegrations','aiLeadScoring'];
const stateFields = ['lead','intent','turns','lastQuestion','qualificationStage','commercialIntent','summaryReadiness','pendingQualificationField','lastPendingQuestion','offTopicTurns'];
const allowedRoles = new Set(['assistant', 'user']);
const allowedActionTypes = new Set(['link', 'demo', 'whatsapp']);
const allowedDemoUrls = new Set(['https://demo.samchecompany.com/', 'https://rehber.samchecompany.ae/']);
const allowedLocales = new Set(['en', 'tr', 'ar']);
const allowedModes = new Set(['sales', 'support']);
const maxMessages = 120;
const maxArticleRefs = 6;

function defaultContext() {
  return { mode: 'sales', product: '', plan: '', supportIssue: '', articleRefs: [], imageSummary: '', imageModule: '' };
}

function boundedText(value, maximum) {
  return typeof value === 'string' ? value.slice(0, maximum) : '';
}
function sanitizeLead(lead) {
  if (!lead || typeof lead !== 'object') return lead;
  return Object.fromEntries(leadFields.filter((key) => Object.hasOwn(lead, key)).map((key) => [key, lead[key]]));
}

function sanitizeMessage(message) {
  if (!message || typeof message !== 'object') return message;
  return {
    role: message.role, text: message.text, time: message.time,
    ...(message.title === undefined ? {} : { title: message.title }),
    ...(message.imageContext ? { imageContext: true } : {}),
    ...(Array.isArray(message.articleRefs) ? { articleRefs: message.articleRefs.filter((slug) => typeof slug === 'string').slice(0, maxArticleRefs) } : {}),
  };
}

function sanitizeContext(context, messages = []) {
  const source = context && typeof context === 'object' ? context : {};
  const refs = [...(Array.isArray(source.articleRefs) ? source.articleRefs : []), ...messages.flatMap((message) => Array.isArray(message?.articleRefs) ? message.articleRefs : [])]
    .filter((slug, index, values) => typeof slug === 'string' && values.indexOf(slug) === index).slice(0, maxArticleRefs);
  return {
    ...defaultContext(),
    mode: allowedModes.has(source.mode) ? source.mode : 'sales',
    product: boundedText(source.product, 160), plan: boundedText(source.plan, 80), supportIssue: boundedText(source.supportIssue, 500),
    articleRefs: refs, imageSummary: boundedText(source.imageSummary, 600), imageModule: boundedText(source.imageModule, 160),
  };
}

function sanitizeChatSession(value) {
  if (!value || typeof value !== 'object') return value;
  if (value.version !== 1 && value.version !== VERSION) return value;
  const source = value.version === 1 ? { ...value, version: VERSION } : value;
  const rawMessages = Array.isArray(source.messages) ? source.messages.map(sanitizeMessage) : source.messages;
  const messages = Array.isArray(rawMessages)
    ? rawMessages.filter((message) => !(message?.role === 'assistant' && hasUnsafeSalesClaim(message.text))).slice(-maxMessages)
    : rawMessages;
  const sourceState = source.state && typeof source.state === 'object' ? source.state : {};
  const state = Object.fromEntries(stateFields
    .filter((key) => Object.hasOwn(sourceState, key))
    .map((key) => [key, key === 'lead' ? sanitizeLead(sourceState.lead) : sourceState[key]]));
  return {
    version: VERSION, messages, state,
    actions: filterSalesActionsForLead(state.lead, source.actions || []),
    open: source.open,
    locale: allowedLocales.has(source.locale) ? source.locale : 'en',
    lastActiveAt: typeof source.lastActiveAt === 'string' ? source.lastActiveAt : new Date().toISOString(),
    context: sanitizeContext(source.context, messages || []),
    ...(source.sessionId === undefined ? {} : { sessionId: source.sessionId }),
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
  if (!value.messages.every((message) => message && allowedRoles.has(message.role) && typeof message.text === 'string' && message.text.length <= 6000 && typeof message.time === 'string' && (message.title === undefined || typeof message.title === 'string') && (!message.articleRefs || message.articleRefs.every((slug) => typeof slug === 'string')))) return null;
  if (!Array.isArray(value.actions) || !value.actions.every((action) => action && typeof action.label === 'string' && allowedActionTypes.has(action.type)
    && (action.type !== 'link' || allowedDemoUrls.has(action.href)))) return null;
  if (typeof value.open !== 'boolean' || !allowedLocales.has(value.locale)) return null;
  const timestamp = Date.parse(value.lastActiveAt);
  if (!Number.isFinite(timestamp) || Date.now() - timestamp > RETENTION_MS) return null;
  if (!value.context || !allowedModes.has(value.context.mode) || !Array.isArray(value.context.articleRefs)) return null;
  if (value.sessionId !== undefined && (typeof value.sessionId !== 'string' || value.sessionId.length > 120)) return null;
  return {
    version: VERSION, messages: value.messages, state: value.state, actions: value.actions, open: value.open,
    locale: value.locale, lastActiveAt: value.lastActiveAt, context: value.context,
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
    for (const key of [CHAT_STORAGE_KEY, LEGACY_CHAT_STORAGE_KEY]) {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const session = validateChatSession(sanitizeChatSession(JSON.parse(raw)));
      if (session) return session;
    }
    return null;
  } catch { return null; }
}

export function saveChatSession(storage, session) {
  storage ??= safeStorage();
  if (!storage || !session) return false;
  try {
    const value = sanitizeChatSession({ ...session, version: VERSION, lastActiveAt: session.lastActiveAt || new Date().toISOString() });
    if (!validateChatSession(value)) return false;
    storage.setItem(CHAT_STORAGE_KEY, JSON.stringify(value));
    storage.removeItem(LEGACY_CHAT_STORAGE_KEY);
    return true;
  } catch { return false; }
}

export function clearChatSession(storage) {
  storage ??= safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(CHAT_STORAGE_KEY);
    storage.removeItem(LEGACY_CHAT_STORAGE_KEY);
    storage.removeItem(LEAD_HANDOFF_KEY);
  } catch { /* A storage denial must not crash or block a clean in-memory session. */ }
}
