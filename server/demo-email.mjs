import { randomUUID, createHash } from 'node:crypto';
import { deliverBySmtp } from './support-email.mjs';

const EMAIL_ADDRESS = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;
const FIELDS = Object.freeze({
  name: 200, email: 254, company: 200, role: 200, interest: 200, message: 5000,
  selected_plan: 100, industry: 200, country: 100, website: 300, mainGoal: 1000,
  channels: 300, products: 300, languages: 300, integrations: 500, volume: 200,
  plan: 100, timeline: 200, teamUsers: 100, leadQualification: 500, aiGuideNeed: 500,
  apiWorkflow: 500, apiAccessNeed: 500, customWorkflowNeed: 500, externalIntegrations: 500,
  aiLeadScoring: 500, preferredDemoDate: 100, preferredDemoTime: 100, conversationSummary: 3000,
});
const REQUIRED = ['name', 'email', 'company', 'role', 'interest', 'message'];

export function validateDemoRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.websiteCheck) return { ok: false };
  const request = {};
  for (const [key, max] of Object.entries(FIELDS)) {
    const value = input[key];
    if (value == null || value === '') continue;
    const forbidden = key === 'message' || key === 'conversationSummary' ? /[\u0000-\u0009\u000b-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/;
    if (typeof value !== 'string' || value.length > max || forbidden.test(value)) return { ok: false };
    const trimmed = value.trim();
    if (trimmed) request[key] = trimmed;
  }
  if (REQUIRED.some((key) => !request[key]) || !EMAIL_ADDRESS.test(request.email)) return { ok: false };
  request.submittedAt = new Date().toISOString();
  return { ok: true, request };
}

export function createDemoHandler({ env = process.env, createTransportImpl, now = () => Date.now(), logger = console } = {}) {
  const requests = new Map();
  return async function handle(body, ip = 'unknown', requestId) {
    const id = requestId || randomUUID();
    const emit = (event, details) => logger[event.endsWith('_failed') ? 'warn' : 'info'](event, { requestId: id, ...details });
    const validated = validateDemoRequest(body);
    if (!validated.ok) return { status: 400, body: { ok: false, error: 'invalid_request' } };
    const timestamp = now();
    for (const [key, entry] of requests) if (timestamp - entry.time >= 60_000) requests.delete(key);
    const recent = [...requests.entries()].filter(([key, entry]) => key.startsWith(`${ip}:`) && timestamp - entry.time < 60_000);
    const content = { ...validated.request };
    delete content.submittedAt;
    const fingerprint = `${ip}:${createHash('sha256').update(JSON.stringify(content)).digest('hex')}`;
    if (requests.has(fingerprint) || recent.length >= 3) return { status: 429, body: { ok: false, error: 'rate_limited' } };
    requests.set(fingerprint, { time: timestamp });
    const request = validated.request;
    const message = { replyTo: request.email, subject: '[SamChe AI] New Product Demo Request',
      text: Object.entries(request).map(([key, value]) => `${key}: ${value}`).join('\n') };
    const result = env.SUPPORT_EMAIL_TRANSPORT?.trim().toLowerCase() === 'smtp'
      ? await deliverBySmtp(message, { env, createTransportImpl, emit, category: 'demo' })
      : { ok: false, reason: 'not_configured' };
    if (!result.ok) requests.delete(fingerprint);
    return result.ok ? { status: 202, body: { ok: true } } : { status: 503, body: { ok: false, error: 'delivery_unavailable' } };
  };
}
