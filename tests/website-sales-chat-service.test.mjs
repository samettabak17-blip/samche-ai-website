import test from 'node:test';
import assert from 'node:assert/strict';
import * as salesChat from '../server/sales-chat-service.mjs';

for (const reply of [
  "Your demo has been confirmed for tomorrow.",
  "We have sent an email confirming your demo.",
  "We've successfully booked your appointment.",
  "Our sales team has scheduled your meeting for tomorrow.",
  "The team has set a meeting for tomorrow.",
  "Your demo is on the calendar for tomorrow.",
  "Our team will book an appointment tomorrow.",
  "No problem, your demo has been confirmed.",
  "I have not sent an email, but your demo has been booked.",
  "تم تأكيد موعد العرض التوضيحي غداً.",
  "لقد حجزنا موعدك غداً.",
  "سنرسل رسالة بريد إلكتروني لتأكيد موعد العرض.",
  "تم تحديد موعد العرض غداً.",
  "سيتم تحديد موعد العرض غداً.",
  "قام فريقنا بحجز اجتماعك غداً.",
  "موعدك مؤكد غداً.",
  "لا مشكلة، تم حجز موعد العرض."
]) {
  test(`final regression: backend blocks ${reply}`, () => {
    assert.notEqual(salesChat.sanitizeSalesReply(reply), reply);
    for (const safeReply of ["Your demo has not been confirmed.","We have not booked your appointment.","No appointment has been scheduled.","We have not sent an email confirming your demo.","Please share your preferred appointment time.","Your preferred demo time is tomorrow.","لم يتم تأكيد موعد العرض.","لم نرسل بريداً إلكترونياً لتأكيد موعدك.","يرجى مشاركة الوقت المفضل للعرض."]) assert.equal(salesChat.sanitizeSalesReply(safeReply), safeReply);
  });
}

for (const [reason, override] of [
  ['invalid_intent', { intent: 'synthetic.person@example.com' }],
  ['invalid_response_mode', { responseMode: 'synthetic.person@example.com' }],
  ['invalid_next_field', { requestedNextField: 'synthetic.person@example.com' }],
  ['invalid_action', { actionIntent: ['synthetic.person@example.com'] }],
  ['unsupported_field', { extractedFields: { 'synthetic.person@example.com': 'secret' } }],
]) {
  test(`final regression: staging diagnostics redact ${reason}`, async () => {
    const logs = [];
    const service = createSalesChatService({
      openaiClient: providerWith(JSON.stringify({
        reply: 'Tell me about your business.', intent: 'qualification', responseMode: 'qualification_answer',
        resumePendingQuestion: true, extractedFields: {}, requestedNextField: null, actionIntent: [], ...override,
      })),
      commercialFacts, environment: { NODE_ENV: 'staging' }, logger: { warn: (...args) => logs.push(args) },
    });
    const result = await service.handle({ body: requestBody() });
    assert.equal(result.status, 200);
    assert.deepEqual(logs, [
      ['sales_chat_validation_failed', { reason }],
      ['sales_chat_provider_salvaged', { category: 'validator', stage: 'optional_metadata', reason }],
    ]);
    assert.doesNotMatch(JSON.stringify(logs), /synthetic\.person@example\.com|secret/);
  });
}


const { createSalesChatRateLimiter, createSalesChatService, validateSalesLlmOutput } = salesChat;

const commercialFacts = {
  plans: [
    { slug: 'growth', name: 'GROWTH', monthly: 3990, setup: 5000, yearly: 40698, interactions: '20,000', features: ['Web Chatbot + WhatsApp AI', 'Up to 5 Team Users'] },
  ],
  products: [
    { name: 'Web Chatbot', status: 'Available' },
    { name: 'WhatsApp AI', status: 'Available' },
    { name: 'AI Guide', status: 'Available' },
  ],
};

function providerWith(content) {
  return { chat: { completions: { create: async () => ({ choices: [{ message: { content } }] }) } } };
}

function requestBody(overrides = {}) {
  return {
    locale: 'en', conversationHistory: [], leadState: {}, qualificationStage: 'discovery',
    pendingQualificationField: 'industry', lastPendingQuestion: 'What type of business do you operate?',
    recommendedPlan: '', userMessage: 'I run a real estate company in Dubai.', ...overrides,
  };
}

test('support intent takes priority for existing customers without restarting sales qualification', async () => {
  const service = createSalesChatService({ openaiClient: providerWith(JSON.stringify({
    reply: 'Please tell me your industry.', intent: 'qualification', responseMode: 'qualification_answer',
    resumePendingQuestion: true, extractedFields: {}, requestedNextField: 'industry', actionIntent: [],
  })), commercialFacts });
  const result = await service.handle({ body: requestBody({ userMessage: 'We already use SamChe AI and our WhatsApp AI stopped replying.' }) });
  assert.equal(result.status, 200);
  assert.equal(result.body.intent, 'support');
  assert.equal(result.body.responseMode, 'support');
  assert.match(result.body.reply, /WhatsApp AI|replying|connection|configuration/i);
  assert.doesNotMatch(result.body.reply, /tell me your industry|what type of business|leads per month/i);
});

