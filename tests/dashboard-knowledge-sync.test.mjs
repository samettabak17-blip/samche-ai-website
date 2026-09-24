import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKnowledgeSyncReport, renderKnowledgeSyncReport } from '../lib/dashboard-knowledge-sync.mjs';
import { getHelpArticleStatistics } from '../lib/help-center/index.mjs';

test('weekly knowledge sync reports published troubleshooting coverage by dashboard area', () => {
  const report = buildKnowledgeSyncReport({ dashboardRoot: 'C:/evidence/dashboard' });
  assert.ok(report.generatedOn);
  assert.equal(report.publishedArticleCount, getHelpArticleStatistics('en').totalPublished);
  assert.ok(report.areas.some((area) => area.area === 'WhatsApp AI' && area.publishedArticleCount > 0));
  assert.ok(report.areas.some((area) => area.area === 'Integrations' && area.auditStatus === 'IMPLEMENTATION-MANAGED'));
});

test('sync remains report-only and never promotes implementation-managed or unverified content', () => {
  const report = buildKnowledgeSyncReport({ dashboardRoot: 'C:/evidence/dashboard' });
  assert.ok(report.excluded.every((item) => item.status !== 'Published'));
  assert.ok(report.excluded.some((item) => item.auditStatus === 'IMPLEMENTATION-MANAGED'));
  assert.match(renderKnowledgeSyncReport(report), /report-only/i);
});
