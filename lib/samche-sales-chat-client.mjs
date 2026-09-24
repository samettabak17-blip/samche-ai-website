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

const REQUIRED_REPLY_KEYS = ['reply', 'intent', 'responseMode', 'resumePendingQuestion', 'extractedFields', 'requestedNextField', 'actionIntent'];
const VALID_INTENTS = new Set(['sales', 'qualification', 'product_question', 'capability_question', 'feature_question', 'pricing_question', 'pricing', 'demo_question', 'support', 'technical_troubleshooting', 'off_topic', 'handoff']);
const VALID_RESPONSE_MODES = new Set(['qualification_answer', 'in_scope_interrupt', 'pricing_interrupt', 'capability_interrupt', 'demo_interrupt', 'support', 'off_topic', 'handoff']);
const VALID_REQUESTED_FIELDS = new Set(['industry', 'channels', 'volume', 'integrations', 'leadQualification', 'languages', 'aiGuideNeed', 'apiWorkflow', 'externalIntegrations', 'aiLeadScoring', 'teamUsers', 'timeline', 'contactPreference']);
const VALID_EXTRACTED_FIELDS = new Set(['name', 'email', 'company', 'industry', 'country', 'website', 'mainGoal', 'channels', 'products', 'languages', 'integrations', 'volume', 'timeline', 'contactPreference', 'preferredDemoDate', 'preferredDemoTime', 'teamUsers', 'leadQualification', 'budget', 'apiWorkflow', 'apiAccessNeed', 'customWorkflowNeed', 'aiGuideNeed', 'externalIntegrations', 'aiLeadScoring']);
const VALID_ACTIONS = new Set(['REQUEST_DEMO', 'WHATSAPP_HANDOFF']);

function localeFor(locale, input) {
  const detected = getSalesInputLanguage(input);
  return ['en', 'tr', 'ar'].includes(detected) ? detected : (['en', 'tr', 'ar'].includes(locale) ? locale : 'en');
}

function supportTopic(input, messages = []) {
  const text = [input, ...messages.flatMap((message) => [message?.text || '', ...(message?.articleRefs || [])])].join(' ').toLowerCase();
  if (/whatsapp/.test(text)) return 'whatsapp';
  if (/ai guide/.test(text)) return 'aiGuide';
  if (/support|issue|error|problem|troubleshoot|sorun|hata|destek|مشكلة|خطأ|دعم/u.test(text)) return 'support';
  return '';
}

function articleRefsFrom(messages = [], explicitRefs = []) {
  return [...new Set([...explicitRefs, ...messages.flatMap((message) => Array.isArray(message?.articleRefs) ? message.articleRefs : [])])]
    .filter((slug) => typeof slug === 'string' && getArticleBySlug(slug, 'en')).slice(0, 3);
}

function articleRefsForInput(input, locale) {
  return getHelpArticleSources(input, locale, 1).map((article) => article.slug);
}

const DASHBOARD_MATCHERS = [
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
  ['Dashboard Overview', /dashboard|overview|analytics|panel|genel görünüm|لوحة|تحليلات/u],
  ['Support Portal', /support|destek|دعم/u],
];

