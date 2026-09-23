import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { plans, platformFeatureGroups } from '../lib/site-data.mjs';
import * as salesChat from '../server/sales-chat-service.mjs';
import { commercialFacts } from '../server/sales-chat-commercial.mjs';
import { translateText } from '../lib/samche-localization.mjs';
import { generateSalesTurn, createInitialSalesState } from '../lib/samche-sales-assistant.mjs';

function providerWith(content) {
  return { chat: { completions: { create: async () => ({ choices: [{ message: { content } }] }) } } };
}

function requestBody(overrides = {}) {
  return {
    locale: 'en',
    userMessage: 'How do I configure my web chatbot?',
    conversationHistory: [],
    leadState: {},
    qualificationStage: 'discovery',
    pendingField: 'industry',
    lastPendingQuestion: 'What type of business do you operate?',
    lastQuestion: '',
    responseMode: 'support',
    detectedIntent: 'support',
    ...overrides,
  };
}

// 1. Locked prices & setup amounts remain strictly unchanged
test('locked prices and setup amounts remain exact and unchanged', () => {
  assert.deepEqual(plans.map((p) => p.monthly), [1790, 3990, 7990, 12500]);
  assert.deepEqual(plans.map((p) => p.setup), [2500, 5000, 9500, 20000]);
  assert.deepEqual(plans.map((p) => p.yearly), [18258, 40698, 81498, 127500]);
  assert.deepEqual(plans.map((p) => p.interactions), ['5,000', '20,000', '50,000', '100,000+']);
});

// 2. Implementation & Onboarding terminology and plan-specific lines
test('implementation and onboarding terminology is present and exact across all plans', () => {
  const [starter, growth, business, enterprise] = plans;
  assert.equal(starter.implementationLabel, 'One-Time Implementation & Onboarding');
  assert.equal(starter.implementationNote, 'AI configuration, knowledge setup and launch');
  assert.equal(growth.implementationLabel, 'One-Time Implementation & Onboarding');
  assert.equal(growth.implementationNote, 'Multi-channel setup, WhatsApp AI and integration onboarding');
  assert.equal(business.implementationLabel, 'One-Time Implementation & Onboarding');
  assert.equal(business.implementationNote, 'Advanced AI configuration, workflows and integration setup');
  assert.equal(enterprise.implementationLabel, 'Enterprise Implementation');
  assert.equal(enterprise.implementationNote, 'Multimodal AI, voice, visual and enterprise integration implementation');
});

// 3. Plan support entitlements exact
test('plan support entitlements are exact and strictly grounded', () => {
  const [starter, growth, business, enterprise] = plans;
  assert.deepEqual(starter.supportEntitlements, [
    '24/7 AI Support',
    'Human Email Support — Business Hours',
    'Support Portal',
  ]);
  assert.deepEqual(growth.supportEntitlements, [
    '24/7 AI Support',
    'Email + WhatsApp Human Support — Business Hours',
    'Priority Support',
    'Support Portal',
  ]);
  assert.deepEqual(business.supportEntitlements, [
    '24/7 AI Support',
    'Priority Email + WhatsApp Human Support',
    'Expanded Priority Support',
    'Support Portal',
  ]);
  assert.deepEqual(enterprise.supportEntitlements, [
    '24/7 AI Support',
    '24/7 Human Support for Critical Issues',
    'Priority Email + WhatsApp',
    'Dedicated Customer Advisor',
    'Enterprise Support Portal',
  ]);
});

