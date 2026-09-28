import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRestrictedMarkdown } from '../lib/restricted-markdown.mjs';
import { createInitialSalesState, generateSalesTurn, getSalesProcessingStatus } from '../lib/samche-sales-assistant.mjs';
import { buildGroundedSupportRecovery, buildSalesFallbackReply, resolveConversationLanguage, resolveSalesChatTurn } from '../lib/samche-sales-chat-client.mjs';
import { getPublishedArticleUrl } from '../lib/help-center/index.mjs';
import { readFile } from 'node:fs/promises';

const INTERNAL_SUPPORT_LEAK = /verified|registry|boundary|tenant(?:Id|ı|i|a|e|ler)?|\/app\/|still needs investigation|implementation(?:-managed)?|roadmap classification|entitlement\/capability key|doğrulanmış (?:bilgi|rota|paket)|hâlâ incelenmesi gereken|\*\*sınır:|المسار المعتمد|المعلومات المعتمدة|ما يزال يحتاج إلى تحقيق|\*\*الحدود:/iu;

const instagramRegressions = [
  {
    language: 'tr',
    first: 'Instagram mesajlarımı SamChe Dashboard üzerinden yönetebilir miyim?',
    second: 'bağlanılamadı uyarısı alıyorum',
    context: /Instagram/iu,
    problem: /bağlan|bağlantı/iu,
    evidence: /hata metni|ekran görüntüsü/iu,
    generic: /Account Settings|Overview|Ayarlar bölümü/iu,
  },
  {
    language: 'en',
    first: 'Can I manage my Instagram messages through the SamChe Dashboard?',
    second: 'I get a could not connect warning',
    context: /Instagram/iu,
    problem: /connect|connection/iu,
    evidence: /exact error|screenshot/iu,
    generic: /Account Settings|Overview|Settings section/iu,
  },
  {
    language: 'ar',
    first: 'هل يمكنني إدارة رسائل إنستغرام من خلال لوحة SamChe؟',
    second: 'تظهر لي رسالة تعذر الاتصال',
    context: /Instagram|إنستغرام/u,
    problem: /الاتصال|يتصل/u,
    evidence: /نص الخطأ|لقطة شاشة/u,
    generic: /Account Settings|Overview|الإعدادات/u,
  },
];

for (const sample of instagramRegressions) {
  test(`${sample.language}: Instagram first turn does not invent a customer-visible capability`, () => {
    const recovery = buildGroundedSupportRecovery({ language: sample.language, input: sample.first, messages: [] });
    assert.match(recovery.reply, sample.context);
    assert.match(recovery.reply, /Channels|Connect Instagram|Test Connection/iu);
    assert.doesNotMatch(recovery.reply, /transfer|route|\/app\//iu);
    assert.doesNotMatch(recovery.reply, INTERNAL_SUPPORT_LEAK);
    assert.ok(recovery.articleRefs.length > 0);
    assert.ok(recovery.articleRefs.every((slug) => slug.startsWith('instagram-dm-ai')));
  });

  test(`${sample.language}: ambiguous Instagram connection follow-up keeps subject and latest language`, () => {
    const first = buildGroundedSupportRecovery({ language: sample.language, input: sample.first, messages: [] });
    const recovery = buildGroundedSupportRecovery({
      language: sample.language,
      input: sample.second,
      messages: [
        { role: 'user', text: sample.first, language: sample.language },
        { role: 'assistant', text: first.reply, language: sample.language, articleRefs: first.articleRefs },
      ],
    });
    assert.match(recovery.reply, sample.context);
    assert.match(recovery.reply, sample.problem);
    assert.match(recovery.reply, sample.evidence);
    assert.doesNotMatch(recovery.reply, sample.generic);
    assert.doesNotMatch(recovery.reply, INTERNAL_SUPPORT_LEAK);
    assert.ok(recovery.articleRefs.length > 0);
    assert.ok(recovery.articleRefs.every((slug) => slug.startsWith('instagram-dm-ai')));
  });
}

test('an explicit WhatsApp topic switch is not overridden by older Instagram context', () => {
  const recovery = buildGroundedSupportRecovery({
    language: 'en', input: 'My WhatsApp AI is not replying',
    messages: [{ role: 'user', text: 'Can I manage Instagram messages in the Dashboard?' }],
  });
  assert.match(recovery.reply, /WhatsApp/i);
  assert.doesNotMatch(recovery.reply, /Instagram/i);
  assert.ok(recovery.articleRefs.every((slug) => slug.startsWith('whatsapp')));
});

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
  assert.doesNotMatch(reply, /\]\(\/help\/article\//);
  assert.match(reply, /WhatsApp|Channels|Status|Save changes/i);
  assert.match(reply, /hata metni|ekran görüntüsü/i);
  assert.doesNotMatch(reply, INTERNAL_SUPPORT_LEAK);
});