test('validates transient screenshot bytes and routes only image turns to the vision model', async () => {
  assert.deepEqual(salesChat.validateChatAttachment({ mimeType: 'image/png', data: 'iVBORw0KGgo=' }), { ok: true, mimeType: 'image/png' });
  assert.equal(salesChat.validateChatAttachment({ mimeType: 'image/png', data: 'bm90LWEtcG5n' }).ok, false);
  let request;
  const service = createSalesChatService({ openaiClient: { chat: { completions: { create: async (payload) => {
    request = payload;
    return { choices: [{ message: { content: JSON.stringify({ reply: 'The screenshot appears to show a SamChe AI configuration issue. Check the channel connection and share any error text.', intent: 'support', responseMode: 'support', resumePendingQuestion: false, extractedFields: {}, requestedNextField: null, actionIntent: [] }) } }] };
  } } } }, commercialFacts });
  const result = await service.handle({ body: requestBody({ userMessage: 'My SamChe Web Chatbot is not loading.', attachment: { mimeType: 'image/png', data: 'iVBORw0KGgo=' } }) });
  assert.equal(result.status, 200);
  assert.equal(request.model, 'gpt-4o');
  assert.equal(request.messages[1].content[1].type, 'image_url');
});

test('server support recovery uses verified module guidance instead of a generic channel fallback', async () => {
  const service = createSalesChatService({ openaiClient: providerWith(JSON.stringify({
    reply: 'Please check your channel connection and workspace configuration.', intent: 'qualification', responseMode: 'qualification_answer',
    resumePendingQuestion: false, extractedFields: {}, requestedNextField: null, actionIntent: [],
  })), commercialFacts });
  const result = await service.handle({ body: requestBody({
    userMessage: 'My Knowledge Intelligence source is stuck processing.',
    pendingQualificationField: null, lastPendingQuestion: '',
  }) });
  assert.equal(result.status, 200);
  assert.match(result.body.reply, /Knowledge Intelligence|processing|indexing/i);
  assert.doesNotMatch(result.body.reply, /check your channel connection and workspace configuration/i);
  assert.ok(result.body.articleRefs.every((slug) => typeof slug === 'string' && slug.length > 0));
});

test('support boundary rejects provider metadata leakage and preserves Instagram follow-up context', async () => {
  const service = createSalesChatService({ openaiClient: providerWith(JSON.stringify({
    reply: 'Verified route: /app/:tenantId/settings. Boundary: Still needs investigation.',
    intent: 'support', responseMode: 'support', resumePendingQuestion: false,
    extractedFields: {}, requestedNextField: null, actionIntent: [], articleRefs: [],
  })), commercialFacts });
  const result = await service.handle({ body: requestBody({
    locale: 'tr', inputLanguage: 'tr', responseMode: 'support', detectedIntent: 'support',
    userMessage: 'bağlanılamadı uyarısı alıyorum', pendingQualificationField: null, lastPendingQuestion: '',
    conversationHistory: [
      { role: 'user', text: 'Instagram mesajlarımı SamChe Dashboard üzerinden yönetebilir miyim?' },
      { role: 'assistant', text: 'Instagram bağlantısında ne gördüğünüzü paylaşın.' },
    ],
  }) });
  assert.equal(result.status, 200);
  assert.match(result.body.reply, /Instagram/iu);
  assert.match(result.body.reply, /bağlan|bağlantı/iu);
  assert.match(result.body.reply, /hata metni|ekran görüntüsü/iu);
  assert.doesNotMatch(result.body.reply, /verified|registry|boundary|tenantId|\/app\/|still needs investigation|implementation|roadmap|Doğrulanmış|Sınır/iu);
  assert.ok(result.body.articleRefs.every((slug) => slug.startsWith('instagram-dm-ai')));
});

test('Instagram first turn cannot inherit an unsupported capability claim from the provider', async () => {
  const service = createSalesChatService({ openaiClient: providerWith(JSON.stringify({
    reply: 'You can manage Instagram messages in Conversations and transfer them to your team.',
    intent: 'support', responseMode: 'support', resumePendingQuestion: false,
    extractedFields: {}, requestedNextField: null, actionIntent: [], articleRefs: ['conversation-missing-from-inbox'],
  })), commercialFacts });
  const result = await service.handle({ body: requestBody({
    locale: 'en', inputLanguage: 'en', responseMode: 'in_scope_interrupt', detectedIntent: 'product_question',
    userMessage: 'Can I manage my Instagram messages through the SamChe Dashboard?',
    pendingQualificationField: null, lastPendingQuestion: '', conversationHistory: [],
  }) });
  assert.equal(result.status, 200);
  assert.match(result.body.reply, /Instagram/i);
  assert.match(result.body.reply, /Channels|Connect Instagram|Test Connection/i);
  assert.doesNotMatch(result.body.reply, /manage Instagram messages in Conversations|transfer them/i);
  assert.doesNotMatch(result.body.reply, /verified|registry|boundary|tenant|\/app\/|implementation|roadmap/i);
  assert.ok(result.body.articleRefs.length > 0);
  assert.ok(result.body.articleRefs.every((slug) => slug.startsWith('instagram-dm-ai')));
});

