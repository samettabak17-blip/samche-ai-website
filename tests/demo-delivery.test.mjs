import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDemoHandler, validateDemoRequest } from '../server/demo-email.mjs';
import { deliverSupportEmail, SUPPORT_RECIPIENT } from '../server/support-email.mjs';
import { translateText } from '../lib/samche-localization.mjs';

const env = { SUPPORT_EMAIL_TRANSPORT: 'smtp', SMTP_HOST: 'smtp.hostinger.com', SMTP_PORT: '465', SMTP_SECURE: 'true', SMTP_USER: 'media@samchecompany.com', SMTP_PASSWORD: 'test-only-password', SUPPORT_EMAIL_FROM: SUPPORT_RECIPIENT, SUPPORT_EMAIL_TO: SUPPORT_RECIPIENT };
const valid = { name: 'Test Customer', email: 'test@example.com', company: 'Example Co', role: 'Director', interest: 'Interested in: Web Chatbot', message: 'We need a website assistant.', preferredDemoDate: '2026-10-01', preferredDemoTime: '14:00', conversationSummary: 'Discussed requirements.' };
const quiet = { info() {}, warn() {} };

test('demo SMTP sends collected details to support with fixed subject and validated Reply-To', async () => {
  let config; let mail;
  const handler = createDemoHandler({ env, logger: quiet, createTransportImpl: (options) => { config = options; return { sendMail: async (message) => { mail = message; return { accepted: [SUPPORT_RECIPIENT], rejected: [] }; } }; } });
  assert.deepEqual(await handler(valid, 'demo-1'), { status: 202, body: { ok: true } });
  assert.equal(config.auth.user, 'media@samchecompany.com');
  assert.equal(config.auth.pass, 'test-only-password');
  assert.equal(mail.to, SUPPORT_RECIPIENT);
  assert.equal(mail.from, SUPPORT_RECIPIENT);
  assert.equal(mail.subject, '[SamChe AI] New Product Demo Request');
  assert.equal(mail.replyTo, valid.email);
  for (const value of Object.values(valid)) assert.ok(mail.text.includes(value), value);
  assert.match(mail.text, /submittedAt: \d{4}-\d{2}-\d{2}T/);
  assert.doesNotMatch(mail.text, /phone:/i);
});

test('demo success requires provider acceptance and failures expose no provider detail', async () => {
  for (const receipt of [{ accepted: [] }, { accepted: ['other@example.com'] }, { accepted: [SUPPORT_RECIPIENT], rejected: [SUPPORT_RECIPIENT] }]) {
    const handler = createDemoHandler({ env, logger: quiet, createTransportImpl: () => ({ sendMail: async () => receipt }) });
    assert.deepEqual(await handler(valid, Math.random().toString()), { status: 503, body: { ok: false, error: 'delivery_unavailable' } });
  }
  const handler = createDemoHandler({ env, logger: quiet, createTransportImpl: () => ({ sendMail: async () => { throw new Error('secret provider detail'); } }) });
  assert.deepEqual(await handler(valid, 'rejected'), { status: 503, body: { ok: false, error: 'delivery_unavailable' } });
});

test('demo requires existing SMTP configuration before attempting delivery', async () => {
  let called = false;
  const handler = createDemoHandler({ env: { ...env, SMTP_PASSWORD: '' }, logger: quiet, createTransportImpl: () => { called = true; return { sendMail: async () => ({ accepted: [SUPPORT_RECIPIENT] }) }; } });
  assert.deepEqual(await handler(valid, 'missing'), { status: 503, body: { ok: false, error: 'delivery_unavailable' } });
  assert.equal(called, false);
});

test('demo validation limits fields, checks email, blocks honeypot and duplicate clicks', async () => {
  assert.equal(validateDemoRequest(valid).ok, true);
  assert.equal(validateDemoRequest({ ...valid, message: 'Line one\nLine two' }).ok, true);
  for (const input of [{ ...valid, email: 'bad' }, { ...valid, message: 'x'.repeat(5001) }, { ...valid, websiteCheck: 'spam' }, { ...valid, interest: '' }]) assert.equal(validateDemoRequest(input).ok, false);
  let sends = 0;
  const handler = createDemoHandler({ env, logger: quiet, createTransportImpl: () => ({ sendMail: async () => { sends++; return { accepted: [SUPPORT_RECIPIENT] }; } }) });
  assert.equal((await handler(valid, 'repeat')).status, 202);
  assert.equal((await handler(valid, 'repeat')).status, 429);
  assert.equal(sends, 1);
});

test('support SMTP remains available with its required category subject', async () => {
  let mail;
  const support = { name: 'Test Customer', email: valid.email, subject: 'A test issue' };
  const result = await deliverSupportEmail(support, { env, createTransportImpl: () => ({ sendMail: async (message) => { mail = message; return { accepted: [SUPPORT_RECIPIENT] }; } }) });
  assert.equal(result.ok, true);
  assert.equal(mail.subject, '[SamChe AI] Support Request');
  assert.equal(mail.to, SUPPORT_RECIPIENT);
});

test('demo confirmation is localized and never claims a booking', async () => {
  const source = 'Your demo request has been successfully submitted. Our team will contact you.';
  assert.equal(translateText(source, 'tr'), 'Demo talebiniz başarıyla iletildi. Ekibimiz sizinle iletişime geçecektir.');
  assert.equal(translateText(source, 'ar'), 'تم إرسال طلب العرض التوضيحي بنجاح. سيتواصل معكم فريقنا.');
  const form = await readFile(new URL('../app/components/contact-form.tsx', import.meta.url), 'utf8');
  assert.ok(form.includes(source));
  assert.doesNotMatch(form, /demo (?:is|has been) booked|appointment (?:is|has been) confirmed/i);
  assert.match(form, /fetch\('\/api\/contact'/);
  const server = await readFile(new URL('../server/server.mjs', import.meta.url), 'utf8');
  assert.match(server, /req\.url === '\/api\/contact'/);
  assert.match(server, /demoHandler\(body, req\.socket\.remoteAddress/);
  assert.doesNotMatch(server, /CONTACT_WEBHOOK_URL/);
});
