import { dashboardSupportMap } from './support-dashboard-map.mjs';
import { getPublishedArticles } from './help-center/index.mjs';

const areaToCategory = new Map([
  ['Dashboard Overview', 'Dashboard / Overview'], ['Analytics', 'Dashboard / Overview'], ['AI Assistants', 'Account / Access'],
  ['Channels', 'WhatsApp AI'], ['Web Chatbot', 'Web Chatbot'], ['WhatsApp AI', 'WhatsApp AI'], ['Instagram DM AI', 'Instagram DM AI'], ['AI Guide', 'AI Guide'],
  ['Knowledge Base', 'Knowledge Intelligence'], ['Knowledge Intelligence', 'Knowledge Intelligence'], ['Knowledge Approvals', 'Knowledge Intelligence'],
  ['Conversations / Shared Inbox', 'Conversations / Shared Inbox'], ['Human Handoff', 'Conversations / Shared Inbox'],
  ['CRM Contacts', 'CRM / Contacts / Leads / Pipeline'], ['CRM Leads', 'CRM / Contacts / Leads / Pipeline'], ['Pipeline', 'CRM / Contacts / Leads / Pipeline'],
  ['Integrations', 'Integrations'], ['AI Visual generation', 'AI Visual'], ['AI Voice', 'AI Voice'], ['Team Management', 'Team / Permissions'],
  ['Account Settings', 'Account / Access'], ['Support Portal', 'Support / Service'],
]);

function auditStatus(entry) {
  if (entry.status === 'implementation_team_managed') return 'IMPLEMENTATION-MANAGED';
  if (entry.status === 'unverified') return 'UNVERIFIED';
  return entry.status === 'implemented_customer_accessible' ? 'VERIFIED CUSTOMER-ACCESSIBLE' : 'NO VERIFIED CONTENT';
}

const comparedFields = ['nav', 'path', 'status', 'owner', 'controls', 'permissions', 'plan', 'dependencies', 'customerSteps', 'checks', 'limitations', 'supportReview'];

function normalizedValue(value) {
  if (Array.isArray(value)) return [...value].map(String).sort((a, b) => a.localeCompare(b));
  return value ?? null;
}

function changedFields(current, evidence) {
  return comparedFields.filter((field) => JSON.stringify(normalizedValue(current?.[field])) !== JSON.stringify(normalizedValue(evidence?.[field])));
}

function impactFor(articleSlugs = []) {
  return {
    articleSlugs: [...new Set(articleSlugs)].sort((a, b) => a.localeCompare(b)),
    dashboardSupportMap: true,
    chatbotRetrieval: true,
    searchKeywords: true,
    translations: ['en', 'tr', 'ar'],
    tests: true,
    counts: true,
  };
}

function explicitClassification(entry) {
  if (entry?.status === 'implementation_team_managed') return 'IMPLEMENTATION-MANAGED';
  if (entry?.status === 'admin_only') return 'ADMIN-ONLY';
  if (entry?.status === 'roadmap') return 'ROADMAP';
  if (entry?.status === 'unverified') return 'UNVERIFIED';
  return null;
}

export function classifyDashboardChanges({ evidence, supportMap = dashboardSupportMap, articles = getPublishedArticles('en') } = {}) {
  const evidenceEntries = Array.isArray(evidence?.entries) ? evidence.entries : [];
  const currentByArea = new Map(supportMap.map((entry) => [entry.area, entry]));
  const evidenceByArea = new Map(evidenceEntries.map((entry) => [entry.area, entry]));
  const findings = [];
  const addFinding = ({ area, classification, current = null, observed = null, fields = [] }) => {
    const category = areaToCategory.get(area);
    const articleSlugs = category ? articles.filter((article) => (article.coverageAreas || []).includes(category)).map((article) => article.slug) : [];
    const publication = ['ADDED', 'CHANGED'].includes(classification) && observed?.status === 'implemented_customer_accessible' ? 'allowed' : 'needs-review';
    findings.push({ area, classification, changedFields: fields, current, evidence: observed, publication, impact: impactFor(articleSlugs) });
  };

  for (const observed of evidenceEntries) {
    const current = currentByArea.get(observed.area);
    const explicit = explicitClassification(observed);
    if (explicit) addFinding({ area: observed.area, classification: explicit, current, observed });
    else if (!current) addFinding({ area: observed.area, classification: 'ADDED', observed });
    else {
      const fields = changedFields(current, observed);
      if (fields.length) addFinding({ area: observed.area, classification: 'CHANGED', current, observed, fields });
    }
  }
  for (const current of supportMap) {
    if (!evidenceByArea.has(current.area)) addFinding({ area: current.area, classification: 'REMOVED', current });
  }
  findings.sort((a, b) => a.area.localeCompare(b.area));
  return { findings, needsReview: findings.filter((item) => item.publication === 'needs-review') };
}

export function buildKnowledgeSyncReport({ dashboardRoot = 'configured dashboard evidence root' } = {}) {
  const published = getPublishedArticles('en');
  const areas = dashboardSupportMap.map((entry) => {
    const category = areaToCategory.get(entry.area) || 'Troubleshooting / Cross-product issues';
    const articleSlugs = published.filter((article) => (article.coverageAreas || []).includes(category)).map((article) => article.slug);
    return { area: entry.area, category, auditStatus: auditStatus(entry), sourceRoute: entry.path, publishedArticleCount: articleSlugs.length, articleSlugs, impact: impactFor(articleSlugs) };
  });
  const excluded = dashboardSupportMap.filter((entry) => ['implementation_team_managed', 'unverified'].includes(entry.status)).map((entry) => ({ area: entry.area, auditStatus: auditStatus(entry), status: 'Needs Review' }));
  return { generatedOn: new Date().toISOString().slice(0, 10), dashboardRoot, publishedArticleCount: published.length, areas, excluded, mode: 'report-only' };
}

export function renderKnowledgeSyncReport(report) {
  const lines = ['# Dashboard Knowledge Sync', '', `Generated: ${report.generatedOn}`, `Mode: ${report.mode} (no automatic publication)`, '', '| Dashboard area | Audit status | Published articles |', '| --- | --- | ---: |'];
  for (const area of report.areas) lines.push(`| ${area.area} | ${area.auditStatus} | ${area.publishedArticleCount} |`);
  lines.push('', '## Impact Analysis', '', 'Every verified Dashboard change is scoped to its affected Help Center articles, chatbot retrieval, search keywords, EN/TR/AR translations, regression tests, and live registry counts.');
  lines.push('', '## Excluded from publication', '', ...report.excluded.map((item) => `- ${item.area}: ${item.auditStatus} (${item.status})`));
  return `${lines.join('\n')}\n`;
}