test('internal metadata cannot bypass the boundary through a non-support request mode', async () => {
  const service = createSalesChatService({ openaiClient: providerWith(JSON.stringify({
    reply: 'The verified route is /app/:tenantId/channels.',
    intent: 'support', responseMode: 'support', resumePendingQuestion: false,
    extractedFields: {}, requestedNextField: null, actionIntent: [], articleRefs: [],
  })), commercialFacts });
  const result = await service.handle({ body: requestBody({
    userMessage: 'Where can I find Channels?', responseMode: 'qualification_answer', detectedIntent: 'product_question',
  }) });
  assert.equal(result.status, 502);
  assert.doesNotMatch(JSON.stringify(result.body), /verified route|tenantId|\/app\//i);
});

test('support rejects raw classifications entitlement keys invented controls and unrelated article refs', async () => {
  for (const reply of [
    'The classification is implemented_customer_accessible with entitlement key whatsapp_ai.',
    'Open Channels in the Dashboard and click Repair Everything to restore the connection.',
  ]) {
    const service = createSalesChatService({ openaiClient: providerWith(JSON.stringify({
      reply, intent: 'support', responseMode: 'support', resumePendingQuestion: false,
      extractedFields: {}, requestedNextField: null, actionIntent: [], articleRefs: ['pipeline-deals'],
    })), commercialFacts });
    const result = await service.handle({ body: requestBody({
      userMessage: 'My WhatsApp AI is not replying', responseMode: 'support', detectedIntent: 'support',
    }) });
    assert.equal(result.status, 200);
    assert.doesNotMatch(result.body.reply, /implemented_customer_accessible|entitlement key|Repair Everything/i);
    assert.ok(result.body.articleRefs.every((slug) => slug.startsWith('whatsapp')));
  }
});

test('bare multilingual greetings rewrite multiple provider questions to one general Sales & Support question', async () => {
  for (const [userMessage, reply] of [
    ['Hello', 'Hello! How can I help with SamChe AI today? What type of business do you operate?'],
    ['Merhaba', 'Merhaba! SamChe AI ile nasıl yardımcı olabilirim? Ne tür bir işletme işletiyorsunuz?'],
    ['مرحبا', 'مرحباً! كيف يمكنني مساعدتكم في SamChe AI؟ ما نوع نشاطكم التجاري؟'],
  ]) {
    const service = createSalesChatService({ openaiClient: providerWith(JSON.stringify({
      reply, intent: 'sales', responseMode: 'qualification_answer', resumePendingQuestion: false, extractedFields: {}, requestedNextField: null, actionIntent: [],
    })), commercialFacts });
    const result = await service.handle({ body: requestBody({ userMessage, conversationHistory: [], pendingQualificationField: null, lastPendingQuestion: '' }) });
    assert.equal(result.status, 200, userMessage);
    assert.equal(result.body.responseMode, 'qualification_answer', userMessage);
    assert.equal((result.body.reply.match(/[?؟]/g) || []).length, 1, userMessage);
    assert.match(result.body.reply, /SamChe AI/i, userMessage);
    assert.doesNotMatch(result.body.reply, /business|işletme|نشاط|volume|hacim|حجم/i, userMessage);
    assert.equal(result.body.requestedNextField, null, userMessage);
  }
});

test('a malformed greeting contract safely salvages to the one-question welcome', async () => {
  const service = createSalesChatService({ openaiClient: providerWith(JSON.stringify({
    reply: 'Hello! How can I help with SamChe AI today?', intent: 'greeting', responseMode: 'greeting', resumePendingQuestion: false, extractedFields: {}, requestedNextField: null, actionIntent: [],
  })), commercialFacts });
  const result = await service.handle({ body: requestBody({ userMessage: 'Hello', conversationHistory: [], pendingQualificationField: null, lastPendingQuestion: '' }) });
  assert.equal(result.status, 200);
  assert.equal((result.body.reply.match(/[?؟]/g) || []).length, 1);
  assert.equal(result.body.requestedNextField, null);
});

test('text model routing is independent from the vision model configuration', async () => {
  const models = [];
  const service = createSalesChatService({
    textModel: 'gpt-4o-mini', visionModel: 'invalid-vision-model', commercialFacts,
    openaiClient: { chat: { completions: { create: async (payload) => {
      models.push(payload.model);
      return { choices: [{ message: { content: JSON.stringify({ reply: 'Hello. What type of business do you operate?', intent: 'qualification', responseMode: 'qualification_answer', resumePendingQuestion: false, extractedFields: {}, requestedNextField: 'industry', actionIntent: [] }) } }] };
    } } } },
  });
  const result = await service.handle({ body: requestBody({ userMessage: 'Hello', conversationHistory: [], pendingQualificationField: null, lastPendingQuestion: '' }) });
  assert.equal(result.status, 200);
  assert.deepEqual(models, ['gpt-4o-mini']);
});

test('an invalid vision model affects only an image turn', async () => {
  const service = createSalesChatService({
    textModel: 'gpt-4o-mini', visionModel: 'invalid-vision-model', commercialFacts,
    openaiClient: { chat: { completions: { create: async (payload) => {
      if (payload.model === 'invalid-vision-model') {
        const error = new Error('provider_http_404');
        error.salesChatDiagnostic = { category: 'provider_http', status: 404, model: payload.model, type: 'invalid_request_error', code: 'model_not_found' };
        throw error;
      }
      return { choices: [{ message: { content: JSON.stringify({ reply: 'Hello. What type of business do you operate?', intent: 'qualification', responseMode: 'qualification_answer', resumePendingQuestion: false, extractedFields: {}, requestedNextField: 'industry', actionIntent: [] }) } }] };
    } } } },
  });
  const textResult = await service.handle({ body: requestBody({ userMessage: 'Hello', conversationHistory: [], pendingQualificationField: null, lastPendingQuestion: '' }) });
  const imageResult = await service.handle({ body: requestBody({ userMessage: 'Please review this screenshot.', attachment: { mimeType: 'image/png', data: 'iVBORw0KGgo=' } }) });
  assert.equal(textResult.status, 200);
  assert.equal(imageResult.status, 503);
});

test('rewrites unavailable scheduling and email confirmation claims to preference-only availability', () => {
  for (const reply of [
    'Your demo is confirmed tomorrow at 18:00. You will receive an email confirmation.',
    'Your demo is set for tomorrow.',
    'I have sent your confirmation email.',
    'I scheduled your demo.',
    'We booked your appointment.',
    'I will send a confirmation email.',
  ]) {
    const result = salesChat.sanitizeSalesReply(reply);
    assert.match(result, /preferred demo time/i);
    assert.match(result, /confirm availability/i);
    assert.doesNotMatch(result, /confirmed|scheduled|booked|set for|sent your confirmation email|send a confirmation email|email confirmation/i);
  }
});

test('preserves safe denials and preferences during sales reply sanitization', () => {
  for (const reply of ['I cannot confirm an appointment.', 'Please share your preferred appointment time.']) {
    assert.equal(salesChat.sanitizeSalesReply(reply), reply);
  }
});

test('ignores client capability overrides in provider context', async () => {
  const service = createSalesChatService({
    openaiClient: providerWith(JSON.stringify({
      reply: 'Tell me about your business.', intent: 'qualification', extractedFields: {},
      requestedNextField: 'industry', actionIntent: [], responseMode: 'qualification_answer', resumePendingQuestion: true,
    })), commercialFacts,
  });
  const result = await service.handle({ body: requestBody({ actionCapabilities: { canConfirmAppointment: true } }) });
  assert.equal(result.context.capabilities.canConfirmAppointment, false);
});

test('sanitizes unsafe claims from interrupt responses and removes action intent', async () => {
  const service = createSalesChatService({
    openaiClient: providerWith(JSON.stringify({
      reply: 'Your demo is booked for tomorrow.', intent: 'demo_question', extractedFields: {},
      requestedNextField: null, actionIntent: ['REQUEST_DEMO'], responseMode: 'demo_interrupt', resumePendingQuestion: true,
    })), commercialFacts,
  });
  const result = await service.handle({ body: requestBody({ responseMode: 'demo_interrupt', userMessage: 'Book a demo.' }) });
  assert.match(result.body.reply, /preferred demo time|confirm availability/i);
  assert.match(result.body.reply, /What type of business do you operate\?/i);
  assert.equal(result.body.resumePendingQuestion, true);
  assert.deepEqual(result.body.actionIntent, []);
});

test('rewrites future-tense and Arabic scheduling or email promises', () => {
  for (const unsafe of [
    'We will schedule your demo tomorrow.',
    'We will confirm your appointment tomorrow.',
    'We will email you a confirmation.',
    'Would you like to proceed with setting up a demo tomorrow at 18:00?',
    'Shall we proceed with scheduling your demo for tomorrow at 18:00?',
    'سنحدد موعد العرض غداً.',
    'سيقوم فريقنا بجدولة اجتماعك غداً.',
  ]) {
    const safe = salesChat.sanitizeSalesReply(unsafe);
    assert.notEqual(safe, unsafe, unsafe);
    assert.doesNotMatch(safe, /\b(?:will|going to)\s+(?:schedule|book|email)\b|\b(?:will|going to)\s+confirm(?!\s+availability)\b|(?:demo|appointment|meeting).{0,40}(?:scheduled|booked|confirmed)|(?:سنحدد|بجدولة|تأكيد موعد|حجز موعد)/i);
  }
});

test('rewrites Turkish future scheduling promises to preference-only language', () => {
  for (const unsafe of [
    'Yarın saat 18:00 için demonuzu planlayacağım.',
    'Randevunuzu oluşturacağım ve onaylayacağım.',
    'Demo planlandı, yarın görüşürüz.',
    'Randevunuz onaylandı.',
    'Yarın size bir onay e-postası göndereceğiz.',
  ]) {
    const safe = salesChat.sanitizeSalesReply(unsafe, undefined, 'tr');
    assert.notEqual(safe, unsafe, unsafe);
    assert.match(safe, /tercih|uygunluğ|satış ekib/i, unsafe);
    assert.doesNotMatch(safe, /planlayacağım|oluşturacağım|planlandı|onaylandı|göndereceğiz|rezervasyon/i, unsafe);
  }
});

test('rewrites Turkish physical-delivery claims to SaaS implementation language', () => {
  const unsafe = 'Evet, ürünlerimizi hemen teslim ediyoruz. Şimdi, iş türünüz hakkında daha fazla bilgi verebilir misiniz?';
  const safe = salesChat.sanitizeSalesReply(unsafe, undefined, 'tr');
  assert.notEqual(safe, unsafe);
  assert.match(safe, /fiziksel bir ürün değil|kurulum|devreye alma/i);
  assert.doesNotMatch(safe, /hemen teslim|stok|kargo|gönder/i);
});

test('server uses the latest Turkish language for unsafe product and demo replies', async () => {
  const cases = [
    ['Ürünleri hemen teslim ediyor musunuz?', 'Evet, ürünlerimizi hemen teslim ediyoruz.', /fiziksel bir ürün değil|kurulum|devreye alma/i],
    ['Yarın saat 18:00 demo istiyorum', 'Yarın saat 18:00 için demonuzu planlayacağım.', /tercih|uygunluğ|satış ekib/i],
  ];
  for (const [userMessage, reply, expected] of cases) {
    const service = createSalesChatService({
      openaiClient: providerWith(JSON.stringify({
        reply, intent: 'product_question', extractedFields: {}, requestedNextField: 'industry',
        actionIntent: [], responseMode: 'in_scope_interrupt', resumePendingQuestion: true,
      })), commercialFacts,
    });
    const result = await service.handle({ body: requestBody({
      locale: 'en', userMessage, responseMode: 'in_scope_interrupt', detectedIntent: 'product_question',
      inputLanguage: 'tr', pendingQualificationField: 'industry', lastPendingQuestion: 'What type of business do you operate?',
    }) });
    assert.equal(result.status, 200);
    assert.match(result.body.reply, expected, userMessage);
    assert.doesNotMatch(result.body.reply, /teslim ediyoruz|planlayacağım|onaylandı|scheduled|booked|confirmed/i, userMessage);
  }
});

test('server localizes an unusable Turkish product response instead of returning an English fallback', async () => {
  const service = createSalesChatService({
    openaiClient: providerWith(JSON.stringify({
      reply: 'SamChe AI can answer common questions.', intent: 'product_question', extractedFields: {}, requestedNextField: 'industry',
      actionIntent: [], responseMode: 'in_scope_interrupt', resumePendingQuestion: true,
    })), commercialFacts,
  });
  const result = await service.handle({ body: requestBody({
    locale: 'en', userMessage: 'Ürünleri hemen teslim ediyor musunuz?', responseMode: 'in_scope_interrupt', detectedIntent: 'product_question', inputLanguage: 'tr',
  }) });
  assert.equal(result.status, 200);
  assert.match(result.body.reply, /SamChe AI|fiziksel|kurulum|teslim/i);
  assert.doesNotMatch(result.body.reply, /^SamChe AI can answer common questions/i);
});

test('does not classify English AI product questions as Turkish', async () => {
  const service = createSalesChatService({
    openaiClient: providerWith(JSON.stringify({
      reply: 'AI Guide provides a guided product experience.', intent: 'feature_question', extractedFields: {}, requestedNextField: 'languages',
      actionIntent: [], responseMode: 'in_scope_interrupt', resumePendingQuestion: true,
    })), commercialFacts,
  });
  const result = await service.handle({ body: requestBody({
    locale: 'en', userMessage: 'How does AI Guide work?', responseMode: 'in_scope_interrupt', detectedIntent: 'product_question',
  }) });
  assert.equal(result.context.inputLanguage, 'en');
  assert.match(result.body.reply, /AI Guide/);
});

test('does not return provider-selected actions for usable interrupt responses', async () => {
  const service = createSalesChatService({
    openaiClient: providerWith(JSON.stringify({
      reply: 'SamChe AI supports first-response work while human sales staff remain important for languages and closing.',
      intent: 'capability_question', extractedFields: {}, requestedNextField: 'languages',
      actionIntent: ['REQUEST_DEMO', 'WHATSAPP_HANDOFF'], responseMode: 'capability_interrupt', resumePendingQuestion: true,
    })), commercialFacts,
  });
  const result = await service.handle({ body: requestBody({
    responseMode: 'capability_interrupt', userMessage: 'Can this AI replace staff?',
    pendingQualificationField: 'languages', lastPendingQuestion: 'Which languages do you need?',
  }) });
  assert.deepEqual(result.body.actionIntent, []);
});

test('builds bounded context from server-owned commercial facts and returns validated output', async () => {
  const service = createSalesChatService({
    openaiClient: providerWith(JSON.stringify({
      reply: 'Which channels bring you the most enquiries?', intent: 'qualification', extractedFields: {},
      requestedNextField: 'channels', actionIntent: [], responseMode: 'qualification_answer', resumePendingQuestion: true,
    })), commercialFacts,
  });
  const result = await service.handle({ body: requestBody({ approvedPlanFacts: [{ slug: 'business', monthly: 1 }], leadState: { industry: 'Real Estate' } }) });
  assert.equal(result.status, 200);
  assert.equal(result.body.requestedNextField, 'channels');
  assert.equal(result.context.approvedPlanFacts[0].monthly, 3990);
  assert.equal(result.context.approvedPlanFacts[0].slug, 'growth');
  assert.equal(result.context.leadState.industry, 'Real Estate');
});

test('passes known fields, last question, and next useful field to the sales provider', async () => {
  let request;
  const service = createSalesChatService({
    openaiClient: { chat: { completions: { create: async (payload) => {
      request = payload;
      return { choices: [{ message: { content: JSON.stringify({
        reply: 'That makes sense. SamChe AI can support both your website and WhatsApp from one platform. Roughly how many customer enquiries do you receive in a typical month?',
        intent: 'qualification', responseMode: 'qualification_answer', resumePendingQuestion: true,
        extractedFields: {}, requestedNextField: 'volume', actionIntent: [],
      }) } }] };
    } } } },
    commercialFacts,
  });
  const result = await service.handle({ body: requestBody({
    userMessage: 'We get leads from our website and WhatsApp.',
    leadState: { industry: 'Real Estate', country: 'United Arab Emirates', channels: ['Website', 'WhatsApp'] },
    pendingQualificationField: 'volume',
    lastPendingQuestion: 'Roughly how many customer enquiries do you receive in a typical month?',
    lastQuestion: 'Where do most customer enquiries arrive today: your website, WhatsApp, or both?',
  }) });
  assert.equal(result.status, 200);
  const context = JSON.parse(request.messages[1].content);
  assert.equal(context.inputLanguage, 'en');
  assert.equal(context.lastQuestion, 'Where do most customer enquiries arrive today: your website, WhatsApp, or both?');
  assert.deepEqual(context.knownFields.sort(), ['channels', 'country', 'industry'].sort());
  assert.equal(context.nextUsefulField, 'volume');
  assert.match(request.messages[0].content, /never repeat|already known/i);
});

test('rejects provider output with unsupported commercial claims without exposing provider details', async () => {
  const service = createSalesChatService({
    openaiClient: providerWith(JSON.stringify({
      reply: 'Growth is free and unlimited at AED 1,000.', intent: 'pricing', extractedFields: {},
      requestedNextField: null, actionIntent: [], responseMode: 'pricing_interrupt', resumePendingQuestion: true,
    })), commercialFacts,
  });
  const result = await service.handle({ body: requestBody({ userMessage: 'What is the price?' }) });
  assert.equal(result.status, 502);
  assert.deepEqual(result.body, { error: 'Sales assistant is temporarily unavailable.' });
});

test('returns a safe response when the OpenAI client fails', async () => {
  const service = createSalesChatService({
    openaiClient: { chat: { completions: { create: async () => { throw new Error('secret provider failure'); } } } }, commercialFacts,
  });
  const result = await service.handle({ body: requestBody() });
  assert.equal(result.status, 503);
  assert.deepEqual(result.body, { error: 'Sales assistant is temporarily unavailable.' });
});

test('rejects oversized messages and histories before calling OpenAI', async () => {
  let calls = 0;
  const service = createSalesChatService({
    openaiClient: { chat: { completions: { create: async () => { calls += 1; return {}; } } } }, commercialFacts,
  });
  const result = await service.handle({ body: requestBody({ userMessage: 'x'.repeat(2001), conversationHistory: Array.from({ length: 13 }, () => ({ role: 'user', text: 'x' })) }) });
  assert.equal(result.status, 400);
  assert.equal(calls, 0);
});

test('rate limiter allows the configured burst and rejects the next request', () => {
  let now = 1000;
  const limiter = createSalesChatRateLimiter({ limit: 2, windowMs: 1000, now: () => now });
  assert.equal(limiter.allow('203.0.113.5'), true);
  assert.equal(limiter.allow('203.0.113.5'), true);
  assert.equal(limiter.allow('203.0.113.5'), false);
  now += 1001;
  assert.equal(limiter.allow('203.0.113.5'), true);
});

test('uses strict JSON Schema response format for the provider contract', async () => {
  let request;
  const service = createSalesChatService({
  openaiClient: { chat: { completions: { create: async (...args) => { request = args[0]; return { choices: [{ message: { content: JSON.stringify({ reply: 'Tell me about your business.', intent: 'qualification', extractedFields: {}, requestedNextField: 'industry', actionIntent: [], responseMode: 'qualification_answer', resumePendingQuestion: true }) } }] }; } } } },
    commercialFacts,
  });
  const result = await service.handle({ body: requestBody() });
  assert.equal(result.status, 200);
  assert.equal(request.response_format.type, 'json_schema');
  assert.equal(request.response_format.json_schema.strict, true);
  assert.equal(request.response_format.json_schema.schema.additionalProperties, false);
  assert.deepEqual(request.response_format.json_schema.schema.required, ['reply', 'intent', 'responseMode', 'resumePendingQuestion', 'extractedFields', 'requestedNextField', 'actionIntent', 'articleRefs']);
});

test('normalizes only explicit safe enum and field aliases before validation', () => {
  const result = validateSalesLlmOutput({
    reply: 'Growth may be the closest fit for your business.',
    intent: 'off-topic',
    extractedFields: { team_users: '3' },
    requestedNextField: 'team_users',
    actionIntent: [], responseMode: 'off_topic', resumePendingQuestion: true,
  }, { plans: commercialFacts.plans, products: commercialFacts.products });
  assert.equal(result.ok, true);
  assert.equal(result.value.intent, 'off_topic');
  assert.equal(result.value.requestedNextField, 'teamUsers');
  assert.deepEqual(result.value.extractedFields, { teamUsers: '3' });
});

test('does not normalize unknown extracted field names', () => {
  const result = validateSalesLlmOutput({
    reply: 'Tell me more about your team.', intent: 'qualification', extractedFields: { teamSize: '3' },
    requestedNextField: 'teamUsers', actionIntent: [], responseMode: 'qualification_answer', resumePendingQuestion: true,
  }, { plans: commercialFacts.plans, products: commercialFacts.products });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'unsupported_field');
  assert.equal(result.field, 'teamSize');
});

