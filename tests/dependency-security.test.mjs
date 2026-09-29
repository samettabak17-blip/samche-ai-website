import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const lock = JSON.parse(await readFile(new URL('package-lock.json', root), 'utf8'));

function parts(version) {
  return String(version).replace(/^v/, '').split(/[.-]/).slice(0, 3).map((part) => Number.parseInt(part, 10) || 0);
}

function atLeast(actual, minimum) {
  const left = parts(actual);
  const right = parts(minimum);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return true;
}

function lockedVersions(name) {
  const suffix = `/node_modules/${name}`;
  return Object.entries(lock.packages)
    .filter(([path]) => path === `node_modules/${name}` || path.replaceAll('\\', '/').endsWith(suffix))
    .map(([, metadata]) => metadata.version)
    .filter(Boolean);
}

function assertEveryLockedVersion(name, minimum) {
  const versions = lockedVersions(name);
  assert.ok(versions.length > 0, `${name} must be present in the canonical npm lockfile`);
  for (const version of versions) {
    assert.ok(atLeast(version, minimum), `${name}@${version} must be at least ${minimum}`);
  }
}

test('direct framework and build dependencies stay on the audited safe patch line', () => {
  assert.equal(packageJson.dependencies.next, '16.3.6');
  assert.equal(packageJson.dependencies.react, '19.2.8');
  assert.equal(packageJson.dependencies['react-dom'], '19.2.8');
  assert.equal(packageJson.devDependencies['eslint-config-next'], '16.3.6');
  assert.equal(packageJson.devDependencies['react-server-dom-webpack'], '19.2.8');
  assert.equal(packageJson.devDependencies.vinext, '1.0.0-beta.12');
  assert.equal(packageJson.devDependencies.vite, '8.3.1');
  assert.equal(packageJson.devDependencies['@vitejs/plugin-rsc'], '0.5.34');
  assert.equal(packageJson.devDependencies['@cloudflare/vite-plugin'], '1.62.2');
  assert.equal(packageJson.devDependencies.wrangler, '4.144.0');
  assert.equal(packageJson.devDependencies['drizzle-kit'], undefined);
  assert.equal(packageJson.scripts['db:generate'], undefined);
});

test('every locked critical or high package occurrence is on its patched release', () => {
  assertEveryLockedVersion('next', '16.3.6');
  assertEveryLockedVersion('sharp', '0.35.4');
  assertEveryLockedVersion('fast-uri', '3.1.6');
  assertEveryLockedVersion('js-yaml', '4.3.2');
  assertEveryLockedVersion('vite', '8.3.1');
  assertEveryLockedVersion('react-server-dom-webpack', '19.2.8');
  assertEveryLockedVersion('ws', '8.21.0');
  assertEveryLockedVersion('undici', '7.29.1');
  assert.equal(lockedVersions('esbuild').some((version) => parts(version)[0] === 0 && parts(version)[1] < 28), false, 'all resolved esbuild versions must be on the patched 0.28 line');
});

test('AVIF optimization stays disabled while supported screenshot and vision formats remain available', async () => {
  const nextConfig = await readFile(new URL('next.config.ts', root), 'utf8');
  const chatAttachment = await readFile(new URL('lib/chat-attachment.mjs', root), 'utf8');
  const formUx = await readFile(new URL('lib/form-ux.mjs', root), 'utf8');

  assert.match(nextConfig, /images\s*:\s*\{[\s\S]*?unoptimized\s*:\s*true/);
  for (const mimeType of ['image/png', 'image/jpeg', 'image/webp']) {
    assert.match(chatAttachment, new RegExp(mimeType.replace('/', '\\/')));
    assert.match(formUx, new RegExp(mimeType.replace('/', '\\/')));
  }
  assert.doesNotMatch(chatAttachment, /image\/avif/);
  assert.doesNotMatch(formUx, /image\/avif/);
});

