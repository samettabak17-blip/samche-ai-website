import test from 'node:test';
import assert from 'node:assert/strict';
import { getRevealProfile, getRevealedText } from '../lib/chat-reveal.mjs';

test('short replies begin quickly and complete as a fast reveal', () => {
  const text = 'I can help with pricing.';
  const profile = getRevealProfile(text);
  assert.ok(profile.firstChunkDelayMs >= 80 && profile.firstChunkDelayMs <= 150);
  assert.ok(getRevealedText(text, 120).length > 0);
  assert.ok(profile.durationMs <= 350);
  assert.equal(getRevealedText(text, profile.durationMs), text);
});

test('long replies use larger word chunks and stay within three seconds', () => {
  const short = getRevealProfile('One two three four five six seven eight.');
  const longText = Array.from({ length: 180 }, (_, index) => `word${index}`).join(' ');
  const profile = getRevealProfile(longText);
  assert.ok(profile.chunkSize > short.chunkSize);
  assert.ok(profile.durationMs > 1_500 && profile.durationMs <= 3_000);
  assert.ok(getRevealedText(longText, 1_000).split(/\s+/).length > 40);
  assert.equal(getRevealedText(longText, profile.durationMs), longText);
});

test('reveal timing is adaptive instead of proportional character typing', () => {
  const medium = 'A useful response with several words and a clear next step for the customer.'.repeat(4);
  const long = medium.repeat(4);
  const mediumProfile = getRevealProfile(medium);
  const longProfile = getRevealProfile(long);
  assert.ok(long.length > medium.length * 3);
  assert.ok(longProfile.durationMs < mediumProfile.durationMs * 3);
  assert.ok(getRevealedText(long, 1_000).length > 0);
});

test('reduced motion renders the full response immediately', () => {
  const text = '1. Check the channel\n2. Open the Help Center article';
  assert.equal(getRevealedText(text, 0, { reducedMotion: true }), text);
});