test('logs only sanitized validation diagnostics in the staging environment', async () => {
  const logs = [];
  const service = createSalesChatService({
    openaiClient: providerWith(JSON.stringify({ reply: 'I can help.', intent: 'general', extractedFields: {}, requestedNextField: null, actionIntent: [], responseMode: 'qualification_answer', resumePendingQuestion: true })),
    commercialFacts,
    environment: { RENDER_SERVICE_NAME: 'samche-api-staging' },
    logger: { warn: (...args) => logs.push(args) },
  });
  const result = await service.handle({ body: requestBody() });
  assert.equal(result.status, 200);
  assert.deepEqual(logs, [
    ['sales_chat_validation_failed', { reason: 'invalid_intent' }],
    ['sales_chat_provider_salvaged', { category: 'validator', stage: 'optional_metadata', reason: 'invalid_intent' }],
  ]);
});

test('preserves an explicit capability interrupt mode and pending-question resume contract', async () => {
  const service = createSalesChatService({
    openaiClient: providerWith(JSON.stringify({
      reply: 'SamChe AI supports first-response work while human sales staff remain important for complex negotiations and closing.',
      intent: 'capability_question', extractedFields: {}, requestedNextField: 'languages', actionIntent: [],
      responseMode: 'capability_interrupt', resumePendingQuestion: true,
    })), commercialFacts,
  });
  const result = await service.handle({ body: requestBody({
    responseMode: 'capability_interrupt',
    userMessage: 'Can this AI replace one of my sales staff?',
    pendingQualificationField: 'languages',
    lastPendingQuestion: 'Which languages do you need the assistant to support?',
  }) });

  assert.equal(result.status, 200);
  assert.equal(result.context.responseMode, 'capability_interrupt');
  assert.equal(result.context.userMessage, 'Can this AI replace one of my sales staff?');
  assert.equal(result.body.responseMode, 'capability_interrupt');
  assert.equal(result.body.resumePendingQuestion, true);
});