// 4. Feature comparison Support & Success section exact
test('platform comparison includes Support & Success group with exact matrix', () => {
  const supportGroup = platformFeatureGroups.find((g) => g.label === 'Support & Success');
  assert.ok(supportGroup, 'Support & Success group must exist');
  assert.deepEqual(supportGroup.rows, [
    { label: '24/7 AI Support', values: ['Included', 'Included', 'Included', 'Included'] },
    { label: 'Human Email Support', values: ['Business Hours', 'Business Hours', 'Priority', 'Priority'] },
    { label: 'Human WhatsApp Support', values: ['Not included', 'Business Hours', 'Priority', 'Priority'] },
    { label: 'Support Portal', values: ['Included', 'Included', 'Included', 'Included'] },
    { label: 'Priority Support', values: ['Standard', 'Priority', 'Expanded Priority', 'Enterprise Priority'] },
    { label: '24/7 Critical Human Support', values: ['Not included', 'Not included', 'Not included', 'Included'] },
    { label: 'Dedicated Customer Advisor', values: ['Not included', 'Not included', 'Not included', 'Included'] },
  ]);
});
// 5. Support request takes priority over sales qualification
test('support issue does not trigger sales qualification', async () => {
  const service = salesChat.createSalesChatService({
    openaiClient: providerWith(JSON.stringify({
      reply: 'WhatsApp AI bağlantınızı Channels > WhatsApp AI bölümünden kontrol edebilirsiniz.',
      intent: 'support',
      responseMode: 'support',
      resumePendingQuestion: false,
      extractedFields: {},
      requestedNextField: null,
      actionIntent: [],
    })),
    commercialFacts,
  });

  const result = await service.handle({
    body: requestBody({ userMessage: 'whatsapp chatbotum calismiyor ne yapmaliyim' }),
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.intent, 'support');
  assert.equal(result.body.responseMode, 'support');
  assert.doesNotMatch(result.body.reply, /sektör|bütçe|kaç kişi|hangi sektörde/i);
});

// 6. Support assistant rejects hallucinated dashboard controls
test('support assistant rejects hallucinated dashboard controls', () => {
  const hallucinatedControls = [
    'Lütfen Görsel Ayarları sekmesine gidin.',
    'Veri Entegrasyonu panelinden kontrol edin.',
    'Eğitim Verisi ayarlarını güncelleyin.',
    'Open the Visual Settings menu in your dashboard.',
  ];

  for (const reply of hallucinatedControls) {
    const result = salesChat.validateSalesLlmOutput(
      JSON.stringify({
        reply,
        intent: 'support',
        responseMode: 'support',
        resumePendingQuestion: false,
        extractedFields: {},
        requestedNextField: null,
        actionIntent: [],
      }),
      commercialFacts
    );
    assert.equal(result.ok, false, `Must reject hallucinated control in: ${reply}`);
  }
});

test('support assistant accepts only map-backed dashboard navigation claims', () => {
  const verified = salesChat.validateSalesLlmOutput(JSON.stringify({
    reply: 'Open Channels, select the WhatsApp channel, choose Edit channel, check Status and Assigned assistant, then Save changes.',
    intent: 'support', responseMode: 'support', resumePendingQuestion: false, extractedFields: {}, requestedNextField: null, actionIntent: [],
  }), commercialFacts);
  assert.equal(verified.ok, true);

  for (const reply of [
    'Open the Integrations menu and reconnect WhatsApp.',
    'Go to AI Visual Settings and enable image generation.',
    'Open the Data Sync tab and refresh the provider credentials.',
  ]) {
    const result = salesChat.validateSalesLlmOutput(JSON.stringify({
      reply, intent: 'support', responseMode: 'support', resumePendingQuestion: false, extractedFields: {}, requestedNextField: null, actionIntent: [],
    }), commercialFacts);
    assert.equal(result.ok, false, `Must reject unsupported navigation: ${reply}`);
    assert.equal(result.reason, 'hallucinated_dashboard_control');
  }
});

// 7. Plan entitlement boundary: Starter + WhatsApp
test('starter + whatsapp issue: assistant explains plan entitlement boundary', () => {
  const turn = generateSalesTurn(createInitialSalesState(), 'WhatsApp AI neden çalışmıyor?', [], 'tr');
  assert.match(turn.reply, /kanalda|hata|sorun/i);
});

// 8. Plan entitlement boundary: Business + AI Visual
test('business + AI Visual: assistant explains Enterprise-only entitlement', () => {
  const turn = generateSalesTurn(createInitialSalesState(), 'whatsapp chatbotum urun görseli üretmiyor ne yapmalıyım', [], 'tr');
  assert.match(turn.reply, /AI Visual|Enterprise/i);
});

// 9. Vision route: image payload routes to gpt-4o
test('image turn routes to OpenAI vision model gpt-4o with transient attachment', async () => {
  let capturedPayload;
  const service = salesChat.createSalesChatService({
    openaiClient: {
      chat: {
        completions: {
          create: async (payload) => {
            capturedPayload = payload;
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    reply: 'Görseldeki sayı 42.',
                    intent: 'support',
                    responseMode: 'support',
                    resumePendingQuestion: false,
                    extractedFields: {},
                    requestedNextField: null,
                    actionIntent: [],
                  }),
                },
              }],
            };
          },
        },
      },
    },
    commercialFacts,
  });

  const result = await service.handle({
    body: requestBody({
      userMessage: 'bu görseldeki sayı kaç?',
      attachment: { mimeType: 'image/png', data: 'iVBORw0KGgo=' },
    }),
  });

  assert.equal(result.status, 200);
  assert.equal(capturedPayload.model, 'gpt-4o');
  assert.equal(capturedPayload.messages[1].content[1].type, 'image_url');
  assert.match(result.body.reply, /42/);
});
// 10. Text turn remains on text model (gpt-4o-mini)
test('text turn remains on text model route gpt-4o-mini', async () => {
  let capturedPayload;
  const service = salesChat.createSalesChatService({
    openaiClient: {
      chat: {
        completions: {
          create: async (payload) => {
            capturedPayload = payload;
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    reply: 'Web Chatbot kurulumunu Channels sekmesinden yapabilirsiniz.',
                    intent: 'support',
                    responseMode: 'support',
                    resumePendingQuestion: false,
                    extractedFields: {},
                    requestedNextField: null,
                    actionIntent: [],
                  }),
                },
              }],
            };
          },
        },
      },
    },
    commercialFacts,
  });

  const result = await service.handle({
    body: requestBody({ userMessage: 'Web Chatbot nasıl kurulur?' }),
  });
  assert.equal(result.status, 200);
  assert.equal(capturedPayload.model, 'gpt-4o-mini');
});

