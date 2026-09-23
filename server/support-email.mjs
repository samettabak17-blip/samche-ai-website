import { randomUUID } from 'node:crypto';

export const SUPPORT_RECIPIENT = 'support@samchecompany.com';
export const MAX_SUPPORT_IMAGE_BYTES = 5 * 1024 * 1024;
const SMTP_ERROR_CODES = new Set(['EAUTH', 'ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS', 'EENVELOPE', 'EMESSAGE', 'ESTREAM']);
const diagnostic = (emit, event, details) => emit?.(event, details);
function smtpFailure(error) {
  const code = SMTP_ERROR_CODES.has(error?.code) ? error.code : 'UNKNOWN';
  const responseCode = Number.isInteger(error?.responseCode) && error.responseCode >= 400 && error.responseCode <= 599 ? error.responseCode : undefined;
  const category = code === 'EAUTH' || responseCode === 535 ? 'authentication' : code === 'ETIMEDOUT' ? 'timeout'
    : code === 'ECONNECTION' || code === 'ESOCKET' || code === 'EDNS' ? 'connection'
      : code === 'EENVELOPE' ? 'envelope' : 'smtp_error';
  return { stage: 'smtp_send', category, code, ...(responseCode ? { responseCode } : {}) };
}
const IMAGE_SIGNATURES = { 'image/png': '89504e470d0a1a0a', 'image/jpeg': 'ffd8ff', 'image/webp': '52494646' };
const PLANS = new Set(['starter', 'growth', 'business', 'enterprise']);
const PRODUCT_AREAS = new Set(['web-chatbot', 'whatsapp-ai', 'ai-guide', 'knowledge-intelligence', 'crm-pipeline', 'live-inbox', 'ai-visual', 'ai-voice', 'integrations', 'billing', 'account']);
const ISSUE_CATEGORIES = new Set(['technical', 'configuration', 'integration', 'billing', 'general']);
const CONTACT_METHODS = new Set(['email', 'whatsapp', 'portal']);
const SEVERITIES = new Set(['low', 'normal', 'high', 'critical']);
const EMAIL_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(value, max = 200) { return typeof value === 'string' ? value.trim().replace(/[\r\u0000-\u001f\u007f]/g, ' ').slice(0, max) : ''; }

export function validateSupportRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'invalid_request' };
  const request = {
    accountIdentifier: field(input.accountIdentifier), name: field(input.name), email: field(input.email),
    phone: field(input.phone), plan: field(input.plan, 30), productArea: field(input.productArea),
    issueCategory: field(input.issueCategory), severity: field(input.severity, 20),
    subject: field(input.subject, 200), description: field(input.description, 5000),
    preferredContactMethod: field(input.preferredContactMethod, 30),
    source: '/support', submittedAt: new Date().toISOString(),
  };
  if (!request.accountIdentifier || !request.name || !EMAIL_ADDRESS.test(request.email) || !PLANS.has(request.plan)
    || !PRODUCT_AREAS.has(request.productArea) || !ISSUE_CATEGORIES.has(request.issueCategory) || !SEVERITIES.has(request.severity)
    || !request.subject || !request.description || !CONTACT_METHODS.has(request.preferredContactMethod)) return { ok: false, reason: 'invalid_request' };
  if (request.plan === 'starter' && request.preferredContactMethod === 'whatsapp') return { ok: false, reason: 'invalid_request' };
  if (input.attachment != null) {
    const { name, mimeType, data } = input.attachment;
    const type = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
    if (typeof name !== 'string' || typeof data !== 'string' || !IMAGE_SIGNATURES[type]
      || data.length > Math.ceil(MAX_SUPPORT_IMAGE_BYTES * 4 / 3) + 8 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return { ok: false, reason: 'invalid_attachment' };
    const bytes = Buffer.from(data, 'base64');
    if (!bytes.length || bytes.length > MAX_SUPPORT_IMAGE_BYTES || !bytes.subarray(0, IMAGE_SIGNATURES[type].length / 2).toString('hex').startsWith(IMAGE_SIGNATURES[type])
      || (type === 'image/webp' && bytes.subarray(8, 12).toString('ascii') !== 'WEBP')) return { ok: false, reason: 'invalid_attachment' };
    const safeName = field(name, 120).replace(/[\\/]/g, '_');
    if (!safeName) return { ok: false, reason: 'invalid_attachment' };
    request.attachment = { name: safeName, mimeType: type, data };
  }
  return { ok: true, request };
}

