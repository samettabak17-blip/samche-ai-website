import { createTroubleshootingArticle } from '../troubleshooting-schema.mjs';

const L = (en, tr, ar) => ({ en, tr, ar });
const LL = (en, tr, ar) => ({ en, tr, ar });
function localizedListItems(value) {
  const length = Math.max(value?.en?.length || 0, value?.tr?.length || 0, value?.ar?.length || 0);
  return Array.from({ length }, (_, index) => L(value.en[index] || '', value.tr[index] || '', value.ar[index] || ''));
}
const CATEGORY_SLUGS = new Map([
  ['Account / Access', 'dashboard-account'], ['Dashboard / Overview', 'getting-started'], ['Web Chatbot', 'web-chatbot'], ['WhatsApp AI', 'whatsapp-ai'], ['Instagram DM AI', 'instagram-dm-ai'], ['AI Guide', 'ai-guide'],
  ['Knowledge Intelligence', 'knowledge'], ['Conversations / Shared Inbox', 'conversations'], ['CRM / Contacts / Leads / Pipeline', 'crm-operations'], ['Integrations', 'support'],
  ['AI Visual', 'support'], ['AI Voice', 'support'], ['Team / Permissions', 'team-access'], ['Plans / Entitlements', 'dashboard-account'], ['Support / Service', 'support'],
  ['Billing / Usage', 'support'], ['Security / Privacy', 'dashboard-account'], ['Troubleshooting / Cross-product issues', 'support'],
]);

export function issue({
  slug, category, productArea, issueType, title, summary, plans = ['all'], roles = ['tenant_access'], route = '', navigation = '', controls = [], steps, decisionTree, boundary,
  expected, causes, doNot, supportChecklist, keywords, related = [], sourceFiles, sourceRoutes = [], status = 'Published', issueLocale = 'en', coverageAreas = [category],
}) {
  const localizedSteps = steps || [
    L('Confirm the affected workspace and feature.', 'Etkilenen çalışma alanını ve özelliği doğrulayın.', 'تحققوا من مساحة العمل والميزة المتأثرة.'),
    L('Record the visible state before changing a setting.', 'Bir ayarı değiştirmeden önce görünen durumu kaydedin.', 'سجّلوا الحالة الظاهرة قبل تغيير أي إعداد.'),
  ];
  const localizedTree = decisionTree || [{
    question: L('Does the issue match this verified feature path?', 'Sorun bu doğrulanmış özellik yoluyla eşleşiyor mu?', 'هل تتطابق المشكلة مع مسار الميزة المعتمد؟'),
    yes: 'continue-checks', no: 'contact-support',
  }];
  const article = createTroubleshootingArticle({
    id: slug, slug, category: CATEGORY_SLUGS.get(category) || 'support', productArea, issueType, title, summary,
    symptoms: causes, appliesTo: { plans, roles }, prerequisites: L('Tenant access and the affected feature must be known.', 'Tenant erişimi ve etkilenen özellik bilinmelidir.', 'يجب معرفة صلاحية مساحة العمل والميزة المتأثرة.'),
    navigation: L(route ? `Open ${route}. ${navigation}` : navigation, route ? `${route} bölümünü açın. ${navigation}` : navigation, route ? `افتحوا ${route}. ${navigation}` : navigation),
    decisionTree: localizedTree, selfServiceSteps: localizedSteps, interventionBoundary: boundary, expectedResult: expected, expected, commonCauses: causes, doNot,
    supportChecklist, keywords, related, coverageAreas, plan: L(plans.join(', '), plans.join(', '), plans.join(', ')),
    permissions: boundary, problems: L(causes.en.join(' '), causes.tr.join(' '), causes.ar.join(' ')),
    sections: [
      { heading: L('Symptoms', 'Belirtiler', 'الأعراض'), body: summary, steps: localizedListItems(causes), note: boundary, warning: doNot },
      { heading: L('Verified checks', 'Doğrulanmış kontroller', 'الفحوصات المعتمدة'), body: navigation, steps: localizedSteps, note: expected, warning: doNot },
      { heading: L('Expected result', 'Beklenen sonuç', 'النتيجة المتوقعة'), body: expected, steps: [expected], note: boundary, warning: doNot },
      { heading: L('Support evidence', 'Support kanıtı', 'دليل Support'), body: boundary, steps: localizedListItems(supportChecklist), note: boundary, warning: doNot },
    ],
    controls, locale: issueLocale,
    verification: { status, verifiedOn: '2026-09-24', sourceFiles: sourceFiles || ['website/lib/support-dashboard-map.mjs'], sourceRoutes, reviewTriggers: ['Dashboard route or control changes', 'plan entitlement changes'] },
  });
  return article;
}

export { L, LL };
