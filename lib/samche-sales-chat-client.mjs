import {
  applyValidatedSalesFields,
  getSalesDetectedIntent,
  getSalesInputLanguage,
  getSalesResponseMode,
  SALES_ACTION_CAPABILITIES,
  validateSalesReply,
} from './samche-sales-assistant.mjs';
import { getPublishedArticleUrl, getArticleBySlug, getHelpArticleSources } from './help-center/index.mjs';

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

export function buildSalesFallbackReply({ locale, input, messages = [], articleRefs = [], attachment = false }) {
  const language = localeFor(locale, input);
  const topic = supportTopic(input, messages);
  const refs = articleRefsFrom(messages, articleRefs);
  const hasVerifiedArticle = refs.length > 0;
  const followUp = /doğrulanmış makale yetersiz|makale yeterli değil|makale açılmıyor|link çalışmıyor|bu bağlantı açılmadı|burada tam olarak nereye tıklayacağım|bu adımı bulamadım|article.*(?:insufficient|not enough)|(?:article|link).*(?:not working|doesn't open|does not open)|where exactly.*click|can't find this step|أين أضغط|الرابط لا يعمل|المقالة.*غير كافية/u.test(input);
  const articleUrl = refs[0] ? getPublishedArticleUrl(refs[0], language) : null;
  if (followUp && articleUrl) {
    if (language === 'tr') return `Bu bağlantı açılmadıysa ilgili rehberi tekrar kontrol edeyim: [İlgili doğrulanmış makale](${articleUrl})\n\nSorununuzu buradan da adım adım çözmeye devam edebiliriz. WhatsApp için **Channels** bölümünü açın, etkilenen kanalı seçin, **Edit channel** içinde **Status** değerini **Active** yapın ve **Assigned assistant** ile **Save changes** seçeneklerini kontrol edin.`;
    if (language === 'ar') return `إذا لم يفتح الرابط، سأعيد التحقق من الدليل المرتبط: [مقالة المساعدة المعتمدة](${articleUrl})\n\nيمكننا متابعة حل المشكلة هنا خطوة بخطوة. بالنسبة إلى واتساب، افتحوا **القنوات (Channels)**، اختاروا القناة المتأثرة، ثم تحققوا من **الحالة (Status)** بقيمة **Active** ومن **Assigned assistant** واختاروا **Save changes**.`;
    return `If the link did not open, I’ll check the related guide again: [Read the verified help article](${articleUrl})\n\nWe can continue troubleshooting here step by step. For WhatsApp, open **Channels**, select the affected channel, set **Status** to **Active** in **Edit channel**, then check **Assigned assistant** and choose **Save changes**.`;
  }
  const hasScreenshot = Boolean(attachment || messages.some((message) => message?.imageContext));
  if (topic === 'whatsapp') {
    if (language === 'tr') return `WhatsApp yanıt vermiyorsa, makaleyi tekrar etmek yerine şu doğrulanmış adımları izleyin:\n\n1. **Channels** bölümünü açın.\n2. Etkilenen WhatsApp kanalını seçin.\n3. **Edit channel** içinde **Status** değerini **Active** yapın.\n4. **Assigned assistant** alanını kontrol edip **Save changes** seçin.\n\n${hasScreenshot ? 'Ekran görüntüsü bu akışın bağlamında; görünen durum farklıysa ilgili kanal adını ve ekrandaki uyarıyı paylaşın.' : 'Bu seçenekleri görmüyorsanız, çalışma alanı yöneticinizin kanal yönetimi erişimini kontrol etmesi gerekir.'}${followUp ? ' Sorun devam ederse, görünen hata metnini ve kanal durumunu birlikte inceleyebiliriz.' : ''}`;
    if (language === 'ar') return `إذا كان WhatsApp لا يرد، فاتبعوا هذه الخطوات المعتمدة بدلاً من تكرار المقالة:\n\n1. افتحوا قسم **Channels**.\n2. اختاروا قناة WhatsApp المتأثرة.\n3. من **Edit channel** اجعلوا **Status** بقيمة **Active**.\n4. تحققوا من **Assigned assistant** ثم اختاروا **Save changes**.\n\n${hasScreenshot ? 'تبقى لقطة الشاشة ضمن سياق المشكلة؛ إذا اختلفت الحالة الظاهرة، شاركوني اسم القناة ورسالة التنبيه.' : 'إذا لم تظهر هذه الخيارات، فتحققوا من أن مدير مساحة العمل يملك صلاحية إدارة القنوات.'}${followUp ? ' إذا استمرت المشكلة، سنراجع رسالة الخطأ وحالة القناة معاً.' : ''}`;
    return `If WhatsApp is not replying, use these verified steps instead of repeating the article:\n\n1. Open **Channels**.\n2. Select the affected WhatsApp channel.\n3. In **Edit channel**, set **Status** to **Active**.\n4. Check **Assigned assistant**, then select **Save changes**.\n\n${hasScreenshot ? 'The screenshot remains part of this troubleshooting context; if the visible state differs, share the channel name and the visible warning.' : 'If these controls are not visible, your workspace administrator may need to check channel-management access.'}${followUp ? ' If the issue continues, we can review the visible error and channel status together.' : ''}`;
  }
  if (topic === 'aiGuide') {
    if (language === 'tr') return 'AI Guide adımını netleştirelim. Mevcut yapılandırmanızda doğrulanmamış bir menü adı uydurmamak için, ekrandaki AI Guide başlığını ve görünen uyarıyı paylaşın; varsa doğrulanmış makalenin kritik adımlarını doğrudan özetleyebilirim.';
    if (language === 'ar') return 'لنحدد خطوة AI Guide بدقة. حتى لا أوجّهكم إلى قائمة غير مؤكدة في إعدادكم الحالي، شاركوني عنوان AI Guide والتنبيه الظاهر؛ ويمكنني تلخيص الخطوات المعتمدة مباشرة من المقالة ذات الصلة.';
    return 'Let’s narrow down the AI Guide step. I do not want to invent a menu name that may not exist in your configuration, so share the visible AI Guide heading and warning. I can then summarize the verified steps directly instead of repeating the article.';
  }
  if (language === 'tr') return `Talebinizi aldım. Yanıt servisi kısa süreliğine tamamlanamadı; yine de yardımcı olmaya devam edelim. ${hasVerifiedArticle ? 'Önerilen makalenin kritik adımlarını doğrudan özetleyebilmem için ' : ''}Etkilenen SamChe AI özelliğini, ekranda gördüğünüz uyarıyı ve son denediğiniz adımı yazın. Böylece doğrulanmış dashboard adımlarını birlikte izleyebiliriz.`;
  if (language === 'ar') return `وصل طلبكم. تعذر إكمال الرد الآلي مؤقتاً، لكن يمكننا متابعة الحل. ${hasVerifiedArticle ? 'يمكنني تلخيص الخطوات المهمة من المقالة المعتمدة مباشرة؛ ' : ''}اذكروا ميزة SamChe AI المتأثرة والتنبيه الظاهر وآخر خطوة جربتموها، وسأتابع معكم خطوات لوحة التحكم المعتمدة.`;
  return `I received your request. The automated reply could not be completed just now, but we can keep troubleshooting. ${hasVerifiedArticle ? 'I can summarize the critical steps from the verified article directly; ' : ''}Tell me which SamChe AI feature is affected, the visible warning, and the last step you tried, and I’ll continue with verified dashboard guidance.`;
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
    const fallback = buildSalesFallbackReply({ locale, input: userMessage.text, messages, state: state || stateCandidate.state, articleRefs: fallbackArticleRefs, attachment: Boolean(attachment || userMessage.imageContext) });
    return {
      messages: [...messages, userMessage, { role: 'assistant', text: fallback, articleRefs: fallbackArticleRefs, time }],
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
