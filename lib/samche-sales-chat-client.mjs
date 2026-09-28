import {
  applyValidatedSalesFields,
  getSalesDetectedIntent,
  getSalesInputLanguage,
  getSalesResponseMode,
  SALES_ACTION_CAPABILITIES,
  validateSalesReply,
} from './samche-sales-assistant.mjs';
import { getArticleBySlug, getHelpArticleSources } from './help-center/index.mjs';
import { dashboardSupportMap } from './support-dashboard-map.mjs';
import { buildSupportRetrievalQuery, containsInternalSupportLeak } from './customer-support-grounding.mjs';

const REQUIRED_REPLY_KEYS = ['reply', 'intent', 'responseMode', 'resumePendingQuestion', 'extractedFields', 'requestedNextField', 'actionIntent'];
const VALID_INTENTS = new Set(['sales', 'qualification', 'product_question', 'capability_question', 'feature_question', 'pricing_question', 'pricing', 'demo_question', 'support', 'technical_troubleshooting', 'off_topic', 'handoff']);
const VALID_RESPONSE_MODES = new Set(['qualification_answer', 'in_scope_interrupt', 'pricing_interrupt', 'capability_interrupt', 'demo_interrupt', 'support', 'off_topic', 'handoff']);
const VALID_REQUESTED_FIELDS = new Set(['industry', 'channels', 'volume', 'integrations', 'leadQualification', 'languages', 'aiGuideNeed', 'apiWorkflow', 'externalIntegrations', 'aiLeadScoring', 'teamUsers', 'timeline', 'contactPreference']);
const VALID_EXTRACTED_FIELDS = new Set(['name', 'email', 'company', 'industry', 'country', 'website', 'mainGoal', 'channels', 'products', 'languages', 'integrations', 'volume', 'timeline', 'contactPreference', 'preferredDemoDate', 'preferredDemoTime', 'teamUsers', 'leadQualification', 'budget', 'apiWorkflow', 'apiAccessNeed', 'customWorkflowNeed', 'aiGuideNeed', 'externalIntegrations', 'aiLeadScoring']);
const VALID_ACTIONS = new Set(['REQUEST_DEMO', 'WHATSAPP_HANDOFF']);

function localeFor(locale, input) {
  return resolveConversationLanguage(input, locale, locale);
}

const CHAT_LANGUAGES = new Set(['en', 'tr', 'ar']);
const LANGUAGE_NEUTRAL_TERMS = new Set(['ai', 'samche', 'whatsapp', 'crm', 'pdf', 'api', 'url', 'id', 'web', 'chatbot', 'guide']);

function hasMeaningfulEnglishInput(input) {
  const terms = String(input || '').replace(/https?:\/\/\S+/gi, ' ').toLowerCase().match(/[a-z]+/g) || [];
  return terms.some((term) => term.length > 1 && !LANGUAGE_NEUTRAL_TERMS.has(term));
}

export function resolveConversationLanguage(input, previousLanguage = '', siteLocale = 'en') {
  const detected = getSalesInputLanguage(input);
  if (detected === 'tr' || detected === 'ar') return detected;
  if (detected === 'en' && hasMeaningfulEnglishInput(input)) return 'en';
  if (CHAT_LANGUAGES.has(previousLanguage)) return previousLanguage;
  return CHAT_LANGUAGES.has(siteLocale) ? siteLocale : 'en';
}

function articleRefsFrom(messages = [], explicitRefs = []) {
  const recentMessageRefs = [...messages].reverse().flatMap((message) => Array.isArray(message?.articleRefs) ? message.articleRefs : []);
  return [...new Set([...recentMessageRefs, ...explicitRefs])]
    .filter((slug) => typeof slug === 'string' && getArticleBySlug(slug, 'en')).slice(0, 3);
}

function articleRefsForInput(input, locale) {
  return getHelpArticleSources(input, locale, 1).map((article) => article.slug);
}

const DASHBOARD_MATCHERS = [
  ['Instagram DM AI', /\binstagram\b|إنستغرام|انستغرام/iu],
  ['AI Visual generation', /ai visual|görsel|مرئي|صور/u],
  ['AI Voice', /ai voice|sesli|صوت/u],
  ['Integrations', /integration|entegrasyon|تكامل/u],
  ['Knowledge Approvals', /knowledge.*(?:approval|candidate)|bilgi.*(?:onay|aday)|اعتماد.*معرف|مرشح/u],
  ['Knowledge Intelligence', /knowledge intelligence|knowledge.*(?:source|document|processing|index)|bilgi.*(?:kaynak|belge|işle)|معرف.*(?:مصدر|مستند|معالج)/u],
  ['Web Chatbot', /web chat|widget|site chatbot|ويب|روبوت الموقع/u],
  ['WhatsApp AI', /whatsapp/u],
  ['AI Guide', /ai guide|guide experience/u],
  ['Conversations / Shared Inbox', /shared inbox|conversation|inbox|görüşme|gelen kutusu|محادث|صندوق/u],
  ['CRM Leads', /crm lead|\blead\b|aday|عميل محتمل/u],
  ['Pipeline', /pipeline|deal|fırsat|صفقة/u],
  ['AI Assistants', /assistant|asistan|مساعد/u],
  ['Account Settings', /billing|usage|account|plan|fatura|kullanım|hesap|paket|فوترة|استخدام|حساب|خطة/u],
  ['Dashboard Overview', /overview|analytics|genel görünüm|analitik|نظرة عامة|تحليلات/u],
  ['Support Portal', /support|destek|دعم/u],
];

