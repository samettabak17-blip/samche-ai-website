import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRestrictedMarkdown } from '../lib/restricted-markdown.mjs';
import { createInitialSalesState, generateSalesTurn, getSalesProcessingStatus } from '../lib/samche-sales-assistant.mjs';
import { buildSalesFallbackReply, resolveSalesChatTurn } from '../lib/samche-sales-chat-client.mjs';
import { getPublishedArticleUrl } from '../lib/help-center/index.mjs';
import { readFile } from 'node:fs/promises';

test('renders a canonical Help Center markdown link only when the slug is supplied', () => {
  const articleUrl = getPublishedArticleUrl('whatsapp-ai-troubleshooting', 'tr');
  const blocks = parseRestrictedMarkdown(`[İlgili doğrulanmış makale](${articleUrl})`, {
    articleUrls: new Map([['whatsapp-ai-troubleshooting', articleUrl]]),
  });
  assert.deepEqual(blocks[0].children, [{
    type: 'link', value: 'İlgili doğrulanmış makale', href: articleUrl,
  }]);
  const unsafe = parseRestrictedMarkdown('[fake](https://example.com/)');
  assert.deepEqual(unsafe[0].children, [{ type: 'text', value: '[fake](https://example.com/)' }]);
});

test('published article URLs preserve locale and unpublished refs have no URL', () => {
  assert.equal(getPublishedArticleUrl('whatsapp-ai-troubleshooting', 'tr'), '/help/article/whatsapp-ai-troubleshooting?locale=tr');
  assert.equal(getPublishedArticleUrl('whatsapp-ai-troubleshooting', 'ar'), '/help/article/whatsapp-ai-troubleshooting?locale=ar');
  assert.equal(getPublishedArticleUrl('invented-slug', 'tr'), null);
});

test('preserves readable paragraphs and visible numbered and bulleted steps', () => {
  const blocks = parseRestrictedMarkdown('Önce durumu kontrol edin.\n\n1. Kanallar bölümünü açın\n2. WhatsApp kanalını seçin\n\n- Durumu Active yapın\n- Save changes seçin');
  assert.deepEqual(blocks.map(({ type }) => type), ['paragraph', 'ol', 'ul']);
  assert.equal(blocks[1].items[0][0].value, 'Kanallar bölümünü açın');
  assert.equal(blocks[2].items[1][0].value, 'Save changes seçin');
});

test('selects natural localized and contextual processing copy', () => {
  const state = createInitialSalesState();
  assert.match(getSalesProcessingStatus('WhatsApp yanıt vermiyor', state, 'tr'), /WhatsApp|incel/i);
  assert.match(getSalesProcessingStatus('I cannot find the AI Guide step', state, 'en'), /AI Guide|guidance/i);
  assert.match(getSalesProcessingStatus('لا يعمل واتساب', state, 'ar'), /واتساب|مشكلة|طلب/u);
  for (const locale of ['en', 'tr', 'ar']) assert.ok(getSalesProcessingStatus('please help', state, locale).length > 0);
});

test('builds a useful Turkish WhatsApp follow-up fallback from prior article context', () => {
  const reply = buildSalesFallbackReply({
    locale: 'tr', input: 'doğrulanmış makale yetersiz',
    messages: [{ role: 'assistant', text: 'WhatsApp kanalını kontrol edin.', articleRefs: ['whatsapp-ai-troubleshooting'] }],
    state: createInitialSalesState(), articleRefs: ['whatsapp-ai-troubleshooting'],
  });
  assert.match(reply, /WhatsApp|Channels|Kanallar/i);
  assert.match(reply, /Edit channel|Save changes|Status|Durum/i);
  assert.doesNotMatch(reply, /tekrar deneyin/i);
});

test('Turkish broken-article follow-up recovers the previous article and continues troubleshooting', () => {
  const reply = buildSalesFallbackReply({
    locale: 'en', input: 'makale açılmıyor',
    messages: [{ role: 'assistant', text: 'WhatsApp kanalını kontrol edin.', articleRefs: ['whatsapp-ai-troubleshooting'] }],
  });
  assert.match(reply, /\[İlgili doğrulanmış makale\]\(\/help\/article\/whatsapp-ai-troubleshooting\?locale=tr\)/);
  assert.match(reply, /WhatsApp|Channels|Status|Save changes/i);
  assert.match(reply, /bağlantı|açılmadı|adım|devam/i);
});

