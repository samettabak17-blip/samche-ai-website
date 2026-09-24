import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPublishedArticles,
  getArticleBySlug,
  searchHelpArticles,
  getHelpArticleSources,
  getHelpCoverageInventory,
  getHelpArticleStatistics,
  filterPublishedHelpArticles,
  getPublishedCategories,
} from '../lib/help-center/index.mjs';
import { troubleshootingArticles } from '../lib/help-center/troubleshooting-registry.mjs';

test('published help inventory covers every verified customer-accessible map entry', () => {
  const inventory = getHelpCoverageInventory();
  assert.equal(inventory.auditedEntries, 20);
  assert.equal(inventory.verifiedCustomerAccessibleEntries, 16);
  assert.equal(inventory.publishedEntriesCovered, 16);
  assert.ok(inventory.publishedArticleCount >= 19);
  assert.deepEqual(inventory.gaps.map((gap) => gap.area), ['CRM Contacts', 'Integrations', 'AI Visual generation', 'AI Voice']);
});

test('every published article has complete localized content and verification evidence', () => {
  const articles = getPublishedArticles('en');
  assert.ok(articles.length >= 19);
  for (const article of articles) {
    assert.match(article.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(article.verification.status, 'Published');
    assert.ok(article.verification.verifiedOn);
    assert.ok(article.verification.sourceFiles.length > 0);
    assert.ok(article.sections.length >= 4);
    for (const locale of ['en', 'tr', 'ar']) {
      const localized = getArticleBySlug(article.slug, locale);
      assert.ok(localized, `${article.slug} missing ${locale}`);
      assert.ok(localized.title && localized.summary && localized.sections.length >= 4, `${article.slug} incomplete ${locale}`);
      assert.equal(localized.locale, locale);
    }
  }
});

test('unpublished gaps never enter public search, sources, or article lookup', () => {
  assert.equal(getArticleBySlug('integrations-provider-setup', 'en'), null);
  assert.equal(searchHelpArticles('provider credentials', 'en').some((result) => result.slug === 'integrations-provider-setup'), false);
  assert.equal(getHelpArticleSources('AI Voice settings', 'en').some((result) => result.slug === 'ai-voice-settings'), false);
});

test('search ranks exact titles and known dashboard errors above body matches in all locales', () => {
  for (const [locale, query] of [
    ['en', 'WhatsApp AI not responding'],
    ['tr', 'WhatsApp yanıt vermiyor'],
    ['ar', 'واتساب لا يرد'],
  ]) {
    assert.ok(searchHelpArticles(query, locale).slice(0, 3).some((result) => result.slug === 'whatsapp-ai-not-replying' || result.slug === 'whatsapp-ai-troubleshooting'), `${locale} ranking`);
  }
});

test('chatbot sources are bounded, localized, and contain canonical article URLs', () => {
  const sources = getHelpArticleSources('Web Chatbot görünmüyor', 'tr', 3);
  assert.ok(sources.length > 0 && sources.length <= 3);
  for (const source of sources) {
    assert.match(source.url, /^\/help\/article\/[a-z0-9-]+(?:\?locale=(?:en|tr|ar))?$/);
    assert.ok(source.title && source.excerpt && source.navigation);
    assert.equal(source.status, 'Published');
  }
});

test('article statistics equal the canonical published registry after publication filters', () => {
  const published = getPublishedArticles('en');
  const statistics = getHelpArticleStatistics('en');
  assert.equal(statistics.totalPublished, published.length);
  assert.equal(statistics.totalTroubleshooting, troubleshootingArticles.filter((article) => article.verification.status === 'Published').length);
  assert.equal(statistics.categories.reduce((sum, category) => sum + category.count, 0), statistics.totalPublished);
  assert.deepEqual(
    statistics.categories.map(({ slug, count }) => ({ slug, count })),
    getPublishedCategories('en').map(({ slug, articleCount }) => ({ slug, count: articleCount })),
  );
});

test('publication filter excludes draft retired unverified roadmap and unpublished records', () => {
  const record = (status) => ({ slug: status.toLowerCase().replaceAll(' ', '-'), verification: { status } });
  assert.deepEqual(
    filterPublishedHelpArticles([
      record('Published'), record('Draft'), record('Needs Review'), record('Retired'),
      record('Unverified'), record('Roadmap'), record('Unpublished'),
    ]).map(({ verification }) => verification.status),
    ['Published'],
  );
});