function supportContextText(input, messages = [], state = {}) {
  const userContext = buildSupportRetrievalQuery({ userMessage: input, conversationHistory: messages });
  const recentAssistantContext = messages.slice(-4)
    .filter((message) => message?.role === 'assistant')
    .flatMap((message) => [message?.text, message?.imageSummary, message?.imageModule])
    .filter(Boolean);
  return [userContext, ...recentAssistantContext, state?.context?.supportIssue, state?.context?.imageSummary, state?.context?.imageModule].filter(Boolean).join(' ');
}

function selectDashboardEntry(text) {
  const folded = String(text || '').toLocaleLowerCase('en-US');
  const match = DASHBOARD_MATCHERS.find(([, pattern]) => pattern.test(folded));
  return match ? dashboardSupportMap.find((entry) => entry.area === match[0]) || null : null;
}

function followUpKind(input) {
  if (/makale açılmıyor|link çalışmıyor|bağlantı çalışmıyor|article.*(?:won't|doesn't|does not).*open|link.*not working|الرابط لا يعمل|المقالة لا تفتح/iu.test(input)) return 'broken-link';
  if (/makale yetersiz|daha detaylı anlat|bu çözmedi|article.*(?:insufficient|not enough)|explain.*detail|didn.t solve|المقالة.*غير كافية|اشرح.*تفصيل|لم يحل/iu.test(input)) return 'insufficient';
  return '';
}

function articleSteps(article, language, maximum = 6) {
  const directSteps = article?.selfServiceSteps?.map((step) => typeof step === 'string' ? step : step?.[language] || step?.en).filter(Boolean) || [];
  if (directSteps.length) return directSteps.slice(0, maximum);
  return article?.sections?.flatMap((section) => section.steps || []).filter(Boolean).slice(0, maximum) || [];
}

function localizedEvidenceQuestion(language) {
  if (language === 'tr') return 'Tam hata metnini veya ekran görüntüsünü ve uyarının ne zaman çıktığını paylaşabilir misiniz?';
  if (language === 'ar') return 'هل يمكنكم مشاركة نص الخطأ الكامل أو لقطة شاشة، ووقت ظهور الرسالة؟';
  return 'Could you share the exact error message or a screenshot, and when the warning appears?';
}

function managedBoundaryReply(language, entry) {
  const evidence = localizedEvidenceQuestion(language);
  if (language === 'tr') return `**${entry.area}** için Dashboard'da kullanabileceğiniz bir ayar bulunmuyor. Yanlış bir menüye yönlendirmeden yardımcı olabilmem için ${evidence.charAt(0).toLocaleLowerCase('tr-TR')}${evidence.slice(1)}`;
  if (language === 'ar') return `لا تتضمن لوحة التحكم إعداداً يمكنكم استخدامه لـ **${entry.area}**. حتى لا أوجهكم إلى قائمة غير موجودة، ${evidence}`;
  return `The Dashboard does not include a setting you can use for **${entry.area}**. To avoid directing you to a control that is not available, ${evidence.charAt(0).toLowerCase()}${evidence.slice(1)}`;
}

function localizedAreaName(language, area) {
  if (language === 'ar' && area === 'WhatsApp AI') return 'واتساب (WhatsApp AI)';
  return area;
}

function unverifiedBoundaryReply(language, entry) {
  const evidence = localizedEvidenceQuestion(language);
  if (language === 'tr') return `**${entry.area}** için Dashboard'da kullanabileceğiniz bağımsız bir bölüm bulunmuyor. ${evidence}`;
  if (language === 'ar') return `لا تتضمن لوحة التحكم قسماً مستقلاً يمكنكم استخدامه لـ **${entry.area}**. ${evidence}`;
  return `The Dashboard does not include a separate section you can use for **${entry.area}**. ${evidence}`;
}

function localizedNavigation(language, entry, article) {
  const label = entry?.nav || (/^Open\s+([^.;]+)/i.exec(article?.navigation || '')?.[1] ?? '');
  if (!label || /\/app\/|tenantId|https?:/i.test(label)) return '';
  if (language === 'tr') return `Dashboard'da **${label}** bölümünü açın.`;
  if (language === 'ar') return `افتحوا قسم **${label}** في لوحة التحكم.`;
  return `Open **${label}** in the Dashboard.`;
}