test('latest follow-up language wins over the stored locale for English and Arabic', () => {
  const english = buildSalesFallbackReply({ locale: 'tr', input: 'the article link is not working', messages: [{ role: 'assistant', articleRefs: ['whatsapp-ai-troubleshooting'] }] });
  const arabic = buildSalesFallbackReply({ locale: 'en', input: 'الرابط لا يعمل', messages: [{ role: 'assistant', articleRefs: ['whatsapp-ai-troubleshooting'] }] });
  assert.match(english, /article|link|WhatsApp/i);
  assert.doesNotMatch(english, /bağlantı|makale açılmadı/iu);
  assert.match(arabic, /الرابط|المقالة|واتساب/u);
});

test('provider failure appends a localized usable fallback instead of an error-only response', async () => {
  const state = createInitialSalesState();
  const userMessage = { role: 'user', text: 'WhatsApp yanıt vermiyor', time: '10:00', imageContext: true };
  const stateCandidate = generateSalesTurn(state, userMessage.text, [], 'tr');
  const resolved = await resolveSalesChatTurn({
    state, stateCandidate, messages: [{ role: 'assistant', text: 'WhatsApp kanalını inceleyelim.', articleRefs: ['whatsapp-ai-troubleshooting'] }],
    userMessage, locale: 'tr', time: '10:01', apiBaseUrl: '', attachment: { mimeType: 'image/png', data: 'c2NyZWVuc2hvdA' },
    fetchImpl: async () => { throw new Error('offline'); },
  });
  const assistant = resolved.messages.at(-1);
  assert.equal(resolved.usedFallback, true);
  assert.equal(resolved.providerFailed, true);
  assert.equal(assistant.role, 'assistant');
  assert.match(assistant.text, /WhatsApp|Kanallar|Durum/i);
  assert.equal(resolved.retryMessage, '');
});

test('initial provider failure still exposes a published article ref for a support question', async () => {
  const state = createInitialSalesState();
  const userMessage = { role: 'user', text: 'WhatsApp yanıt vermiyor', time: '10:00' };
  const stateCandidate = generateSalesTurn(state, userMessage.text, [], 'tr');
  const resolved = await resolveSalesChatTurn({
    state, stateCandidate, messages: [], userMessage, locale: 'tr', time: '10:01', apiBaseUrl: '',
    fetchImpl: async () => { throw new Error('offline'); },
  });
  assert.deepEqual(resolved.messages.at(-1).articleRefs, ['whatsapp-ai-troubleshooting']);
  assert.match(resolved.messages.at(-1).text, /WhatsApp|Channels|Status/i);
});

test('Arabic support fallback remains actionable and localized', () => {
  const reply = buildSalesFallbackReply({
    locale: 'ar', input: 'أين أضغط؟',
    messages: [{ role: 'assistant', text: 'WhatsApp channel is inactive.', articleRefs: ['whatsapp-ai-troubleshooting'] }],
    state: createInitialSalesState(), articleRefs: ['whatsapp-ai-troubleshooting'],
  });
  assert.match(reply, /واتساب|القنوات|الحالة/u);
  assert.match(reply, /حفظ|تعديل|القناة/u);
});

test('widget contract uses localized status, progressive reveal, and canonical article anchors', async () => {
  const source = await readFile(new URL('../app/components/samche-chat-widget.tsx', import.meta.url), 'utf8');
  assert.match(source, /getSalesProcessingStatus\(trimmed, salesStateRef\.current, locale\)/);
  assert.match(source, /setMessages\(\(current\) => \[\.\.\.current, userMessage\]\)/);
  assert.match(source, /requestAnimationFrame|setInterval|setTimeout/);
  assert.match(source, /articleUrls/);
  assert.match(source, /token\.type === 'link'/);
  assert.match(source, /InternalLink[\s\S]{0,120}articleUrls\.get\(slug\)/);
});