function supportContextText(input, messages = [], state = {}) {
  const messageText = messages.flatMap((message) => [message?.text, message?.imageSummary, message?.imageModule]).filter(Boolean);
  return [input, ...messageText, state?.context?.supportIssue, state?.context?.imageSummary, state?.context?.imageModule].filter(Boolean).join(' ');
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

function articleSteps(article, maximum = 6) {
  return article?.sections?.flatMap((section) => section.steps || []).filter(Boolean).slice(0, maximum) || [];
}

function localizedEvidenceQuestion(language) {
  if (language === 'tr') return 'İncelemeyi tamamlamak için görünen hata metni, etkilenen kayıt/kanal adı ve yaklaşık hata zamanı nedir?';
  if (language === 'ar') return 'لاستكمال التحقيق، ما نص الخطأ الظاهر واسم القناة أو السجل المتأثر والوقت التقريبي للمشكلة؟';
  return 'To complete the investigation, what is the visible error, affected channel or record name, and approximate failure time?';
}

function managedBoundaryReply(language, entry) {
  const evidence = localizedEvidenceQuestion(language);
  if (language === 'tr') return `**${entry.area}** için doğrulanmış bir müşteri ayar ekranı yok; ayrıca doğrulanmış bir menü veya durum kontrolü bulunmuyor. Bu alan uygulama ekibi tarafından yönetilir; tenant ya da sağlayıcı durumunu buradan kontrol ettiğimi iddia edemem. ${evidence}`;
  if (language === 'ar') return `لا يوجد إعداد أو قائمة أو حالة معتمدة موجهة للعميل لـ **${entry.area}** في لوحة التحكم. يدير فريق التنفيذ هذا المجال، ولا يمكنني الادعاء بأنني تحققت من حالة الحساب أو المزوّد. ${evidence}`;
  return `There is no verified customer-facing setting, menu, or status control for **${entry.area}** in the Dashboard. This area is implementation-managed, and I cannot claim to have checked tenant or provider state. ${evidence}`;
}

function localizedAreaName(language, area) {
  if (language === 'ar' && area === 'WhatsApp AI') return 'واتساب (WhatsApp AI)';
  return area;
}

function unverifiedBoundaryReply(language, entry) {
  const evidence = localizedEvidenceQuestion(language);
  if (language === 'tr') return `**${entry.area}** için doğrulanmış bağımsız bir müşteri rotası veya kontrolü yok. Var olmayan bir menü yönlendirmesi vermeyeceğim. ${evidence}`;
  if (language === 'ar') return `لا يوجد مسار أو تحكم مستقل معتمد موجه للعميل لـ **${entry.area}**، لذلك لن أوجّهكم إلى قائمة غير موجودة. ${evidence}`;
  return `No independent customer-facing route or control is verified for **${entry.area}**, so I will not direct you to a control that may not exist. ${evidence}`;
}

export function buildGroundedSupportRecovery({ language, locale, input, messages = [], state = {}, articleRefs = [], attachment = false }) {
  const replyLanguage = localeFor(language || locale, input);
  const contextText = supportContextText(input, messages, state);
  const entry = selectDashboardEntry(contextText);
  const kind = followUpKind(input);
  const priorRefs = articleRefsFrom(messages, articleRefs);
  const searchedSources = getHelpArticleSources(entry ? `${entry.area} ${input}` : contextText, replyLanguage, 3);
  const primarySearchedRef = searchedSources[0]?.slug;
  const selectedRefs = [...new Set([
    ...(kind ? priorRefs : []),
    ...(primarySearchedRef ? [primarySearchedRef] : []),
    ...(!kind ? priorRefs : []),
  ])].slice(0, kind ? 3 : 1);
  const primary = getArticleBySlug(selectedRefs[0], replyLanguage);
  const related = kind === 'insufficient' && primary
    ? primary.related.map((slug) => getArticleBySlug(slug, replyLanguage)).filter(Boolean).slice(0, 2)
    : [];
  const hasScreenshot = Boolean(attachment || messages.some((message) => message?.imageContext) || state?.context?.imageSummary);

  if (entry?.status === 'implementation_team_managed') return { reply: managedBoundaryReply(replyLanguage, entry), articleRefs: selectedRefs };
  if (entry?.status === 'unverified') return { reply: unverifiedBoundaryReply(replyLanguage, entry), articleRefs: selectedRefs };

  const steps = [...articleSteps(primary), ...related.flatMap((article) => articleSteps(article, 2))].slice(0, kind === 'insufficient' ? 8 : 5);
  const fallbackSteps = entry?.customerSteps || [];
  const effectiveSteps = steps.length ? steps : fallbackSteps;
  const numbered = effectiveSteps.map((step, index) => `${index + 1}. ${step}`).join('\n');
  const plan = primary?.plan || entry?.plan || '';
  const permissions = primary?.permissions || entry?.permissions || '';
  const boundary = primary?.problems || entry?.limitations?.[0] || '';
  const navigation = primary?.navigation || (entry?.nav ? `${entry.nav}${entry.path ? ` — ${entry.path}` : ''}` : '');
  const evidenceQuestion = localizedEvidenceQuestion(replyLanguage);

  let heading;
  if (replyLanguage === 'tr') heading = kind === 'broken-link' ? 'Bağlantıyı doğrulanmış makale kartıyla yeniden sunacağım; çözümü burada da sürdürelim.' : kind === 'insufficient' ? 'Makaleyi tekrarlamak yerine doğrulanmış ve ilgili rehberlerdeki adımları derinleştirelim.' : 'Doğrulanmış SamChe AI bilgisiyle ilerleyelim.';
  else if (replyLanguage === 'ar') heading = kind === 'broken-link' ? 'سأعيد عرض الرابط عبر بطاقة المقالة المعتمدة، وسنتابع الحل هنا أيضاً.' : kind === 'insufficient' ? 'بدلاً من تكرار المقالة، سنفصّل الخطوات من الدليل المعتمد والأدلة ذات الصلة.' : 'لنتابع استناداً إلى معلومات SamChe AI المعتمدة.';
  else heading = kind === 'broken-link' ? 'I will reissue the link through its verified article card and continue the solution here.' : kind === 'insufficient' ? 'Instead of repeating the article, here is a deeper sequence from the verified guide and related guidance.' : 'Here is the verified SamChe AI path for this issue.';

  const labels = replyLanguage === 'tr'
    ? { visible: 'Ekranda görünen', verified: 'Doğrulanmış bilgi', remaining: 'Hâlâ incelenmesi gereken', path: 'Yol', boundary: 'Sınır' }
    : replyLanguage === 'ar'
      ? { visible: 'ما يظهر في الشاشة', verified: 'المعلومات المعتمدة', remaining: 'ما يزال يحتاج إلى تحقيق', path: 'المسار', boundary: 'الحدود' }
      : { visible: 'Visible evidence', verified: 'Verified documentation', remaining: 'Still needs investigation', path: 'Path', boundary: 'Boundary' };

  if (!entry && !primary) {
    const unknown = replyLanguage === 'tr'
      ? `Bu istek için doğrulanmış bir kontrol veya makale eşleşmesi bulamadım; menü ya da tenant durumu uydurmayacağım. ${evidenceQuestion}`
      : replyLanguage === 'ar'
        ? `لم أجد تحكماً أو مقالة معتمدة تطابق هذا الطلب، ولن أخترع قائمة أو حالة للحساب. ${evidenceQuestion}`
        : `I could not find a verified control or published article for this request, so I will not invent a menu or tenant state. ${evidenceQuestion}`;
    return { reply: unknown, articleRefs: [] };
  }

  const screenshotSummary = messages.map((message) => message?.imageSummary).find(Boolean) || state?.context?.imageSummary || (replyLanguage === 'tr' ? 'Ekran görüntüsü bu görüşmenin mevcut kanıtıdır.' : replyLanguage === 'ar' ? 'لقطة الشاشة هي الدليل المرئي المتاح في هذه المحادثة.' : 'The screenshot is the visible evidence available in this conversation.');
  const parts = [heading];
  if (hasScreenshot) parts.push(`**${labels.visible}:** ${screenshotSummary}`);
  parts.push(`**${labels.verified}:** ${entry ? localizedAreaName(replyLanguage, entry.area) : primary?.title}${navigation ? `\n\n**${labels.path}:** ${navigation}` : ''}${numbered ? `\n\n${numbered}` : ''}`);
  if (plan || permissions || boundary) parts.push(`**${labels.boundary}:** ${[plan, permissions, boundary].filter(Boolean).join(' ')}`);
  parts.push(`**${labels.remaining}:** ${evidenceQuestion}`);
  return { reply: parts.join('\n\n'), articleRefs: selectedRefs };
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
    const priorArticleRefs = articleRefsFrom(messages);
    const fallbackArticleRefs = priorArticleRefs.length ? priorArticleRefs : articleRefsForInput(userMessage.text, locale);
    const recovery = buildGroundedSupportRecovery({ locale, input: userMessage.text, messages, state: state || stateCandidate.state, articleRefs: fallbackArticleRefs, attachment: Boolean(attachment || userMessage.imageContext) });
    return {
      messages: [...messages, userMessage, { role: 'assistant', text: recovery.reply, articleRefs: recovery.articleRefs, time }],
      state: state || stateCandidate.state, actions: state ? [] : stateCandidate.actions, retryMessage: '',
      diagnostic: request.diagnostic, usedFallback: true, providerFailed: true,
    };
  }
  return {
    messages: [...messages, userMessage, { role: 'assistant', text: validateSalesReply(request.reply.reply, SALES_ACTION_CAPABILITIES, getSalesInputLanguage(userMessage.text)), articleRefs: request.reply.articleRefs || [], time }],
    state: applyValidatedSalesFields(stateCandidate.state, request.reply.extractedFields), actions: stateCandidate.actions,
    retryMessage: '', usedFallback: false,
  };
}
