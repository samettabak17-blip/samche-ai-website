import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routes = [
  ['app/page.tsx', 'https://samche.ai/'],
  ['app/platform/page.tsx', 'https://samche.ai/platform'],
  ['app/pricing/page.tsx', 'https://samche.ai/pricing'],
  ['app/contact/page.tsx', 'https://samche.ai/contact'],
  ['app/privacy/page.tsx', 'https://samche.ai/privacy'],
  ['app/security/page.tsx', 'https://samche.ai/security'],
  ['app/support/page.tsx', 'https://samche.ai/support'],
  ['app/help/page.tsx', 'https://samche.ai/help'],
];

test('every indexable public route declares canonical and share metadata', async () => {
  for (const [file, canonical] of routes) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(source, /(?:alternates:\s*\{[^}]*canonical:|buildPageMetadata)/s, `${file} should declare canonical metadata`);
    const path = new URL(canonical).pathname;
    assert.match(source, new RegExp(`path:\\s*['"]${path === '/' ? '\\/' : path}['"]`), `${file} should point at ${canonical}`);
    assert.match(source, /(?:openGraph:|buildPageMetadata)/, `${file} should declare Open Graph metadata`);
    assert.match(source, /(?:twitter:|buildPageMetadata)/, `${file} should declare Twitter metadata`);
  }
});

test('help detail routes expose canonical metadata and breadcrumb schema inputs', async () => {
  const article = await readFile(new URL('../app/help/article/[slug]/page.tsx', import.meta.url), 'utf8');
  const category = await readFile(new URL('../app/help/category/[category]/page.tsx', import.meta.url), 'utf8');
  for (const source of [article, category]) {
    assert.match(source, /buildPageMetadata/);
    assert.match(source, /BreadcrumbJsonLd/);
  }
});

test('structured data is truthful and multilingual URLs are not overstated', async () => {
  const layout = await readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8');
  const sitemap = await readFile(new URL('../app/sitemap.ts', import.meta.url), 'utf8');
  const robots = await readFile(new URL('../public/robots.txt', import.meta.url), 'utf8');
  assert.match(layout, /SoftwareApplication/);
  assert.doesNotMatch(layout, /aggregateRating|reviewCount|ratingValue/);
  assert.doesNotMatch(layout, /hreflang|alternateLanguages/);
  assert.match(sitemap, /https:\/\/samche\.ai/);
  assert.match(robots, /Sitemap:\s*https:\/\/samche\.ai\/sitemap\.xml/);
});

test('public comparison table remains full-width without forcing horizontal scrolling', async () => {
  const component = await readFile(new URL('../app/components/pricing-table.tsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(component, /<table className="plan-comparison">/);
  assert.match(component, /<thead>/);
  assert.match(component, /<tbody>/);
  assert.match(css, /\.comparison-scroll\s*\{[^}]*overflow-x:\s*visible/s);
  assert.doesNotMatch(css, /\.comparison-scroll\s*\{[^}]*overflow-x:\s*(?:auto|scroll)/s);
  assert.doesNotMatch(css, /\.plan-comparison\s*\{[^}]*min-width:\s*\d+px/s);
  assert.doesNotMatch(css, /html\s*,\s*body\s*\{[^}]*overflow-x:\s*hidden/s);
});
