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
  assert.match(home, /searchParams/);
  assert.match(home, /await searchParams/);
  assert.match(home, /Array\.isArray\(params\.q\)/);
  assert.match(home, /initialQuery=\{initialQuery\}/);
  assert.match(category, /getCategoryBySlug/);
  assert.match(article, /getArticleBySlug/);
  assert.match(article, /generateMetadata/);
  assert.match(article, /notFound/);
  assert.match(component, /searchHelpArticleResults/);
  assert.match(component, /HelpCenterHome\(\{ initialQuery/);
  assert.match(component, /<SearchForm initial=\{initialQuery\}/);
  assert.match(component, /help-search-suggestions/);
  assert.match(component, /URLSearchParams/);
  assert.match(component, /related/);
  assert.match(component, /Was this article helpful|Makale faydalı oldu mu|هل كانت هذه المقالة مفيدة/);
  assert.match(component, /dir=\{locale === 'ar' \? 'rtl' : 'ltr'\}/);
  assert.match(component, /getHelpCenterStats/);
  assert.match(component, /totalPublished/);
  assert.match(component, /totalTroubleshooting/);
  assert.match(component, /totalCategories/);
  assert.match(component, /resultsFor/);
  assert.match(component, /resultRange/);
  assert.match(component, /help-article-row/);
  assert.match(component, /getCategoryArticleGroups/);
  assert.match(component, /askAi/);
  assert.match(component, /samche:open-chat/);
  assert.match(component, /category\.articleCount/);
  assert.match(component, /category\.articles\.length/);
  assert.doesNotMatch(component, />\{article\.category\}</);
});

test('article reading structure includes navigation, contents, verification, and support links', async () => {
  const source = await readFile(files.component, 'utf8');
  for (const marker of ['Table of contents', 'Prerequisites', 'Expected result', 'Troubleshooting', 'Related articles', 'Contact Support', 'Ask SamChe AI', 'last verified']) assert.match(source, new RegExp(marker, 'i'), marker);
  assert.match(source, /section\.note/);
  assert.match(source, /section\.warning/);
  assert.match(source, /localizedArticleUrl\(relatedArticle\.slug, locale\)/);
});

test('Help Center CSS declares responsive no-overflow layouts', async () => {
  const css = await readFile('app/globals.css', 'utf8');
  assert.match(css, /\.help-center/);
  assert.match(css, /help-article/);
  assert.match(css, /help-article-row/);
  assert.match(css, /help-metric-grid/);
  assert.match(css, /\[dir=['"]rtl['"]\]/);
  assert.match(css, /@media/);
});
