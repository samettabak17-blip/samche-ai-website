import { dashboardSupportMap } from './support-dashboard-map.mjs';
import { getPublishedArticles } from './help-center/index.mjs';

const areaToCategory = new Map([
  ['Dashboard Overview', 'Dashboard / Overview'], ['Analytics', 'Dashboard / Overview'], ['AI Assistants', 'Account / Access'],
  ['Channels', 'WhatsApp AI'], ['Web Chatbot', 'Web Chatbot'], ['WhatsApp AI', 'WhatsApp AI'], ['AI Guide', 'AI Guide'],
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

export function buildKnowledgeSyncReport({ dashboardRoot = 'configured dashboard evidence root' } = {}) {
  const published = getPublishedArticles('en');
  const areas = dashboardSupportMap.map((entry) => {
    const category = areaToCategory.get(entry.area) || 'Troubleshooting / Cross-product issues';
    const articleSlugs = published.filter((article) => (article.coverageAreas || []).includes(category)).map((article) => article.slug);
    return { area: entry.area, category, auditStatus: auditStatus(entry), sourceRoute: entry.path, publishedArticleCount: articleSlugs.length, articleSlugs };
  });
  const excluded = dashboardSupportMap.filter((entry) => ['implementation_team_managed', 'unverified'].includes(entry.status)).map((entry) => ({ area: entry.area, auditStatus: auditStatus(entry), status: 'Needs Review' }));
  return { generatedOn: new Date().toISOString().slice(0, 10), dashboardRoot, publishedArticleCount: published.length, areas, excluded, mode: 'report-only' };
}

export function renderKnowledgeSyncReport(report) {
  const lines = ['# Dashboard Knowledge Sync', '', `Generated: ${report.generatedOn}`, `Mode: ${report.mode} (no automatic publication)`, '', '| Dashboard area | Audit status | Published articles |', '| --- | --- | ---: |'];
  for (const area of report.areas) lines.push(`| ${area.area} | ${area.auditStatus} | ${area.publishedArticleCount} |`);
  lines.push('', '## Excluded from publication', '', ...report.excluded.map((item) => `- ${item.area}: ${item.auditStatus} (${item.status})`));
  return `${lines.join('\n')}\n`;
}