function supportMessage(request, from) {
  return { to: SUPPORT_RECIPIENT, from, replyTo: request.email, subject: `[SamChe Support] ${request.subject}`,
    text: Object.entries(request).filter(([key]) => key !== 'attachment').map(([key, value]) => `${key}: ${value}`).join('\n') };
}

async function deliverBySmtp(request, env, createTransportImpl, emit) {
  const host = env.SMTP_HOST?.trim();
  const portValue = env.SMTP_PORT?.trim();
  const user = env.SMTP_USER?.trim();
  const password = env.SMTP_PASSWORD;
  const from = env.SUPPORT_EMAIL_FROM?.trim();
  const to = env.SUPPORT_EMAIL_TO?.trim();
  const port = Number(portValue);
  const invalidField = !host || !/^[a-z0-9.-]+$/i.test(host) ? 'SMTP_HOST'
    : !portValue || !/^\d+$/.test(portValue) || !Number.isInteger(port) || port < 1 || port > 65535 ? 'SMTP_PORT'
      : env.SMTP_SECURE?.trim().toLowerCase() !== 'true' ? 'SMTP_SECURE'
        : !EMAIL_ADDRESS.test(user || '') ? 'SMTP_USER' : !password ? 'SMTP_PASSWORD'
          : !EMAIL_ADDRESS.test(from || '') ? 'SUPPORT_EMAIL_FROM'
            : to !== SUPPORT_RECIPIENT ? 'SUPPORT_EMAIL_TO' : null;
  if (invalidField) {
    diagnostic(emit, 'support_smtp_failed', { stage: 'configuration', category: 'invalid_configuration', field: invalidField });
    return { ok: false, reason: 'not_configured' };
  }
  let nodemailer;
  try { nodemailer = createTransportImpl ? null : await import('nodemailer'); }
  catch {
    diagnostic(emit, 'support_smtp_failed', { stage: 'module_load', category: 'nodemailer_unavailable' });
    return { ok: false, reason: 'delivery_failed' };
  }
  let stage = 'transport_init';
  try {
    const createTransport = createTransportImpl || nodemailer.createTransport || nodemailer.default?.createTransport;
    if (typeof createTransport !== 'function') {
      diagnostic(emit, 'support_smtp_failed', { stage: 'transport_init', category: 'missing_transport' });
      return { ok: false, reason: 'delivery_failed' };
    }
    const transport = createTransport({ host, port, secure: true, auth: { user, pass: password },
      connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 20000, logger: false, debug: false,
      disableFileAccess: true, disableUrlAccess: true, tls: { minVersion: 'TLSv1.2' } });
    stage = 'smtp_send';
    diagnostic(emit, 'support_smtp_connection_attempt', { stage: 'smtp_send' });
    const message = { ...supportMessage(request, from), attachments: request.attachment ? [{ filename: request.attachment.name,
      content: Buffer.from(request.attachment.data, 'base64'), contentType: request.attachment.mimeType }] : [] };
    const receipt = await transport.sendMail(message);
    if (!Array.isArray(receipt?.accepted) || !receipt.accepted.some((address) => String(address).toLowerCase() === SUPPORT_RECIPIENT)
      || receipt.rejected?.some((address) => String(address).toLowerCase() === SUPPORT_RECIPIENT)) {
      diagnostic(emit, 'support_smtp_failed', { stage: 'smtp_acceptance', category: 'recipient_not_accepted' });
      return { ok: false, reason: 'unverified_delivery' };
    }
    diagnostic(emit, 'support_smtp_accepted', { stage: 'smtp_acceptance' });
    return { ok: true };
  } catch (error) {
    diagnostic(emit, 'support_smtp_failed', { ...smtpFailure(error), stage });
    return { ok: false, reason: 'delivery_failed' };
  }
}

