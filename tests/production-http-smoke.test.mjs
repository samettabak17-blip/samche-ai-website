import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { getPublishedArticles } from '../lib/help-center/index.mjs';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const documentRoutes = [
  ['/', 'SamChe AI Platform'],
  ['/platform', 'Product modules for customer-facing AI'],
  ['/pricing', 'Choose the right SamChe AI plan'],
  ['/support', 'Knowledge, troubleshooting and plan-based assistance'],
  ['/security', 'Clear product boundaries'],
  ['/contact', 'find the right SamChe AI setup'],
  ['/privacy', 'Privacy information for samche.ai'],
];

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForHealth(baseUrl, child, output) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Production server exited early (${child.exitCode}).\n${output.join('')}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.status === 200) return;
    } catch {
      // The listener may not be ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Production server did not become healthy.\n${output.join('')}`);
}

function assertHtmlDocument(body, marker) {
  assert.match(body, /<html(?:\s|>)/i);
  assert.match(body, /<head(?:\s|>)/i);
  assert.match(body, /<title(?:\s|>)/i);
  assert.match(body, /<body(?:\s|>)/i);
  assert.ok(body.includes(marker), `Expected document content to include: ${marker}`);
}

test('built production server serves documents, assets, RSC, and same-origin APIs', { timeout: 45_000 }, async (t) => {
  const port = await reservePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const output = [];
  const child = spawn(process.execPath, ['server/server.mjs'], {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      OPENAI_API_KEY: '',
      CONTACT_WEBHOOK_URL: '',
      SUPPORT_EMAIL_API_URL: '', SUPPORT_EMAIL_API_TOKEN: '', SUPPORT_EMAIL_FROM: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => output.push(chunk.toString()));
  child.stderr.on('data', (chunk) => output.push(chunk.toString()));
  t.after(async () => {
    if (child.exitCode === null) child.kill();
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
  });

  await waitForHealth(baseUrl, child, output);

  let rootHtml = '';
  for (const [route, marker] of documentRoutes) {
    await t.test(`GET ${route} is a complete HTML document`, async () => {
      const response = await fetch(`${baseUrl}${route}`, { headers: { accept: 'text/html' } });
      const body = await response.text();
      assert.equal(response.status, 200, `${route} returned ${response.status}\n${output.join('')}`);
      assert.match(response.headers.get('content-type') || '', /^text\/html\b/i);
      assertHtmlDocument(body, marker);
      if (route === '/') rootHtml = body;
    });
  }

  await t.test('missing document route returns an HTML 404, not an internal error', async () => {
    const response = await fetch(`${baseUrl}/definitely-not-a-public-route`, { headers: { accept: 'text/html' } });
    const body = await response.text();
    assert.equal(response.status, 404);
    assert.match(response.headers.get('content-type') || '', /^text\/html\b/i);
    assert.match(body, /<html(?:\s|>)/i);
    assert.match(body, /<body(?:\s|>)/i);
  });

  await t.test('published Help Center articles resolve and invalid article refs 404', async () => {
    const articles = getPublishedArticles('en');
    for (const article of articles) {
      const response = await fetch(`${baseUrl}/help/article/${article.slug}`, { headers: { accept: 'text/html' } });
      assert.equal(response.status, 200, article.slug);
      assert.match(await response.text(), /<html(?:\s|>)/i);
    }
    const invalid = await fetch(`${baseUrl}/help/article/missing-or-unpublished`, { headers: { accept: 'text/html' } });
    assert.equal(invalid.status, 404);
  });

  await t.test('RSC request remains healthy', async () => {
    const response = await fetch(`${baseUrl}/pricing`, { headers: { accept: 'text/x-component', rsc: '1' } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /^text\/x-component\b/i);
  });

  await t.test('health endpoint remains healthy', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /^application\/json\b/i);
    assert.deepEqual(await response.json(), { ok: true, service: 'samche-ai-website', salesChatConfigured: false });
  });

  await t.test('built CSS and JavaScript assets retain correct MIME types', async () => {
    const cssPath = rootHtml.match(/href="([^"]+\.css)"/)?.[1];
    const scriptPath = rootHtml.match(/src="([^"]+\.js)"/)?.[1];
    assert.ok(cssPath, 'Root document should reference a built CSS asset');
    assert.ok(scriptPath, 'Root document should reference a built JavaScript asset');
    const [css, script] = await Promise.all([fetch(new URL(cssPath, baseUrl)), fetch(new URL(scriptPath, baseUrl))]);
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type') || '', /^text\/css\b/i);
    assert.equal(script.status, 200);
    assert.match(script.headers.get('content-type') || '', /^(?:text|application)\/javascript\b/i);
  });

  await t.test('public image assets retain the correct MIME type', async () => {
    const response = await fetch(`${baseUrl}/samche-ai-platform-approved.png`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/png');
  });

  await t.test('same-origin contact and sales-chat API boundaries remain functional', async () => {
    const [contact, salesChat] = await Promise.all([
      fetch(`${baseUrl}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }),
      fetch(`${baseUrl}/api/sales-chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          locale: 'en',
          conversationHistory: [],
          leadState: {},
          qualificationStage: 'discovery',
          pendingQualificationField: 'industry',
          lastPendingQuestion: 'What type of business do you operate?',
          recommendedPlan: '',
          userMessage: 'I run a real estate company in Dubai.',
        }),
      }),
    ]);
    assert.equal(contact.status, 400);
    assert.match(contact.headers.get('content-type') || '', /^application\/json\b/i);
    assert.deepEqual(await contact.json(), { ok: false, error: 'invalid_request' });
    assert.equal(salesChat.status, 503);
    assert.match(salesChat.headers.get('content-type') || '', /^application\/json\b/i);
    assert.deepEqual(await salesChat.json(), { error: 'Sales assistant is temporarily unavailable.' });
  });
  await t.test('support API refuses to claim delivery without a configured provider', async () => {
    const response = await fetch(`${baseUrl}/api/support`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      accountIdentifier: 'Smoke Co', name: 'Test User', email: 'test@example.com', plan: 'starter', productArea: 'web-chatbot',
      issueCategory: 'technical', severity: 'normal', subject: 'Smoke test', description: 'A test request.', preferredContactMethod: 'email',
    }) });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok: false, error: 'delivery_unavailable' });
  });
  await t.test('demo API refuses to claim delivery without configured SMTP', async () => {
    const response = await fetch(`${baseUrl}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      name: 'Test Customer', email: 'test@example.com', company: 'Example Co', role: 'Director',
      interest: 'Interested in: Web Chatbot', message: 'A demo request.',
    }) });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok: false, error: 'delivery_unavailable' });
  });
  await t.test('sales chat accepts a source image under 5 MB and rejects an oversized source before provider submission', async () => {
    const header = Buffer.from('89504e470d0a1a0a', 'hex');
    const request = async (size) => fetch(`${baseUrl}/api/sales-chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      userMessage: 'Bu görselde ne var?', conversationHistory: [],
      attachment: { mimeType: 'image/png', data: Buffer.concat([header, Buffer.alloc(size - header.length)]).toString('base64') },
    }) });
    const withinLimit = await request(5 * 1024 * 1024 - 1);
    assert.equal(withinLimit.status, 503);
    const oversized = await request(5 * 1024 * 1024 + 1);
    assert.equal(oversized.status, 400);
    assert.deepEqual(await oversized.json(), { error: 'image_too_large' });
  });
});