test('server enforcement repairs conflicting capability intent and removes model actions', async () => {
  const service = createSalesChatService({
    openaiClient: providerWith(JSON.stringify({
      reply: 'Which languages do you need?', intent: 'off_topic', extractedFields: {}, requestedNextField: 'languages',
      actionIntent: ['REQUEST_DEMO', 'WHATSAPP_HANDOFF'], responseMode: 'capability_interrupt', resumePendingQuestion: true,
    })), commercialFacts,
  });
  const result = await service.handle({ body: requestBody({
    responseMode: 'capability_interrupt', detectedIntent: 'capability_question',
    pendingQualificationField: 'languages', lastPendingQuestion: 'Which languages do you need?',
    userMessage: 'Can this AI replace one of my sales staff?',
  }) });

  assert.equal(result.status, 200);
  assert.equal(result.body.intent, 'capability_question');
  assert.equal(result.body.responseMode, 'capability_interrupt');
  assert.deepEqual(result.body.actionIntent, []);
  assert.match(result.body.reply, /first-response|sales staff|negotiat|human/i);
  assert.match(result.body.reply, /languages/i);
});

test('server enforcement falls back to approved pricing when the model returns only the pending question', async () => {
  const service = createSalesChatService({
    openaiClient: providerWith(JSON.stringify({
      reply: 'How many people will use the shared inbox?', intent: 'pricing_question', extractedFields: {}, requestedNextField: 'teamUsers',
      actionIntent: ['REQUEST_DEMO', 'WHATSAPP_HANDOFF'], responseMode: 'pricing_interrupt', resumePendingQuestion: true,
    })), commercialFacts,
  });
  const result = await service.handle({ body: requestBody({
    responseMode: 'pricing_interrupt', detectedIntent: 'pricing_question', recommendedPlan: 'growth',
    pendingQualificationField: 'teamUsers', lastPendingQuestion: 'How many people will use the shared inbox?',
    userMessage: 'How much does Growth cost?',
  }) });

  assert.equal(result.status, 200);
  assert.equal(result.body.intent, 'pricing_question');
  assert.equal(result.body.responseMode, 'pricing_interrupt');
  assert.deepEqual(result.body.actionIntent, []);
  assert.match(result.body.reply, /AED 3,990\/month/);
  assert.match(result.body.reply, /shared inbox|team/i);
});

