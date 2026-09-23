import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSupportHandler, deliverSupportEmail, SUPPORT_RECIPIENT, validateSupportRequest } from '../server/support-email.mjs';

const valid = { accountIdentifier: 'ACME', name: 'Test Customer', email: 'test@example.com', phone: '+971500000000', plan: 'growth', productArea: 'whatsapp-ai', issueCategory: 'technical', severity: 'normal', subject: 'Test issue', description: 'A channel is not replying.', preferredContactMethod: 'email' };
const env = { SUPPORT_EMAIL_API_URL: 'https://mail.example.test/send', SUPPORT_EMAIL_API_TOKEN: 'server-only-token', SUPPORT_EMAIL_FROM: 'support@example.test' };
const smtpEnv = { SUPPORT_EMAIL_TRANSPORT: 'smtp', SMTP_HOST: 'smtp.hostinger.com', SMTP_PORT: '465', SMTP_SECURE: 'true', SMTP_USER: SUPPORT_RECIPIENT, SMTP_PASSWORD: 'test-only-password', SUPPORT_EMAIL_FROM: SUPPORT_RECIPIENT, SUPPORT_EMAIL_TO: SUPPORT_RECIPIENT };

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

test('SMTP sends the structured request and screenshot with a validated Reply-To', async () => {
  let options; let message;
  const image = { name: 'screen.png', mimeType: 'image/png', data: 'iVBORw0KGgo=' };
  const { request } = validateSupportRequest({ ...valid, attachment: image });
  const result = await deliverSupportEmail(request, { env: smtpEnv, createTransportImpl: (config) => {
    options = config;
    return { sendMail: async (mail) => { message = mail; return { accepted: [SUPPORT_RECIPIENT], rejected: [], messageId: 'mock-only' }; } };
  } });
  assert.equal(result.ok, true);
  assert.equal(options.host, 'smtp.hostinger.com');
  assert.equal(options.port, 465);
  assert.equal(options.secure, true);
  assert.equal(options.auth.user, SUPPORT_RECIPIENT);
  assert.equal(options.auth.pass, 'test-only-password');
  assert.equal(options.logger, false);
  assert.equal(options.debug, false);
  assert.equal(message.to, SUPPORT_RECIPIENT);
  assert.equal(message.from, SUPPORT_RECIPIENT);
  assert.equal(message.replyTo, valid.email);
  for (const value of [valid.accountIdentifier, valid.name, valid.email, valid.phone, valid.plan, valid.productArea, valid.issueCategory, valid.severity, valid.subject, valid.description, valid.preferredContactMethod, '/support']) assert.ok(message.text.includes(value));
  assert.match(message.text, /submittedAt: \d{4}-\d{2}-\d{2}T/);
  assert.equal(message.attachments.length, 1);
  assert.deepEqual(message.attachments[0].content, Buffer.from(image.data, 'base64'));
  assert.equal(message.attachments[0].contentType, 'image/png');
});

test('SMTP success requires explicit acceptance of the fixed support recipient', async () => {
  for (const receipt of [{ accepted: [], rejected: [SUPPORT_RECIPIENT] }, { accepted: ['other@example.com'], rejected: [] }, {}]) {
    const result = await deliverSupportEmail(valid, { env: smtpEnv, createTransportImpl: () => ({ sendMail: async () => receipt }) });
    assert.equal(result.ok, false);
  }
  const failed = await deliverSupportEmail(valid, { env: smtpEnv, createTransportImpl: () => ({ sendMail: async () => { throw new Error('secret credential detail'); } }) });
  assert.deepEqual(failed, { ok: false, reason: 'delivery_failed' });
});

test('same-origin support handler reports SMTP success only after acceptance', async () => {
  let sends = 0;
  const handler = createSupportHandler({ env: smtpEnv, createTransportImpl: () => ({ sendMail: async () => {
    sends++;
    return sends === 1 ? { accepted: [SUPPORT_RECIPIENT] } : { accepted: [], rejected: [SUPPORT_RECIPIENT] };
  } }) });
  assert.deepEqual(await handler(valid, 'test-1'), { status: 202, body: { ok: true } });
  assert.deepEqual(await handler(valid, 'test-2'), { status: 503, body: { ok: false, error: 'delivery_unavailable' } });
  assert.equal(sends, 2);
});

test('SMTP requires a complete TLS configuration and cannot redirect the destination', async () => {
  for (const override of [{ SMTP_PASSWORD: '' }, { SMTP_SECURE: 'false' }, { SMTP_PORT: '0' }, { SUPPORT_EMAIL_TO: 'other@example.com' }, { SUPPORT_EMAIL_FROM: 'not-an-email' }]) {
    let called = false;
    const result = await deliverSupportEmail(valid, { env: { ...smtpEnv, ...override }, createTransportImpl: () => { called = true; return { sendMail: async () => ({ accepted: [SUPPORT_RECIPIENT] }) }; } });
    assert.equal(result.ok, false);
    assert.equal(called, false);
  }
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
