import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLeadSummary, buildWhatsAppSalesUrl, createInitialSalesState, generateSalesTurn, getSalesInputLanguage, validateSalesReply, WHATSAPP_ICON_DIAGNOSTIC_MATRIX, WHATSAPP_SAFE_ICONS } from '../lib/samche-sales-assistant.mjs';
import { resolveSalesChatTurn } from '../lib/samche-sales-chat-client.mjs';

const userMessage = { role: 'user', text: 'We are a real estate company in Dubai.', time: '10:00 AM' };
const messages = [{ role: 'assistant', text: 'How can I help?', time: '9:59 AM' }];
const initialState = createInitialSalesState();
const stateCandidate = generateSalesTurn(initialState, userMessage.text, messages, 'en');
const validReply = {
  reply: 'I can help qualify your requirements.', intent: 'qualification', responseMode: 'qualification_answer',
  extractedFields: {}, requestedNextField: 'channels', actionIntent: [], resumePendingQuestion: true,
};

const finalUnsafeClaims = [
  "Your demo has been confirmed for tomorrow.",
  "We have sent an email confirming your demo.",
  "We've successfully booked your appointment.",
  "Our sales team has scheduled your meeting for tomorrow.",
  "The team has set a meeting for tomorrow.",
  "Your demo is on the calendar for tomorrow.",
  "Our team will book an appointment tomorrow.",
  "No problem, your demo is confirmed.",
  "I have not sent an email, but your demo has been booked.",
  "تم تأكيد موعد العرض التوضيحي غداً.",
  "لقد حجزنا موعدك غداً.",
  "سنرسل رسالة بريد إلكتروني لتأكيد موعد العرض.",
  "تم تحديد موعد العرض غداً.",
  "سيتم تحديد موعد العرض غداً.",
  "قام فريقنا بحجز اجتماعك غداً.",
  "موعدك مؤكد غداً.",
  "لا مشكلة، تم حجز موعد العرض.",
  "Evet, ürünlerimizi hemen teslim ediyoruz.",
  "Yarın saat 18:00 için demonuzu planlayacağım.",
  "Randevunuz onaylandı ve size bir onay e-postası göndereceğiz."
];
const finalSafeReplies = [
  "Your demo has not been confirmed.",
  "We have not booked your appointment.",
  "No appointment has been scheduled.",
  "We have not sent an email confirming your demo.",
  "Please share your preferred appointment time.",
  "Your preferred demo time is tomorrow.",
  "لم يتم تأكيد موعد العرض.",
  "لم نرسل بريداً إلكترونياً لتأكيد موعدك.",
  "يرجى مشاركة الوقت المفضل للعرض."
];

for (const reply of finalUnsafeClaims) {
  test(`final regression: frontend blocks ${reply}`, () => {
    assert.notEqual(validateSalesReply(reply), reply);
    for (const safeReply of finalSafeReplies) assert.equal(validateSalesReply(safeReply), safeReply);
  });
}

test('final regression: frontend rewrites Turkish unsafe claims safely', () => {
  const safe = validateSalesReply('Yarın saat 18:00 için demonuzu planlayacağım.', undefined, 'tr');
  assert.match(safe, /tercih|uygunluğ|satış ekib/i);
  assert.doesNotMatch(safe, /planlayacağım|onaylandı|göndereceğiz/i);
});


async function resolveWith(fetchImpl) {
  return resolveSalesChatTurn({ state: initialState, stateCandidate, messages, userMessage, locale: 'en', time: '10:01 AM', apiBaseUrl: 'https://api.example', fetchImpl });
}

function jsonResponse(body) {
  return { ok: true, status: 200, json: async () => body };
}