function localizedSupportText(language, value) {
  let text = String(value || '')
    .replace(/\/app\/:tenantId(?:\/[\w:.-]+)*/gi, '')
    .replace(/\btenantId\b/gi, '')
    .replace(/\btenants?\b/gi, 'workspace')
    .replace(/tenant(?:ı|i|a|e|ler|ları|leri)/giu, 'çalışma alanı')
    .replace(/\bunverified\b/gi, '')
    .replace(/\bverified\b/gi, '')
    .replace(/\bimplementation-managed\b/gi, 'SamChe Support')
    .replace(/\bimplementation\b/gi, 'SamChe Support')
    .replace(/\bregistry\b/gi, 'bilgi kaynağı')
    .replace(/\bboundary\b/gi, 'destek notu')
    .replace(/\s+/g, ' ')
    .trim();
  if (language === 'tr') return text
    .replace(/public chatbot/gi, 'herkese açık sohbet botu')
    .replace(/tenant(?:ı|i)?/gi, 'çalışma alanını')
    .replace(/\bprovisioning\b/gi, 'devreye alma')
    .replace(/doğrulanmış\s*/giu, '');
  if (language === 'ar') return text
    .replace(/public chatbot/gi, 'روبوت المحادثة العام')
    .replace(/\btenant\b/gi, 'مساحة العمل')
    .replace(/\bprovisioning\b/gi, 'التجهيز');
  return text;
}

function unknownSupportReply(language) {
  const evidence = localizedEvidenceQuestion(language);
  if (language === 'tr') return `Bu sorun için güvenilir bir çözüm önerebilmem adına daha fazla bilgiye ihtiyacım var. ${evidence}`;
  if (language === 'ar') return `أحتاج إلى مزيد من المعلومات قبل اقتراح خطوات موثوقة لهذه المشكلة. ${evidence}`;
  return `I need a little more information before I can suggest reliable steps for this issue. ${evidence}`;
}

function localizedIssueHeading(language, area, input) {
  const connectionIssue = /bağlan|connect|connection|اتصال|يتصل/iu.test(input);
  if (connectionIssue && language === 'tr') return `${area} bağlantısında “bağlanılamadı” uyarısı aldığınızı anlıyorum.`;
  if (connectionIssue && language === 'ar') return `أفهم أن رسالة تعذر الاتصال تظهر عند محاولة ربط ${area}.`;
  if (connectionIssue) return `I understand you are seeing a connection warning while trying to connect ${area}.`;
  if (language === 'tr') return `${area} sorununu birlikte inceleyelim.`;
  if (language === 'ar') return `لنراجع مشكلة ${area} خطوة بخطوة.`;
  return `Let’s work through the ${area} issue.`;
}

