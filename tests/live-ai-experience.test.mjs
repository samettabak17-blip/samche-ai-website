import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { arText, trText } from '../lib/samche-localization.mjs';

const pageSource = () => readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');

test('live AI capability cards tell a complete bounded product story', async () => {
  const source = await pageSource();
  for (const phrase of [
    'PAGE-AWARE SALES AI', 'Support + sales/product assistance', 'Product discovery and recommendations',
    'Proactive engagement while browsing, when configured', 'lead qualification', 'customer information capture',
    'AI DECISION, PLANNING', 'industry-specific configurable journeys', 'customer-specific roadmaps',
    'Calculators, estimates and quote flows where configured', 'VISUAL AI', 'CUSTOMER REQUEST',
    'APPROVED BUSINESS / PRODUCT KNOWLEDGE', 'CUSTOMER CONTEXT', 'customer-specific visual',
  ]) assert.match(source, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `missing ${phrase}`);
  assert.match(source, /a furniture customer can send a room photo/i);
  assert.match(source, /combining support and sales/i);
});

test('new live AI experience copy has Turkish and Arabic translations', () => {
  for (const key of [
    'PAGE-AWARE SALES AI', 'Support + sales/product assistance', 'Product discovery and recommendations',
    'Proactive engagement while browsing, when configured', 'AI DECISION, PLANNING & SALES EXPERIENCE',
    'Industry-specific configurable journeys and discovery questions', 'Customer-specific roadmaps, planning and recommendations', 'VISUAL AI', 'CUSTOMER REQUEST',
    '+ APPROVED BUSINESS / PRODUCT KNOWLEDGE', '+ CUSTOMER CONTEXT', 'When Visual AI is configured: a furniture customer can send a room photo and ask how an approved product could look in that space. The assistant uses the request, approved product knowledge and customer context to create a relevant visual.',
  ]) {
    assert.ok(trText[key], `missing Turkish translation for ${key}`);
    assert.ok(arText[key], `missing Arabic translation for ${key}`);
  }
});

test('launcher is immediate while the full widget stays lazy', async () => {
  const source = await readFile(new URL('../app/components/samche-chat-loader.tsx', import.meta.url), 'utf8');
  assert.match(source, /lazy\(\(\) => import\('\.\/samche-chat-widget'\)/);
  assert.doesNotMatch(source, /requestIdleCallback|setTimeout\(/);
  assert.match(source, /setLoadFullWidget\(true\)/);
  assert.match(source, /initiallyOpen=\{openRequested\}/);
});