test('final regression: client accepts real backend interrupt and qualification responses', async () => {
  const { createSalesChatService } = await import('../server/sales-chat-service.mjs');
  for (const fields of [
    { intent: 'feature_question', responseMode: 'in_scope_interrupt', requestedNextField: 'leadQualification' },
    { intent: 'demo_question', responseMode: 'demo_interrupt', requestedNextField: 'channels' },
    { intent: 'sales', responseMode: 'qualification_answer', requestedNextField: null },
    { intent: 'pricing', responseMode: 'pricing_interrupt', requestedNextField: 'volume' },
    { intent: 'off_topic', responseMode: 'off_topic', requestedNextField: null },
  ]) {
    const body = { ...validReply, ...fields, extractedFields: { leadQualification: 'Required', channels: ['Website'], preferredDemoDate: 'Tomorrow', preferredDemoTime: '6:00 PM' } };
    const service = createSalesChatService({
      openaiClient: { chat: { completions: { create: async () => ({ choices: [{ message: { content: JSON.stringify(body) } }] }) } } },
      commercialFacts: { plans: [], products: [] },
    });
    const resolved = await resolveWith(async (_url, options) => {
      const result = await service.handle({ body: JSON.parse(options.body) });
      assert.equal(result.status, 200);
      return jsonResponse(result.body);
    });
    assert.equal(resolved.usedFallback, false, JSON.stringify(fields));
    assert.equal(resolved.state.lead.leadQualification, 'Required');
    assert.equal(resolved.state.lead.channels.includes('Website'), true);
  }
});

test('final regression: client accepts backend preferred-demo fields through the real service boundary', async () => {
  const { createSalesChatService } = await import('../server/sales-chat-service.mjs');
  const body = { ...validReply, extractedFields: { preferredDemoDate: 'Tomorrow', preferredDemoTime: '6:00 PM' } };
  const service = createSalesChatService({
    openaiClient: { chat: { completions: { create: async () => ({ choices: [{ message: { content: JSON.stringify(body) } }] }) } } },
    commercialFacts: { plans: [], products: [] },
  });
  const resolved = await resolveWith(async (_url, options) => jsonResponse((await service.handle({ body: JSON.parse(options.body) })).body));
  assert.equal(resolved.usedFallback, false);
  assert.equal(resolved.state.lead.preferredDemoDate, 'Tomorrow');
  assert.equal(resolved.state.lead.preferredDemoTime, '6:00 PM');
});

test('final regression: every required response key includes resumePendingQuestion', async () => {
  for (const key of ['resumePendingQuestion', 'reply', 'intent', 'responseMode', 'extractedFields', 'requestedNextField', 'actionIntent']) {
    const body = { ...validReply };
    delete body[key];
    const resolved = await resolveWith(async () => jsonResponse(body));
    assert.equal(resolved.usedFallback, false, key);
    assert.equal(resolved.providerFailed, true, key);
    assert.deepEqual(resolved.diagnostic, { source: 'contract', contractReason: 'missing-required-fields' });
  }
});

for (const [name, fields] of [
  ['unknown key', { meetingConfirmed: true }],
  ['array scalar', { channels: 'Website' }],
  ['array item', { products: [123] }],
  ['object value', { industry: { value: 'Retail' } }],
  ['number value', { volume: 2000 }],
  ['null value', { company: null }],
]) {
  test(`final regression: client rejects extracted ${name}`, async () => {
    const resolved = await resolveWith(async () => jsonResponse({ ...validReply, extractedFields: fields }));
    assert.equal(resolved.usedFallback, false);
    assert.equal(resolved.providerFailed, true);
    assert.deepEqual(resolved.state, initialState);
    assert.deepEqual(resolved.diagnostic, { source: 'provider', contractReason: 'invalid-response' });
  });
}

test('final regression: client rejects obsolete demo_request response mode', async () => {
  const resolved = await resolveWith(async () => jsonResponse({ ...validReply, responseMode: 'demo_request' }));
    assert.equal(resolved.usedFallback, false);
    assert.equal(resolved.providerFailed, true);
});

test('final regression: outbound demo mode matches backend contract', async () => {
  let sent;
  const input = { role: 'user', text: 'I want a demo', time: '10:00 AM' };
  await resolveSalesChatTurn({
    stateCandidate: generateSalesTurn(createInitialSalesState(), input.text), messages: [], userMessage: input,
    locale: 'en', time: '10:01 AM', apiBaseUrl: 'https://api.example',
    fetchImpl: async (_url, options) => { sent = JSON.parse(options.body); return jsonResponse(validReply); },
  });
  assert.equal(sent.responseMode, 'demo_interrupt');
});