test('latest follow-up language wins over the stored locale for English and Arabic', () => {
  const english = buildSalesFallbackReply({ locale: 'tr', input: 'the article link is not working', messages: [{ role: 'assistant', articleRefs: ['whatsapp-ai-troubleshooting'] }] });
  const arabic = buildSalesFallbackReply({ locale: 'en', input: 'الرابط لا يعمل', messages: [{ role: 'assistant', articleRefs: ['whatsapp-ai-troubleshooting'] }] });
  assert.match(english, /article|link|WhatsApp/i);
  assert.doesNotMatch(english, /bağlantı|makale açılmadı/iu);
  assert.match(arabic, /[؀-ۿ]/u);
  assert.match(arabic, /WhatsApp|واتساب/u);
  assert.doesNotMatch(arabic, INTERNAL_SUPPORT_LEAK);
});

test('conversation language uses the latest detectable message and retains prior language only for neutral input', () => {
  assert.equal(resolveConversationLanguage('makale açılmıyor', 'en', 'en'), 'tr');
  assert.equal(resolveConversationLanguage('makale acilmiyor', 'en', 'en'), 'tr');
  assert.equal(resolveConversationLanguage('the article is not enough', 'tr', 'tr'), 'en');
  assert.equal(resolveConversationLanguage('المقالة لا تفتح', 'en', 'en'), 'ar');
  assert.equal(resolveConversationLanguage('...', 'tr', 'en'), 'tr');
  assert.equal(resolveConversationLanguage('123', 'ar', 'en'), 'ar');
  assert.equal(resolveConversationLanguage('Web Chatbot', 'tr', 'en'), 'tr');
  assert.equal(resolveConversationLanguage('AI Guide', 'tr', 'en'), 'tr');
  assert.equal(resolveConversationLanguage('https://samche.ai/help', 'tr', 'en'), 'tr');
  for (const input of ['destek', 'yardim', 'calismiyor', 'gorsel uretmiyor', 'kac resim', 'sayi']) assert.equal(resolveConversationLanguage(input, 'en', 'en'), 'tr');
});

