const INTERNAL_SUPPORT_PATTERNS = [
  /\bverified\b/i,
  /\bregistry\b/i,
  /\bboundary\b/i,
  /\bstill needs investigation\b/i,
  /\bimplementation(?:-managed| evidence| metadata| terminology| review| team managed)\b/i,
  /\broadmap classification\b/i,
  /\bregistry state\b/i,
  /\bentitlement\/capability key\b/i,
  /\btenant(?:s|'s)?\b/i,
  /tenant(?:ı|i|a|e|ler|ları|leri)/iu,
  /\btenantId\b/i,
  /\/app\//i,
  /\b(?:sourceFiles|verifiedOn|articleId|selfServiceAvailable)\b/i,
  /\b(?:implemented_customer_accessible|implementation_team_managed|documented_not_customer_exposed)\b/i,
  /\b(?:classification|entitlement key|capability key)\b/i,
  /doğrulanmış (?:bilgi|rota|yol|paket|doküman|dokümantasyon)/iu,
  /hâlâ incelenmesi gereken/iu,
  /\*\*sınır:/iu,
  /المعلومات المعتمدة|المسار المعتمد|ما يزال يحتاج إلى تحقيق|\*\*الحدود:/u,
];

const GROUNDING_LOCKED_SUBJECTS = Object.freeze([
  {
    key: 'instagram',
    pattern: /\binstagram\b|إنستغرام|انستغرام/iu,
    labels: Object.freeze({ en: 'Instagram', tr: 'Instagram', ar: 'إنستغرام' }),
  },
]);

function limitedText(value, maximum = 1200) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function safeGroundingText(value, maximum = 1200) {
  return limitedText(value, maximum)
    .replace(/\/app\/:tenantId(?:\/[\w:.-]+)*/gi, '')
    .replace(/\btenantId\b/gi, '')
    .replace(/tenant(?:ı|i|a|e|ler|ları|leri)?/giu, 'workspace')
    .replace(/\bunverified\b/gi, '')
    .replace(/\bverified\b/gi, '')
    .replace(/\bimplementation-managed\b/gi, 'handled with SamChe Support')
    .replace(/\bimplementation\b/gi, 'SamChe Support')
    .replace(/\btenant\b/gi, 'workspace')
    .replace(/\bregistry\b/gi, 'knowledge source')
    .replace(/\bboundary\b/gi, 'support note')
    .replace(/doğrulanmış\s*/giu, '')
    .replace(/müşteri-facing/giu, 'müşteriye açık')
    .replace(/\binternal route\b/gi, 'navigation')
    .replace(/\broute\b/gi, 'navigation')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSupportRetrievalQuery({ userMessage = '', conversationHistory = [] } = {}) {
  const current = limitedText(userMessage, 2000);
  const namedSubject = /\b(?:instagram|whatsapp|web chatbot|ai guide|knowledge intelligence|knowledge base|conversations?|shared inbox|pipeline|leads?|billing|account settings)\b|إنستغرام|انستغرام|واتساب|المعرفة|المحادثات|الفوترة/iu;
  if (namedSubject.test(current)) return current;
  const inheritedSubject = conversationHistory
    .filter((message) => message?.role === 'user')
    .map((message) => limitedText(message?.text ?? message?.content, 1200))
    .filter(Boolean)
    .filter((message) => message !== current)
    .findLast((message) => namedSubject.test(message));
  return [inheritedSubject, current].filter(Boolean).join('\n');
}

export function findGroundingLockedSubject(value, language = 'en') {
  const record = GROUNDING_LOCKED_SUBJECTS.find((candidate) => candidate.pattern.test(String(value || '')));
  if (!record) return null;
  return { key: record.key, label: record.labels[language] || record.labels.en };
}

export function containsInternalSupportLeak(reply) {
  const value = String(reply || '');
  return INTERNAL_SUPPORT_PATTERNS.some((pattern) => pattern.test(value));
}

export function toCustomerGroundingPayload({ dashboardEntries = [], helpArticles = [] } = {}) {
  const dashboard = dashboardEntries.map((entry) => {
    const customerAccessible = entry?.status === 'implemented_customer_accessible';
    return {
      area: safeGroundingText(entry?.area),
      ...(customerAccessible && entry?.nav ? { navigationLabel: safeGroundingText(entry.nav) } : {}),
      customerActions: (entry?.customerSteps || []).map((value) => safeGroundingText(value)).filter(Boolean),
      visibleControls: customerAccessible ? (entry?.controls || []).map((value) => safeGroundingText(value)).filter(Boolean) : [],
      checks: (entry?.checks || []).map((value) => safeGroundingText(value)).filter(Boolean),
      selfServiceAvailable: customerAccessible,
    };
  });
  const articles = helpArticles.map((article) => ({
    articleId: limitedText(article?.slug, 160),
    publicUrl: limitedText(article?.url, 400),
    title: safeGroundingText(article?.title),
    summary: safeGroundingText(article?.excerpt),
    guidance: safeGroundingText(article?.content, 2400),
  })).filter((article) => article.articleId && article.publicUrl && article.title);
  return { dashboard, articles };
}
