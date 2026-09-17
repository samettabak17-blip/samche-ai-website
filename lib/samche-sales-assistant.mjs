import { plans } from './site-data.mjs';
import { translateText } from './samche-localization.mjs';

const blankLead = () => ({
  name: '', email: '', company: '', industry: '', country: '', website: '', mainGoal: '',
  channels: [], products: [], languages: '', integrations: '', volume: '',
  likelyPlan: '', recommendedPlan: '', preferredPlan: '', timeline: '', contactPreference: '', demoInterest: false,
  preferredDemoDate: '', preferredDemoTime: '',
  teamUsers: '', leadQualification: '', budget: '', apiWorkflow: '', apiAccessNeed: '', customWorkflowNeed: '', aiGuideNeed: '', externalIntegrations: '', aiLeadScoring: '',
});

const legacyBookingFields = new Set([
  'scheduledDemoDate', 'scheduledDemoTime', 'confirmedDemoDate', 'confirmedDemoTime',
  'bookedDemo', 'appointmentConfirmed', 'emailConfirmationSent',
]);

function sanitizeSalesLead(lead) {
  if (!lead || typeof lead !== 'object') return lead;
  return Object.fromEntries(Object.entries(lead).filter(([key]) => !legacyBookingFields.has(key)));
}

export const SALES_ACTION_CAPABILITIES = Object.freeze({
  canSubmitDemoForm: true,
  canOpenWhatsApp: true,
  canSendEmail: false,
  canScheduleCalendarMeeting: false,
  canConfirmAppointment: false,
});

const whatsappIconReplacements = Object.freeze({
  '🤖': '⚙️', '👤': '☑️', '🎯': '✳️', '💬': '✉️', '🧩': '✳️',
  '🌐': '☀️', '🔌': '⚡', '📊': '☑️', '📦': '▣', '🗓️': '☑️', '👥': '☑️',
});

