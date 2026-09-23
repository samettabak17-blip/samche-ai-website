export const SUPPORT_RECIPIENT = 'support@samchecompany.com';
export const MAX_SUPPORT_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_SIGNATURES = { 'image/png': '89504e470d0a1a0a', 'image/jpeg': 'ffd8ff', 'image/webp': '52494646' };
const PLANS = new Set(['starter', 'growth', 'business', 'enterprise']);
const PRODUCT_AREAS = new Set(['web-chatbot', 'whatsapp-ai', 'ai-guide', 'knowledge-intelligence', 'crm-pipeline', 'live-inbox', 'ai-visual', 'ai-voice', 'integrations', 'billing', 'account']);
const ISSUE_CATEGORIES = new Set(['technical', 'configuration', 'integration', 'billing', 'general']);
const CONTACT_METHODS = new Set(['email', 'whatsapp', 'portal']);
const SEVERITIES = new Set(['low', 'normal', 'high', 'critical']);

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
  if (!request.accountIdentifier || !request.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email) || !PLANS.has(request.plan)
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
    request.attachment = { name: field(name, 120), mimeType: type, data };
  }
  return { ok: true, request };
}

export async function deliverSupportEmail(request, { env = process.env, fetchImpl = fetch } = {}) {
  const url = env.SUPPORT_EMAIL_API_URL?.trim();
  const token = env.SUPPORT_EMAIL_API_TOKEN?.trim();
  const from = env.SUPPORT_EMAIL_FROM?.trim();
  if (!url || !token || !from) return { ok: false, reason: 'not_configured' };
  let endpoint;
  try { endpoint = new URL(url); } catch { return { ok: false, reason: 'not_configured' }; }
  if (endpoint.protocol !== 'https:') return { ok: false, reason: 'not_configured' };
  const payload = { to: SUPPORT_RECIPIENT, from, replyTo: request.email, subject: `[SamChe Support] ${request.subject}`,
    text: Object.entries(request).filter(([key]) => key !== 'attachment').map(([key, value]) => `${key}: ${value}`).join('\n'),
    attachment: request.attachment || null };
  try {
    const response = await fetchImpl(endpoint, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
    if (!response.ok) return { ok: false, reason: 'delivery_failed' };
    const receipt = await response.json();
    if (receipt?.accepted !== true || receipt?.recipient !== SUPPORT_RECIPIENT) return { ok: false, reason: 'unverified_delivery' };
    return { ok: true };
  } catch { return { ok: false, reason: 'delivery_failed' }; }
}

export function createSupportHandler({ env = process.env, fetchImpl = fetch, now = () => Date.now() } = {}) {
  const requests = new Map();
  return async function handle(body, ip = 'unknown') {
    const timestamp = now();
    const recent = (requests.get(ip) || []).filter((time) => timestamp - time < 60_000);
    if (recent.length >= 3) return { status: 429, body: { ok: false, error: 'rate_limited' } };
    recent.push(timestamp); requests.set(ip, recent);
    const validated = validateSupportRequest(body);
    if (!validated.ok) return { status: 400, body: { ok: false, error: validated.reason } };
    const result = await deliverSupportEmail(validated.request, { env, fetchImpl });
    return result.ok ? { status: 202, body: { ok: true } } : { status: 503, body: { ok: false, error: 'delivery_unavailable' } };
  };
}