test('ASCII Turkish support wording keeps network recovery in Turkish', async () => {
  const state = createInitialSalesState();
  const userMessage = { role: 'user', text: 'destek', time: '10:00' };
  const stateCandidate = generateSalesTurn(state, userMessage.text, [], 'tr');
  const resolved = await resolveSalesChatTurn({ state, stateCandidate, messages: [], userMessage, locale: 'en', conversationLanguage: 'tr', time: '10:01', apiBaseUrl: '', fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal(resolved.messages.at(-1).language, 'tr');
  assert.match(resolved.messages.at(-1).text, /Doğrulanmış|inceleme|destek|sorun/u);
});

test('network HTTP malformed JSON and timeout recoveries retain the prior language for a neutral latest message', async () => {
  const failures = [
    async () => { throw new Error('offline'); },
    async () => ({ ok: false, status: 504 }),
    async () => ({ ok: true, json: async () => { throw new SyntaxError('bad json'); } }),
    async () => { const error = new Error('timeout'); error.name = 'AbortError'; throw error; },
  ];
  for (const fetchImpl of failures) {
    const state = createInitialSalesState();
    const userMessage = { role: 'user', text: '...', time: '10:00' };
    const stateCandidate = generateSalesTurn(state, userMessage.text, [], 'tr');
    const resolved = await resolveSalesChatTurn({
      state, stateCandidate, messages: [{ role: 'assistant', text: 'WhatsApp kanalını inceleyelim.', articleRefs: ['whatsapp-ai-not-replying'], language: 'tr' }],
      userMessage, locale: 'en', conversationLanguage: 'tr', time: '10:01', apiBaseUrl: '', fetchImpl,
    });
    const assistant = resolved.messages.at(-1);
    assert.equal(assistant.language, 'tr');
    assert.match(assistant.text, /sorununu|hata metni|ekran görüntüsü/u);
    assert.doesNotMatch(assistant.text, INTERNAL_SUPPORT_LEAK);
    assert.deepEqual(assistant.articleRefs, ['whatsapp-ai-not-replying']);
  }
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
  assert.deepEqual(resolved.messages.at(-1).articleRefs, ['whatsapp-ai-not-replying']);
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
  assert.match(source, /getSalesProcessingStatus\(userText, salesStateRef\.current, turnLanguage\)/);
  assert.match(source, /siteLocale: locale, conversationLanguage/);
  assert.match(source, /resolveConversationLanguage\(userText, previousConversationLanguage, locale\)/);
  assert.match(source, /conversationLanguage: turnLanguage/);
  assert.match(source, /setMessages\(\(current\) => \[\.\.\.current, userMessage\]\)/);
  assert.match(source, /requestAnimationFrame|setInterval|setTimeout/);
  assert.match(source, /getPublishedArticlePresentation/);
  assert.match(source, /stripHelpArticleLinks/);
  assert.match(source, /token\.type === 'link'/);
  assert.match(source, /InternalLink[\s\S]{0,220}article\.url/);
  assert.match(source, /İlgili yardım makaleleri/);
  assert.match(source, /\.\.\.new Set\(message\.articleRefs \|\| \[\]\)/);
  assert.match(source, /className="samche-chat-messages"[^>]*data-no-translate/);
  assert.match(source, /samche:open-chat/);
  assert.doesNotMatch(source, /articleUrls\.get\(slug\)/);
});

test('grounded recovery covers verified dashboard modules with canonical routes or controls', () => {
  const cases = [
    ['Web Chatbot is not appearing', /Web Chat Experience|Channels/],
    ['Knowledge Intelligence source is stuck processing', /Knowledge Intelligence|processing|indexing/i],
    ['I cannot approve a knowledge candidate', /Knowledge Intelligence|candidate|approv/i],
    ['Shared Inbox conversation is missing', /Conversations|Shared Inbox|channel/i],
    ['CRM lead is missing', /Leads|lead/i],
    ['Pipeline deal will not move', /Pipeline|stage/i],
    ['Team member cannot change the channel', /Team|permission|role/i],
    ['Billing usage looks wrong', /Settings|billing|usage|Support/i],
  ];
  for (const [input, expected] of cases) {
    const recovery = buildGroundedSupportRecovery({ language: 'en', input, messages: [] });
    assert.match(recovery.reply, expected, input);
    assert.ok(recovery.reply.length > 80, input);
    assert.ok(recovery.articleRefs.every((slug) => getPublishedArticleUrl(slug, 'en')), input);
    assert.doesNotMatch(recovery.reply, /please try again|check your channel connection and workspace configuration/i, input);
  }
});

test('grounded recovery states implementation-managed and unverified boundaries without fake controls', () => {
  for (const input of ['Where is the Integrations settings menu?', 'Where is the AI Visual enable toggle?', 'Where is the AI Voice provider status?']) {
    const recovery = buildGroundedSupportRecovery({ language: 'en', input, messages: [] });
    assert.match(recovery.reply, /Dashboard does not include|exact error|screenshot/i, input);
    assert.doesNotMatch(recovery.reply, INTERNAL_SUPPORT_LEAK, input);
    assert.doesNotMatch(recovery.reply, /open (?:the )?(?:Integrations|AI Visual|AI Voice) (?:settings|menu)|enable toggle|provider status is connected/i, input);
  }
});

test('insufficient article recovery expands the prior article and related verified guidance', () => {
  const recovery = buildGroundedSupportRecovery({
    language: 'en', input: 'The article is not enough, explain in more detail',
    messages: [{ role: 'assistant', text: 'Use the guide.', articleRefs: ['knowledge-document-upload-failed'] }],
  });
  assert.ok(recovery.articleRefs.includes('knowledge-document-upload-failed'));
  assert.match(recovery.reply, /1\.|2\.|processing|indexing/i);
  assert.doesNotMatch(recovery.reply, /\]\(\/help\/article\//);
});

test('screenshot recovery uses visible evidence without exposing grounding metadata', () => {
  const recovery = buildGroundedSupportRecovery({
    language: 'en', input: 'What should I do here?', attachment: true,
    messages: [{ role: 'user', text: 'WhatsApp is inactive', imageContext: true, imageSummary: 'Visible inactive channel warning', imageModule: 'WhatsApp AI' }],
  });
  assert.match(recovery.reply, /Visible|screenshot/i);
  assert.match(recovery.reply, /WhatsApp|Channels|Status/i);
  assert.match(recovery.reply, /exact error|screenshot/i);
  assert.doesNotMatch(recovery.reply, INTERNAL_SUPPORT_LEAK);
});

test('Arabic grounded recovery localizes navigation prose while preserving verified control names', () => {
  const recovery = buildGroundedSupportRecovery({ language: 'ar', input: 'واتساب لا يجيب والمقالة لا تفتح', messages: [] });
  assert.match(recovery.reply, /المسار|افتحوا|القناة/u);
  assert.doesNotMatch(recovery.reply, /\b(?:Open|select|choose|check)\b/i);
  assert.doesNotMatch(recovery.reply, /\b(?:requires|included|status is|assistant is)\b/i);
});

test('latest support message module wins over stale screenshot and conversation modules', () => {
  const recovery = buildGroundedSupportRecovery({
    language: 'en', input: 'The article is not enough. Give me detailed WhatsApp troubleshooting steps',
    messages: [{ role: 'assistant', text: 'AI Visual is implementation-managed', imageSummary: 'AI Visual generation error', imageModule: 'AI Visual', articleRefs: ['ai-visual-not-available'] }],
    state: { context: { imageModule: 'AI Visual', imageSummary: 'AI Visual generation error' } },
  });
  assert.match(recovery.reply, /WhatsApp|Channels/);
  assert.doesNotMatch(recovery.reply, /no verified customer-facing setting.*Visual/is);
  assert.ok(!recovery.articleRefs.includes('ai-visual-not-available'));
});

test('Turkish grounded recovery does not leak generic English implementation prose', () => {
  const recovery = buildGroundedSupportRecovery({ language: 'tr', input: 'WhatsApp makalesi açılmıyor', messages: [] });
  assert.match(recovery.reply, /WhatsApp|hata metni|ekran görüntüsü/u);
  assert.doesNotMatch(recovery.reply, /public chatbot|tenantı|provisioning/i);
  assert.doesNotMatch(recovery.reply, INTERNAL_SUPPORT_LEAK);
});