export function buildGroundedSupportRecovery({ language, locale, input, messages = [], state = {}, articleRefs = [], attachment = false }) {
  const replyLanguage = localeFor(language || locale, input);
  const contextText = supportContextText(input, messages, state);
  const entry = selectDashboardEntry(input) || selectDashboardEntry(contextText);
  const kind = followUpKind(input);
  const priorRefs = articleRefsFrom(messages, articleRefs);
  const relevantPriorRefs = entry ? priorRefs.filter((slug) => getArticleBySlug(slug, 'en')?.coverageAreas?.includes(entry.area)) : priorRefs;
  const searchedSources = getHelpArticleSources(entry ? `${entry.area} ${input}` : contextText, replyLanguage, 3);
  const instagramCapabilityQuestion = entry?.area === 'Instagram DM AI'
    && /manage|yönet|إدارة|can i|could i|mümkün mü|هل يمكن/iu.test(input)
    && !/error|fail|not replying|connect warning|hata|uyarı|yanıt verm|bağlanılamadı|خطأ|تعذر|لا يجيب/iu.test(input);
  const primarySearchedRef = instagramCapabilityQuestion ? 'instagram-dm-ai-setup' : searchedSources[0]?.slug;
  const selectedRefs = [...new Set([
    ...(kind ? relevantPriorRefs : []),
    ...(primarySearchedRef ? [primarySearchedRef] : []),
    ...(!kind ? relevantPriorRefs : []),
  ])].slice(0, kind ? 3 : 1);
  const primary = getArticleBySlug(selectedRefs[0], replyLanguage);
  const related = kind === 'insufficient' && primary
    ? primary.related.map((slug) => getArticleBySlug(slug, replyLanguage)).filter(Boolean).slice(0, 2)
    : [];
  const hasScreenshot = Boolean(attachment || messages.some((message) => message?.imageContext) || state?.context?.imageSummary);

  if (entry?.status === 'implementation_team_managed') return { reply: managedBoundaryReply(replyLanguage, entry), articleRefs: selectedRefs };
  if (entry?.status === 'unverified') return { reply: unverifiedBoundaryReply(replyLanguage, entry), articleRefs: selectedRefs };

  const steps = [...articleSteps(primary, replyLanguage), ...related.flatMap((article) => articleSteps(article, replyLanguage, 2))].slice(0, kind === 'insufficient' ? 8 : 5);
  const fallbackSteps = entry?.customerSteps || [];
  const effectiveSteps = (steps.length ? steps : fallbackSteps).map((step) => localizedSupportText(replyLanguage, step));
  const numbered = effectiveSteps.map((step, index) => `${index + 1}. ${step}`).join('\n');
  const navigation = localizedNavigation(replyLanguage, entry, primary);
  const evidenceQuestion = localizedEvidenceQuestion(replyLanguage);

  if (!entry && !primary) {
    return { reply: unknownSupportReply(replyLanguage), articleRefs: [] };
  }

  const screenshotSummary = messages.map((message) => message?.imageSummary).find(Boolean) || state?.context?.imageSummary || (replyLanguage === 'tr' ? 'Ekran görüntüsü bu görüşmenin mevcut kanıtıdır.' : replyLanguage === 'ar' ? 'لقطة الشاشة هي الدليل المرئي المتاح في هذه المحادثة.' : 'The screenshot is the visible evidence available in this conversation.');
  const area = entry ? localizedAreaName(replyLanguage, entry.area) : primary?.title;
  const heading = localizedIssueHeading(replyLanguage, area, input);
  const parts = [heading];
  if (hasScreenshot) parts.push(localizedSupportText(replyLanguage, screenshotSummary));
  if (navigation) parts.push(navigation);
  if (numbered) parts.push(numbered);
  parts.push(evidenceQuestion);
  const reply = parts.join('\n\n');
  return containsInternalSupportLeak(reply)
    ? { reply: unknownSupportReply(replyLanguage), articleRefs: [] }
    : { reply, articleRefs: selectedRefs };
}

export function buildSalesFallbackReply(options) {
  return buildGroundedSupportRecovery({ ...options, language: options.language || options.locale }).reply;
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
      articleRefs: Array.isArray(result.articleRefs) ? result.articleRefs.filter((slug) => typeof slug === 'string').slice(0, 3) : [],
      resumePendingQuestion: result.resumePendingQuestion,
    },
  };
}

export async function requestNaturalSalesReply({ state, messages, userMessage, locale, inputLanguage, attachment, apiBaseUrl, fetchImpl = fetch }) {
  let response;
  try {
    response = await fetchImpl(`${apiBaseUrl}/api/sales-chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        locale, inputLanguage: inputLanguage || resolveConversationLanguage(userMessage, '', locale), conversationHistory: messages.slice(-12), leadState: state.lead,
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

export async function resolveSalesChatTurn({ state, stateCandidate, messages, userMessage, locale, conversationLanguage: previousConversationLanguage, attachment, time, apiBaseUrl, fetchImpl = fetch }) {
  const conversationLanguage = resolveConversationLanguage(userMessage.text, previousConversationLanguage, locale);
  const localizedUserMessage = { ...userMessage, language: conversationLanguage };
  const request = await requestNaturalSalesReply({ state: stateCandidate.state, messages, userMessage: userMessage.text, locale, inputLanguage: conversationLanguage, attachment, apiBaseUrl, fetchImpl });
  if (!request.reply) {
    const priorArticleRefs = articleRefsFrom(messages);
    const fallbackArticleRefs = priorArticleRefs.length ? priorArticleRefs : articleRefsForInput(userMessage.text, conversationLanguage);
    const recovery = buildGroundedSupportRecovery({ language: conversationLanguage, locale, input: userMessage.text, messages, state: state || stateCandidate.state, articleRefs: fallbackArticleRefs, attachment: Boolean(attachment || userMessage.imageContext) });
    return {
      messages: [...messages, localizedUserMessage, { role: 'assistant', text: recovery.reply, articleRefs: recovery.articleRefs, time, language: conversationLanguage }],
      state: state || stateCandidate.state, actions: state ? [] : stateCandidate.actions, retryMessage: '',
      diagnostic: request.diagnostic, usedFallback: true, providerFailed: true, conversationLanguage,
    };
  }
  return {
    messages: [...messages, localizedUserMessage, { role: 'assistant', text: validateSalesReply(request.reply.reply, SALES_ACTION_CAPABILITIES, conversationLanguage), articleRefs: request.reply.articleRefs || [], time, language: conversationLanguage }],
    state: applyValidatedSalesFields(stateCandidate.state, request.reply.extractedFields), actions: stateCandidate.actions,
    retryMessage: '', usedFallback: false, conversationLanguage,
  };
}
