import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKnowledgeSyncReport, classifyDashboardChanges, renderKnowledgeSyncReport } from '../lib/dashboard-knowledge-sync.mjs';
import { getHelpArticleStatistics } from '../lib/help-center/index.mjs';

test('weekly knowledge sync reports published troubleshooting coverage by dashboard area', () => {
  const report = buildKnowledgeSyncReport({ dashboardRoot: 'C:/evidence/dashboard' });
  assert.ok(report.generatedOn);
  assert.equal(report.publishedArticleCount, getHelpArticleStatistics('en').totalPublished);
  assert.ok(report.areas.some((area) => area.area === 'WhatsApp AI' && area.publishedArticleCount > 0));
  assert.ok(report.areas.some((area) => area.area === 'Instagram DM AI' && area.publishedArticleCount > 0));
  assert.ok(report.areas.some((area) => area.area === 'Integrations' && area.auditStatus === 'IMPLEMENTATION-MANAGED'));
});

test('sync remains report-only and never promotes implementation-managed or unverified content', () => {
  const report = buildKnowledgeSyncReport({ dashboardRoot: 'C:/evidence/dashboard' });
  assert.ok(report.excluded.every((item) => item.status !== 'Published'));
  assert.ok(report.excluded.some((item) => item.auditStatus === 'IMPLEMENTATION-MANAGED'));
  assert.match(renderKnowledgeSyncReport(report), /report-only/i);
});

test('weekly comparison classifies every supported dashboard change and reports scoped impacts', () => {
  const current = [
    { area: 'Overview', nav: 'Overview', path: '/overview', status: 'implemented_customer_accessible', controls: ['Date range'] },
    { area: 'Web Chatbot', nav: 'Web Chatbot', path: '/web', status: 'implemented_customer_accessible', controls: ['Theme'] },
    { area: 'Legacy', nav: 'Legacy', path: '/legacy', status: 'implemented_customer_accessible', controls: [] },
  ];
  const evidence = { entries: [
    current[0],
    { ...current[1], controls: ['Theme', 'Launcher'] },
    { area: 'New Module', nav: 'New Module', path: '/new', status: 'implemented_customer_accessible', controls: [] },
    { area: 'Integration', status: 'implementation_team_managed', owner: 'implementation' },
    { area: 'Admin Console', status: 'admin_only', owner: 'admin' },
    { area: 'Workflow Engine', status: 'roadmap' },
    { area: 'Mystery', status: 'unverified' },
  ] };
  const result = classifyDashboardChanges({ evidence, supportMap: current, articles: [] });
  const classes = Object.fromEntries(result.findings.map((item) => [item.area, item.classification]));
  assert.equal(classes['Web Chatbot'], 'CHANGED');
  assert.equal(classes['New Module'], 'ADDED');
  assert.equal(classes.Legacy, 'REMOVED');
  assert.equal(classes.Integration, 'IMPLEMENTATION-MANAGED');
  assert.equal(classes['Admin Console'], 'ADMIN-ONLY');
  assert.equal(classes['Workflow Engine'], 'ROADMAP');
  assert.equal(classes.Mystery, 'UNVERIFIED');
  const changed = result.findings.find((item) => item.area === 'Web Chatbot');
  assert.deepEqual(changed.impact.translations, ['en', 'tr', 'ar']);
  assert.equal(changed.impact.chatbotRetrieval, true);
  assert.equal(changed.impact.searchKeywords, true);
  assert.equal(changed.impact.tests, true);
  assert.equal(changed.impact.counts, true);
  assert.equal(result.findings.find((item) => item.area === 'Workflow Engine').publication, 'needs-review');
});

test('standard coverage report exposes article, retrieval, search, translation, test and count impacts', () => {
  const report = buildKnowledgeSyncReport({ dashboardRoot: 'C:/evidence/dashboard' });
  assert.ok(report.areas.every((area) => Array.isArray(area.impact.articleSlugs)));
  assert.ok(report.areas.every((area) => area.impact.translations.join(',') === 'en,tr,ar'));
  assert.ok(report.areas.every((area) => area.impact.chatbotRetrieval && area.impact.searchKeywords && area.impact.tests && area.impact.counts));
  const markdown = renderKnowledgeSyncReport(report);
  assert.match(markdown, /Impact Analysis/);
  assert.match(markdown, /EN\/TR\/AR/);
});
