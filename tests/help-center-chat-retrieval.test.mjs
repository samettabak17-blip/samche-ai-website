import test from 'node:test';
import assert from 'node:assert/strict';
import { createSalesChatService } from '../server/sales-chat-service.mjs';
import { getHelpArticleSources } from '../lib/help-center/index.mjs';

const facts = { plans: [], products: [] };
const base = { userMessage: 'My WhatsApp AI is not replying', locale: 'en', conversationHistory: [], leadState: {} };
const valid = { reply: 'Please check the verified WhatsApp channel path in your workspace.', intent: 'support', responseMode: 'support', resumePendingQuestion: false, extractedFields: {}, requestedNextField: null, actionIntent: [], articleRefs: ['whatsapp-ai-troubleshooting', 'invented-slug'] };

test('support context includes retrieved verified article content and final refs are canonical', async () => {
  let sent;
  const openaiClient = { chat: { completions: { create: async (request) => { sent = request; return { choices: [{ message: { content: JSON.stringify(valid) } }] }; } } } };
  const result = await createSalesChatService({ openaiClient, commercialFacts: facts, logger: { warn() {} } }).handle({ body: base });
  assert.equal(result.status, 200);
  const context = JSON.parse(sent.messages[1].content);
  assert.ok(context.helpArticles.some((article) => article.slug === 'whatsapp-ai-troubleshooting'));
  assert.deepEqual(result.body.articleRefs, ['whatsapp-ai-troubleshooting']);
  assert.equal(result.body.helpArticles, undefined);
});

test('article source retrieval is empty for unrelated queries and remains localized', () => {
  assert.equal(getHelpArticleSources('zzzz-no-match', 'en').length, 0);
  assert.ok(getHelpArticleSources('WhatsApp yanıt vermiyor', 'tr').some((article) => article.slug === 'whatsapp-ai-troubleshooting'));
});
