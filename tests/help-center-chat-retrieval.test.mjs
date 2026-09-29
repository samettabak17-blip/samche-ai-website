import test from 'node:test';
import assert from 'node:assert/strict';
import { createSalesChatService } from '../server/sales-chat-service.mjs';
import { getHelpArticleSources } from '../lib/help-center/index.mjs';

const facts = { plans: [], products: [] };
const base = { userMessage: 'My WhatsApp AI is not replying', locale: 'en', conversationHistory: [], leadState: {} };
const valid = { reply: 'Open Channels, select the affected WhatsApp channel, and check its visible status.', intent: 'support', responseMode: 'support', resumePendingQuestion: false, extractedFields: {}, requestedNextField: null, actionIntent: [], articleRefs: ['whatsapp-ai-troubleshooting', 'pipeline-deals', 'invented-slug'] };

test('support context exposes only customer-safe grounding and final refs are canonical', async () => {
  let sent;
  const openaiClient = { chat: { completions: { create: async (request) => { sent = request; return { choices: [{ message: { content: JSON.stringify(valid) } }] }; } } } };
  const result = await createSalesChatService({ openaiClient, commercialFacts: facts, logger: { warn() {} } }).handle({ body: base });
  assert.equal(result.status, 200);
  const context = JSON.parse(sent.messages.at(-1).content);
  assert.equal(context.verifiedDashboardMap, undefined);
  assert.equal(context.helpArticles, undefined);
  assert.ok(context.supportGrounding.articles.some((article) => article.articleId === 'whatsapp-ai-troubleshooting'));
  assert.doesNotMatch(JSON.stringify(context.supportGrounding), /sourceFiles|verifiedOn|tenant|\/app\/|implementation_team_managed|registry state|unverified/i);
  assert.deepEqual(result.body.articleRefs, ['whatsapp-ai-troubleshooting']);
  assert.equal(result.body.helpArticles, undefined);
});

test('ambiguous support retrieval query includes the immediately relevant user subject', async () => {
  let sent;
  const openaiClient = { chat: { completions: { create: async (request) => {
    sent = request;
    return { choices: [{ message: { content: JSON.stringify({
      ...valid,
      reply: 'I need the exact Instagram connection error or a screenshot before I can narrow this down.',
      articleRefs: [],
    }) } }] };
  } } } };
  const body = {
    userMessage: 'I get a could not connect warning', locale: 'en', inputLanguage: 'en', responseMode: 'support',
    conversationHistory: [
      { role: 'user', text: 'Can I manage my Instagram messages through the SamChe Dashboard?' },
      { role: 'assistant', text: 'Please share what happens when you try to connect Instagram.' },
    ],
    leadState: {},
  };
  const result = await createSalesChatService({ openaiClient, commercialFacts: facts, logger: { warn() {} } }).handle({ body });
  assert.equal(result.status, 200);
  const context = JSON.parse(sent.messages.at(-1).content);
  assert.match(context.supportRetrievalQuery, /Instagram/i);
  assert.match(context.supportRetrievalQuery, /could not connect/i);
  assert.ok(context.supportGrounding.articles.some((article) => article.articleId.startsWith('instagram-dm-ai')));
  assert.ok(result.body.articleRefs.every((slug) => slug.startsWith('instagram-dm-ai')));
});

test('an explicit current product replaces stale retrieval context', async () => {
  let sent;
  const openaiClient = { chat: { completions: { create: async (request) => {
    sent = request;
    return { choices: [{ message: { content: JSON.stringify(valid) } }] };
  } } } };
  await createSalesChatService({ openaiClient, commercialFacts: facts, logger: { warn() {} } }).handle({ body: {
    ...base,
    conversationHistory: [{ role: 'user', text: 'Can I connect Instagram?' }],
  } });
  const context = JSON.parse(sent.messages.at(-1).content);
  assert.doesNotMatch(context.supportRetrievalQuery, /Instagram/i);
  assert.match(context.supportRetrievalQuery, /WhatsApp/i);
  assert.ok(context.supportGrounding.articles.every((article) => article.articleId.startsWith('whatsapp')));
});

test('article source retrieval is empty for unrelated queries and remains localized', () => {
  assert.equal(getHelpArticleSources('zzzz-no-match', 'en').length, 0);
  assert.ok(getHelpArticleSources('WhatsApp yanıt vermiyor', 'tr').some((article) => article.slug === 'whatsapp-ai-troubleshooting'));
});
