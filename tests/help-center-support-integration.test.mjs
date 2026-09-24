import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getAllPublishedArticleUrls, getPublishedArticles, searchHelpArticles } from '../lib/help-center/index.mjs';

test('support portal searches the shared Help Center registry and links published articles', async () => {
  const source = await readFile('app/components/support-portal.tsx', 'utf8');
  assert.match(source, /searchHelpArticles/);
  assert.match(source, /getPublishedArticles/);
  assert.match(source, /href=\{item\.url\}/);
  assert.match(source, /support-search-suggestions/);
  assert.match(source, /\/help\?.*q=/);
  assert.equal(searchHelpArticles('WhatsApp yanıt vermiyor', 'tr')[0].url, '/help/article/whatsapp-ai-not-replying?locale=tr');
  assert.match(searchHelpArticles('واتساب لا يرد', 'ar')[0].url, /^\/help\/article\/(?:whatsapp-ai-not-replying|whatsapp-ai-troubleshooting)\?locale=ar$/);
});

test('published Help Center URLs are included in the sitemap and unpublished gaps are excluded', async () => {
  const sitemap = await readFile('app/sitemap.ts', 'utf8');
  assert.match(sitemap, /getAllPublishedArticleUrls/);
  assert.match(sitemap, /help/);
  const urls = getAllPublishedArticleUrls();
  assert.ok(urls.length >= 19);
  assert.equal(urls.includes('/help/article/integrations-provider-setup'), false);
});

test('support form remains connected to the existing support API and attachment flow', async () => {
  const source = await readFile('app/components/support-portal.tsx', 'utf8');
  assert.match(source, /fetch\('\/api\/support'/);
  assert.match(source, /validateScreenshot/);
  assert.match(source, /support-screenshot/);
  assert.equal(getPublishedArticles('en').some((article) => article.slug === 'support-request-and-entitlements'), true);
});
