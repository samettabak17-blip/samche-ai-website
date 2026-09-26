import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPublishedArticles,
  getArticleBySlug,
  searchHelpArticles,
  searchHelpArticleResults,
  getCategoryArticleGroups,
  getHelpArticleSources,
  getHelpCoverageInventory,
  getHelpArticleStatistics,
  getHelpCenterStats,
  filterPublishedHelpArticles,
  getPublishedCategories,
} from '../lib/help-center/index.mjs';
import { troubleshootingArticles } from '../lib/help-center/troubleshooting-registry.mjs';

test('published help inventory covers every verified customer-accessible map entry', () => {
  const inventory = getHelpCoverageInventory();
  assert.equal(inventory.auditedEntries, 21);
  assert.equal(inventory.verifiedCustomerAccessibleEntries, 17);
  assert.equal(inventory.publishedEntriesCovered, 17);
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

test('search summaries report the complete localized result count before pagination', () => {
  const results = searchHelpArticleResults('WhatsApp', 'tr', { offset: 0, limit: 2 });
  assert.ok(results.total > results.items.length);
  assert.deepEqual([results.start, results.end], [1, 2]);
  assert.equal(results.query, 'WhatsApp');
  assert.equal(new Set(results.items.map((item) => item.slug)).size, results.items.length);
  for (const item of results.items) {
    assert.equal(item.categoryLabel, 'WhatsApp AI');
    assert.ok(['Rehber', 'Sorun Giderme'].includes(item.articleTypeLabel));
    assert.ok(item.excerpt);
  }
  assert.deepEqual(searchHelpArticleResults('zzzz-no-match', 'ar', { limit: 20 }), { query: 'zzzz-no-match', total: 0, start: 0, end: 0, items: [] });
});

test('category groups localize headings and include each published article exactly once', () => {
  const groups = getCategoryArticleGroups('whatsapp-ai', 'tr');
  const slugs = groups.flatMap((group) => group.articles.map((article) => article.slug));
  assert.equal(slugs.length, 9);
  assert.equal(new Set(slugs).size, 9);
  assert.ok(groups.every((group) => group.label && group.articles.length > 0));
  assert.ok(groups.some((group) => group.key === 'troubleshooting' && group.label === 'Sorun Giderme'));
  assert.ok(groups.flatMap((group) => group.articles).every((article) => article.categoryLabel === 'WhatsApp AI'));
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

test('canonical help center stats expose exact verified totals category counts and locale coverage', () => {
  const stats = getHelpCenterStats('tr');
  assert.equal(stats.totalPublished, 71);
  assert.equal(stats.totalTroubleshooting, 52);
  assert.equal(stats.totalCategories, 12);
  assert.deepEqual(stats.byLocale, { en: 71, tr: 71, ar: 71 });
  assert.deepEqual(stats.byStatus, { Published: 71 });
  assert.deepEqual(stats.byCategory.map(({ slug, count }) => [slug, count]), [
    ['getting-started', 5], ['dashboard-account', 5], ['ai-assistants', 3],
    ['web-chatbot', 5], ['whatsapp-ai', 9], ['instagram-dm-ai', 3], ['ai-guide', 3], ['knowledge', 9],
    ['conversations', 5], ['crm-operations', 6], ['team-access', 2], ['support', 16],
  ]);

  const turkishArticle = getPublishedArticles('tr').find((article) => article.slug === 'whatsapp-ai-not-replying');
  assert.equal(turkishArticle.categoryLabel, 'WhatsApp AI');
  assert.equal(turkishArticle.articleType, 'troubleshooting');
  assert.equal(turkishArticle.articleTypeLabel, 'Sorun Giderme');
});

test('Instagram DM AI help is canonical, localized, searchable, and counted from the registry', () => {
  const stats = getHelpCenterStats('en');
  const instagramCategory = stats.byCategory.find((category) => category.slug === 'instagram-dm-ai');
  assert.ok(instagramCategory?.count >= 3);
  assert.equal(stats.totalPublished, stats.byCategory.reduce((sum, category) => sum + category.count, 0));
  assert.equal(stats.byLocale.en, stats.totalPublished);
  assert.equal(stats.byLocale.tr, stats.totalPublished);
  assert.equal(stats.byLocale.ar, stats.totalPublished);
  for (const [locale, query] of [['en', 'Connect Instagram'], ['tr', 'Instagram bağla'], ['ar', 'ربط Instagram']]) {
    const results = searchHelpArticles(query, locale);
    assert.ok(results.some((article) => article.category === 'Instagram DM AI'), `${locale} Instagram search`);
  }
  const setup = getArticleBySlug('instagram-dm-ai-setup', 'en');
  assert.equal(setup?.category, 'instagram-dm-ai');
  for (const control of ['Connect Instagram', 'Test Connection', 'Configure']) assert.match(setup.navigation, new RegExp(control));
});

test('published filtering excludes verified records without complete localized display content', () => {
  const malformed = { slug: 'incomplete', category: 'support', articleType: 'guide', verification: { status: 'Published', verifiedOn: '2026-09-25', sourceFiles: ['source'], reviewTriggers: ['change'] } };
  const superficiallyLocalized = {
    ...malformed,
    slug: 'superficially-localized',
    title: { en: 'Title', tr: 'Başlık', ar: 'عنوان' },
    summary: { en: 'Summary', tr: 'Özet', ar: 'ملخص' },
    sections: [{ heading: { en: 'Steps', tr: 'Adımlar', ar: 'الخطوات' } }],
  };
  assert.deepEqual(filterPublishedHelpArticles([malformed, superficiallyLocalized]), []);
  assert.equal(getHelpCenterStats('en', [malformed, superficiallyLocalized]).totalPublished, 0);
});

test('publication filter excludes draft retired unverified roadmap and unpublished records', () => {
  const record = (status) => {
    const text = { en: 'Text', tr: 'Metin', ar: 'نص' };
    return {
      slug: status.toLowerCase().replaceAll(' ', '-'),
      title: text, summary: text, plan: text, permissions: text, prerequisites: text, navigation: text, expected: text, problems: text,
      keywords: { en: ['text'], tr: ['metin'], ar: ['نص'] },
      sections: [{ heading: text, body: text, steps: [{ en: 'Step', tr: 'Adım', ar: 'خطوة' }] }],
      verification: { status, verifiedOn: '2026-09-25', sourceFiles: ['verified.tsx'], reviewTriggers: ['source changes'] },
    };
  };
  const incompletePublished = { slug: 'incomplete-published', verification: { status: 'Published', verifiedOn: '', sourceFiles: [], reviewTriggers: [] } };
  assert.deepEqual(
    filterPublishedHelpArticles([
      record('Published'), record('Draft'), record('Needs Review'), record('Retired'),
      record('Unverified'), record('Roadmap'), record('Unpublished'), incompletePublished,
    ]).map(({ verification }) => verification.status),
    ['Published'],
  );
});

test('canonical published registry exposes each article slug exactly once', () => {
  const slugs = getPublishedArticles('en').map((article) => article.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});
