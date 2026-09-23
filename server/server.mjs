import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { createSalesChatRateLimiter, createSalesChatService } from './sales-chat-service.mjs';
import { commercialFacts } from './sales-chat-commercial.mjs';
import { createSupportHandler } from './support-email.mjs';

const port = Number(process.env.PORT || 3000);
const rateLimiter = createSalesChatRateLimiter();
const supportHandler = createSupportHandler();
const clientRoot = resolve(fileURLToPath(new URL('..', import.meta.url)), 'dist', 'client');

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 10_000_000) throw new Error('body_too_large');
  }
  return raw ? JSON.parse(raw) : {};
}

async function handleContact(req, res) {
  const body = await readBody(req);
  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (!webhook) return json(res, 503, { ok: false, error: 'Contact processing is not configured.' });
  const response = await fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) return json(res, 502, { ok: false, error: 'Contact processing is temporarily unavailable.' });
  return json(res, 202, { ok: true });
}

function contentType(file) {
  return {
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  }[extname(file).toLowerCase()] || 'application/octet-stream';
}

async function serveAsset(req, res) {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (!(pathname.startsWith('/_next/') || pathname.startsWith('/assets/') || pathname.startsWith('/samche-'))) return false;
  const candidate = resolve(clientRoot, `.${pathname}`);
  if (candidate !== clientRoot && !candidate.startsWith(`${clientRoot}${sep}`) && !candidate.startsWith(`${clientRoot}/`)) return false;
  try {
    if (!(await stat(candidate)).isFile()) return false;
  } catch {
    return false;
  }
  res.writeHead(200, { 'content-type': contentType(candidate), 'cache-control': 'public, max-age=31536000, immutable' });
  if (req.method === 'HEAD') return res.end();
  createReadStream(candidate).pipe(res);
  return true;
}

const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
const openaiModel = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
const openaiVisionModel = process.env.OPENAI_VISION_MODEL?.trim() || 'gpt-4o';
const salesChatConfigured = Boolean(openaiApiKey);
if (!salesChatConfigured) console.warn('sales_chat_provider_not_configured', { reason: 'missing_openai_api_key' });
else console.info('sales_chat_provider_configured', { model: openaiModel, visionModel: openaiVisionModel });
const openaiClient = salesChatConfigured ? { chat: { completions: { create: async (payload, options = {}) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${openaiApiKey}`, 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: options.signal });
  if (!response.ok) {
    let providerError = {};
    try {
      const body = await response.json();
      providerError = { type: typeof body?.error?.type === 'string' ? body.error.type.slice(0, 80) : undefined, code: typeof body?.error?.code === 'string' ? body.error.code.slice(0, 80) : undefined };
    } catch { /* A status code is sufficient when the provider error body is not JSON. */ }
    const error = new Error(`provider_http_${response.status}`);
    error.salesChatDiagnostic = { category: 'provider_http', status: response.status, model: typeof payload?.model === 'string' ? payload.model.slice(0, 80) : undefined, requestId: response.headers.get('x-request-id') || undefined, ...providerError };
    throw error;
  }
  return response.json();
} } } } : null;
const salesChatService = createSalesChatService({ openaiClient, commercialFacts, textModel: openaiModel, visionModel: openaiVisionModel, environment: process.env });
const websiteApp = (await import('../dist/server/index.js')).default;

async function serveFramework(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const request = new Request(requestUrl, { method: req.method, headers: req.headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Readable.toWeb(req) });
  const response = await websiteApp.fetch(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (req.method === 'HEAD' || !response.body) return res.end();
  return Readable.fromWeb(response.body).pipe(res);
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/health') return json(res, 200, { ok: true, service: 'samche-ai-website', salesChatConfigured });
    if (req.method === 'POST' && req.url === '/api/sales-chat') {
      if (!rateLimiter.allow(req.socket.remoteAddress || 'unknown')) return json(res, 429, { error: 'Sales assistant is temporarily unavailable.' });
      return json(res, ...(await salesChatService.handle({ body: await readBody(req) }).then((result) => [result.status, result.body])));
    }
    if (req.method === 'POST' && req.url === '/api/contact') return await handleContact(req, res);
    if (req.method === 'POST' && req.url === '/api/support') {
      const result = await supportHandler(await readBody(req), req.socket.remoteAddress || 'unknown');
      return json(res, result.status, result.body);
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      if (await serveAsset(req, res)) return;
      return serveFramework(req, res);
    }
    return json(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    return json(res, error?.message === 'body_too_large' ? 413 : 400, { error: 'Request could not be processed.' });
  }
});

server.listen(port, '0.0.0.0', () => console.log(`SamChe AI website listening on ${port}`));
