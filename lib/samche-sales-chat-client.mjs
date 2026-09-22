import {
  applyValidatedSalesFields,
  getSalesDetectedIntent,
  getSalesInputLanguage,
  getSalesResponseMode,
  SALES_ACTION_CAPABILITIES,
  validateSalesReply,
} from './samche-sales-assistant.mjs';

const REQUIRED_REPLY_KEYS = ['reply', 'intent', 'responseMode', 'resumePendingQuestion', 'extractedFields', 'requestedNextField', 'actionIntent'];
const VALID_INTENTS = new Set(['sales', 'qualification', 'product_question', 'capability_question', 'feature_question', 'pricing_question', 'pricing', 'demo_question', 'support', 'technical_troubleshooting', 'off_topic', 'handoff']);
const VALID_RESPONSE_MODES = new Set(['qualification_answer', 'in_scope_interrupt', 'pricing_interrupt', 'capability_interrupt', 'demo_interrupt', 'support', 'off_topic', 'handoff']);
const VALID_REQUESTED_FIELDS = new Set(['industry', 'channels', 'volume', 'integrations', 'leadQualification', 'languages', 'aiGuideNeed', 'apiWorkflow', 'externalIntegrations', 'aiLeadScoring', 'teamUsers', 'timeline', 'contactPreference']);
const VALID_EXTRACTED_FIELDS = new Set(['name', 'email', 'company', 'industry', 'country', 'website', 'mainGoal', 'channels', 'products', 'languages', 'integrations', 'volume', 'timeline', 'contactPreference', 'preferredDemoDate', 'preferredDemoTime', 'teamUsers', 'leadQualification', 'budget', 'apiWorkflow', 'apiAccessNeed', 'customWorkflowNeed', 'aiGuideNeed', 'externalIntegrations', 'aiLeadScoring']);
const VALID_ACTIONS = new Set(['REQUEST_DEMO', 'WHATSAPP_HANDOFF']);

function salesRetryMessage(locale, input) {
  if (getSalesInputLanguage(input) === 'tr') return 'Şu anda AI yanıtına ulaşılamıyor, lütfen tekrar deneyin.';
  if (getSalesInputLanguage(input) === 'ar') return 'يتعذر الوصول إلى رد الذكاء الاصطناعي حالياً، يرجى المحاولة مرة أخرى.';
  if (locale === 'ar') return 'يتعذر الوصول إلى رد الذكاء الاصطناعي حالياً، يرجى المحاولة مرة أخرى.';
  if (locale === 'tr') return 'Şu anda AI yanıtına ulaşılamıyor, lütfen tekrar deneyin.';
  return 'AI response is unavailable right now. Please try again.';
}

function invalidReply(reason, source = 'contract') {
  return { reply: null, diagnostic: { source, contractReason: reason } };
}

function parseSalesReply(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return invalidReply('missing-required-fields');
  if (!REQUIRED_REPLY_KEYS.every((key) => Object.hasOwn(body, key))) return invalidReply('missing-required-fields');
  const result = body;
  if (typeof result.reply !== 'string' || !result.reply.trim() || typeof result.intent !== 'string' || !result.intent.trim()
    || !result.extractedFields || typeof result.extractedFields !== 'object' || Array.isArray(result.extractedFields)
    || !Array.isArray(result.actionIntent)) return invalidReply('missing-required-fields');
  if (!VALID_INTENTS.has(result.intent)
    || typeof result.responseMode !== 'string' || !VALID_RESPONSE_MODES.has(result.responseMode)
    || (result.requestedNextField !== null && (typeof result.requestedNextField !== 'string' || !VALID_REQUESTED_FIELDS.has(result.requestedNextField)))
    || !result.actionIntent.every((action) => typeof action === 'string' && VALID_ACTIONS.has(action))
    || typeof result.resumePendingQuestion !== 'boolean'
    || !Object.entries(result.extractedFields).every(([key, value]) => VALID_EXTRACTED_FIELDS.has(key)
      && (key === 'channels' || key === 'products'
        ? Array.isArray(value) && value.every((item) => typeof item === 'string')
        : typeof value === 'string' || typeof value === 'boolean'))) return invalidReply('invalid-response', 'provider');
  return {
    reply: {
      reply: result.reply.trim(), intent: result.intent, responseMode: result.responseMode,
      extractedFields: result.extractedFields, requestedNextField: result.requestedNextField,
      actionIntent: result.actionIntent,
      resumePendingQuestion: result.resumePendingQuestion,
    },
  };
}

export async function requestNaturalSalesReply({ state, messages, userMessage, locale, attachment, apiBaseUrl, fetchImpl = fetch }) {
  let response;
  try {
    response = await fetchImpl(`${apiBaseUrl}/api/sales-chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        locale, inputLanguage: getSalesInputLanguage(userMessage), conversationHistory: messages.slice(-12), leadState: state.lead,
        qualificationStage: state.qualificationStage, pendingField: state.pendingQualificationField,
        pendingQualificationField: state.pendingQualificationField, lastPendingQuestion: state.lastPendingQuestion,
        lastQuestion: state.lastQuestion,
        responseMode: getSalesResponseMode(userMessage), detectedIntent: getSalesDetectedIntent(userMessage), actionCapabilities: SALES_ACTION_CAPABILITIES,
        recommendedPlan: state.lead.recommendedPlan || state.lead.likelyPlan, allowedActions: ['REQUEST_DEMO', 'WHATSAPP_HANDOFF'],
        userMessage, ...(attachment ? { attachment } : {}),
      }),
    });
  } catch {
    return { reply: null, diagnostic: { source: 'network' } };
  }
  if (!response.ok) return { reply: null, diagnostic: { source: 'http', httpStatus: response.status } };
  try {
    return parseSalesReply(await response.json());
  } catch {
    return invalidReply('malformed-json');
  }
}

export async function resolveSalesChatTurn({ state, stateCandidate, messages, userMessage, locale, attachment, time, apiBaseUrl, fetchImpl = fetch }) {
  const request = await requestNaturalSalesReply({ state: stateCandidate.state, messages, userMessage: userMessage.text, locale, attachment, apiBaseUrl, fetchImpl });
  if (!request.reply) {
    return {
      messages: [...messages, userMessage],
      state: state || stateCandidate.state, actions: state ? [] : stateCandidate.actions, retryMessage: salesRetryMessage(locale, userMessage.text),
      diagnostic: request.diagnostic, usedFallback: false, providerFailed: true,
    };
  }
  return {
    messages: [...messages, userMessage, { role: 'assistant', text: validateSalesReply(request.reply.reply, SALES_ACTION_CAPABILITIES, getSalesInputLanguage(userMessage.text)), time }],
    state: applyValidatedSalesFields(stateCandidate.state, request.reply.extractedFields), actions: stateCandidate.actions,
    retryMessage: '', usedFallback: false,
  };
}
