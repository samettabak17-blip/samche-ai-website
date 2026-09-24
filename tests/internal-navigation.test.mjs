import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('internal links prefetch same-origin documents without replacing anchor navigation', async () => {
  const source = await readFile(new URL('../app/components/internal-link.tsx', import.meta.url), 'utf8');
  assert.match(source, /prefetch/);
  assert.match(source, /window\.location\.origin/);
  assert.match(source, /<a href={href}/);
  assert.doesNotMatch(source, /window\.location\.assign/);
});