export async function deliverSupportEmail(request, { env = process.env, fetchImpl = fetch, createTransportImpl, emit } = {}) {
  const selectedTransport = env.SUPPORT_EMAIL_TRANSPORT?.trim().toLowerCase() || 'api';
  diagnostic(emit, 'support_email_transport_selected', { transport: selectedTransport === 'smtp' || selectedTransport === 'api' ? selectedTransport : 'invalid' });
  if (selectedTransport === 'smtp') return deliverBySmtp(request, env, createTransportImpl, emit);
  if (selectedTransport !== 'api') {
    diagnostic(emit, 'support_email_failed', { stage: 'configuration', category: 'invalid_transport' });
    return { ok: false, reason: 'not_configured' };
  }
  const url = env.SUPPORT_EMAIL_API_URL?.trim();
  const token = env.SUPPORT_EMAIL_API_TOKEN?.trim();
  const from = env.SUPPORT_EMAIL_FROM?.trim();
  if (!url || !token || !from) {
    diagnostic(emit, 'support_email_failed', { stage: 'configuration', category: 'incomplete_api_configuration' });
    return { ok: false, reason: 'not_configured' };
  }
  let endpoint;
  try { endpoint = new URL(url); } catch {
    diagnostic(emit, 'support_email_failed', { stage: 'configuration', category: 'invalid_api_url' });
    return { ok: false, reason: 'not_configured' };
  }
  if (endpoint.protocol !== 'https:') {
    diagnostic(emit, 'support_email_failed', { stage: 'configuration', category: 'invalid_api_url' });
    return { ok: false, reason: 'not_configured' };
  }
  const payload = { ...supportMessage(request, from), attachment: request.attachment || null };
  try {
    const response = await fetchImpl(endpoint, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      diagnostic(emit, 'support_email_failed', { stage: 'api_send', category: 'provider_http', status: response.status });
      return { ok: false, reason: 'delivery_failed' };
    }
    const receipt = await response.json();
    if (receipt?.accepted !== true || receipt?.recipient !== SUPPORT_RECIPIENT) {
      diagnostic(emit, 'support_email_failed', { stage: 'api_acceptance', category: 'recipient_not_accepted' });
      return { ok: false, reason: 'unverified_delivery' };
    }
    diagnostic(emit, 'support_email_accepted', { stage: 'api_acceptance' });
    return { ok: true };
  } catch {
    diagnostic(emit, 'support_email_failed', { stage: 'api_send', category: 'request_failed' });
    return { ok: false, reason: 'delivery_failed' };
  }
}

export function createSupportHandler({ env = process.env, fetchImpl = fetch, createTransportImpl, now = () => Date.now(), logger = console } = {}) {
  const requests = new Map();
  return async function handle(body, ip = 'unknown', requestId) {
    const id = requestId || randomUUID();
    const emit = (event, details) => logger[event.endsWith('_failed') ? 'warn' : 'info'](event, { requestId: id, ...details });
    emit('support_request_received', { stage: 'handler' });
    const timestamp = now();
    const recent = (requests.get(ip) || []).filter((time) => timestamp - time < 60_000);
    if (recent.length >= 3) {
      emit('support_request_failed', { stage: 'rate_limit', category: 'rate_limited' });
      return { status: 429, body: { ok: false, error: 'rate_limited' } };
    }
    recent.push(timestamp); requests.set(ip, recent);
    const validated = validateSupportRequest(body);
    if (!validated.ok) {
      emit('support_request_failed', { stage: 'validation', category: validated.reason });
      return { status: 400, body: { ok: false, error: validated.reason } };
    }
    emit('support_request_validated', { stage: 'validation', attachment: Boolean(validated.request.attachment) });
    const result = await deliverSupportEmail(validated.request, { env, fetchImpl, createTransportImpl, emit });
    return result.ok ? { status: 202, body: { ok: true } } : { status: 503, body: { ok: false, error: 'delivery_unavailable' } };
  };
}