test('server enforcement keeps AI Guide as a product interrupt even when the model misclassifies it', async () => {
  const service = createSalesChatService({
    openaiClient: providerWith(JSON.stringify({
      reply: 'AI Guide is useful.', intent: 'capability_question', extractedFields: {}, requestedNextField: 'languages',
      actionIntent: ['REQUEST_DEMO'], responseMode: 'in_scope_interrupt', resumePendingQuestion: true,
    })), commercialFacts,
  });
  const result = await service.handle({ body: requestBody({
    responseMode: 'in_scope_interrupt', detectedIntent: 'product_question', pendingQualificationField: 'languages',
    lastPendingQuestion: 'Which languages do you need?', userMessage: 'How does AI Guide work?',
  }) });

  assert.equal(result.status, 200);
  assert.equal(result.body.intent, 'feature_question');
  assert.equal(result.body.responseMode, 'in_scope_interrupt');
  assert.deepEqual(result.body.actionIntent, []);
  assert.match(result.body.reply, /AI Guide/i);
  assert.match(result.body.reply, /languages/i);
});

test('latest user language overrides UI locale for Turkish product questions', async () => {
  const service = createSalesChatService({
    openaiClient: providerWith(JSON.stringify({
      reply: 'SamChe AI fiziksel bir ürün değil; kurulum ve yapılandırma süreci işletmenizin ihtiyaçlarına göre tamamlanır. Hangi sektörde faaliyet gösteriyorsunuz?',
      intent: 'product_question', extractedFields: {}, requestedNextField: 'industry', actionIntent: [],
      responseMode: 'in_scope_interrupt', resumePendingQuestion: true,
    })), commercialFacts,
  });
  const result = await service.handle({ body: requestBody({
    locale: 'en', inputLanguage: 'tr', responseMode: 'in_scope_interrupt', detectedIntent: 'product_question',
    userMessage: 'Ürünleri hemen teslim ediyor musunuz?', pendingQualificationField: 'industry',
    lastPendingQuestion: 'What type of business do you operate?',
  }) });
  assert.equal(result.status, 200);
  assert.equal(result.context.inputLanguage, 'tr');
  assert.match(result.body.reply, /fiziksel bir ürün değil|kurulum/i);
  assert.doesNotMatch(result.body.reply, /^What type of business/i);
});