export const WHATSAPP_SAFE_ICONS = Object.freeze([...new Set(Object.values(whatsappIconReplacements))]);
export const WHATSAPP_ICON_DIAGNOSTIC_MATRIX = Object.entries(whatsappIconReplacements).map(([source, icon]) => ({
  source, icon, codePoint: [...icon].map((character) => `U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join(' '),
  encoded: encodeURIComponent(icon), previewResult: 'PASS',
}));

export function getSalesInputLanguage(input = '') {
  const text = input.toLocaleLowerCase('tr-TR');
  if (/[çğıöşü]/i.test(text) || /\b(?:urun|ürün|hemen|teslim|ediyor|musunuz|müsünüz|danismanlik|danışmanlık|fiyat|paket|istiyorum|için|icin|mi|mı|nasıl|nasil|şirket|sirket)\b/i.test(text)) return 'tr';
  if (/[^\x00-\x7f]/.test(text)) return 'other';
  return 'en';
}

export function createInitialSalesState() {
  return {
    lead: blankLead(), intent: 'COLD', turns: 0, lastQuestion: '', qualificationStage: 'discovery',
    commercialIntent: 'COLD', summaryReadiness: false, pendingQualificationField: 'industry',
    lastPendingQuestion: 'What type of business do you operate?', offTopicTurns: 0,
  };
}

export function getSalesProcessingStatus(input, state = createInitialSalesState()) {
  const text = input.toLowerCase();
  if (/proposal|quotation|quote|start|speak to sales|talk to sales|demo|this month|buy|purchase/.test(text)) return 'Preparing your sales summary…';
  if (/price|pricing|cost|how much/.test(text)) return 'Checking the best-fit plan…';
  if (/real estate|property|e-?commerce|retail|hospitality|healthcare|education|\bdubai\b|\buae\b/.test(text)) return 'Understanding your business model…';
  if (/website|web chatbot|whatsapp|channel/.test(text)) return 'Analyzing your customer channels…';
  if (/crm|booking|integration|lead qualification|languages|api|workflow|ai guide|team|users|scoring/.test(text)) return 'Matching your requirements to SamChe AI products…';
  if (state.turns > 4) return 'Reviewing your product fit…';
  return 'Understanding your business needs…';
}

function addUnique(items, item) { return items.includes(item) ? items : [...items, item]; }
function explicitlyNotRequired(text, requirement) {
  const direct = new RegExp(`(?:\\bno\\b\\s*,?\\s*(?:we\\s+)?|\\b(?:do not|don['’]t|dont|not)\\b\\s*)(?:need|require|want)?\\s*(?:the\\s+)?${requirement}(?:\\s+needed)?\\b`, 'i');
  const list = new RegExp(`\\bno\\b[^.!?]*\\b${requirement}\\b`, 'i');
  const coordinated = text.match(/\b(?:do not|don['’]t|dont)\s+(?:need|require|want)\b([^.!?]*)/i);
  const coordinatedTail = coordinated?.[1] || '';
  const hasSecondRequirementVerb = /\b(?:need|require|want)\b/i.test(coordinatedTail);
  const hasContrast = /\b(?:but|however|except)\b/i.test(coordinatedTail);
  return direct.test(text) || list.test(text) || (Boolean(coordinatedTail) && !hasSecondRequirementVerb && !hasContrast
    && new RegExp(`\\b${requirement}\\b`, 'i').test(coordinatedTail));
}
function recoverLeadFromHistory(lead, history) {
  if (!Array.isArray(history) || history.length === 0) return lead;
  const recovered = history.reduce((current, message) => {
    if (message?.role !== 'user') return current;
    const text = typeof message.text === 'string' ? message.text : typeof message.content === 'string' ? message.content : '';
    return text ? extractLead(current, text) : current;
  }, blankLead());
  const merged = { ...recovered };
  for (const [key, value] of Object.entries(lead || {})) {
    if (Array.isArray(value)) merged[key] = [...new Set([...(recovered[key] || []), ...value])];
    else if (typeof value === 'string' && value) merged[key] = value;
    else if (typeof value === 'boolean') merged[key] = value || Boolean(recovered[key]);
  }
  return merged;
}

export function recommendSamchePlan(lead) {
  const text = [lead.mainGoal, lead.products.join(' '), lead.channels.join(' '), lead.integrations, lead.apiWorkflow, lead.volume].join(' ').toLowerCase();
  const volume = Number((lead.volume.match(/[\d,]+/) || ['0'])[0].replaceAll(',', ''));
  if (/multiple brands|multiple sites|erp|payment integration|custom infrastructure|very high volume/.test(text) || volume >= 100000) return 'enterprise';
  const apiOrWorkflowRequired = lead.apiAccessNeed === 'Required' || lead.customWorkflowNeed === 'Required'
    || lead.apiWorkflow === 'API / custom workflow capability requested';
  if (lead.aiGuideNeed === 'Required' || apiOrWorkflowRequired || lead.externalIntegrations === 'Multiple integrations requested'
    || lead.preferredPlan === 'business' || lead.aiLeadScoring === 'Required') return 'business';
  if (lead.channels.includes('WhatsApp') || /crm|booking|shared inbox|lead qualification/.test(text) || (lead.channels.includes('Website') && lead.products.includes('WhatsApp AI'))) return 'growth';
  if (lead.channels.includes('Website') || lead.products.includes('Web Chatbot')) return 'starter';
  return '';
}

function hasCoreQualification(lead) {
  return Boolean(lead.industry && lead.channels.length && lead.volume && lead.languages && lead.integrations && lead.leadQualification);
}

function isPlanRecommendationReady(lead) {
  return Boolean(lead.preferredPlan || (hasCoreQualification(lead) && lead.aiGuideNeed && lead.apiWorkflow
    && lead.externalIntegrations && lead.aiLeadScoring && lead.teamUsers));
}

export function hasRequiredDemoContact(lead) {
  return Boolean(lead?.name?.trim() && lead?.company?.trim() && /^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(lead?.email?.trim() || ''));
}

export function isDemoQualificationReady(lead) {
  return Boolean(lead?.industry && lead?.channels?.length && lead?.volume && (lead?.mainGoal || lead?.integrations));
}

export function filterSalesActionsForLead(lead, actions = []) {
  const ready = isDemoQualificationReady(lead) && hasRequiredDemoContact(lead);
  const withoutDemo = actions.filter((action) => action?.type !== 'demo');
  if (!ready) return withoutDemo;
  return actions.some((action) => action?.type === 'demo') || !lead?.demoInterest
    ? actions
    : [...actions, { label: 'REQUEST DEMO', type: 'demo' }];
}

export function validateSalesReply(reply, capabilities = SALES_ACTION_CAPABILITIES) {
  const text = String(reply || '').trim();
  if (!hasUnsafeSalesClaim(text, capabilities)) return text;
  return 'We’ll include your requested time as a preferred demo time. Our sales team will confirm availability after reviewing your request.';
}

export function hasUnsafeSalesClaim(reply, capabilities = SALES_ACTION_CAPABILITIES) {
  // Remove only explicit negated predicates, never a reply-wide "no" exemption.
  // Check clauses independently so a denial cannot hide a later affirmative claim.
  return String(reply).replace(/[’]/g, "'").replace(/[\u064B-\u065F]/g, '')
    .split(/[.!?;,\n،؛]+|\b(?:but|however|and)\b|ولكن|لكن/iu).some((clause) => {
      const affirmative = clause
        .replace(/\bno\s+(?:demo|appointment|meeting|slot|booking|email)(?:\s+or\s+email)?\s+(?:(?:has|have|is|was|were|will|be|been|now|yet)\s+)*(?:confirmed|scheduled|booked|sent)\b/gi, '')
        .replace(/\b(?:not|never|cannot|can't|haven't|hasn't|won't|isn't|wasn't|didn't)\s+(?:(?:have|has|been|be|yet|already|ever)\s+)*(?:confirm(?:ed)?|schedul(?:e|ed)|book(?:ed)?|send|sent|receive|received|email(?:ed)?)\b/gi, '')
        .replace(/(?:لم|لن|لا)\s+(?:يتم\s+|نقم\s+ب|يمكن(?:ني|نا)?\s+)?(?:تأكيد|نؤكد|حجز|نحجز|جدولة|نجدول|إرسال|ارسال|نرسل|يرسل|تأكيده)/gu, '')
        .replace(/(?:غير|ليس|ليست)\s+(?:مؤكد|مؤكدة|محجوز|محجوزة|مجدول|مجدولة)/gu, '');
      const explicitDenial = /\b(?:not|never|cannot|can't|haven't|hasn't|won't|isn't|wasn't|didn't)\b[^.!?\n]{0,100}\b(?:confirm|schedule|book|send|sent|receive|received|email)\b/i.test(clause)
        || /(?:لم|لن|لا|ليس|ليست|غير)[^،؛.!?\n]{0,100}(?:تأكيد|حجز|جدولة|إرسال|ارسال|بريد|إيميل|ايميل|مؤكد|محجوز|مجدول)/u.test(clause);
      if (explicitDenial) return false;
      const scheduling = /\b(?:demo|appointment|meeting|slot|booking)\b.{0,100}\b(?:confirm(?:ed|ation)?|schedul(?:e|ed|ing)|book(?:ed|ing)?|reserved|set|setting up|arranged|on the calendar)\b|\b(?:will|shall|can|going to)\s+(?:schedule|confirm|book|arrange|set(?:\s+up)?)\b.{0,100}\b(?:demo|appointment|meeting|slot|booking)\b|\b(?:schedule|scheduling|confirm|book|booking|set(?:ting)?(?:\s+up)?)\b.{0,100}\b(?:demo|appointment|meeting|slot|booking)\b|\b(?:confirm(?:ed|ation)?|schedul(?:e|ed|ing)|book(?:ed|ing)?|reserved|arranged|set(?:ting)?(?:\s+up)?|will\s+|going to\s+)(?:\w+\s+){0,2}(?:demo|appointment|meeting|slot|booking)\b|\b(?:set|setting up|arranged|scheduled|booked)\s+(?:a\s+)?(?:demo|appointment|meeting|slot|booking)\b|\b(?:demo|appointment|meeting|slot)\b.{0,100}\bon\s+the\s+calendar\b/i.test(affirmative)
        || /(?:تم|سيتم|سن|سوف|سيقوم|قمنا|لقد|قام|نحدد|نؤكد|نحجز|نجدول|جدولة|حجز|تأكيد|تحديد).{0,80}(?:موعد|عرض|اجتماع|تقويم)|(?:موعد|عرض|اجتماع).{0,80}(?:مؤكد|محجوز|مجدول)/u.test(affirmative);
      const email = /\b(?:send|sent|emailed|email|receive|received|will\s+email|going to\s+email)\b.{0,80}\b(?:confirmation|confirming|email)\b|\b(?:confirmation email|email confirmation|email is on the way|check your inbox)\b/i.test(affirmative)
        || /(?:أرسلنا|ارسلنا|سنرسل|نرسل|سيرسل|سيصلك|ستصلك|إرسال|ارسال|بريد|رسالة|إيميل|ايميل).{0,80}(?:تأكيد|موعد|عرض)/u.test(affirmative);
      return ((!capabilities.canScheduleCalendarMeeting || !capabilities.canConfirmAppointment) && scheduling)
        || (!capabilities.canSendEmail && email);
    });
}

function isGenericMainGoal(value) {
  return /^(?:i|we)\s+(?:need|want|am looking for|are looking for)\s+(?:ai|artificial intelligence)\s+for\s+(?:my|our)\s+(?:business|company)\.?$/i.test((value || '').trim());
}

function isWeakMainGoal(value) {
  return isGenericMainGoal(value) || /^(?:we are|i am|our company is)\b.*\b(?:company|business|real estate|retail|hospitality|healthcare|education)\b[.!]?$/i.test((value || '').trim());
}

const llmLeadFields = new Set([
  'name', 'email', 'company', 'industry', 'country', 'website', 'mainGoal', 'channels', 'products', 'languages',
  'integrations', 'volume', 'timeline', 'contactPreference', 'preferredDemoDate', 'preferredDemoTime', 'teamUsers', 'leadQualification', 'budget',
  'apiWorkflow', 'apiAccessNeed', 'customWorkflowNeed', 'aiGuideNeed', 'externalIntegrations', 'aiLeadScoring',
]);

function normalizeTeamUsers(value) {
  const text = String(value || '').trim().toLowerCase();
  const word = '(one|two|three|four|five|six|seven|eight|nine|ten)';
  const match = text.match(new RegExp(`\\b(\\d+|${word.slice(1, -1)})\\b`));
  if (!match) return '';
  const numbers = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10' };
  return numbers[match[1]] || match[1];
}

export function getPendingQualificationField(state) {
  const lead = state?.lead || state || blankLead();
  if (!lead.industry) return 'industry';
  if (!lead.channels?.length) return 'channels';
  if (!lead.volume) return 'volume';
  if (!lead.integrations) return 'integrations';
  if (!lead.leadQualification) return 'leadQualification';
  if (!lead.languages) return 'languages';
  if (!lead.aiGuideNeed) return 'aiGuideNeed';
  if (!lead.apiWorkflow) return 'apiWorkflow';
  if (!lead.externalIntegrations) return 'externalIntegrations';
  if (!lead.aiLeadScoring) return 'aiLeadScoring';
  if (!lead.teamUsers) return 'teamUsers';
  if (!lead.timeline) return 'timeline';
  if (!lead.contactPreference) return 'contactPreference';
  return null;
}

export function applyValidatedSalesFields(state, fields = {}) {
  const nextLead = { ...state.lead, channels: [...state.lead.channels], products: [...state.lead.products] };
  for (const [key, value] of Object.entries(fields)) {
    if (!llmLeadFields.has(key)) continue;
    if (key === 'channels' || key === 'products') {
      if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) continue;
      nextLead[key] = [...new Set([...nextLead[key], ...value])];
    } else if (key === 'teamUsers') {
      const normalized = normalizeTeamUsers(value);
      if (normalized) nextLead.teamUsers = normalized;
    } else if (typeof value === 'string' && value.trim().length <= 500) {
      nextLead[key] = value.trim();
    }
  }
  nextLead.likelyPlan = nextLead.preferredPlan || (nextLead.channels.length && nextLead.volume && (nextLead.integrations || nextLead.leadQualification) ? recommendSamchePlan(nextLead) : '') || '';
  nextLead.recommendedPlan = isPlanRecommendationReady(nextLead) ? (nextLead.preferredPlan || nextLead.likelyPlan || recommendSamchePlan(nextLead) || '') : '';
  const intent = state.intent || 'COLD';
  const next = {
    ...state,
    lead: nextLead,
    pendingQualificationField: getPendingQualificationField({ lead: nextLead }),
    summaryReadiness: isLeadSummaryReady(nextLead, intent),
  };
  next.qualificationStage = next.summaryReadiness ? 'qualified' : nextLead.recommendedPlan ? 'confirmed-fit' : nextLead.likelyPlan ? 'fit-discovery' : nextLead.channels.length ? 'qualification' : 'discovery';
  return next;
}

export function buildOffTopicReply(state, input = '') {
  const pendingQuestion = state.lastPendingQuestion || nextQualificationQuestion(state.lead) || 'What would you like SamChe AI to help your business achieve?';
  const count = Math.min(Number(state.offTopicTurns) || 0, 2);
  const replies = [
    `I’m focused on SamChe AI rather than ${input.trim() || 'that topic'}, so I can’t reliably help with it here. For your setup, I was checking: ${pendingQuestion}`,
    `I can help with SamChe AI sales and product questions. The pending question for your setup is: ${pendingQuestion}`,
    `Let’s keep this focused on SamChe AI. ${pendingQuestion}`,
  ];
  return {
    state: { ...state, offTopicTurns: count + 1, pendingQualificationField: state.pendingQualificationField || getPendingQualificationField(state) },
    reply: replies[count],
  };
}

function extractLead(lead, input) {
  const next = { ...lead, channels: [...lead.channels], products: [...lead.products] };
  const raw = input.trim();
  const lower = raw.toLowerCase();
  const labeled = (key) => raw.match(new RegExp(`(?:^|[,;\\n])\\s*${key}\\s*:\\s*([^,;\\n]+)`, 'i'))?.[1]?.trim();
  next.name ||= labeled('name') || '';
  next.email ||= raw.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] || '';
  next.company ||= labeled('company') || labeled('business') || '';
  const site = raw.match(/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:com|ae|org|net|io|ai|co|biz)\b/i)?.[0];
  next.website ||= site ? (/^https?:\/\//i.test(site) ? site : `https://${site}`) : '';
  if (/real estate|property|properties/.test(lower)) next.industry ||= 'Real Estate';
  else if (/e-?commerce|retail|online store/.test(lower)) next.industry ||= 'E-commerce / Retail';
  else if (/hotel|hospitality|restaurant/.test(lower)) next.industry ||= 'Hospitality';
  else if (/healthcare|clinic|medical/.test(lower)) next.industry ||= 'Healthcare';
  else if (/education|school|university/.test(lower)) next.industry ||= 'Education';
  else if (labeled('industry')) next.industry ||= labeled('industry');
  if (/\b(?:uae|united arab emirates|dubai|abu dhabi)\b/i.test(raw)) next.country ||= 'United Arab Emirates';
  else if (/\bsaudi|riyadh|ksa\b/i.test(lower)) next.country ||= 'Saudi Arabia';
  else if (/\b(qatar|doha)\b/i.test(lower)) next.country ||= 'Qatar';
  else if (labeled('country|market')) next.country ||= labeled('country|market');
  if (/website|web chatbot|website ai|site enquiries/i.test(lower)) next.channels = addUnique(next.channels, 'Website');
  if (/whatsapp/i.test(lower)) next.channels = addUnique(next.channels, 'WhatsApp');
  if (next.channels.includes('Website')) next.products = addUnique(next.products, 'Web Chatbot');
  const productMatches = [
    ['Web Chatbot', /web chatbot|website chatbot|website ai|website enquiries|website inquiries/], ['WhatsApp AI', /whatsapp(?: ai)?/],
    ['AI Guide', /ai guide/], ['Knowledge Intelligence', /knowledge intelligence|company knowledge|business knowledge/],
    ['Live Inbox', /live inbox|shared inbox/], ['CRM & Pipeline', /samche.{0,20}\bcrm\b|\bcrm\s*(?:&|and)\s*pipeline\b|\bpipeline module\b/i],
  ];
  for (const [name, pattern] of productMatches) {
    const excluded = name === 'AI Guide' && explicitlyNotRequired(lower, '(?:ai guide|guided journey)');
    if (pattern.test(lower) && !excluded) next.products = addUnique(next.products, name);
  }
  const languages = ['English', 'Arabic', 'Turkish', 'French', 'Spanish', 'Hindi', 'Urdu'];
  const foundLanguages = languages.filter((language) => new RegExp(`\\b${language}\\b`, 'i').test(raw));
  if (foundLanguages.length) next.languages = [...new Set([...next.languages.split(' / ').filter(Boolean), ...foundLanguages])].join(' / ');
  const volume = raw.match(/([\d,]+\+?)\s*(?:customer\s+)?(?:enquir(?:y|ies)|inquir(?:y|ies)|leads|customers|messages|conversations)(?:\s*(?:per|\/|a)\s*month|\s*monthly|\s*each month)?/i)
    || raw.match(/(?:volume|around|about|approximately)\s*[:=]?\s*([\d,]+\+?)\s*(?:\/month|per month|monthly)/i);
  if (volume) next.volume ||= `${volume[1]}/month`;
  if (/crm|booking|integration/i.test(lower)) next.integrations ||= /no integration|without integration/i.test(lower) ? 'Not currently required' : 'CRM / booking integration requested';
  if (/\b(?:this month|within 30 days|within 1 month|urgent|asap|immediately)\b/i.test(lower)) next.timeline ||= /this month/i.test(lower) ? 'This month' : 'Within 30 days';
  else if (/next month|within 3 months|this quarter/i.test(lower)) next.timeline ||= /next month/i.test(lower) ? 'Next month' : 'This quarter';
  if (/\b(?:starter plan|plan starter|prefer starter)\b/i.test(lower)) next.preferredPlan = 'starter';
  if (/\b(?:growth plan|plan growth|prefer growth)\b/i.test(lower)) next.preferredPlan = 'growth';
  if (/\b(?:business plan|plan business|prefer business)\b/i.test(lower)) next.preferredPlan = 'business';
  if (/\b(?:enterprise plan|plan enterprise|prefer enterprise)\b/i.test(lower)) next.preferredPlan = 'enterprise';
  if (/\b(?:ai guide|guided journey)\b/i.test(lower)) next.aiGuideNeed = explicitlyNotRequired(lower, '(?:ai guide|guided journey)') ? 'Not required' : 'Required';
  const mentionsApi = /\bapi(?:\s+access)?\b/i.test(lower);
  const mentionsCustomWorkflow = /\bcustom workflows?\b|\bcustom integration\b/i.test(lower);
  if (mentionsApi) next.apiAccessNeed = explicitlyNotRequired(lower, 'api(?:\\s+access)?') ? 'Not required' : 'Required';
  if (mentionsCustomWorkflow) next.customWorkflowNeed = explicitlyNotRequired(lower, '(?:custom workflows?|custom integration)') ? 'Not required' : 'Required';
  if (mentionsApi || mentionsCustomWorkflow) {
    const apiNegative = next.apiAccessNeed === 'Not required' || !mentionsApi;
    const workflowNegative = next.customWorkflowNeed === 'Not required' || !mentionsCustomWorkflow;
    next.apiWorkflow = apiNegative && workflowNegative ? 'Not required' : 'API / custom workflow capability requested';
  }
  if (/\b(?:lead scoring|score leads)\b/i.test(lower)) next.aiLeadScoring = explicitlyNotRequired(lower, '(?:ai\\s+)?(?:lead scoring|score leads)') ? 'Not required' : 'Required';
  const integrationCount = raw.match(/\b(\d+|one|two|three|four|five)\s+(?:(?:external|crm|booking)\s+)?integrations?\b/i);
  if (/multiple integrations|several integrations/i.test(lower)) next.externalIntegrations ||= 'Multiple integrations requested';
  else if (integrationCount) next.externalIntegrations ||= integrationCount[1];
  else if (/no other integrations|only (?:one|a single) (?:crm|booking) integration|just (?:one|a single) (?:crm|booking) integration|no additional integrations/i.test(lower)) next.externalIntegrations ||= 'One integration';
  const users = raw.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b(?:\s+(?:team\s+)?(?:users|agents|staff|people)|\s+of\s+us|\s+(?:sales\s+)?reps?\b)/i)
    || raw.match(/\b(?:only\s+)?(?:our|my)\s+(?:sales\s+)?(?:team\s+of\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i);
  if (users) {
    const userCount = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10' };
    next.teamUsers = userCount[users[1].toLowerCase()] || users[1];
  }
  else if (/\b(?:team size|team users|users|agents|staff)\b/i.test(lower) && /not relevant|not applicable|only me|just me/i.test(lower)) next.teamUsers ||= 'Not applicable';
  if (/\b(?:demo|demonstration)\b/i.test(lower)) next.demoInterest = true;
  if (/\btoday\b/i.test(lower)) next.preferredDemoDate ||= 'Today';
  else if (/\btomorrow\b/i.test(lower)) next.preferredDemoDate ||= 'Tomorrow';
  const dottedTime = raw.match(/\b(?:at\s*)?(\d{1,2})[.:](\d{2})\s*(am|pm)?\b/i);
  const spokenTime = raw.match(/\b(?:at\s*)?(\d{1,2})\s*(am|pm)\b/i);
  const time = dottedTime || spokenTime;
  if (time) {
    const hour = Number(time[1]);
    const minute = dottedTime ? dottedTime[2] : '00';
    const suffix = (dottedTime?.[3] || spokenTime?.[2] || '').toUpperCase();
    next.preferredDemoTime ||= `${hour}:${minute}${suffix ? ` ${suffix}` : ''}`;
  }
  if (/\b(?:prefer(?:red)?(?:\s+to contact)?\s+whatsapp|contact me (?:on|via) whatsapp|talk to sales (?:on|via) whatsapp)\b/i.test(lower)) next.contactPreference ||= 'WhatsApp';
  else if (/\bprefer(?:red)?(?:\s+to contact)?\s+(?:by )?email|contact me by email\b/i.test(lower)) next.contactPreference ||= 'Email';
  if (/\b(?:budget|aed|usd|dollars|dirhams)\b/i.test(lower) && /\d/.test(lower)) next.budget ||= raw.match(/.{0,20}\b(?:budget|aed|usd)\b.{0,28}/i)?.[0]?.trim() || '';
  if (/lead qualification|qualify leads/i.test(lower)) next.leadQualification ||= /(?:do not|don't|dont|no|not)\s+(?:need|require|want).{0,80}(?:lead qualification|qualify leads)/i.test(lower) ? 'Not required' : 'Lead qualification requested';
  if ((!next.mainGoal || isWeakMainGoal(next.mainGoal)) && (next.channels.length || /lead qualification|customer enquiries|customer inquiries|crm integration|ai guide|automate|qualify|website|whatsapp/i.test(lower))) next.mainGoal = raw;
  next.likelyPlan = next.preferredPlan || (next.channels.length && next.volume && (next.integrations || next.leadQualification) ? recommendSamchePlan(next) : '') || '';
  next.recommendedPlan = isPlanRecommendationReady(next) ? (next.preferredPlan || next.likelyPlan || recommendSamchePlan(next) || '') : '';
  return next;
}

export function isLeadSummaryReady(lead, intent = 'COLD') {
  const hasSpecificGoal = Boolean(lead.mainGoal && !isGenericMainGoal(lead.mainGoal));
  const hasRequirement = Boolean(lead.channels.length || lead.products.length || lead.website || lead.integrations || lead.leadQualification || lead.volume || hasSpecificGoal);
  const enoughForSummary = Boolean(lead.industry && lead.channels.length && lead.volume && lead.languages && lead.integrations && lead.leadQualification && hasRequirement);
  const fitConfirmed = Boolean(lead.recommendedPlan && isPlanRecommendationReady(lead));
  const demoHandoffReady = !lead.demoInterest || (isDemoQualificationReady(lead) && hasRequiredDemoContact(lead));
  return Boolean(enoughForSummary && demoHandoffReady && (intent === 'HOT' || fitConfirmed));
}

function hasHotIntent(input) {
  return /\b(price|pricing|cost|how much|demo|demonstration|start|proposal|quote|quotation|sales|setup|urgent|this month|buy|purchase|subscribe|subscription)\b/i.test(input);
}

function classifyInScopeInterrupt(input) {
  const lower = input.toLowerCase();
  if (/demo|demonstration/.test(lower) && !/\b(?:i|we)\s+(?:need|want|would like)\b.*\bdemo\b/i.test(lower)) return 'demo_question';
  const isQuestion = /\?/.test(lower) || /^\s*(?:can|could|how|what|does|is|will|would|do|are|tell me)\b/.test(lower);
  if (!isQuestion) return '';
  if (/replace (?:one of )?(?:my|our) sales staff|replace (?:an? )?employee|reduce (?:our )?headcount|guaranteed (?:roi|sales)|can (?:the )?ai (?:answer|handle|automate)|answer customers (?:at night|overnight)|24\s*\/\s*7|after[- ]hours|what can (?:the )?ai do|how does (?:the )?ai work/.test(lower)) return 'capability_question';
  if (/how does (?:the )?ai guide work|how does (?:the )?(?:web chatbot|whatsapp ai|live inbox|knowledge intelligence) work|what does (?:the )?(?:ai guide|web chatbot|whatsapp ai|live inbox) do/.test(lower)) return 'feature_question';
  if (/price|pricing|cost|how much/.test(lower)) return 'pricing_question';
  if (/what is (?:samche|the )?(?:ai|platform)|what (?:products?|features?)|how does .*platform|integration|crm|lead qualification|web chatbot|whatsapp ai|ai guide|live inbox/.test(lower)) return 'product_question';
  return '';
}

export function getSalesResponseMode(input) {
  const interruptKind = classifyInScopeInterrupt(input);
  if (interruptKind === 'capability_question') return 'capability_interrupt';
  if (interruptKind === 'pricing_question') return 'pricing_interrupt';
  if (interruptKind === 'demo_question' || hasExplicitDemoIntent(input)) return 'demo_interrupt';
  if (interruptKind === 'feature_question' || interruptKind === 'product_question') return 'in_scope_interrupt';
  if (hasExplicitSalesIntent(input) || hasExplicitCommercialIntent(input)) return 'handoff';
  return 'qualification_answer';
}

export function getSalesDetectedIntent(input) {
  const interruptKind = classifyInScopeInterrupt(input);
  if (interruptKind === 'capability_question') return 'capability_question';
  if (interruptKind === 'pricing_question') return 'pricing_question';
  if (interruptKind === 'demo_question' || hasExplicitDemoIntent(input)) return 'demo_question';
  if (interruptKind === 'feature_question' || interruptKind === 'product_question') return 'product_question';
  if (hasExplicitSalesIntent(input) || hasExplicitCommercialIntent(input)) return 'handoff';
  return 'qualification';
}

function pendingQuestionFor(state, lead) {
  return state.lastPendingQuestion || nextQualificationQuestion(lead) || 'What would you like SamChe AI to help your business achieve?';
}

function capabilityInterruptReply(pendingQuestion) {
  return `SamChe AI can automate a large part of first-response and qualification work, such as answering enquiries, handling FAQs, qualifying leads, and routing conversations. It is a support layer rather than a one-for-one replacement for a salesperson: human sales staff remain important for complex negotiations, relationship-building, and closing. ${pendingQuestion}`;
}

function featureInterruptReply(input, pendingQuestion) {
  if (/ai guide/i.test(input)) return `AI Guide provides a guided, step-by-step experience that can help visitors find the right information and next action. It can support structured journeys without replacing human judgment for complex cases. ${pendingQuestion}`;
  return `SamChe AI can answer common questions, use approved business knowledge, and route qualified conversations to your team. ${pendingQuestion}`;
}

function planFor(lead) { return plans.find((plan) => plan.slug === (lead.recommendedPlan || lead.likelyPlan)); }
function nextQualificationQuestion(lead) {
  if (!lead.volume) return 'Roughly how many customer enquiries do you receive in a typical month?';
  if (!lead.integrations) return 'Will you need a CRM, booking, or other system integration?';
  if (!lead.leadQualification) return 'Do you need AI to qualify leads before handing them to your team?';
  if (!lead.languages) return 'Which languages do you need the assistant to support?';
  if (!lead.aiGuideNeed) return 'Would a guided AI Guide experience be useful, or are you focused on Web Chatbot and WhatsApp?';
  if (!lead.apiWorkflow) return 'Do you need API access or custom workflows?';
  if (!lead.externalIntegrations) return 'How many external system integrations do you expect to need?';
  if (!lead.aiLeadScoring) return 'Would AI lead scoring be useful for your sales team?';
  if (!lead.teamUsers) return 'How many people would use the shared inbox or lead workspace?';
  if (!lead.timeline) return 'When would you ideally like to start evaluating or launching the setup?';
  if (!lead.contactPreference) return 'Would you prefer a demo request or a WhatsApp conversation?';
  return '';
}

function nextDemoQualificationQuestion(lead) {
  if (!lead.industry) return 'What type of business do you operate?';
  if (!lead.channels.length) return 'Which customer channels should the demo cover: your website, WhatsApp, or both?';
  if (!lead.volume) return 'Roughly how many customer enquiries do you receive in a typical month?';
  if (!lead.mainGoal && !lead.integrations) return 'What is the main requirement you want the demo to focus on?';
  if (!hasRequiredDemoContact(lead)) return 'Great — I have the main requirements. May I have your name, work email and company name?';
  return '';
}

function normalizeArabicSalesInput(value) {
  let text = value;
  const substitutions = [
    [/أحتاج حلاً بالذكاء الاصطناعي لشركتي|أحتاج ذكاءً اصطناعياً لشركتي|نحتاج الذكاء الاصطناعي لشركتنا/g, 'I need AI for my business'],
    [/هل يمكن للذكاء الاصطناعي استبدال موظف المبيعات|هل يمكن للذكاء الاصطناعي استبدال أحد موظفي المبيعات/g, 'Can AI replace one of my sales staff?'],
    [/هل يمكنه الإجابة على العملاء ليلاً|هل يجيب العملاء أثناء الليل/g, 'Can it answer customers at night?'],
    [/كيف يعمل (?:مرشد الذكاء الاصطناعي|الدليل الذكي|AI Guide)/gi, 'How does the AI Guide work?'],
    [/العقارات|عقارية|عقاري/g, 'real estate'], [/الإمارات العربية المتحدة|الإمارات|دبي|أبوظبي/g, 'UAE Dubai'],
    [/الموقع الإلكتروني|الموقع|موقعنا|موقعي/g, 'website'], [/واتساب|واتس آب/g, 'WhatsApp'],
    [/تأهيل العملاء المحتملين|تأهيل العملاء/g, 'lead qualification'], [/استفسارات|استفسار/g, 'enquiries'], [/حوالي|تقريباً|نحو/g, 'around'],
    [/شهرياً|في الشهر|كل شهر/g, 'per month'], [/ربط|تكامل|التكامل مع|تكامل مع/g, 'integration'],
    [/إدارة علاقات العملاء|إدارة العملاء|سي آر إم|CRM/gi, 'CRM'],
    [/الإنجليزية|إنجليزي/g, 'English'], [/العربية|عربي|عربية/g, 'Arabic'],
    [/مرشد الذكاء الاصطناعي|الدليل الذكي|AI Guide/gi, 'AI Guide'], [/عرض توضيحي|عرضاً توضيحياً|عرض تجريبي/g, 'demo'],
    [/عرض سعر|عرضاً تجارياً|مقترح تجاري|مقترح/g, 'proposal'], [/هذا الشهر|الشهر الحالي/g, 'this month'],
    [/لا نحتاج|لا أحتاج|غير مطلوب|لا حاجة إلى/g, 'do not need'], [/سير عمل مخصص|مسارات عمل مخصصة/g, 'custom workflows'],
    [/واجهة برمجة التطبيقات|واجهات برمجة التطبيقات|API/gi, 'API'], [/كم التكلفة|ما التكلفة|كم السعر|الأسعار|السعر/g, 'How much cost'],
    [/شركة|شركتنا|شركتي/g, 'company'], [/أريد أن أبدأ|نريد البدء|نريد أن نبدأ/g, 'We want to start'],
    [/المبيعات/g, 'sales'], [/خطة/g, 'plan'], [/الفريق/g, 'team'], [/اللغات/g, 'languages'],
  ];
  for (const [pattern, replacement] of substitutions) text = text.replace(pattern, replacement);
  text = text.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  return text;
}

function arabicQualificationQuestion(lead) {
  if (!lead.industry) return 'ما طبيعة نشاط شركتكم؟';
  if (!lead.channels.length) return 'أين ترد معظم استفسارات العملاء اليوم: عبر موقعكم الإلكتروني أم واتساب أم كليهما؟';
  if (!lead.volume) return 'تقريباً، كم استفساراً من العملاء تستقبلون شهرياً؟ وهل تحتاجون إلى تكامل مع CRM أو إلى تأهيل العملاء المحتملين؟';
  if (!lead.integrations) return 'هل تحتاجون إلى ربط CRM أو نظام حجز أو أي نظام آخر؟';
  if (!lead.leadQualification) return 'هل تحتاجون إلى تأهيل العملاء المحتملين بالذكاء الاصطناعي قبل تحويلهم إلى فريقكم؟';
  if (!lead.languages) return 'ما اللغات التي يحتاج المساعد إلى دعمها لعملائكم؟';
  if (!lead.aiGuideNeed) return 'هل تحتاجون إلى تجربة AI Guide إرشادية، أم يتركز احتياجكم على روبوت الموقع وWhatsApp؟';
  if (!lead.apiWorkflow) return 'هل تحتاجون إلى واجهة API أو مسارات عمل مخصصة؟';
  if (!lead.externalIntegrations) return 'كم نظاماً خارجياً تتوقعون الحاجة إلى ربطه؟';
  if (!lead.aiLeadScoring) return 'هل يفيد فريق المبيعات تقييم العملاء المحتملين بالذكاء الاصطناعي؟';
  if (!lead.teamUsers) return 'كم شخصاً سيستخدم صندوق المحادثات أو مساحة العملاء؟';
  if (!lead.timeline) return 'متى تودون بدء تقييم الحل أو تشغيله؟';
  if (!lead.contactPreference) return 'هل تفضلون طلب عرض توضيحي أم متابعة الحديث عبر واتساب؟';
  return '';
}

function arabicSalesReply(englishReply, lead, input) {
  const question = arabicQualificationQuestion(lead);
  if (/automate a large part|support layer|human sales staff remain important/i.test(englishReply)) return `يمكن لـ SamChe AI أتمتة جزء كبير من الردود الأولية وتأهيل العملاء، مثل الإجابة عن الاستفسارات والتعامل مع الأسئلة الشائعة وتأهيل العملاء وتوجيه المحادثات. وهو طبقة دعم لفريقكم وليس بديلاً فردياً عن موظفي المبيعات؛ إذ يظل دور الفريق مهماً في التفاوض وبناء العلاقات وإتمام الصفقات. ${question}`;
  if (/AI Guide provides|SamChe AI can answer common questions/i.test(englishReply)) return `يوفر AI Guide تجربة إرشادية خطوة بخطوة تساعد الزوار في الوصول إلى المعلومات والخطوة التالية المناسبة، مع إبقاء الحالات المعقدة ضمن التقدير البشري. ${question}`;
  if (/product assistant/i.test(englishReply)) return 'أنا مساعد منتجات SamChe AI، ويمكنني مساعدتكم في المنتجات والأسعار والعروض واختيار الحل المناسب لأعمالكم. ما التحدي الذي ترغبون في معالجته؟';
  if (/what type of business do you operate/i.test(englishReply)) return `بالطبع، يمكنني مساعدتكم في اختيار الإعداد الأنسب. ${question}`;
  if (/where do most customer enquiries arrive/i.test(englishReply)) return `شكراً، دوّنت نشاطكم${lead.country ? ` في ${lead.country}` : ''}. ${question}`;
  if (/both your website and whatsapp/i.test(englishReply)) return `هذا مناسب. يمكن لـ SamChe AI دعم موقعكم وWhatsApp من منصة واحدة. ${question}`;
  if (/AED 1,790\/month/i.test(englishReply)) return `تبدأ خطة Starter لروبوت الموقع من AED 1,790 شهرياً، مع رسوم إعداد لمرة واحدة قدرها AED 2,500 و5,000 تفاعل ذكاء اصطناعي شهرياً. ${question}`;
  const plan = plans.find((item) => item.slug === (lead.recommendedPlan || lead.likelyPlan));
  if (/how much|AED \d/i.test(input) && plan) return `تبدو خطة ${plan.name} حالياً الأقرب لاحتياجكم. تبلغ AED ${plan.monthly.toLocaleString('en-US')} شهرياً، مع رسوم إعداد لمرة واحدة قدرها AED ${plan.setup.toLocaleString('en-US')} و${plan.interactions} تفاعل ذكاء اصطناعي شهرياً. ${question}`;
  if (/currently looks like the closest fit|closest fit/i.test(englishReply)) return `بناءً على ما شاركتموه حتى الآن، تبدو خطة ${plan?.name || ''} الأقرب لاحتياجكم. قبل تأكيدها، ${question}`;
  if (/recommended plan/i.test(englishReply)) return `بناءً على متطلباتكم، تبدو خطة ${plan?.name || ''} الأنسب. ${question || 'يمكنكم مراجعة ملخص المتطلبات واختيار طلب عرض توضيحي أو التواصل مع فريق المبيعات.'}`;
  if (/requirements summary/i.test(englishReply)) return `أعددت ملخص متطلباتكم أدناه${plan ? `، وتبدو خطة ${plan.name} الأقرب لاحتياجكم حالياً` : ''}. راجعوه ثم اختاروا طلب عرض توضيحي أو التواصل مع فريق المبيعات عبر واتساب لمناقشة العرض التجاري.`;
  if (/which product are you most interested/i.test(englishReply)) return 'يسعدني ترتيب العرض المناسب. ما المنتج الذي ترغبون في استكشافه أولاً: روبوت الموقع، WhatsApp AI، AI Guide، أم المنصة كاملة؟';
  if (/how many|which languages|integration|api access|ai guide|external system|how many people|when would you ideally|prefer a demo/i.test(englishReply)) return question;
  return `يمكن لـ SamChe AI دعم احتياجات أعمالكم عبر مساعدات ذكية ومحادثات العملاء وإدارة المعرفة. ${question || 'كيف تودون متابعة الخطوة التالية؟'}`;
}

function hasExplicitDemoIntent(input) {
  return /\b(?:i|we)\s+(?:want|need|would like|am interested in)\s+(?:a\s+)?(?:product\s+)?(?:demo|demonstration)\b|\b(?:request|book|schedule)\s+(?:a\s+)?(?:product\s+)?(?:demo|demonstration)\b|\b(?:try|test)\s+(?:the\s+)?(?:web chatbot|whatsapp ai|ai guide)\b/i.test(input);
}

function hasExplicitSalesIntent(input) {
  return /\b(?:i|we)\s+(?:want|need|would like)\s+to\s+(?:speak|talk)\s+to\s+sales\b|\b(?:speak|talk)\s+to\s+sales\s+(?:on|via)\s+whatsapp\b|\bcontact\s+(?:sales|someone)\b/i.test(input);
}

function hasExplicitCommercialIntent(input) {
  return /\b(?:i|we)\s+(?:want|need|would like|am ready)\s+to\s+(?:start|buy|purchase|subscribe)\b|\b(?:send|prepare|need)\s+(?:me\s+)?(?:a\s+)?(?:proposal|quote|quotation)\b/i.test(input);
}

function actionsFor(lead, commercialStage, input = '') {
  const actions = [];
  const canEscalate = Boolean(lead.products.length || lead.industry || lead.company || lead.name || lead.mainGoal || lead.timeline);
  const explicitDemo = hasExplicitDemoIntent(input) || Boolean(lead.demoInterest);
  const explicitSales = hasExplicitSalesIntent(input);
  const explicitCommercial = hasExplicitCommercialIntent(input);
  const productDemo = /\b(?:try|test)\s+(?:the\s+)?(?:web chatbot|whatsapp ai|ai guide)\b/i.test(input);
  if ((commercialStage || productDemo) && lead.products.includes('Web Chatbot')) actions.push({ label: 'TRY WEB CHATBOT', type: 'link', href: 'https://demo.samchecompany.com/' });
  if ((commercialStage || productDemo) && lead.products.includes('AI Guide')) actions.push({ label: 'TRY AI GUIDE', type: 'link', href: 'https://rehber.samchecompany.ae/' });
  const demoReady = SALES_ACTION_CAPABILITIES.canSubmitDemoForm
    && isDemoQualificationReady(lead) && Boolean(lead.leadQualification) && hasRequiredDemoContact(lead)
    && (commercialStage || explicitDemo || explicitCommercial);
  if (demoReady) actions.push({ label: 'REQUEST DEMO', type: 'demo' });
  if ((commercialStage && canEscalate && (!lead.demoInterest || hasRequiredDemoContact(lead))) || explicitSales || (!lead.demoInterest && explicitCommercial)) actions.push({ label: 'TALK TO SALES ON WHATSAPP', type: 'whatsapp' });
  return actions;
}

export function generateSalesTurn(state = createInitialSalesState(), input, conversationHistory = [], locale = 'en') {
  const originalInput = input.trim();
  const raw = locale === 'ar' ? normalizeArabicSalesInput(originalInput).trim() : originalInput;
  const interruptKind = classifyInScopeInterrupt(raw);
  const recoveredLead = recoverLeadFromHistory(sanitizeSalesLead(state.lead), conversationHistory);
  const nextLead = interruptKind ? { ...recoveredLead, channels: [...recoveredLead.channels], products: [...recoveredLead.products] } : extractLead(recoveredLead, raw);
  const priorQuestion = state.lastQuestion;
  const pendingQuestion = pendingQuestionFor(state, nextLead);
  const contextualSalesAnswer = (
    (/how many.*(?:enquiries|inquiries|leads|customers)/i.test(priorQuestion) && /\d/.test(raw))
    || (/crm, booking, or other system integration/i.test(priorQuestion) && /\b(?:yes|no|crm|booking|integration|api|none)\b/i.test(raw))
    || (/which languages/i.test(priorQuestion) && /\b(?:english|arabic|turkish|french|spanish|hindi|urdu)\b/i.test(raw))
    || (/when would you ideally like to start/i.test(priorQuestion) && /\b(?:within|this month|next month|quarter|urgent|asap)\b/i.test(raw))
    || (/prefer a demo request or a whatsapp conversation/i.test(priorQuestion) && /\b(?:demo|whatsapp)\b/i.test(raw))
    || (/how many people would use the shared inbox or lead workspace/i.test(priorQuestion)
      && /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:team\s+)?(?:users|agents|staff|people)\b/i.test(raw))
    || (/what type of business do you operate/i.test(priorQuestion) && /\b(?:real estate|property|properties|e-?commerce|retail|hotel|hospitality|restaurant|healthcare|clinic|medical|education|school|university)\b/i.test(raw))
    || (/where do most customer enquiries arrive/i.test(priorQuestion) && /\b(?:website|whatsapp|both)\b/i.test(raw))
  );
  if (/demo request or a whatsapp conversation|prefer a demo request or a whatsapp/i.test(state.lastQuestion)) {
    if (/\bwhatsapp\b/i.test(raw)) nextLead.contactPreference = 'WhatsApp';
    else if (/\bdemo\b/i.test(raw)) nextLead.contactPreference = 'Demo request';
  }
  const hot = !interruptKind && hasHotIntent(raw);
  const intent = interruptKind ? (state.intent || 'COLD') : (hot || state.intent === 'HOT' ? 'HOT' : (isLeadSummaryReady(nextLead) ? 'WARM' : 'COLD'));
  const leadChanged = Object.keys(nextLead).some((key) => JSON.stringify(nextLead[key]) !== JSON.stringify(state.lead?.[key]));
  const next = {
    lead: nextLead, intent, turns: state.turns + 1, lastQuestion: '', qualificationStage: state.qualificationStage || 'discovery',
    commercialIntent: intent, summaryReadiness: false, pendingQualificationField: state.pendingQualificationField,
    lastPendingQuestion: state.lastPendingQuestion || pendingQuestion, offTopicTurns: 0,
  };
  if (interruptKind) {
    const pricingPlan = /web chatbot|chatbot/i.test(raw)
      ? plans.find((item) => item.slug === 'starter')
      : planFor(nextLead) || plans.find((item) => new RegExp(`\\b${item.name}\\b`, 'i').test(raw));
    let reply;
    if (interruptKind === 'capability_question') reply = capabilityInterruptReply(pendingQuestion);
    else if (interruptKind === 'feature_question' || interruptKind === 'product_question') reply = featureInterruptReply(raw, pendingQuestion);
    else if (interruptKind === 'pricing_question' && pricingPlan) {
      const pricingQuestion = nextLead.industry || nextLead.channels.length ? pendingQuestion : 'Roughly how many customer enquiries do you receive in a typical month?';
      const planLabel = nextLead.recommendedPlan ? `The ${pricingPlan.name} plan` : `${pricingPlan.name} currently looks like the closest fit`;
      reply = `${planLabel} is ${pricingPlan.from ? 'from ' : ''}AED ${pricingPlan.monthly.toLocaleString('en-US')}/month, with ${pricingPlan.from ? 'from ' : ''}AED ${pricingPlan.setup.toLocaleString('en-US')} one-time setup and ${pricingPlan.interactions} AI interactions per month. ${pricingQuestion}`;
    }
    else if (interruptKind === 'pricing_question') reply = `I can explain the approved SamChe plan pricing. ${pendingQuestion}`;
    else if (interruptKind === 'demo_question' && isDemoQualificationReady(nextLead) && hasRequiredDemoContact(nextLead)) reply = 'I’ve prepared your demo request with the information you shared. You can review and submit it using the Request Demo button below. Our sales team will then follow up with you.';
    else reply = nextLead.products.length
      ? `I can help arrange the right SamChe AI demonstration for ${nextLead.products.join(' and ')}. ${pendingQuestion}`
      : 'I can help arrange the right demo. Which product are you most interested in seeing first: Web Chatbot, WhatsApp AI, AI Guide, or the full platform?';
    next.lastQuestion = pendingQuestion;
    if (interruptKind === 'demo_question') nextLead.demoInterest = true;
    next.pendingQualificationField = state.pendingQualificationField || getPendingQualificationField(next);
    next.lastPendingQuestion = pendingQuestion;
    next.qualificationStage = state.qualificationStage || 'qualification';
    return { state: next, reply: locale === 'ar' ? arabicSalesReply(reply, nextLead, raw) : reply, actions: actionsFor(nextLead, false, raw) };
  }
  if (!contextualSalesAnswer && !leadChanged && !/samche|product|platform|web chatbot|whatsapp|ai guide|knowledge intelligence|live inbox|crm|pipeline|pricing|price|cost|how much|budget|proposal|quotation|quote|plan|demo|assistant|integration|website|business|company|automation|agentic|start|sales|setup|enquiries|inquiries|leads|qualification|scoring|customers|team|users|api|workflow|language/i.test(raw)) {
    const offTopic = buildOffTopicReply({ ...next, lastPendingQuestion: next.lastPendingQuestion || state.lastQuestion || nextQualificationQuestion(nextLead) }, raw);
    return { state: offTopic.state, reply: locale === 'ar' ? arabicSalesReply(offTopic.reply, nextLead, raw) : offTopic.reply, actions: [] };
  }
  const plan = planFor(nextLead);
  let reply;
  if (/\b(?:all plans|compare plans|list (?:all )?plans|every plan)\b/i.test(raw)) {
    reply = `The approved plans are Starter at AED 1,790/month, Growth at AED 3,990/month, Business at AED 7,990/month, and Enterprise from AED 12,500/month. One-time setup is AED 2,500, AED 5,000, AED 9,500, and from AED 20,000 respectively. Which channels are most important for your team?`;
  } else if (/price|pricing|cost|how much/i.test(raw) && /web chatbot|chatbot/i.test(raw)) {
    reply = `Our Starter plan for a Web Chatbot is AED 1,790/month, with AED 2,500 one-time setup and 5,000 AI interactions per month. ${nextQualificationQuestion(nextLead) || 'Your requirements are captured in the summary below; you can request a demo or continue with sales.'}`;
  } else if (/price|pricing|cost/i.test(raw) && plan) {
    reply = `${nextLead.recommendedPlan ? `The ${plan.name} plan` : `${plan.name} currently looks like the closest fit`} is ${plan.from ? 'from ' : ''}AED ${plan.monthly.toLocaleString('en-US')}/month, with ${plan.from ? 'from ' : ''}AED ${plan.setup.toLocaleString('en-US')} one-time setup and ${plan.interactions} AI interactions per month. ${nextQualificationQuestion(nextLead) || 'Your requirements are captured in the summary below; you can request a demo or continue with sales.'}`;
  } else if (/\b(?:proposal|quote|quotation)\b/i.test(raw)) {
    reply = `I’ve prepared your requirements summary below${plan ? ` with ${plan.name} as the current recommendation` : ''}. Review it, then choose Request Demo or Talk to Sales on WhatsApp to discuss a proposal.`;
  } else if (nextLead.demoInterest && !isDemoQualificationReady(nextLead)) {
    reply = nextDemoQualificationQuestion(nextLead);
  } else if (nextLead.demoInterest && !hasRequiredDemoContact(nextLead)) {
    reply = nextDemoQualificationQuestion(nextLead);
  } else if (nextLead.demoInterest && isDemoQualificationReady(nextLead) && hasRequiredDemoContact(nextLead)) {
    reply = 'I’ve prepared your demo request with the information you shared. You can review and submit it using the Request Demo button below. Our sales team will then follow up with you.';
  } else if (/demo|demonstration/i.test(raw) && !nextLead.products.length) {
    reply = 'I can help arrange the right demo. Which product are you most interested in seeing first: Web Chatbot, WhatsApp AI, AI Guide, or the full platform?';
    nextLead.demoInterest = true;
  } else if (/ai guide|\bapi\b|custom workflow/i.test(raw) && plan
    && (nextLead.aiGuideNeed === 'Required' || nextLead.apiAccessNeed === 'Required' || nextLead.customWorkflowNeed === 'Required')) {
    reply = `Business is the closest fit for AI Guide and API/custom workflow requirements. Its published plan includes AI Guide and API access/custom workflows; CRM or booking integration is listed on Growth, while Business includes up to three external integrations. Which CRM or workflow would you want to connect?`;
  } else if (/^(?:i|we)\s+(?:need|want)\s+ai(?:\s+for\s+(?:my|our)\s+(?:company|business|website))?[.!]?$/i.test(raw) && !nextLead.industry) {
    reply = 'Absolutely. I can help find the right setup. What type of business do you operate?';
  } else if (/\b(starter|growth|business|enterprise)\b/i.test(raw) && /include|features?|what.*plan/i.test(raw) && plan) {
    reply = `The ${plan.name} plan highlights are ${plan.features.slice(0, 4).join(', ')}. What is the main customer task you want that plan to support?`;
  } else if (nextLead.industry && !nextLead.channels.length) {
    reply = `Thanks — I’ve noted ${nextLead.industry}${nextLead.country ? ` in ${nextLead.country}` : ''}. Where do most customer enquiries arrive today: your website, WhatsApp, or both?`;
  } else if (nextLead.channels.length && !nextLead.industry) {
    reply = `I’ve noted ${nextLead.channels.join(' and ')} as the main channel${nextLead.channels.length > 1 ? 's' : ''}. What type of business do you operate?`;
  } else if (!nextLead.industry && (nextLead.aiGuideNeed || nextLead.integrations || nextLead.leadQualification)) {
    reply = 'I’ve noted those product requirements. What type of business do you operate, and which customer channels should the setup support?';
  } else if (nextLead.channels.includes('Website') && nextLead.channels.includes('WhatsApp') && nextLead.industry && !nextLead.volume) {
    reply = 'That makes sense. SamChe AI can support both your website and WhatsApp from one platform. Roughly how many customer enquiries do you receive per month, and do you need CRM integration or lead qualification?';
  } else if (hot) {
    const recommendation = plan
      ? ` Based on what you’ve shared so far, ${plan.name} currently looks like the closest fit${plan.slug === 'growth' ? ' because it includes Web Chatbot, WhatsApp AI, the shared inbox, and one CRM or booking integration' : plan.slug === 'business' ? ' because it includes AI Guide, API access and custom workflows, plus up to three external integrations' : nextLead.channels.includes('Website') && nextLead.channels.includes('WhatsApp') ? ' for your website and WhatsApp channels' : ''}.`
      : '';
    const nextQuestion = nextQualificationQuestion(nextLead);
    if (nextQuestion) reply = `Thanks, I’ve captured your requirements.${recommendation} ${nextQuestion}`;
    else reply = `I’ve captured your requirements${recommendation}. Please review the summary below and use Request Demo or Talk to Sales on WhatsApp when ready.`;
  } else if (nextLead.channels.length && nextLead.industry && !isPlanRecommendationReady(nextLead)) {
    const question = nextQualificationQuestion(nextLead) || 'What else should we know about your customer enquiry flow?';
    reply = nextLead.likelyPlan
      ? `Based on what you’ve shared so far, ${plans.find((item) => item.slug === nextLead.likelyPlan)?.name} currently looks like the closest fit. Before I confirm that, ${question.charAt(0).toLowerCase()}${question.slice(1)}`
      : question;
  } else if (nextLead.channels.length && nextLead.industry && nextLead.recommendedPlan && plan) {
    const nextQuestion = nextQualificationQuestion(nextLead);
    reply = `Based on your requirements, ${plan.name} is the recommended plan. ${nextQuestion || 'You can review your requirements and request a demo or proposal below.'}`;
  } else if (plan) {
    reply = `${plan.name} may fit what you described${plan.slug === 'starter' ? ' as it is designed for a single-site website assistant' : ''}. What is the main customer task you want AI to handle?`;
  } else {
    reply = 'What is the main customer or sales problem you want SamChe AI to help solve?';
  }
  next.lastQuestion = reply.split('?').at(-2)?.trim() || '';
  nextLead.likelyPlan = nextLead.preferredPlan || (nextLead.channels.length && nextLead.volume && (nextLead.integrations || nextLead.leadQualification) ? recommendSamchePlan(nextLead) : '') || '';
  nextLead.recommendedPlan = isPlanRecommendationReady(nextLead) ? (nextLead.preferredPlan || nextLead.likelyPlan || recommendSamchePlan(nextLead) || '') : '';
  next.summaryReadiness = isLeadSummaryReady(nextLead, intent);
  next.qualificationStage = next.summaryReadiness ? 'qualified' : nextLead.recommendedPlan ? 'confirmed-fit' : nextLead.likelyPlan ? 'fit-discovery' : nextLead.channels.length ? 'qualification' : 'discovery';
  next.pendingQualificationField = getPendingQualificationField(next);
  next.lastPendingQuestion = nextQualificationQuestion(nextLead) || '';
  const commercialStage = isLeadSummaryReady(nextLead, intent);
  return { state: next, reply: locale === 'ar' ? arabicSalesReply(reply, nextLead, raw) : reply, actions: actionsFor(nextLead, commercialStage, raw) };
}

const display = (key, value) => key === 'recommendedPlan' ? (plans.find((plan) => plan.slug === value)?.name || '') : Array.isArray(value) ? value.join(' + ') : value;

export function buildLeadSummary(lead, locale = 'en') {
  const value = (key) => display(key, lead[key]) || 'Not shared yet';
  const volume = lead.volume ? `${lead.volume.replace(/\/?month$/i, '')} enquiries/month` : 'Not shared yet';
  const planName = display('recommendedPlan', lead.recommendedPlan || lead.likelyPlan) || 'Not shared yet';
  const planLabel = lead.recommendedPlan ? '📦 RECOMMENDED PLAN' : '📦 LIKELY PLAN';
  const qualification = /requested/i.test(lead.leadQualification || '') ? 'Required' : value('leadQualification');
  const summary = [
    '🤖 SAMCHE AI — SALES ENQUIRY', '',
    'Hello SamChe AI Sales Team,', '',
    'I would like to discuss SamChe AI and receive a demo/commercial proposal.', '',
    '👤 LEAD DETAILS',
    `• 👤 Name: ${value('name')}`,
    `• ✉️ Email: ${value('email')}`,
    `• 🏢 Company: ${value('company')}`,
    `• 🏷️ Industry: ${value('industry')}`,
    `• 🌍 Country: ${value('country')}`,
    `• 🌐 Website: ${value('website')}`, '',
    '🎯 REQUIREMENT', value('mainGoal'), '',
    '💬 CHANNELS', value('channels'), '',
    '🧩 PRODUCTS', value('products'), '',
    '🌐 LANGUAGES', value('languages'), '',
    '🔌 INTEGRATIONS', value('integrations'), '',
    '📊 ESTIMATED VOLUME', volume, '',
    planLabel, planName, '',
    '🗓️ TIMELINE', value('timeline'), '',
    '📞 CONTACT PREFERENCE', value('contactPreference'), '',
    '👥 TEAM USERS', value('teamUsers'), '',
    '💰 BUDGET', value('budget'), '',
    '🎯 LEAD QUALIFICATION', qualification, '',
    '🧭 AI GUIDE', value('aiGuideNeed'), '',
    '⚙️ API / CUSTOM WORKFLOWS', value('apiWorkflow'), '',
    '🔗 EXTERNAL INTEGRATIONS', value('externalIntegrations'), '',
    '📈 AI LEAD SCORING', value('aiLeadScoring'), '',
    '⏱️ PREFERRED DEMO DATE', value('preferredDemoDate'), '',
    '⏱️ PREFERRED DEMO TIME', value('preferredDemoTime'), '',
    'Please contact me regarding a demo and commercial proposal.', '',
    '— Generated via SamChe AI Assistant',
  ].join('\n');
  const localized = locale === 'ar' ? translateText(summary, 'ar') : summary;
  return localized.replace(/(?:🤖|👤|🎯|💬|🧩|🌐|🔌|📊|📦|🗓️|👥)/gu, (icon) => whatsappIconReplacements[icon] || icon);
}

export function buildWhatsAppSalesUrl(lead, locale = 'en') {
  const message = buildLeadSummary(lead, locale);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/971506941372?text=${encodedMessage}`;
}

export function toContactHandoff(lead, locale = 'en') {
  return {
    name: lead.name, email: lead.email, company: lead.company, industry: lead.industry, country: lead.country, website: lead.website,
    mainGoal: lead.mainGoal, channels: lead.channels, products: lead.products, languages: lead.languages, integrations: lead.integrations,
    leadQualification: lead.leadQualification, aiGuideNeed: lead.aiGuideNeed, apiWorkflow: lead.apiWorkflow,
    apiAccessNeed: lead.apiAccessNeed, customWorkflowNeed: lead.customWorkflowNeed,
    externalIntegrations: lead.externalIntegrations, aiLeadScoring: lead.aiLeadScoring, teamUsers: lead.teamUsers,
    volume: lead.volume, plan: lead.recommendedPlan || lead.likelyPlan, timeline: lead.timeline,
    contactPreference: lead.contactPreference,
    preferredDemoDate: lead.preferredDemoDate, preferredDemoTime: lead.preferredDemoTime,
    message: buildLeadSummary(lead, locale), conversationSummary: buildLeadSummary(lead, locale), interest: lead.recommendedPlan ? `plan:${lead.recommendedPlan}` : (lead.products[0] || ''),
  };
}

export function editLeadField(lead, key, value) {
  if (!Object.hasOwn(blankLead(), key)) return lead;
  return { ...lead, [key]: value };
}
