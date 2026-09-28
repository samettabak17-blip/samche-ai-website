import { dashboardSupportMap } from '../lib/support-dashboard-map.mjs';
import { getHelpArticleSources, getPublishedArticles } from '../lib/help-center/index.mjs';
import { buildGroundedSupportRecovery, resolveConversationLanguage } from '../lib/samche-sales-chat-client.mjs';
import { buildSupportRetrievalQuery, containsInternalSupportLeak, findGroundingLockedSubject, toCustomerGroundingPayload } from '../lib/customer-support-grounding.mjs';
const MODEL = 'gpt-4o-mini';
const VISION_MODEL = 'gpt-4o';
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 12;
const MAX_HISTORY_MESSAGE_LENGTH = 1200;
const ALLOWED_INTENTS = new Set(['sales', 'qualification', 'product_question', 'capability_question', 'feature_question', 'pricing_question', 'pricing', 'demo_question', 'support', 'technical_troubleshooting', 'off_topic', 'handoff']);
const ALLOWED_RESPONSE_MODES = new Set(['qualification_answer', 'in_scope_interrupt', 'pricing_interrupt', 'capability_interrupt', 'demo_interrupt', 'support', 'off_topic', 'handoff']);
const ALLOWED_NEXT_FIELDS = new Set(['industry', 'channels', 'volume', 'integrations', 'leadQualification', 'languages', 'aiGuideNeed', 'apiWorkflow', 'externalIntegrations', 'aiLeadScoring', 'teamUsers', 'timeline', 'contactPreference', null]);
const ALLOWED_LEAD_FIELDS = new Set(['name', 'email', 'company', 'industry', 'country', 'website', 'mainGoal', 'channels', 'products', 'languages', 'integrations', 'volume', 'timeline', 'contactPreference', 'preferredDemoDate', 'preferredDemoTime', 'teamUsers', 'leadQualification', 'budget', 'apiWorkflow', 'apiAccessNeed', 'customWorkflowNeed', 'aiGuideNeed', 'externalIntegrations', 'aiLeadScoring']);
const ALLOWED_ACTIONS = ['REQUEST_DEMO', 'WHATSAPP_HANDOFF'];
const PUBLISHED_HELP_SLUGS = new Set(getPublishedArticles('en').map((article) => article.slug));
export const SALES_CHAT_CAPABILITIES = Object.freeze({
  canScheduleCalendarMeeting: false,
  canConfirmAppointment: false,
  canSendEmail: false,
});
const SYSTEM_PROMPT = `You are the SamChe AI sales and support conversation layer. Return only the requested JSON. CURRENT USER MESSAGE HAS PRIORITY. Reply in the language of the latest user message.

CUSTOMER ANSWER CONTRACT:
- supportGrounding is an internal evidence payload, not customer copy. Use it to decide what is supported, then write a natural customer-support answer from scratch.
- Never mention or reproduce internal grounding schemas, article IDs, classifications, source metadata, diagnostic labels, implementation terminology, entitlement/capability keys, placeholders, or developer routes. Never print a path beginning with /app/ or any value containing tenantId.
- Never use headings or phrases such as "verified documentation", "verified route", "boundary", "still needs investigation", "registry", or localized equivalents. Refer only to Dashboard labels that a customer can see.
- When the supplied guidance is insufficient, do not invent a feature or fix. Acknowledge the specific subject and ask for the exact visible error or a screenshot.
- The latest user-message language is authoritative even when retrieved material or earlier turns use another language.

SUPPORT RULES:
- Support takes priority over sales qualification. If the user reports an issue, error, troubleshooting question, or is an existing customer, use intent "support" and responseMode "support". Never restart sales qualification, ask sales lead fields, or push plans during support turns.
- Sequence for support:
  1. Understand the problem and affected system (Web Chatbot, WhatsApp AI, AI Guide, AI Voice, AI Visual, Knowledge Intelligence, Live Inbox, CRM & Pipeline, Integrations).
  2. Plan entitlement awareness:
     - Starter: Includes 1 Web Chatbot (1 site), 2 languages, Knowledge Intelligence, Page-aware Context, Basic Lead Capture, Human Handover. (WhatsApp AI, AI Guide, AI Visual are NOT included). Support: 24/7 AI Support, Email Support (Business Hours), Support Portal.
     - Growth: Includes Web Chatbot + WhatsApp AI, Up to 3 languages, Advanced Knowledge Intelligence, 1 CRM or Booking integration, Shared Inbox, Lead Qualification & Routing, Up to 5 team users. (AI Guide, AI Visual are NOT included). Support: 24/7 AI Support, Email + WhatsApp Support (Business Hours), Priority Support, Support Portal.
     - Business: Includes Web Chatbot + WhatsApp AI + AI Guide, Up to 5 languages, Entity-aware Intelligence, Up to 3 external integrations, AI Lead Scoring, API Access & Custom Workflows, Up to 10 team users. (AI Visual is NOT included). Support: 24/7 AI Support, Priority Email & WhatsApp Support, Expanded Priority Support, Support Portal.
     - Enterprise: Includes Web Chatbot + WhatsApp AI + AI Guide + Multiple Brands/Sites, Extended Multilingual, 200 AI Visual Generations/month, AI Voice Receptionist (300 inbound mins, 2 concurrent calls), Advanced Enterprise Controls, Custom Data Retention. Support: 24/7 AI Support, 24/7 Critical Human Support, Priority WhatsApp & Email, Dedicated Customer Advisor, Enterprise Support Portal.
  3. If Starter asks why WhatsApp AI isn't working: explain WhatsApp AI is included starting from Growth plan.
  4. If Starter/Growth/Business asks why AI Visual isn't working: explain AI Visual Generation is exclusively available on the Enterprise plan.
  5. If Enterprise asks about AI Visual troubleshooting: check if AI Visual is enabled for tenant, request came through supported channel, image was received, and catalog/product context exists.
  6. Only give a dashboard path when the verified dashboard map supplied in context contains it. Treat dashboard evidence as four separate categories: (a) verified customer-facing controls, (b) documented platform procedures, (c) general diagnostic suggestions, and (d) tenant-specific information requiring authorized access. The public website repository does not prove tenant routes or control labels. Do not infer a route from a module name. AI Visual tenant configuration is implementation-managed; do not direct customers to an AI Visual Settings screen.
  7. NEVER invent nonexistent settings, buttons, tabs, or menus (e.g. NEVER mention "Görsel Ayarları", "Veri Entegrasyonu", "Eğitim Verisi", "Visual Settings", "Data Sync Tab"). If a control is not confirmed in SamChe AI, say: "Mevcut yapılandırmanızda bulunmayan bir ayara yönlendirmemek adına, önce etkilenen özelliği netleştirelim." / "I don't want to point you to a setting that may not exist in your current configuration. Let me narrow down the affected feature first."
  8. NO automatic live transfer and NO fake tickets: Never say "Sizi canlı desteğe aktarıyorum", "Bir temsilciye bağlıyorum", "Teknik ekibe aktardım", "Ticket oluşturdum", "Ticket #123 created", or claim to view unseen backend server logs. Provide verified sequential troubleshooting steps, and if the issue cannot be resolved, state that further technical review is required according to their plan's support channels.
  9. Vision understanding: When an image/screenshot is provided, read its visible text and UI content, and answer the user's exact visual question. If it shows ORDER ID: SC-4827, report SC-4827. The screenshot is part of the current support context, including an immediate follow-up such as "burada nereden yapacağım?". Do not substitute generic troubleshooting for visible facts.
  10. For a follow-up asking where to act, use the exact verified navigation and control labels from the dashboard map only when that map-backed evidence applies. A visible WhatsApp channel with Status: Inactive can be handled by a user with channel management access at Channels → affected WhatsApp channel → Edit channel → Status (Active) and Assigned assistant → Save changes. This does not prove the customer's tenant has that state; screenshots and authorized tenant access are the evidence sources. If the customer lacks that access, ask them to contact their workspace administrator or submit the details through Support. Do not replace these steps with a vague or invented path.

SALES RULES:
- Preserve known lead fields, never repeat an already known field, ask at most one useful question, never invent commercial facts, and never claim physical delivery or guaranteed outcomes. For a bare greeting, write a short welcome that identifies you as the SamChe AI sales and support assistant and ask at most one general help question.

HELP CENTER RULES:
- The context may include customer-safe supportGrounding articles. Use only their supplied guidance and visible navigation labels.
- Return articleRefs containing only supplied articleId values that directly support the reply. Return [] when no article applies. Never invent an ID or URL, and never recommend an article for a different product or channel.`;
const EXTRACTED_ARRAY_FIELDS = new Set(['channels', 'products']);
const EXTRACTED_FIELD_ALIASES = Object.freeze({
  team_users: 'teamUsers', lead_qualification: 'leadQualification', ai_guide_need: 'aiGuideNeed',
  api_workflow: 'apiWorkflow', api_access_need: 'apiAccessNeed', custom_workflow_need: 'customWorkflowNeed',
  external_integrations: 'externalIntegrations', ai_lead_scoring: 'aiLeadScoring', contact_preference: 'contactPreference',
});
const NEXT_FIELD_ALIASES = Object.freeze({
  team_users: 'teamUsers', lead_qualification: 'leadQualification', ai_guide_need: 'aiGuideNeed',
  api_workflow: 'apiWorkflow', external_integrations: 'externalIntegrations', ai_lead_scoring: 'aiLeadScoring',
  contact_preference: 'contactPreference',
});
const INTENT_ALIASES = Object.freeze({ 'off-topic': 'off_topic', 'off topic': 'off_topic', 'product-question': 'product_question', 'product question': 'product_question' });
const EXTRACTED_FIELD_SCHEMA = Object.fromEntries([...ALLOWED_LEAD_FIELDS].map((field) => [field, EXTRACTED_ARRAY_FIELDS.has(field)
  ? { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }] }
  : { anyOf: [{ type: 'string' }, { type: 'boolean' }, { type: 'null' }] }]));
