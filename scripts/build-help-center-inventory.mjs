import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dashboardSupportMap } from '../lib/support-dashboard-map.mjs';
import { getPublishedArticles } from '../lib/help-center/index.mjs';
import { getHelpCoverageMatrix } from '../lib/help-center/troubleshooting-schema.mjs';

const implementationAreas = new Set(['Integrations', 'AI Visual generation', 'AI Voice']);
const categoryForArea = new Map([
  ['Dashboard Overview', 'Dashboard / Overview'], ['Analytics', 'Dashboard / Overview'], ['AI Assistants', 'Account / Access'], ['Channels', 'WhatsApp AI'],
  ['Web Chatbot', 'Web Chatbot'], ['WhatsApp AI', 'WhatsApp AI'], ['AI Guide', 'AI Guide'], ['Knowledge Base', 'Knowledge Intelligence'], ['Knowledge Intelligence', 'Knowledge Intelligence'],
  ['Knowledge Approvals', 'Knowledge Intelligence'], ['Conversations / Shared Inbox', 'Conversations / Shared Inbox'], ['Human Handoff', 'Conversations / Shared Inbox'], ['CRM Contacts', 'CRM / Contacts / Leads / Pipeline'],
  ['CRM Leads', 'CRM / Contacts / Leads / Pipeline'], ['Pipeline', 'CRM / Contacts / Leads / Pipeline'], ['Integrations', 'Integrations'], ['AI Visual generation', 'AI Visual'], ['AI Voice', 'AI Voice'],
  ['Team Management', 'Team / Permissions'], ['Account Settings', 'Account / Access'], ['Support Portal', 'Support / Service'],
]);
const knownEvidenceFiles = {
  'Dashboard Overview': ['src/app/router.tsx', 'src/features/overview/overview-page.tsx'], Analytics: ['src/features/overview/overview-page.tsx'], 'AI Assistants': ['src/features/assistants/assistants-page.tsx'],
  Channels: ['src/features/channels/channels-page.tsx'], 'Web Chatbot': ['src/features/channels/web-chat-management.tsx'], 'WhatsApp AI': ['src/features/channels/channels-page.tsx', 'src/features/channels/whatsapp-embedded-signup.tsx'],
  'AI Guide': ['src/features/guide-experience/guide-experience-page.tsx'], 'Knowledge Base': ['src/features/knowledge-base/knowledge-base-page.tsx'], 'Knowledge Intelligence': ['src/features/knowledge-intelligence/knowledge-intelligence-page.tsx'],
  'Knowledge Approvals': ['src/features/knowledge-intelligence/knowledge-intelligence-page.tsx'], 'Conversations / Shared Inbox': ['src/features/conversations/conversations-page.tsx'], 'Human Handoff': ['src/features/conversations/conversation-detail-page.tsx'],
  'CRM Leads': ['src/features/leads/leads-page.tsx'], Pipeline: ['src/features/pipeline/pipeline-page.tsx'], 'Team Management': ['src/features/team/team-page.tsx'], 'Account Settings': ['src/features/settings/settings-page.tsx'],
};

function existingEvidenceFiles(dashboardRoot, area) {
  const candidates = knownEvidenceFiles[area] || ['src/app/router.tsx', 'src/components/layout/sidebar.tsx'];
  return candidates.filter((relative) => existsSync(resolve(dashboardRoot, relative))).map((relative) => `dashboard/${relative}`);
}

function auditStatus(entry) {
  if (implementationAreas.has(entry.area) || entry.status === 'implementation_team_managed') return 'IMPLEMENTATION-MANAGED';
  if (entry.status === 'unverified') return 'UNVERIFIED';
  if (entry.owner === 'admin' || entry.permissions?.toLowerCase().includes('owner-only')) return 'ADMIN-ONLY';
  if (entry.status === 'implemented_customer_accessible') return 'VERIFIED CUSTOMER-ACCESSIBLE';
  return 'UNVERIFIED';
}

function candidateFromEntry(entry, dashboardRoot) {
  const category = categoryForArea.get(entry.area) || 'Troubleshooting / Cross-product issues';
  const status = auditStatus(entry);
  return {
    id: entry.area.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), category, area: entry.area, auditStatus: status,
    sourceFiles: [...existingEvidenceFiles(dashboardRoot, entry.area), 'website/lib/support-dashboard-map.mjs'], sourceRoutes: status === 'IMPLEMENTATION-MANAGED' || status === 'UNVERIFIED' ? [] : entry.path ? [entry.path] : [],
    verifiedControls: status === 'IMPLEMENTATION-MANAGED' || status === 'UNVERIFIED' ? [] : entry.controls || [], plan: entry.plan || 'not independently verified', remainingDocumentationGaps: [],
  };
}

export function buildInventory({ dashboardRoot }) {
  const root = dashboardRoot || resolve(fileURLToPath(new URL('..', import.meta.url)), '..', '..', 'samche-api-service', 'dashboard');
  const sourceExists = existsSync(root);
  if (!sourceExists) throw new Error(`Dashboard evidence root does not exist: ${root}`);
  const candidates = dashboardSupportMap.map((entry) => candidateFromEntry(entry, root));
  const published = getPublishedArticles('en');
  const coverage = getHelpCoverageMatrix({ records: published.map((article) => ({ ...article, coverageAreas: article.coverageAreas || [] })) }).map((row) => ({
    ...row, publishedArticleCount: published.filter((article) => (article.coverageAreas || []).includes(row.category)).length,
    sourceEvidence: [...new Set(candidates.filter((item) => item.category === row.category).flatMap((item) => item.sourceFiles))],
    remainingDocumentationGaps: row.auditStatus === 'NO VERIFIED CONTENT' ? ['No verified customer-facing behavior is currently documented.'] : [],
  }));
  return { generatedOn: new Date().toISOString().slice(0, 10), dashboardRoot: root, candidates, coverage };
}

export function renderInventoryMarkdown(inventory) {
  const lines = ['# Help Center Troubleshooting Coverage Matrix', '', `Generated: ${inventory.generatedOn}`, '', '| Category | Audit status | Published articles | Evidence | Remaining gaps |', '| --- | --- | ---: | --- | --- |'];
  for (const row of inventory.coverage) lines.push(`| ${row.category} | ${row.auditStatus} | ${row.publishedArticleCount} | ${row.sourceEvidence.join('<br>') || 'None'} | ${row.remainingDocumentationGaps.join(' ') || 'None'} |`);
  return `${lines.join('\n')}\n`;
}

function runCli(argv) {
  const rootIndex = argv.indexOf('--dashboard-root');
  const outputIndex = argv.indexOf('--output');
  const matrixIndex = argv.indexOf('--matrix');
  const dashboardRoot = rootIndex >= 0 ? argv[rootIndex + 1] : undefined;
  const output = outputIndex >= 0 ? argv[outputIndex + 1] : 'docs/help-center-troubleshooting-inventory.json';
  const matrix = matrixIndex >= 0 ? argv[matrixIndex + 1] : 'docs/help-center-coverage-matrix.md';
  const inventory = buildInventory({ dashboardRoot });
  writeFileSync(output, `${JSON.stringify(inventory, null, 2)}\n`);
  writeFileSync(matrix, renderInventoryMarkdown(inventory));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) runCli(process.argv.slice(2));