// 11. No automatic live-transfer claims
test('no automatic live-transfer claims allowed', () => {
  const unsafeLiveTransfers = [
    'Sizi canlı desteğe aktarıyorum, lütfen bekleyin.',
    'Bir temsilciye bağlıyorum.',
    'I am transferring you to live support now.',
    'Connecting you to an agent.',
  ];

  for (const claim of unsafeLiveTransfers) {
    const sanitized = salesChat.sanitizeSalesReply(claim, salesChat.SALES_CHAT_CAPABILITIES, 'tr');
    assert.doesNotMatch(sanitized, /canlı desteğe aktarıyorum|bağlıyorum|transferring/i);
  }
});

// 12. No fake ticket creation claims
test('no fake ticket creation claims allowed', () => {
  const fakeTickets = [
    'Destek talebiniz açıldı. Ticket #4829 oluşturuldu.',
    'I have created ticket #123 for your issue.',
    'Teknik ekibe aktardım ve bilet #999 açtım.',
  ];

  for (const claim of fakeTickets) {
    const sanitized = salesChat.sanitizeSalesReply(claim, salesChat.SALES_CHAT_CAPABILITIES, 'tr');
    assert.doesNotMatch(sanitized, /ticket #\d+|bilet #\d+|oluşturuldu/i);
  }
});

// 13. Localization in TR and AR without English leakage
test('Turkish and Arabic pricing, support, and implementation copy are localized without leakage', () => {
  assert.equal(translateText('One-Time Implementation & Onboarding', 'tr'), 'Tek Seferlik Uygulama ve Onboarding');
  assert.equal(translateText('Enterprise Implementation', 'tr'), 'Kurumsal Uygulama');
  assert.equal(translateText('AI configuration, knowledge setup and launch', 'tr'), 'AI yapılandırması, bilgi tabanı kurulumu ve yayına alma');
  assert.equal(translateText('Support & Success', 'tr'), 'Destek ve Başarı');
  assert.equal(translateText('24/7 AI Support', 'tr'), '7/24 AI Destek');
  assert.equal(translateText('Why is there a one-time implementation fee?', 'tr'), 'Tek seferlik uygulama ücreti neden var?');

  assert.equal(translateText('One-Time Implementation & Onboarding', 'ar'), 'تطبيق وتأهيل لمرة واحدة');
  assert.equal(translateText('Enterprise Implementation', 'ar'), 'تطبيق المؤسسات');
  assert.equal(translateText('Support & Success', 'ar'), 'الدعم والنجاح');
  assert.equal(translateText('Why is there a one-time implementation fee?', 'ar'), 'لماذا توجد رسوم تطبيق لمرة واحدة؟');
});

// 14. Implementation FAQ is present in platform FAQ items
test('Implementation FAQ question and answer are present in PlatformFAQ', async () => {
  const content = await readFile(new URL('../app/components/platform-faq.tsx', import.meta.url), 'utf8');
  assert.match(content, /Why is there a one-time implementation fee\?/);
  assert.match(content, /initial technical and AI setup required to configure SamChe AI for your business/);
  assert.match(content, /knowledge preparation, integration configuration, testing and launch support/);
});