test('server retains authoritative conversation language for a neutral latest support message', async () => {
  const service = createSalesChatService({
    openaiClient: providerWith(JSON.stringify({
      reply: 'I cannot help with that.', intent: 'support', extractedFields: {}, requestedNextField: null,
      actionIntent: [], responseMode: 'support', resumePendingQuestion: false, articleRefs: [],
    })), commercialFacts,
  });
  const result = await service.handle({ body: requestBody({
    locale: 'en', inputLanguage: 'tr', userMessage: '...', responseMode: 'support', detectedIntent: 'support',
    conversationHistory: [{ role: 'user', text: 'WhatsApp yanıt vermiyor' }, { role: 'assistant', text: 'Kanalı inceleyelim.', articleRefs: ['whatsapp-ai-not-replying'] }],
  }) });
  assert.equal(result.status, 200);
  assert.equal(result.context.inputLanguage, 'tr');
  assert.match(result.body.reply, /Doğrulanmış|incelemeyi|etkilenen|çalışma alanı/u);
});

test('server uses the shared conversation language resolver for neutral product names URLs and ASCII Turkish', async () => {
  for (const userMessage of ['Web Chatbot', 'AI Guide', 'https://samche.ai/help', 'baglanti', 'acilmadi', 'gorsel uretmiyor', 'kac resim', 'sayi']) {
    const service = createSalesChatService({
      openaiClient: providerWith(JSON.stringify({
        reply: 'Doğrulanmış destek adımlarıyla Türkçe devam edelim.', intent: 'support', extractedFields: {}, requestedNextField: null,
        actionIntent: [], responseMode: 'support', resumePendingQuestion: false, articleRefs: [],
      })), commercialFacts,
    });
    const result = await service.handle({ body: requestBody({ locale: 'en', inputLanguage: 'tr', userMessage, responseMode: 'support', detectedIntent: 'support' }) });
    assert.equal(result.context.inputLanguage, 'tr', userMessage);
    assert.match(result.body.reply, /Türkçe|Doğrulanmış/u, userMessage);
  }
});

