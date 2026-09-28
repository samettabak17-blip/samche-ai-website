import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSalesChatService, validateChatAttachment } from '../server/sales-chat-service.mjs';
import { commercialFacts } from '../server/sales-chat-commercial.mjs';
import { dashboardSupportMap } from '../lib/support-dashboard-map.mjs';

const png = (await readFile(new URL('./fixtures/order-sc-4827.png', import.meta.url))).toString('base64');
const attachment = { mimeType: 'image/png', data: png };
const reply = (value) => JSON.stringify({ reply: value, intent: 'support', responseMode: 'support', resumePendingQuestion: false, extractedFields: {}, requestedNextField: null, actionIntent: [] });

test('5 MB source image contract validates bytes before provider submission', () => {
  assert.equal(validateChatAttachment(attachment).ok, true);
  assert.equal(validateChatAttachment({ mimeType: 'image/png', data: Buffer.concat([Buffer.from(png, 'base64'), Buffer.alloc(5 * 1024 * 1024)]).toString('base64') }).reason, 'image_too_large');
});

test('controlled screenshot and immediate follow-up reach vision request and survive validation', async () => {
  const payloads = [];
  const service = createSalesChatService({ commercialFacts, openaiClient: { chat: { completions: { create: async (payload) => {
    payloads.push(payload);
    return { choices: [{ message: { content: reply(payloads.length === 1 ? 'Bu ekrandaki sipariş numarası SC-4827.' : 'Bu ekranda Channels > WhatsApp AI bölümü açık.') } }] };
  } } } } });
  const first = await service.handle({ body: { userMessage: 'Bu ekrandaki sipariş numarası nedir?', conversationHistory: [], attachment } });
  assert.equal(first.status, 200);
  assert.match(first.body.reply, /SC-4827/);
  assert.equal(payloads[0].model, 'gpt-4o');
  assert.equal(payloads[0].messages[1].content[1].image_url.url, `data:image/png;base64,${png}`);
  const next = await service.handle({ body: { userMessage: 'Burada hangi bölüm açık?', conversationHistory: [
    { role: 'user', text: 'Bu ekrandaki sipariş numarası nedir?', imageContext: true },
    { role: 'assistant', text: first.body.reply },
  ], attachment } });
  assert.equal(next.status, 200);
  assert.match(next.body.reply, /Channels > WhatsApp AI/);
  assert.equal(payloads[1].model, 'gpt-4o');
});

test('image diagnostics expose only safe boundary metadata', async () => {
  const events = [];
  const service = createSalesChatService({ commercialFacts, logger: { warn: (...args) => events.push(args), info: (...args) => events.push(args) }, openaiClient: { chat: { completions: { create: async () => ({ choices: [{ message: { content: reply('The screenshot shows ORDER ID: SC-4827.') } }] }) } } } });
  const result = await service.handle({ body: { userMessage: 'Please inspect this screenshot.', conversationHistory: [], attachment } });
  assert.equal(result.status, 200);
  const eventNames = events.map(([name]) => name);
  assert.ok(eventNames.includes('sales_chat_image_received'));
  assert.ok(eventNames.includes('sales_chat_vision_request_succeeded'));
  const received = events.find(([name]) => name === 'sales_chat_image_received')[1];
  assert.deepEqual(Object.keys(received).sort(), ['base64Chars', 'mimeType', 'sourceBytes']);
  assert.equal(received.mimeType, 'image/png');
  assert.equal(received.sourceBytes, Buffer.from(png, 'base64').length);
  assert.equal(events.some(([, details]) => JSON.stringify(details).includes(png)), false);
});

test('unusable vision output is not silently replaced with generic support advice', async () => {
  const service = createSalesChatService({ commercialFacts, openaiClient: { chat: { completions: { create: async () => ({ choices: [{ message: { content: null } }] }) } } } });
  const result = await service.handle({ body: { userMessage: 'Bu görselde ne yazıyor?', conversationHistory: [], attachment } });
  assert.equal(result.status, 502);
});

test('dashboard map contains only verified routes and no fabricated AI Visual setting', () => {
  const whatsapp = dashboardSupportMap.find((entry) => entry.area === 'WhatsApp AI');
  const visual = dashboardSupportMap.find((entry) => entry.area === 'AI Visual generation');
  assert.equal(whatsapp.path, '/app/:tenantId/channels');
  assert.equal(visual.path, null);
  assert.equal(visual.owner, 'implementation');
  assert.equal(dashboardSupportMap.some((entry) => entry.controls.some((control) => /Visual Settings|QR re-authenticate/i.test(control))), false);
});

test('WhatsApp troubleshooting controls are explicitly verified in the dashboard map', () => {
  const whatsapp = dashboardSupportMap.find((entry) => entry.area === 'WhatsApp AI');
  assert.equal(whatsapp.status, 'implemented_customer_accessible');
  assert.equal(whatsapp.nav, 'Channels');
  assert.equal(whatsapp.path, '/app/:tenantId/channels');
  for (const control of ['WhatsApp channel', 'Edit channel', 'Status', 'Assigned assistant', 'Save changes']) {
    assert.ok(whatsapp.controls.includes(control), `missing verified control: ${control}`);
  }
});

test('a follow-up to an AI Visual support issue stays in support and never invents a settings screen', async () => {
  const service = createSalesChatService({ commercialFacts, openaiClient: { chat: { completions: { create: async () => ({ choices: [{ message: { content: reply('Lütfen Görsel Ayarları sekmesine gidin.') } }] }) } } } });
  const result = await service.handle({ body: { userMessage: 'burda nerden yapicam?', conversationHistory: [
    { role: 'user', text: 'WhatsApp chatbotum ürün görseli üretmiyor.' },
    { role: 'assistant', text: 'Hangi planı kullanıyorsunuz?' },
  ] } });
  assert.equal(result.status, 200);
  assert.equal(result.body.responseMode, 'support');
  assert.doesNotMatch(result.body.reply, /Görsel Ayarları/);
  assert.match(result.body.reply, /Dashboard'da kullanabileceğiniz bir ayar bulunmuyor/);
  assert.match(result.body.reply, /hata metnini|ekran görüntüsünü/);
  assert.doesNotMatch(result.body.reply, /verified|registry|boundary|tenantId|\/app\/|doğrulanmış|implementation/iu);
});