test('client preserves state without adding a conversational reply for provider failures', async () => {
  const cases = [
    ['network', async () => { throw new Error('offline'); }, { source: 'network' }],
    ['http', async () => ({ ok: false, status: 503 }), { source: 'http', httpStatus: 503 }],
    ['malformed JSON', async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad JSON'); } }), { source: 'contract', contractReason: 'malformed-json' }],
    ['missing contract field', async () => {
      const missingRequestedNextField = { ...validReply };
      delete missingRequestedNextField.requestedNextField;
      return jsonResponse(missingRequestedNextField);
    }, { source: 'contract', contractReason: 'missing-required-fields' }],
  ];

  for (const [name, fetchImpl, diagnostic] of cases) {
    const resolved = await resolveWith(fetchImpl);
    assert.equal(resolved.usedFallback, false, name);
    assert.equal(resolved.providerFailed, true, name);
    assert.deepEqual(resolved.diagnostic, diagnostic, name);
    assert.deepEqual(resolved.state, initialState, name);
    assert.deepEqual(resolved.actions, [], name);
    assert.deepEqual(resolved.messages, [...messages, userMessage], name);
    assert.equal(resolved.retryMessage, 'AI response is unavailable right now. Please try again.', name);
    assert.equal(resolved.messages.some((message) => message.text === resolved.retryMessage), false, name);
  }
});

test('client rejects invalid provider replies without generating a conversational fallback', async () => {
  const cases = [
    ['intent', { ...validReply, intent: 'COLD' }],
    ['response mode', { ...validReply, responseMode: 'anything_else' }],
    ['requested field', { ...validReply, requestedNextField: 'untrustedField' }],
    ['action', { ...validReply, actionIntent: ['DELETE_LEAD'] }],
  ];

  for (const [name, response] of cases) {
    const resolved = await resolveWith(async () => jsonResponse(response));
    assert.equal(resolved.usedFallback, false, name);
    assert.deepEqual(resolved.diagnostic, { source: 'provider', contractReason: 'invalid-response' }, name);
    assert.deepEqual(resolved.state, initialState, name);
    assert.deepEqual(resolved.messages, [...messages, userMessage], name);
    assert.equal(resolved.providerFailed, true, name);
  }
});

test('client preserves a valid provider response without a transient retry message', async () => {
  const resolved = await resolveWith(async () => jsonResponse(validReply));
  assert.equal(resolved.usedFallback, false);
  assert.equal(resolved.retryMessage, '');
  assert.equal(resolved.messages.at(-1).text, validReply.reply);
});

test('Turkish input is detected independently of the selected locale', () => {
  assert.equal(getSalesInputLanguage('urunleri hemen teslim ediyor musunuz?'), 'tr');
  assert.equal(getSalesInputLanguage('danismanlik'), 'tr');
  assert.equal(getSalesInputLanguage('Which plan is right for us?'), 'en');
});

test('WhatsApp summary contains only selected BMP-safe replacement icons', () => {
  const summary = buildLeadSummary(createInitialSalesState().lead);
  assert.equal(summary.includes('�'), false);
  for (const icon of WHATSAPP_SAFE_ICONS) assert.equal(summary.includes(icon), true);
  for (const icon of ['🤖', '👤', '🎯', '💬', '🧩', '🌐', '🔌', '📊', '📦', '🗓️', '👥']) {
    assert.equal(summary.includes(icon), false, `supplementary-plane icon remains: ${icon}`);
  }
});

test('WhatsApp diagnostic matrix records BMP codepoints and encoded transport', () => {
  assert.equal(WHATSAPP_ICON_DIAGNOSTIC_MATRIX.length, 11);
  for (const entry of WHATSAPP_ICON_DIAGNOSTIC_MATRIX) {
    assert.match(entry.codePoint, /^U\+[0-9A-F]{4,6}( U\+[0-9A-F]{4,6})?$/);
    assert.equal(entry.encoded, encodeURIComponent(entry.icon));
    assert.equal(entry.previewResult, 'PASS');
    assert.equal(entry.icon.codePointAt(0) <= 0xffff, true);
  }
  const url = buildWhatsAppSalesUrl(createInitialSalesState().lead);
  assert.equal(new URL(url).pathname, '/971506941372');
  assert.equal(decodeURIComponent(new URL(url).searchParams.get('text')).includes('�'), false);
});