test('provider replies in the latest language for English and Arabic questions', async () => {
  for (const [locale, userMessage, reply, expected] of [
    ['en', 'What products are available?', 'SamChe AI offers Web Chatbot, WhatsApp AI, and AI Guide.', /Web Chatbot/],
    ['ar', 'ما المنتجات المتاحة؟', 'يوفر SamChe AI روبوت الموقع وWhatsApp AI وAI Guide.', /يوفر|المنتجات/],
  ]) {
    const service = createSalesChatService({
      openaiClient: providerWith(JSON.stringify({ reply, intent: 'product_question', extractedFields: {}, requestedNextField: null, actionIntent: [], responseMode: 'in_scope_interrupt', resumePendingQuestion: true })),
      commercialFacts,
    });
    const result = await service.handle({ body: requestBody({ locale, userMessage, responseMode: 'in_scope_interrupt', detectedIntent: 'product_question' }) });
    assert.equal(result.status, 200);
    assert.match(result.body.reply, expected);
  }
});

test('server rejects a provider reply that ignores the latest user-message language', async () => {
  const service = createSalesChatService({
    openaiClient: providerWith(JSON.stringify({
      reply: 'Anladım, hangi kanalları kullanıyorsunuz?', intent: 'qualification', extractedFields: {},
      requestedNextField: 'channels', actionIntent: [], responseMode: 'qualification_answer', resumePendingQuestion: true,
    })), commercialFacts,
  });
  const result = await service.handle({ body: requestBody({
    locale: 'en', userMessage: 'I run a real estate business in Dubai.', responseMode: 'qualification_answer',
  }) });
  assert.equal(result.status, 502);
  assert.deepEqual(result.body, { error: 'Sales assistant is temporarily unavailable.' });
});

test('production diagnostics record a safe validator category without provider content', async () => {
  const logs = [];
  const service = createSalesChatService({
    openaiClient: providerWith(JSON.stringify({
      reply: 'I can help.', intent: 'not-a-valid-intent', extractedFields: {}, requestedNextField: null,
      actionIntent: [], responseMode: 'qualification_answer', resumePendingQuestion: true,
    })),
    commercialFacts, environment: { NODE_ENV: 'production' }, logger: { warn: (...args) => logs.push(args) },
  });
  const result = await service.handle({ body: requestBody() });
  assert.equal(result.status, 200);
  assert.deepEqual(logs, [
    ['sales_chat_provider_unusable', { category: 'validator', stage: 'provider_contract', field: undefined, reason: 'invalid_intent' }],
    ['sales_chat_provider_salvaged', { category: 'validator', stage: 'optional_metadata', reason: 'invalid_intent' }],
  ]);
});

test('safely salvages malformed bare greetings without starting qualification', async () => {
  const cases = [
    ['Hello', 'Hi! I’m the SamChe AI sales and support assistant. How can I help you today?', 'en'],
    ['Merhaba', 'Merhaba! Ben SamChe AI satış ve destek asistanıyım. Size nasıl yardımcı olabilirim?', 'tr'],
    ['مرحبا', 'مرحباً! أنا مساعد المبيعات والدعم في SamChe AI. كيف يمكنني مساعدتك اليوم؟', 'ar'],
  ];
  for (const [userMessage, reply, language] of cases) {
    const service = createSalesChatService({
      openaiClient: providerWith(JSON.stringify({
        reply, intent: 'general', responseMode: 'unexpected_mode', resumePendingQuestion: 'true',
        extractedFields: { unknownField: 'ignore me' }, requestedNextField: 'unknownField', actionIntent: ['UNSAFE_ACTION'],
      })), commercialFacts,
    });
    const result = await service.handle({ body: requestBody({ userMessage }) });
    assert.equal(result.status, 200, userMessage);
    assert.equal(result.body.reply, reply);
    assert.equal(result.body.intent, 'sales');
    assert.equal(result.body.responseMode, 'qualification_answer');
    assert.deepEqual(result.body.extractedFields, {});
    assert.equal(result.body.requestedNextField, null);
    assert.deepEqual(result.body.actionIntent, []);
    assert.equal(result.context.inputLanguage, language);
    assert.equal((result.body.reply.match(/[?؟]/g) || []).length, 1);
  }
});

test('does not salvage a reply with an unsupported commercial claim', async () => {
  const service = createSalesChatService({
    openaiClient: providerWith(JSON.stringify({
      reply: 'Growth is free and unlimited.', intent: 'general', responseMode: 'unexpected_mode', resumePendingQuestion: false,
      extractedFields: {}, requestedNextField: null, actionIntent: [],
    })), commercialFacts,
  });
  const result = await service.handle({ body: requestBody({ userMessage: 'Hello' }) });
  assert.equal(result.status, 502);
  assert.deepEqual(result.body, { error: 'Sales assistant is temporarily unavailable.' });
});
