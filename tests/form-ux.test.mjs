import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateScreenshot, formatScreenshotSize } from '../lib/form-ux.mjs';
import { translateText } from '../lib/samche-localization.mjs';

const supportSource = () => readFile(new URL('../app/components/support-portal.tsx', import.meta.url), 'utf8');
const demoSource = () => readFile(new URL('../app/components/contact-form.tsx', import.meta.url), 'utf8');

test('screenshot selection accepts supported images through the 5 MB boundary', () => {
  for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
    assert.deepEqual(validateScreenshot({ type, size: 5 * 1024 * 1024 }), { ok: true });
  }
  assert.equal(formatScreenshotSize(1024), '1 KB');
  assert.equal(formatScreenshotSize(5 * 1024 * 1024), '5 MB');
});

test('screenshot selection rejects oversized and unsupported files', () => {
  assert.deepEqual(validateScreenshot({ type: 'image/png', size: 5 * 1024 * 1024 + 1 }), { ok: false, reason: 'attachmentSize' });
  assert.deepEqual(validateScreenshot({ type: 'application/pdf', size: 100 }), { ok: false, reason: 'attachmentType' });
  assert.deepEqual(validateScreenshot({ type: '', size: 100 }), { ok: false, reason: 'attachmentType' });
});

test('support keeps the native file picker and exposes preview, replacement and removal', async () => {
  const source = await supportSource();
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(source, /id="support-screenshot"[\s\S]*?type="file"[\s\S]*?accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(source, /className="attachment-input"/);
  assert.match(source, /URL\.createObjectURL\(file\)/);
  assert.match(source, /URL\.revokeObjectURL\(previewUrlRef\.current\)/);
  assert.match(source, /type="button"[\s\S]*?removeAttachment/);
  assert.match(source, /attachment\.name/);
  assert.match(source, /formatScreenshotSize\(attachment\.size\)/);
  assert.match(css, /\.attachment-input:focus-visible\s*\+\s*\.attachment-trigger-content/);
  assert.match(css, /\.attachment-input\s*\{[^}]*opacity:\s*0/s);
});

test('both forms expose loading and duplicate-submission protection', async () => {
  const [support, demo] = await Promise.all([supportSource(), demoSource()]);
  for (const source of [support, demo]) {
    assert.match(source, /submittingRef\.current/);
    assert.match(source, /aria-busy=\{/);
    assert.match(source, /disabled=\{/);
    assert.match(source, /aria-live=/);
  }
});

test('validation, upload controls and submit states have EN/TR/AR text', async () => {
  const support = await supportSource();
  const demo = await demoSource();
  for (const phrase of ['Attach Screenshot', 'Replace Screenshot', 'Remove screenshot', 'File is larger than 5 MB.', 'Choose a PNG, JPG, JPEG, or WEBP image.']) {
    assert.match(support, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  for (const locale of ['tr', 'ar']) {
    assert.notEqual(translateText('Remove screenshot', locale), 'Remove screenshot');
    for (const phrase of ['Please complete all required fields.', 'Enter a valid email address.', 'Your demo request could not be submitted. Please try again.']) {
      assert.notEqual(translateText(phrase, locale), phrase, `${locale}: ${phrase}`);
    }
  }
  assert.match(demo, /role=\{statusType === 'error' \? 'alert' : 'status'\}/);
});

test('form CSS provides bounded desktop grids, mobile touch targets and RTL controls', async () => {
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /\.support-form\s*\{[^}]*max-width:\s*8\d\dpx/s);
  assert.match(css, /@media\s*\(max-width:\s*640px\)[\s\S]*?\.form-row\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(css, /\.support-form[^{}]*\.field[^{}]*(?:input|select|textarea)[^{}]*\{[^}]*font-size:\s*16px/s);
  assert.match(css, /\.attachment-remove[^{}]*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.localized-site\[data-locale="ar"\][^{}]*\.form-submit-icon/);
});