const SALES_CHAT_RESPONSE_FORMAT = Object.freeze({
  type: 'json_schema',
  json_schema: {
    name: 'sales_chat_response',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        reply: { type: 'string' },
        intent: { type: 'string', enum: [...ALLOWED_INTENTS] },
        responseMode: { type: 'string', enum: [...ALLOWED_RESPONSE_MODES] },
        resumePendingQuestion: { type: 'boolean' },
        extractedFields: { type: 'object', additionalProperties: false, properties: EXTRACTED_FIELD_SCHEMA, required: [...ALLOWED_LEAD_FIELDS] },
        requestedNextField: { anyOf: [{ type: 'string', enum: [...ALLOWED_NEXT_FIELDS].filter(Boolean) }, { type: 'null' }] },
        actionIntent: { type: 'array', items: { type: 'string', enum: ALLOWED_ACTIONS } },
        articleRefs: { type: 'array', items: { type: 'string' } },
      },
      required: ['reply', 'intent', 'responseMode', 'resumePendingQuestion', 'extractedFields', 'requestedNextField', 'actionIntent', 'articleRefs'],
    },
  },
});

function text(value, limit) { return typeof value === 'string' ? value.slice(0, limit) : ''; }

function sanitizeArticleRefs(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((slug) => typeof slug === 'string' && PUBLISHED_HELP_SLUGS.has(slug)))].slice(0, 3);
}

function sanitizeGroundedArticleRefs(value, context) {
  const supplied = new Set((context?.supportGrounding?.articles || []).map((article) => article.articleId));
  return sanitizeArticleRefs(value).filter((articleId) => supplied.has(articleId));
}

