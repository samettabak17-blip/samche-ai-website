import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hasLocaleTranslation, translateText } from '../lib/samche-localization.mjs';

const source = await readFile(new URL('../app/components/samche-chat-widget.tsx', import.meta.url), 'utf8');

test('composer handles image paste without intercepting text paste or submitting', () => {
  assert.match(source, /onPaste=\{handlePaste\}/);
  assert.match(source, /extractClipboardImage\(event\.clipboardData\)/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /if \(clipboard\.kind === 'text' \|\| clipboard\.kind === 'empty'\) return/);
  assert.match(source, /setAttachment\(/);
  const pasteHandler = source.slice(source.indexOf('function handlePaste'), source.indexOf('function openDemoRequest'));
  assert.doesNotMatch(pasteHandler, /void ask\(|ask\(/);
});

test('composer keeps preview removal and explicit send controls', () => {
  assert.match(source, /samche-attachment-preview/);
  assert.match(source, /aria-label=\{translateText\('Remove attachment'/);
  assert.match(source, /type="submit"/);
  assert.match(source, /onSubmit=\{handleSubmit\}/);
});

test('attachment feedback is localized in EN, TR, and AR', () => {
  const keys = [
    'This image format is not supported. Use PNG, JPG, JPEG, or WEBP.',
    'This image is larger than 5 MB.',
    'We could not read the clipboard image. Try the attachment button.',
    'A new image replaced the previous attachment.',
  ];
  for (const key of keys) {
    assert.equal(hasLocaleTranslation(key, 'tr'), true, `missing Turkish translation: ${key}`);
    assert.equal(hasLocaleTranslation(key, 'ar'), true, `missing Arabic translation: ${key}`);
  }
  assert.notEqual(translateText(keys[0], 'tr'), keys[0]);
  assert.notEqual(translateText(keys[0], 'ar'), keys[0]);
});
