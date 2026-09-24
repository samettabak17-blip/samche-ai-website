import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getAllPublishedArticleUrls, getPublishedArticles } from '../lib/help-center/index.mjs';

test('sitemap is sourced from the published canonical registry only', async () => {
  const source = await readFile('app/sitemap.ts', 'utf8');
  assert.match(source, /getAllPublishedArticleUrls/);
  assert.match(source, /getPublishedCategories/);
  assert.doesNotMatch(source, /unpublishedGaps/);
  const urls = getAllPublishedArticleUrls();
  assert.equal(urls.length, getPublishedArticles('en').length);
  assert.ok(urls.every((url) => /^\/help\/article\/[a-z0-9-]+$/.test(url)));
  assert.ok(!urls.includes('/help/article/missing-or-unpublished'));
});