function supportIntentFor(message) {
  const text = String(message || '').toLowerCase();
  return /\b(?:already (?:a |an )?(?:customer|use|using)|existing customer|not (?:loading|working|replying|generating|producing)|stopped replying|stuck|missing|cannot|can't|error|broken|troubleshoot|support|configuration|connection|bug|issue|fail|failing)\b/i.test(text)
    || /(?:mevcut müşteri|zaten kullan|yanıt vermiyor|çalışmıyor|yüklenmiyor|destek|hata|sorun|bağlanmıyor|görsel üretmiyor|görseli üretmiyor|gorsel uretmiyor|ürün görseli üretmiyor|urun görseli üretmiyor|çalışmıyor ne yapmalıyım)/iu.test(text)
    || /(?:عميل حالي|لا يعمل|لا يرد|دعم|مشكلة|خطأ|لا ينشئ|لا يولد|عطل)/u.test(text);
}

export function validateChatAttachment(attachment) {
  if (!attachment || typeof attachment !== 'object' || typeof attachment.mimeType !== 'string' || typeof attachment.data !== 'string') return failure('invalid_attachment');
  const signatures = { 'image/png': '89504e470d0a1a0a', 'image/jpeg': 'ffd8ff', 'image/webp': '52494646' };
  const mimeType = attachment.mimeType.toLowerCase() === 'image/jpg' ? 'image/jpeg' : attachment.mimeType.toLowerCase();
  if (!Object.hasOwn(signatures, mimeType) || !/^[A-Za-z0-9+/]+={0,2}$/.test(attachment.data)) return failure('invalid_attachment');
  if (attachment.data.length > Math.ceil(MAX_ATTACHMENT_BYTES * 4 / 3) + 8) return failure('image_too_large');
  const bytes = Buffer.from(attachment.data, 'base64');
  if (bytes.length > MAX_ATTACHMENT_BYTES) return failure('image_too_large');
  if (!bytes.length || !bytes.subarray(0, signatures[mimeType].length / 2).toString('hex').startsWith(signatures[mimeType])) return failure('invalid_attachment');
  if (mimeType === 'image/webp' && bytes.subarray(8, 12).toString('ascii') !== 'WEBP') return failure('invalid_attachment');
  return { ok: true, mimeType };
}

function safeSupportRecovery(context) {
  return buildGroundedSupportRecovery({
    language: context.inputLanguage,
    input: context.userMessage,
    messages: context.conversationHistory,
    state: { context: { plan: context.recommendedPlan || '' } },
    attachment: context.hasImage,
  });
}

function replyMatchesInputLanguage(reply, language) {
  const value = String(reply || '');
  if (language === 'ar') return /[؀-ۿ]/u.test(value);
  if (language === 'tr') {
    return /[çğıöşü]/i.test(value)
      || /\b(?:anladım|müşteri|sorularınız|için|icin|hangi|talepleriniz|uygunluğu|satış ekibimiz|görsel|görselde|sayı|sayısı|resim|resimde|ekran|hata|paket|kurulum|destek|yardım|plan|kontrol|etkilenen|ayarlar|özellik|mevcut|kullanıyorsunuz|oluşturulan|üretmiyor|çalışıyor|devreye|alındı|dahil|değil|olarak|ve|bir|bu|şu|o|da|de|ile|mi|mı|mu|mü|evet|hayır|adım|öğrenmek|yapılandırma|temsilci|bağlantı|sorunu)\b/i.test(value);
  }
  return !/[؀-ۿ]/u.test(value) && !/[çğıöşü]/i.test(value) && !/\b(?:anladım|müşteri|sorularınız|uygunluğu|satış ekibimiz)\b/i.test(value);
}

function hasAtMostOneQuestion(reply) {
  return (String(reply || '').match(/[?؟]/g) || []).length <= 1;
}

function isGreetingOnly(message) {
  return /^(?:hello|hi|hey|merhaba|selam|مرحبا|اهلا|أهلا|السلام عليكم)[!.,\s]*$/iu.test(String(message || '').trim());
}

function safeGreetingReply(language) {
  if (language === 'tr') return 'Merhaba! Ben SamChe AI satış ve destek asistanıyım. Size nasıl yardımcı olabilirim?';
  if (language === 'ar') return 'مرحباً! أنا مساعد المبيعات والدعم في SamChe AI. كيف يمكنني مساعدتك اليوم؟';
  return 'Hi! I’m the SamChe AI sales and support assistant. How can I help you today?';
}

function enforceBareGreetingResponse(candidate, context) {
  if (!isGreetingOnly(context.userMessage)) return candidate;
  return {
    ...candidate,
    reply: safeGreetingReply(context.inputLanguage),
    intent: 'sales',
    responseMode: 'qualification_answer',
    resumePendingQuestion: false,
    extractedFields: {},
    requestedNextField: null,
    actionIntent: [],
  };
}

function resolveInputLanguage(input, requestedLanguage, siteLocale) {
  return resolveConversationLanguage(input, requestedLanguage, siteLocale);
}
const CHAT_LANGUAGES = new Set(['en', 'tr', 'ar']);

function unavailableSalesClaims(reply, capabilities) {
  // Remove only explicit negated predicates, never a reply-wide "no" exemption.
  // Check clauses independently so a denial cannot hide a later affirmative claim.
  return String(reply).replace(/[’]/g, "'").replace(/[\u064B-\u065F]/g, '')
    .split(/[.!?;,\n،؛]+|\b(?:but|however|and)\b|ولكن|لكن/iu).map((clause) => {
      const affirmative = clause
        .replace(/\bno\s+(?:demo|appointment|meeting|slot|booking|email)(?:\s+or\s+email)?\s+(?:(?:has|have|is|was|were|will|be|been|now|yet)\s+)*(?:confirmed|scheduled|booked|sent)\b/gi, '')
        .replace(/\b(?:not|never|cannot|can't|haven't|hasn't|won't|isn't|wasn't|didn't)\s+(?:(?:have|has|been|be|yet|already|ever)\s+)*(?:confirm(?:ed)?|schedul(?:e|ed)|book(?:ed)?|send|sent|receive|received|email(?:ed)?)(?:\s+(?:an?|the|your|any))?(?:\s+(?:confirmation|email|demo|appointment|meeting|slot|booking))*(?:\s+(?:confirming|for|on|at)\b[^\n]*)?\b/gi, '')
        .replace(/(?:لم|لن|لا)\s+(?:يتم\s+|نقم\s+ب|يمكن(?:ني|نا)?\s+)?(?:تأكيد|نؤكد|حجز|نحجز|جدولة|نجدول|إرسال|ارسال|نرسل|يرسل|تأكيده)(?:\s+(?:بريد[^\n]*|موعد[^\n]*|عرض[^\n]*))?/gu, '')
        .replace(/(?:غير|ليس|ليست)\s+(?:مؤكد|مؤكدة|محجوز|محجوزة|مجدول|مجدولة)/gu, '');
      const explicitDenial = /\b(?:not|never|cannot|can't|haven't|hasn't|won't|isn't|wasn't|didn't)\b[^.!?\n]{0,100}\b(?:confirm|schedule|book|send|sent|receive|received|email)\b/i.test(clause)
        || /(?:لم|لن|لا|ليس|ليست|غير)[^،؛.!?\n]{0,100}(?:تأكيد|حجز|جدولة|إرسال|ارسال|بريد|إيميل|ايميل|مؤكد|محجوز|مجدول)/u.test(clause)
        || /(?:değil|değildir|yok|sunmuyor|göndermiyor|planlamıyor|onaylamıyor)/iu.test(clause);
      if (explicitDenial) return false;
      const scheduling = /\b(?:demo|appointment|meeting|slot|booking)\b.{0,100}\b(?:confirm(?:ed|ation)?|schedul(?:e|ed|ing)|book(?:ed|ing)?|reserved|set|setting up|arranged|on the calendar)\b|\b(?:will|shall|can|going to)\s+(?:schedule|confirm|book|arrange|set(?:\s+up)?)\b.{0,100}\b(?:demo|appointment|meeting|slot|booking)\b|\b(?:schedule|scheduling|confirm|book|booking|set(?:ting)?(?:\s+up)?)\b.{0,100}\b(?:demo|appointment|meeting|slot|booking)\b|\b(?:confirm(?:ed|ation)?|schedul(?:e|ed|ing)|book(?:ed|ing)?|reserved|arranged|set(?:ting)?(?:\s+up)?|will\s+|going to\s+)(?:\w+\s+){0,2}(?:demo|appointment|meeting|slot|booking)\b|\b(?:set|setting up|arranged|scheduled|booked)\s+(?:a\s+)?(?:demo|appointment|meeting|slot|booking)\b|\b(?:demo|appointment|meeting|slot)\b.{0,100}\bon\s+the\s+calendar\b/i.test(affirmative)
        || /(?:تم|سيتم|سن|سوف|سيقوم|قمنا|لقد|قام|نحدد|نؤكد|نحجز|نجدول|جدولة|حجز|تأكيد|تحديد).{0,80}(?:موعد|عرض|اجتماع|تقويم)|(?:موعد|عرض|اجتماع).{0,80}(?:مؤكد|محجوز|مجدول)/u.test(affirmative)
        || /(?:planlayacağım|planlayacağız|planlayacak|planlandı|oluşturacağım|oluşturacağız|rezervasyon\s+yapacağım|rezervasyon\s+yapacağız|onaylandı|onaylayacağım|onaylayacağız|teyit\s+edeceğim|teyit\s+edeceğiz).{0,100}(?:demo|randevu|toplantı|görüşme)|(?:demo\w*|randevu\w*|toplantı\w*|görüşme\w*).{0,100}(?:planlandı|onaylandı|oluşturuldu|rezervasyon)|(?:demo\w*|randevu\w*|toplantı\w*|görüşme\w*)\s+(?:planlayacağım|planlayacağız|planlayacak|oluşturacağım|oluşturacağız|rezervasyon\s+yapacağım|rezervasyon\s+yapacağız|onaylayacağım|onaylayacağız|teyit\s+edeceğim|teyit\s+edeceğiz)/iu.test(affirmative);
      const email = /\b(?:send|sent|email|emailed|receive|received|will\s+email|going to\s+email)\b.{0,80}\b(?:confirmation|confirming|email)\b|\b(?:confirmation email|email confirmation|email is on the way|check your inbox)\b/i.test(affirmative)
        || /(?:أرسلنا|ارسلنا|سنرسل|نرسل|سيرسل|سيصلك|ستصلك|إرسال|ارسال|بريد|رسالة|إيميل|ايميل).{0,80}(?:تأكيد|موعد|عرض)/u.test(affirmative)
        || /(?:onay\s+e-?postası|onay\s+maili|e-?posta|email|mail).{0,80}(?:gönder|göndereceğiz|göndereceğim|onay)/iu.test(affirmative);
      const fakeAction = /\b(?:transferring\s+you\s+to\s+live\s+support|connecting\s+(?:you\s+)?to\s+an?\s+agent|opened\s+a\s+ticket|created\s+ticket\s+#?\d+|ticket\s+#\d+\s+created|ticket\s+#\d+|escalated\s+to\s+(?:engineering|technical\s+team))\b/i.test(affirmative)
        || /(?:sizi\s+canlı\s+desteğe\s+aktarıyorum|canlı\s+desteğe\s+bağlıyorum|temsilciye\s+bağlıyorum|temsilciye\s+aktarıyorum|ticket\s+#?\d+|ticket\s+oluştur|bilet\s+#?\d+|bilet\s+oluştur|talep\s+#?\d+|talep\s+oluştur|teknik\s+ekibe\s+aktar|mühendislik\s+ekibine\s+ilet)/iu.test(affirmative)
        || /(?:تحويلكم\s+إلى\s+الدعم\s+المباشر|ربطكم\s+بممثل\s+الدعم|تم\s+إنشاء\s+تذكرة\s+#?\d+|أنشأت\s+تذكرة|تم\s+التصعيد\s+للفريق\s+الفني)/u.test(affirmative);
      if (fakeAction) return 'fake_action';
      if ((!capabilities.canScheduleCalendarMeeting || !capabilities.canConfirmAppointment) && scheduling) return 'scheduling';
      if (!capabilities.canSendEmail && email) return 'email';
      const physicalDelivery = /\b(?:physical\s+product|products?|items?)\b.{0,80}\b(?:deliver|delivery|ship|shipping|stock|same[- ]day|immediate|fulfill|fulfillment)\b|\b(?:deliver|ship|stock|same[- ]day|immediate)\b.{0,80}\b(?:products?|items?)\b/i.test(affirmative)
        || /(?:ürün|ürünler|ürünlerimizi|ürünleri).{0,100}(?:teslim|stok|kargo|gönder|sevkiyat)|(?:hemen|aynı\s+gün).{0,50}(?:teslim|gönder)/iu.test(affirmative)
        || /(?:منتج|منتجات|بضاعة).{0,100}(?:تسليم|شحن|مخزون|إرسال)|(?:تسليم|شحن).{0,80}(?:فوري|مباشر|في\s+نفس\s+اليوم)/u.test(affirmative);
      if (physicalDelivery) return 'physical_delivery';
      return false;
    }).find(Boolean) || false;
}

function safeReplyForLanguage(language, category = 'scheduling') {
  if (language === 'tr') {
    if (category === 'fake_action') return 'Sorunu doğrudan burada birlikte inceleyebiliriz. Etkilenen kanalı, hata mesajını veya ekran görüntüsünü paylaşırsanız adım adım kontrol sağlayabilirim.';
    if (category === 'physical_delivery') return 'SamChe AI fiziksel bir ürün değil; kurulum ve devreye alma süresi seçtiğiniz ürünlere ve entegrasyon kapsamına göre değişir. Hazır web chatbot gibi çözümler daha hızlı devreye alınabilirken, özel entegrasyonlar ek kurulum gerektirebilir.';
    return 'Belirttiğiniz zamanı tercih edilen demo zamanı olarak talebinize ekleyebiliriz. Satış ekibimiz uygunluğu kontrol ederek sizinle iletişime geçecektir.';
  }
  if (language === 'ar') {
    if (category === 'fake_action') return 'يمكننا مراجعة المشكلة معاً هنا مباشرة. يرجى تزويدي بالقناة المتأثرة أو رسالة الخطأ لنتمكن من توجيهكم بالخطوات الصحيحة.';
    if (category === 'physical_delivery') return 'SamChe AI ليس منتجاً مادياً؛ تختلف مدة الإعداد والتشغيل حسب المنتجات ونطاق التكامل المطلوب. يمكن تشغيل حلول مثل روبوت الموقع بسرعة أكبر، بينما قد تتطلب التكاملات المخصصة إعداداً إضافياً.';
    return 'يمكننا إضافة الوقت الذي ذكرتموه كتفضيل لطلب العرض التوضيحي. سيتحقق فريق المبيعات من التوفر ويتواصل معكم.';
  }
  if (category === 'fake_action') return 'We can investigate this directly here. Please share the affected channel, error message, or screenshot so I can guide you through verified troubleshooting steps.';
  if (category === 'physical_delivery') return 'SamChe AI is a SaaS platform, not a physical product. Setup and launch timing depends on the selected products and integration scope; ready web-chatbot solutions can be enabled faster, while custom integrations may need additional setup.';
  return 'We’ll include your requested time as a preferred demo time. Our sales team will confirm availability after reviewing your request.';
}

export function sanitizeSalesReply(reply, capabilities = SALES_CHAT_CAPABILITIES, language = 'en') {
  if (typeof reply !== 'string') return reply;
  const category = unavailableSalesClaims(reply, capabilities);
  return category ? safeReplyForLanguage(language, category) : reply;
}

function hasUsableLeadValue(value) {
  return Array.isArray(value) ? value.length > 0 : typeof value === 'string' ? Boolean(value.trim()) : typeof value === 'boolean' ? true : value !== null && value !== undefined;
}

function nextUsefulField(leadState) {
  for (const field of ['industry', 'channels', 'volume', 'integrations', 'leadQualification', 'languages', 'aiGuideNeed', 'apiWorkflow', 'externalIntegrations', 'aiLeadScoring', 'teamUsers', 'timeline', 'contactPreference']) {
    if (!hasUsableLeadValue(leadState[field])) return field;
  }
  return null;
}

function buildContext(body, commercialFacts) {
  const leadState = {};
  for (const key of ALLOWED_LEAD_FIELDS) {
    const value = body.leadState?.[key];
    if (Array.isArray(value)) leadState[key] = value.filter((item) => typeof item === 'string').slice(0, 20);
    else if (typeof value === 'string' || typeof value === 'boolean') leadState[key] = value;
  }
  const inputLanguage = resolveInputLanguage(body.userMessage, body.inputLanguage, body.locale);
  const conversationHistory = body.conversationHistory.slice(-MAX_HISTORY).map((message) => ({
    role: message?.role === 'assistant' ? 'assistant' : 'user',
    text: text(message?.text ?? message?.content, MAX_HISTORY_MESSAGE_LENGTH),
    imageContext: message?.imageContext === true,
  })).filter((message) => message.text);
  const supportRetrievalQuery = buildSupportRetrievalQuery({ userMessage: body.userMessage, conversationHistory });
  const groundingLockedSubject = findGroundingLockedSubject(supportRetrievalQuery, inputLanguage);
  const helpArticles = getHelpArticleSources(supportRetrievalQuery, inputLanguage, 3);
  return {
    locale: CHAT_LANGUAGES.has(body.locale) ? body.locale : 'en',
    inputLanguage,
    hasImage: Boolean(body.attachment),
    conversationHistory,
    leadState,
    knownFields: Object.keys(leadState).filter((key) => hasUsableLeadValue(leadState[key])),
    lastQuestion: text(body.lastQuestion, 500),
    nextUsefulField: nextUsefulField(leadState),
    qualificationStage: text(body.qualificationStage, 40),
    pendingField: ALLOWED_NEXT_FIELDS.has(body.pendingQualificationField ?? body.pendingField) ? (body.pendingQualificationField ?? body.pendingField) : null,
    lastPendingQuestion: text(body.lastPendingQuestion, 500),
    recommendedPlan: text(body.recommendedPlan, 40),
    responseMode: body.attachment || groundingLockedSubject || supportIntentFor(body.userMessage) || (body.conversationHistory.slice(-4).some((message) => message?.imageContext === true || supportIntentFor(message?.text))) ? 'support' : ALLOWED_RESPONSE_MODES.has(body.responseMode) ? body.responseMode : 'qualification_answer',
    detectedIntent: text(body.detectedIntent, 40),
    approvedPlanFacts: commercialFacts.plans.map((plan) => ({ ...plan })),
    approvedProductFacts: commercialFacts.products.map((product) => ({ ...product })),
    supportRetrievalQuery,
    supportGrounding: toCustomerGroundingPayload({ dashboardEntries: dashboardSupportMap, helpArticles }),
    capabilities: SALES_CHAT_CAPABILITIES,
    allowedActions: [...ALLOWED_ACTIONS],
    userMessage: text(body.userMessage, MAX_MESSAGE_LENGTH),
  };
}

function approvedAmounts(plans) { return new Set(plans.flatMap((plan) => [plan.monthly, plan.setup, plan.yearly, plan.interactions]).map(String)); }

function failure(reason, details = {}) { return { ok: false, reason, ...details }; }

function safeDiagnosticValue(value) {
  return typeof value === 'string' ? value.slice(0, 80) : typeof value === 'number' || typeof value === 'boolean' ? value : undefined;
}

export function normalizeSalesLlmOutput(output) {
  if (!output || typeof output !== 'object' || Array.isArray(output)) return output;
  const normalized = { ...output };
  if (typeof normalized.intent === 'string') normalized.intent = INTENT_ALIASES[normalized.intent] || normalized.intent;
  if (typeof normalized.requestedNextField === 'string') normalized.requestedNextField = NEXT_FIELD_ALIASES[normalized.requestedNextField] || normalized.requestedNextField;
  if (normalized.extractedFields && typeof normalized.extractedFields === 'object' && !Array.isArray(normalized.extractedFields)) {
    normalized.extractedFields = Object.fromEntries(Object.entries(normalized.extractedFields)
      .map(([key, value]) => [EXTRACTED_FIELD_ALIASES[key] || key, value])
      .filter(([, value]) => value !== null));
  }
  return normalized;
}

export function validateSalesLlmOutput(output, { plans, products, allowedActions = ALLOWED_ACTIONS } = {}) {
  let value = output;
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return failure('invalid_json'); } }
  value = normalizeSalesLlmOutput(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return failure('invalid_shape');
  const replyValidation = validateSalesReplyText(value.reply, { plans, products });
  if (!replyValidation.ok) return replyValidation;
  if (!ALLOWED_INTENTS.has(value.intent)) return failure('invalid_intent', { value: safeDiagnosticValue(value.intent) });
  if (!ALLOWED_RESPONSE_MODES.has(value.responseMode)) return failure('invalid_response_mode', { value: safeDiagnosticValue(value.responseMode) });
  if (typeof value.resumePendingQuestion !== 'boolean') return failure('invalid_resume_pending_question');
  if (!ALLOWED_NEXT_FIELDS.has(value.requestedNextField ?? null)) return failure('invalid_next_field', { value: safeDiagnosticValue(value.requestedNextField) });
  if (!Array.isArray(value.actionIntent) || value.actionIntent.some((action) => !allowedActions.includes(action))) return failure('invalid_action', { value: safeDiagnosticValue(value.actionIntent?.find((action) => !allowedActions.includes(action))) });
  if (!value.extractedFields || typeof value.extractedFields !== 'object' || Array.isArray(value.extractedFields)) return failure('invalid_fields');
  const unsupportedField = Object.keys(value.extractedFields).find((key) => !ALLOWED_LEAD_FIELDS.has(key));
  if (unsupportedField) return failure('unsupported_field', { field: unsupportedField });
  for (const [key, fieldValue] of Object.entries(value.extractedFields)) {
    if (['channels', 'products'].includes(key)) {
      if (!Array.isArray(fieldValue) || fieldValue.some((item) => typeof item !== 'string')) return failure('invalid_field_value', { field: key, type: Array.isArray(fieldValue) ? 'array_item' : typeof fieldValue });
    } else if (typeof fieldValue !== 'string' && typeof fieldValue !== 'boolean') return failure('invalid_field_value', { field: key, type: typeof fieldValue });
  }
  if (value.responseMode === 'capability_interrupt' && value.intent !== 'capability_question') return failure('response_mode_intent_mismatch');
  if (value.responseMode === 'pricing_interrupt' && !['pricing', 'pricing_question'].includes(value.intent)) return failure('response_mode_intent_mismatch');
  if (['in_scope_interrupt', 'capability_interrupt', 'pricing_interrupt', 'demo_interrupt'].includes(value.responseMode) && value.resumePendingQuestion !== true) return failure('interrupt_resume_required');
  return { ok: true, value: { reply: value.reply.trim(), intent: value.intent, responseMode: value.responseMode, resumePendingQuestion: value.resumePendingQuestion, extractedFields: value.extractedFields, requestedNextField: value.requestedNextField ?? null, actionIntent: value.actionIntent, articleRefs: sanitizeArticleRefs(value.articleRefs) } };
}

function validateSalesReplyText(reply, { plans, products }) {
  if (typeof reply !== 'string' || !reply.trim() || reply.length > 3000) return failure('invalid_reply', { field: 'reply' });
  if (containsInternalSupportLeak(reply)) return failure('internal_support_leak', { category: 'customer_response' });
  const amounts = approvedAmounts(plans);
  for (const amount of reply.matchAll(/AED\s*([\d,]+)/gi)) if (!amounts.has(amount[1].replaceAll(',', ''))) return failure('unsupported_commercial_claim', { category: 'amount' });
  if (/(?:discount|free|unlimited|guaranteed)/i.test(reply)) return failure('unsupported_commercial_claim', { category: 'disallowed_term' });
  if (containsUnsupportedDashboardInstruction(reply)) return failure('hallucinated_dashboard_control', { category: 'unverified_navigation' });
  if (containsUnknownDashboardControlClaim(reply)) return failure('hallucinated_dashboard_control', { category: 'unknown_control' });
  if (/(?:Görsel Ayarları|Veri Entegrasyonu|Eğitim Verisi|Visual Settings|Data Integration Tab|Training Data Tab)/iu.test(reply)) {
    return failure('hallucinated_dashboard_control', { category: 'fake_menu' });
  }
  const knownProducts = products.map((product) => product.name);
  const unknownProductClaim = [...reply.matchAll(/\b(?:Web Chatbot|WhatsApp AI|AI Guide|Knowledge Intelligence|Live Inbox|CRM & Pipeline)\b/g)].some((match) => knownProducts.length > 0 && !knownProducts.includes(match[0]));
  if (unknownProductClaim) return failure('unsupported_product_claim', { category: 'product_name' });
  return { ok: true, value: reply.trim() };
}

function normalizeControlText(value) {
  return String(value || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function containsUnknownDashboardControlClaim(reply) {
  if (!/(?:dashboard|channels?|settings|overview|assistants?|knowledge|conversations?|leads?|pipeline|support|menü|ayar|pano)/iu.test(reply)) return false;
  const known = dashboardSupportMap
    .filter((entry) => entry.status === 'implemented_customer_accessible')
    .flatMap((entry) => [entry.area, entry.nav, ...(entry.controls || [])])
    .filter(Boolean)
    .map(normalizeControlText);
  const directControlPattern = /\b(?:click|press|select|choose|use)\s+(?:the\s+)?["“]?([^.,;!?\n]{1,70})/gi;
  for (const match of reply.matchAll(directControlPattern)) {
    const claimed = normalizeControlText(match[1].split(/\b(?:to|then|and then|when|if)\b/i)[0]);
    if (!claimed) continue;
    if (!known.some((control) => claimed.includes(control) || control.includes(claimed))) return true;
  }
  return false;
}

function containsUnsupportedDashboardInstruction(reply) {
  const instruction = /\b(?:open|go to|navigate to|click|select|choose|set|save|check|verify)\b/i.test(reply)
    || /(?:aç|gidin|tıklayın|seçin|ayarlayın|kaydedin|kontrol edin|doğrulayın)/iu.test(reply);
  const routeClaim = /\b(?:menu|tab|screen|settings|route|dashboard|menü|sekme|ekran|ayar|pano)\b/i.test(reply)
    || /\b(?:open|go to|navigate to)\s+(?:the\s+)?(?:channels?|settings|overview|assistants?|knowledge|conversations?|leads?|pipeline|support)\b/i.test(reply)
    || /(?:→|->)/.test(reply);
  if (!instruction || !routeClaim) return false;
  const lower = reply.toLocaleLowerCase();
  const unverifiedTerms = dashboardSupportMap.filter((entry) => entry.status !== 'implemented_customer_accessible')
    .flatMap((entry) => [entry.area, entry.nav]).filter(Boolean).map((term) => String(term).toLocaleLowerCase());
  if (unverifiedTerms.some((term) => new RegExp(`(?<![\\p{L}\\p{N}_])${term.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(?![\\p{L}\\p{N}_])`, 'iu').test(lower))) return true;
  return !dashboardSupportMap.some((entry) => {
    if (entry.status !== 'implemented_customer_accessible' || !entry.nav) return false;
    const verifiedTerms = [entry.nav, entry.area, ...(entry.controls || [])].filter(Boolean).map((term) => String(term).toLocaleLowerCase());
    return verifiedTerms.some((term) => new RegExp(`(?<![\\p{L}\\p{N}_])${term.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(?![\\p{L}\\p{N}_])`, 'iu').test(lower));
  });
}

function logValidationFailure(result, { environment, logger }) {
  // Reasons are fixed literals produced by this module. Never forward provider values, prompts, or keys.
  if (environment?.RENDER_SERVICE_NAME === 'samche-api-staging' || environment?.NODE_ENV === 'staging') {
    logger?.warn?.('sales_chat_validation_failed', { reason: result.reason });
    return;
  }
  logger?.warn?.('sales_chat_provider_unusable', { category: 'validator', stage: 'provider_contract', field: result.field, reason: result.reason });
}

function logProviderFailure(error, logger) {
  const diagnostic = error?.salesChatDiagnostic;
  if (diagnostic) return logger?.warn?.('sales_chat_provider_failure', diagnostic);
  return logger?.warn?.('sales_chat_provider_failure', { category: error?.name === 'AbortError' ? 'timeout' : 'request_failed' });
}

function isInterruptMode(mode) { return ['capability_interrupt', 'pricing_interrupt', 'in_scope_interrupt', 'demo_interrupt'].includes(mode); }

function expectedIntentForMode(mode, userMessage = '') {
  if (mode === 'capability_interrupt') return 'capability_question';
  if (mode === 'pricing_interrupt') return 'pricing_question';
  if (mode === 'in_scope_interrupt') return /ai guide|web chatbot|whatsapp ai|live inbox|knowledge intelligence|product|feature/i.test(userMessage) ? 'feature_question' : 'product_question';
  if (mode === 'demo_interrupt') return 'demo_question';
  return 'qualification';
}

function safelySalvageProviderReply(output, context, commercialFacts) {
  let value = output;
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return null; } }
  value = normalizeSalesLlmOutput(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const replyValidation = validateSalesReplyText(value.reply, { plans: commercialFacts.plans, products: commercialFacts.products });
  if (!replyValidation.ok) return null;
  const safeReply = isGreetingOnly(context.userMessage) ? safeGreetingReply(context.inputLanguage) : replyValidation.value;
  if (!replyMatchesInputLanguage(safeReply, context.inputLanguage) || !hasAtMostOneQuestion(safeReply)) return null;
  const extractedFields = {};
  if (value.extractedFields && typeof value.extractedFields === 'object' && !Array.isArray(value.extractedFields)) {
    for (const [field, fieldValue] of Object.entries(value.extractedFields)) {
      if (!ALLOWED_LEAD_FIELDS.has(field) || fieldValue === null) continue;
      if (EXTRACTED_ARRAY_FIELDS.has(field)) {
        if (Array.isArray(fieldValue) && fieldValue.every((item) => typeof item === 'string')) extractedFields[field] = fieldValue;
      } else if (typeof fieldValue === 'string' || typeof fieldValue === 'boolean') extractedFields[field] = fieldValue;
    }
  }
  const responseMode = ALLOWED_RESPONSE_MODES.has(value.responseMode) ? value.responseMode : context.responseMode;
  const expectedIntent = expectedIntentForMode(responseMode, context.userMessage);
  const intent = ALLOWED_INTENTS.has(value.intent) ? value.intent : expectedIntent;
  const modeIntentMismatch = (responseMode === 'capability_interrupt' && intent !== 'capability_question')
    || (responseMode === 'pricing_interrupt' && !['pricing', 'pricing_question'].includes(intent));
  return enforceBareGreetingResponse({
    reply: sanitizeSalesReply(safeReply, SALES_CHAT_CAPABILITIES, context.inputLanguage),
    intent: modeIntentMismatch ? expectedIntent : intent,
    responseMode,
    resumePendingQuestion: typeof value.resumePendingQuestion === 'boolean' ? value.resumePendingQuestion : Boolean(context.lastPendingQuestion && context.pendingField),
    extractedFields,
    requestedNextField: ALLOWED_NEXT_FIELDS.has(value.requestedNextField ?? null) ? value.requestedNextField ?? null : null,
    actionIntent: [],
    articleRefs: sanitizeArticleRefs(value.articleRefs),
  }, context);
}

function pendingResumePresent(reply, context) {
  if (!context.lastPendingQuestion || !context.pendingField) return true;
  const normalize = (value) => value.toLocaleLowerCase().replace(/[?!.:,;،؛]+/g, '').replace(/\s+/g, ' ').trim();
  const answer = normalize(reply);
  const pending = normalize(context.lastPendingQuestion);
  // A useful interrupt may resume the pending field in another language. Reject
  // only a provider response that is effectively just the pending question.
  return answer !== pending && !(answer.startsWith(pending) && answer.length <= pending.length + 24);
}

function planFromContext(context, plans) {
  const textValue = `${context.userMessage} ${context.recommendedPlan}`.toLowerCase();
  return plans.find((plan) => textValue.includes(plan.slug) || textValue.includes(plan.name.toLowerCase())) || null;
}

function safeInterruptReply(mode, context, plans) {
  const pending = context.lastPendingQuestion || '';
  const pendingForLanguage = context.inputLanguage === 'tr'
    ? ({ industry: 'Ne tür bir işletme işletiyorsunuz?', channels: 'Müşteri talepleriniz bugün web sitenizden mi, WhatsApp üzerinden mi, yoksa her ikisinden mi geliyor?', volume: 'Ayda yaklaşık kaç müşteri talebi alıyorsunuz?' }[context.pendingField] || '')
    : pending;
  if (context.inputLanguage === 'tr' && mode === 'in_scope_interrupt' && /demo|randevu|toplantı|görüşme/i.test(context.userMessage)) return `Belirttiğiniz zamanı tercih edilen demo zamanı olarak talebinize ekleyebiliriz. Satış ekibimiz uygunluğu kontrol ederek sizinle iletişime geçecektir. ${pendingForLanguage}`.trim();
  if (context.inputLanguage === 'tr' && mode === 'in_scope_interrupt') return `SamChe AI fiziksel bir ürün değil; kurulum ve devreye alma süresi seçtiğiniz ürünlere ve entegrasyon kapsamına göre değişir. ${pendingForLanguage}`.trim();
  if (context.inputLanguage === 'tr' && mode === 'demo_interrupt') return `Belirttiğiniz zamanı tercih edilen demo zamanı olarak talebinize ekleyebiliriz. Satış ekibimiz uygunluğu kontrol ederek sizinle iletişime geçecektir. ${pendingForLanguage}`.trim();
  if (mode === 'capability_interrupt') return `SamChe AI can support first-response work by answering FAQs, qualifying leads, and routing conversations. It is a support layer rather than a one-for-one employee replacement; people remain important for negotiation, relationships, and closing.${pending ? ` ${pending}` : ''}`;
  if (mode === 'pricing_interrupt') {
    const plan = planFromContext(context, plans);
    if (plan) return `The ${plan.name} plan is ${plan.from ? 'from ' : ''}AED ${plan.monthly.toLocaleString('en-US')}/month, with ${plan.from ? 'from ' : ''}AED ${plan.setup.toLocaleString('en-US')} one-time setup and ${plan.interactions} AI interactions per month.${pending ? ` ${pending}` : ''}`;
  }
  if (mode === 'in_scope_interrupt') {
    const product = /ai guide/i.test(context.userMessage)
      ? 'AI Guide provides a guided, step-by-step experience for helping visitors find relevant information and next actions.'
      : 'SamChe AI can answer common questions using approved business knowledge and route qualified conversations to your team.';
    return `${product}${pending ? ` ${pending}` : ''}`;
  }
  return `I can help with that SamChe AI question.${pending ? ` ${pending}` : ''}`;
}

function interruptReplyIsUsable(mode, reply, context, plans) {
  if (!reply || !pendingResumePresent(reply, context)) return false;
  if (mode === 'capability_interrupt') return /automate|support|first-response|faq|qualif|rout|human|sales staff|negotiat|relationship|closing/i.test(reply)
    && !/guaranteed|headcount reduction|reduce(?:d)? headcount|replace.*one-for-one|\broi\b|sales results/i.test(reply);
  if (mode === 'pricing_interrupt') {
    const plan = planFromContext(context, plans);
    return Boolean(plan && reply.includes(`AED ${plan.monthly.toLocaleString('en-US')}`));
  }
  if (mode === 'in_scope_interrupt') {
    if (context.inputLanguage === 'tr') return /fiziksel|ürün|urun|teslim|kurulum|yapılandır|yapilandır|platform|entegrasyon|özellik|ozellik|uygunluğu|satış ekibi/i.test(reply);
    if (context.inputLanguage === 'ar') return /سام|منتج|تسليم|تركيب|تهيئة|منصة|تكامل|ميزة|ذكاء|يوفر|روبوت|الموقع/i.test(reply);
    return /ai guide|web chatbot|whatsapp ai|live inbox|knowledge intelligence|product|feature/i.test(reply);
  }
  return true;
}

function enforceInterruptResponse(candidate, context, commercialFacts) {
  const mode = context.responseMode;
  const sanitizedCandidateReply = candidate ? sanitizeSalesReply(candidate.reply, SALES_CHAT_CAPABILITIES, context.inputLanguage) : null;
  const replyWasRewritten = Boolean(candidate && sanitizedCandidateReply !== candidate.reply);
  const sanitizedCandidate = replyWasRewritten ? { ...candidate, reply: sanitizedCandidateReply, actionIntent: [] } : candidate;
  const usable = replyWasRewritten || (sanitizedCandidate && interruptReplyIsUsable(mode, sanitizedCandidate.reply, context, commercialFacts.plans));
  const baseReply = usable ? sanitizedCandidate.reply : safeInterruptReply(mode, context, commercialFacts.plans);
  const pendingForLanguage = context.inputLanguage === 'tr'
    ? ({ industry: 'Ne tür bir işletme işletiyorsunuz?', channels: 'Müşteri talepleriniz bugün web sitenizden mi, WhatsApp üzerinden mi, yoksa her ikisinden mi geliyor?', volume: 'Ayda yaklaşık kaç müşteri talebi alıyorsunuz?', languages: 'Asistanın hangi dilleri desteklemesini istersiniz?' }[context.pendingField] || '')
    : context.lastPendingQuestion;
  const reply = pendingForLanguage && !baseReply.includes(pendingForLanguage) ? `${baseReply} ${pendingForLanguage}` : baseReply;
  return {
    reply, intent: expectedIntentForMode(mode, context.userMessage), responseMode: mode,
    extractedFields: usable ? sanitizedCandidate.extractedFields : {},
    requestedNextField: context.pendingField || (usable ? sanitizedCandidate.requestedNextField : null),
    resumePendingQuestion: Boolean(context.lastPendingQuestion && context.pendingField), actionIntent: [],
    articleRefs: usable ? sanitizeArticleRefs(sanitizedCandidate.articleRefs) : [],
  };
}

function enforceSupportResponse(candidate, context) {
  const groundingLockedSubject = findGroundingLockedSubject(context.supportRetrievalQuery, context.inputLanguage);
  const isUsable = !groundingLockedSubject && candidate && replyMatchesInputLanguage(candidate.reply, context.inputLanguage)
    && !containsInternalSupportLeak(candidate.reply)
    && !unavailableSalesClaims(candidate.reply, SALES_CHAT_CAPABILITIES)
    && (context.hasImage || candidate.responseMode === 'support' || candidate.intent === 'support');
  const recovery = isUsable ? null : safeSupportRecovery(context);
  const reply = isUsable ? candidate.reply : recovery.reply;
  return { reply, intent: 'support', responseMode: 'support', resumePendingQuestion: false, extractedFields: {}, requestedNextField: null, actionIntent: [], articleRefs: isUsable ? sanitizeGroundedArticleRefs(candidate.articleRefs, context) : recovery.articleRefs };
}

export function createSalesChatService({ openaiClient, commercialFacts, textModel = MODEL, visionModel = VISION_MODEL, timeoutMs = 20000, environment = process.env, logger = console } = {}) {
  async function handle({ body = {} } = {}) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 400, body: { error: 'Sales assistant request is invalid.' } };
    if (typeof body.userMessage !== 'string' || !body.userMessage.trim() || body.userMessage.length > MAX_MESSAGE_LENGTH) return { status: 400, body: { error: 'A non-empty message is required.' } };
    if (!Array.isArray(body.conversationHistory) || body.conversationHistory.length > MAX_HISTORY) return { status: 400, body: { error: 'Sales assistant request is invalid.' } };
    const context = buildContext({ ...body, conversationHistory: body.conversationHistory }, commercialFacts);
    const attachment = body.attachment === undefined ? null : validateChatAttachment(body.attachment);
    if (attachment && !attachment.ok) return { status: 400, body: { error: attachment.reason === 'image_too_large' ? 'image_too_large' : 'invalid_attachment' }, context };
    if (!openaiClient?.chat?.completions?.create) return { status: 503, body: { error: 'Sales assistant is temporarily unavailable.' }, context };
    if (attachment) {
      const sourceBytes = Buffer.from(body.attachment.data, 'base64').length;
      logger?.info?.('sales_chat_image_received', {
        mimeType: attachment.mimeType,
        sourceBytes,
        base64Chars: body.attachment.data.length,
      });
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const userContent = attachment ? [
        { type: 'text', text: JSON.stringify({ ...context, attachment: { mimeType: attachment.mimeType, transient: true } }) },
        { type: 'image_url', image_url: { url: `data:${attachment.mimeType};base64,${body.attachment.data}` } },
      ] : JSON.stringify(context);
      const completion = await openaiClient.chat.completions.create({ model: attachment ? visionModel : textModel, response_format: SALES_CHAT_RESPONSE_FORMAT, messages: [
        { role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userContent },
      ] }, { signal: controller.signal });
      const content = completion?.choices?.[0]?.message?.content;
      if (attachment && typeof content === 'string') logger?.info?.('sales_chat_vision_request_succeeded', { model: visionModel, responseChars: content.length });
      if (typeof content !== 'string') {
        logValidationFailure(failure('invalid_provider_response'), { environment, logger });
        if (attachment) return { status: 502, body: { error: 'Vision response was not usable.' }, context };
        if (context.responseMode === 'support') return { status: 200, body: enforceSupportResponse(null, context), context };
        if (isInterruptMode(context.responseMode)) return { status: 200, body: enforceInterruptResponse(null, context, commercialFacts), context };
        return { status: 422, body: { error: 'Sales assistant response was not usable.' }, context };
      }
      const result = validateSalesLlmOutput(content, { plans: commercialFacts.plans, products: commercialFacts.products });
      if (!result.ok) logValidationFailure(result, { environment, logger });
      if (!result.ok) {
        const salvage = safelySalvageProviderReply(content, context, commercialFacts);
        if (salvage) {
          logger?.warn?.('sales_chat_provider_salvaged', { category: 'validator', stage: 'optional_metadata', reason: result.reason });
          if (context.responseMode === 'support') return { status: 200, body: enforceSupportResponse(salvage, context), context };
          if (isInterruptMode(context.responseMode)) return { status: 200, body: enforceInterruptResponse(salvage, context, commercialFacts), context };
          return { status: 200, body: salvage, context };
        }
        if (context.responseMode === 'support' && !attachment) return { status: 200, body: enforceSupportResponse(null, context), context };
        return { status: 502, body: { error: 'Sales assistant is temporarily unavailable.' }, context };
      }
      // A bare greeting has a deterministic, non-qualifying safe response. Apply
      // it after strict provider validation so it cannot mask unsafe reply text.
      const candidate = result.ok ? enforceBareGreetingResponse(result.value, context) : null;
      const languageValid = Boolean(candidate) && replyMatchesInputLanguage(candidate.reply, context.inputLanguage);
      const questionCountValid = Boolean(candidate) && hasAtMostOneQuestion(candidate.reply);
      if (result.ok && (!languageValid || !questionCountValid)) logValidationFailure(failure(!languageValid ? 'invalid_language' : 'too_many_questions'), { environment, logger });
      if (attachment && (!languageValid || !questionCountValid)) return { status: 502, body: { error: 'Vision response was not usable.' }, context };
      if (context.responseMode === 'support') return { status: 200, body: enforceSupportResponse(languageValid && questionCountValid ? candidate : null, context), context };
      if (isInterruptMode(context.responseMode)) return { status: 200, body: enforceInterruptResponse(languageValid && questionCountValid ? candidate : null, context, commercialFacts), context };
      if (result.ok && languageValid && questionCountValid) {
        const reply = sanitizeSalesReply(candidate.reply, SALES_CHAT_CAPABILITIES, context.inputLanguage);
        return { status: 200, body: { ...candidate, reply, actionIntent: reply === candidate.reply ? candidate.actionIntent : [] }, context };
      }
      return { status: 502, body: { error: 'Sales assistant is temporarily unavailable.' }, context };
    } catch (error) {
      logProviderFailure(error, logger);
      return { status: 503, body: { error: 'Sales assistant is temporarily unavailable.' }, context };
    } finally { clearTimeout(timer); }
  }
  return { handle };
}

export function createSalesChatRateLimiter({ limit = 30, windowMs = 60_000, now = Date.now } = {}) {
  const attempts = new Map();
  return {
    allow(identity = 'unknown') {
      const current = now();
      const recent = (attempts.get(identity) || []).filter((timestamp) => current - timestamp < windowMs);
      if (recent.length >= limit) { attempts.set(identity, recent); return false; }
      recent.push(current);
      attempts.set(identity, recent);
      return true;
    },
  };
}

export function registerSalesChatRoute({ app, service, rateLimiter }) {
  app.post('/api/sales-chat', async (req, res) => {
    if (!rateLimiter.allow(req.ip || req.socket?.remoteAddress || 'unknown')) {
      return res.status(429).json({ error: 'Sales assistant is temporarily unavailable.' });
    }
    const result = await service.handle({ body: req.body });
    return res.status(result.status).json(result.body);
  });
}

export { MODEL, VISION_MODEL, MAX_HISTORY, MAX_MESSAGE_LENGTH, SALES_CHAT_RESPONSE_FORMAT };
