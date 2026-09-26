import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTroubleshootingArticle,
  validateHelpCenterRegistry,
  getHelpCoverageMatrix,
} from '../lib/help-center/troubleshooting-schema.mjs';
import { getPublishedArticles, getArticleBySlug } from '../lib/help-center/index.mjs';
import { getPublishedArticlePresentation } from '../lib/help-center/index.mjs';

const localized = (value) => ({ en: value, tr: `${value} TR`, ar: `${value} AR` });
const localizedList = (value) => ({ en: [value], tr: [`${value} TR`], ar: [`${value} AR`] });

function makeValidRecord(overrides = {}) {
  return createTroubleshootingArticle({
    id: 'test-whatsapp-not-replying', slug: 'test-whatsapp-not-replying', category: 'whatsapp-ai', productArea: 'WhatsApp AI', issueType: 'message_delivery',
    title: localized('WhatsApp is not replying'), summary: localized('Check the verified channel path.'), symptoms: localizedList('Messages are not answered.'),
    appliesTo: { plans: ['growth'], roles: ['tenant_admin'] }, prerequisites: localized('Workspace access.'), navigation: localized('Open Channels.'),
    decisionTree: [{ question: localized('Is the channel visible?'), yes: 'check-status', no: 'contact-support' }], selfServiceSteps: [localized('Check the channel status.')],
    interventionBoundary: localized('Provider issues require Support.'), expectedResult: localized('The channel is active.'), commonCauses: localizedList('Inactive channel.'),
    doNot: localizedList('Do not invent provider controls.'), supportChecklist: localizedList('Include the visible error.'), keywords: localizedList('whatsapp reply'), related: [],
    verification: { status: 'Published', verifiedOn: '2026-09-24', sourceFiles: ['dashboard/src/features/channels/channels-page.tsx'], sourceRoutes: ['/app/:tenantId/channels'], reviewTriggers: ['route changes'] },
    ...overrides,
  });
}

test('validates a complete published troubleshooting record', () => {
  const result = validateHelpCenterRegistry([makeValidRecord()]);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('rejects duplicate article ids and slugs', () => {
  const result = validateHelpCenterRegistry([makeValidRecord(), makeValidRecord()]);
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /duplicate/i);
});

test('rejects incomplete localized content and missing evidence', () => {
  const result = validateHelpCenterRegistry([makeValidRecord({
    title: { en: 'Only English', tr: '', ar: '' },
    verification: { status: 'Published', verifiedOn: '', sourceFiles: [], sourceRoutes: [], reviewTriggers: [] },
  })]);
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /localized|verified|source/i);
});

test('rejects non-published statuses and invalid related slugs', () => {
  const result = validateHelpCenterRegistry([
    makeValidRecord({ verification: { status: 'Needs Review', verifiedOn: '2026-09-24', sourceFiles: ['evidence'], sourceRoutes: [], reviewTriggers: [] } }),
    makeValidRecord({ id: 'other', slug: 'other', related: ['missing-article'] }),
  ]);
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /Published|related|status/i);
});

test('coverage matrix includes every mandatory category and allowed status', () => {
  const matrix = getHelpCoverageMatrix();
  assert.equal(matrix.length, 18);
  assert.deepEqual(matrix.map((row) => row.category), [
    'Account / Access', 'Dashboard / Overview', 'Web Chatbot', 'WhatsApp AI', 'Instagram DM AI', 'AI Guide', 'Knowledge Intelligence',
    'Conversations / Shared Inbox', 'CRM / Contacts / Leads / Pipeline', 'Integrations', 'AI Visual', 'AI Voice',
    'Team / Permissions', 'Plans / Entitlements', 'Support / Service', 'Billing / Usage', 'Security / Privacy', 'Troubleshooting / Cross-product issues',
  ]);
  for (const row of matrix) assert.match(row.auditStatus, /^(VERIFIED CUSTOMER-ACCESSIBLE|IMPLEMENTATION-MANAGED|ADMIN-ONLY|ROADMAP|UNVERIFIED|NO VERIFIED CONTENT)$/);
});

test('publishes a substantially expanded verified troubleshooting inventory', () => {
  const articles = getPublishedArticles('en');
  assert.ok(articles.length >= 45, `expected at least 45 published articles, got ${articles.length}`);
  for (const slug of [
    'account-workspace-access', 'dashboard-data-missing', 'web-chatbot-not-responding', 'whatsapp-ai-not-replying',
    'ai-guide-not-available', 'knowledge-pdf-old-price', 'conversation-missing-from-inbox', 'lead-not-visible',
    'integration-requires-samche', 'ai-visual-not-available', 'ai-voice-not-connecting', 'team-member-permission-denied',
    'feature-not-visible-by-plan', 'submit-support-evidence', 'ai-usage-limits-explained',
  ]) assert.ok(getArticleBySlug(slug, 'en'), `${slug} should be published`);
});

test('major troubleshooting families expose localized decision trees and boundaries', () => {
  for (const category of ['Web Chatbot', 'WhatsApp AI', 'Knowledge Intelligence', 'Conversations / Shared Inbox', 'CRM / Contacts / Leads / Pipeline', 'Integrations', 'AI Visual', 'AI Voice', 'Plans / Entitlements', 'Support / Service']) {
    const articles = getPublishedArticles('en');
    const family = articles.filter((article) => article.coverageAreas?.includes(category));
    assert.ok(family.length > 0, `${category} needs published coverage`);
    assert.ok(family.some((article) => article.decisionTree?.length), `${category} needs a decision tree`);
    for (const locale of ['en', 'tr', 'ar']) {
      const localizedFamily = getPublishedArticles(locale).filter((article) => article.coverageAreas?.includes(category));
      for (const article of localizedFamily) assert.ok(article.title && article.summary && article.locale === locale);
    }
  }
});

test('canonical registry exposes the same published article identity for Help Center and chatbot links', () => {
  const presentation = getPublishedArticlePresentation('whatsapp-ai-not-replying', 'tr');
  assert.equal(presentation?.slug, 'whatsapp-ai-not-replying');
  assert.equal(presentation?.url, '/help/article/whatsapp-ai-not-replying?locale=tr');
  assert.equal(getPublishedArticlePresentation('missing-or-unpublished', 'tr'), null);
});
