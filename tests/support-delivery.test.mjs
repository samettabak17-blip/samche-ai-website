import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSupportHandler, deliverSupportEmail, SUPPORT_RECIPIENT, validateSupportRequest } from '../server/support-email.mjs';

const valid = { accountIdentifier: 'ACME', name: 'Test Customer', email: 'test@example.com', phone: '+971500000000', plan: 'growth', productArea: 'whatsapp-ai', issueCategory: 'technical', severity: 'normal', subject: 'Test issue', description: 'A channel is not replying.', preferredContactMethod: 'email' };
const env = { SUPPORT_EMAIL_API_URL: 'https://mail.example.test/send', SUPPORT_EMAIL_API_TOKEN: 'server-only-token', SUPPORT_EMAIL_FROM: 'support@example.test' };

test('support API path is wired to the server handler', async () => {
  const server = await readFile(new URL('../server/server.mjs', import.meta.url), 'utf8');
  assert.match(server, /req\.url === '\/api\/support'/);
  assert.match(server, /supportHandler\(await readBody\(req\)/);
});

test('support delivery has one fixed destination and requires recipient acknowledgement', async () => {
  let sent;
  const accepted = await deliverSupportEmail(valid, { env, fetchImpl: async (_url, options) => {
    sent = JSON.parse(options.body);
    return { ok: true, json: async () => ({ accepted: true, recipient: SUPPORT_RECIPIENT }) };
  } });
  assert.equal(accepted.ok, true);
  assert.equal(sent.to, 'support@samchecompany.com');
  assert.equal(sent.replyTo, valid.email);
  assert.equal((await deliverSupportEmail(valid, { env, fetchImpl: async () => ({ ok: true, json: async () => ({ accepted: true, recipient: 'other@example.com' }) }) })).ok, false);
  assert.equal((await deliverSupportEmail(valid, { env: {} })).ok, false);
});

test('server validates fields, image bytes, and rate limits submissions', async () => {
  const image = { name: 'screen.png', mimeType: 'image/png', data: 'iVBORw0KGgo=' };
  assert.equal(validateSupportRequest({ ...valid, attachment: image }).ok, true);
  assert.equal(validateSupportRequest({ ...valid, attachment: { ...image, data: 'A'.repeat(7_000_000) } }).reason, 'invalid_attachment');
  assert.equal(validateSupportRequest({ ...valid, plan: 'made-up' }).ok, false);
  assert.equal(validateSupportRequest({ ...valid, plan: 'starter', preferredContactMethod: 'whatsapp' }).ok, false);
  let count = 0;
  const handler = createSupportHandler({ env, fetchImpl: async () => { count++; return { ok: true, json: async () => ({ accepted: true, recipient: SUPPORT_RECIPIENT }) }; }, now: () => 1000 });
  for (let index = 0; index < 3; index++) assert.equal((await handler(valid, '127.0.0.1')).status, 202);
  assert.equal((await handler(valid, '127.0.0.1')).status, 429);
  assert.equal(count, 3);
});

test('customer support page submits and confirms only a successful response', async () => {
  const page = await readFile(new URL('../app/components/support-portal.tsx', import.meta.url), 'utf8');
  assert.match(page, /fetch\('\/api\/support'/);
  assert.match(page, /if \(!response\.ok\) throw/);
  assert.match(page, /Destek talebiniz başarıyla iletildi/);
  assert.match(page, /Your support request has been successfully submitted/);
  assert.match(page, /تم إرسال طلب الدعم بنجاح/);
  assert.doesNotMatch(page, /backend integration|validated and prepared|ticketing backend/i);
});
