import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = {
  home: 'app/help/page.tsx',
  category: 'app/help/category/[category]/page.tsx',
  article: 'app/help/article/[slug]/page.tsx',
  component: 'app/components/help-center.tsx',
};

test('Help Center routes use the shared registry and provide permanent article URLs', async () => {
  const [home, category, article, component] = await Promise.all(Object.values(files).map((file) => readFile(file, 'utf8')));
  assert.match(home, /HelpCenterHome/);
  assert.match(category, /getCategoryBySlug/);
  assert.match(article, /getArticleBySlug/);
  assert.match(article, /generateMetadata/);
  assert.match(component, /searchHelpArticles/);
  assert.match(component, /related/);
  assert.match(component, /Was this article helpful|Makale faydalı oldu mu|هل كانت هذه المقالة مفيدة/);
  assert.match(component, /dir=\{locale === 'ar' \? 'rtl' : 'ltr'\}/);
});

test('article reading structure includes navigation, contents, verification, and support links', async () => {
  const source = await readFile(files.component, 'utf8');
  for (const marker of ['Table of contents', 'Prerequisites', 'Expected result', 'Troubleshooting', 'Related articles', 'Contact Support', 'last verified']) assert.match(source, new RegExp(marker, 'i'), marker);
  assert.match(source, /href=\{`\/help\/article\/\$\{relatedArticle\.slug\}`\}/);
});

test('Help Center CSS declares responsive no-overflow layouts', async () => {
  const css = await readFile('app/globals.css', 'utf8');
  assert.match(css, /\.help-center/);
  assert.match(css, /help-article/);
  assert.match(css, /@media/);
});
