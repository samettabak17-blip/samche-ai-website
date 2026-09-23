import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_CHAT_ATTACHMENT_BYTES,
  extractClipboardImage,
  readImageFile,
  validateImageFile,
} from '../lib/chat-attachment.mjs';

const pngBytes = Buffer.from('89504e470d0a1a0a', 'hex');

function file({ type = 'image/png', size = pngBytes.length, name = 'shot.png', bytes = pngBytes } = {}) {
  return { type, size, name, bytes };
}

class FakeFileReader {
  readAsDataURL(input) {
    this.result = `data:${input.type};base64,${Buffer.from(input.bytes).toString('base64')}`;
    queueMicrotask(() => this.onload?.());
  }
}

test('accepts PNG, JPEG/JPG, and WEBP and normalizes image/jpg', () => {
  assert.equal(validateImageFile(file()).ok, true);
  assert.equal(validateImageFile(file({ type: 'image/jpeg', name: 'shot.jpg' })).mimeType, 'image/jpeg');
  assert.equal(validateImageFile(file({ type: 'image/jpg', name: 'shot.jpg' })).mimeType, 'image/jpeg');
  assert.equal(validateImageFile(file({ type: 'image/webp', name: 'shot.webp' })).mimeType, 'image/webp');
});

test('rejects unsupported formats and images over the 5 MB source limit', () => {
  assert.deepEqual(validateImageFile(file({ type: 'image/gif' })), { ok: false, reason: 'unsupported_format' });
  assert.deepEqual(validateImageFile(file({ size: MAX_CHAT_ATTACHMENT_BYTES + 1 })), { ok: false, reason: 'image_too_large' });
  assert.equal(validateImageFile(file({ size: MAX_CHAT_ATTACHMENT_BYTES })).ok, true);
});

test('extracts the first supported clipboard image without touching text-only paste', () => {
  const image = file();
  assert.deepEqual(extractClipboardImage({ items: [{ kind: 'string', type: 'text/plain' }, { kind: 'file', type: image.type, getAsFile: () => image }] }), { kind: 'image', file: image });
  assert.deepEqual(extractClipboardImage({ items: [{ kind: 'string', type: 'text/plain' }] }), { kind: 'text' });
  assert.deepEqual(extractClipboardImage({ items: [] }), { kind: 'empty' });
});

test('reports clipboard access failure when the browser cannot expose the image file', () => {
  assert.deepEqual(extractClipboardImage({ items: [{ kind: 'file', type: 'image/png', getAsFile: () => { throw new Error('denied'); } }] }), { kind: 'error', reason: 'clipboard_access_failure' });
});

test('reads a valid image into the existing data and preview contract', async () => {
  const result = await readImageFile(file(), FakeFileReader);
  assert.equal(result.name, 'shot.png');
  assert.equal(result.mimeType, 'image/png');
  assert.equal(result.data, pngBytes.toString('base64'));
  assert.match(result.preview, /^data:image\/png;base64,/);
});

test('does not read an invalid image and exposes a stable reason', async () => {
  await assert.rejects(readImageFile(file({ type: 'image/gif' }), FakeFileReader), { reason: 'unsupported_format' });
});

test('rejects clipboard content with an image MIME type but invalid image bytes', async () => {
  await assert.rejects(readImageFile(file({ bytes: Buffer.from('not-a-png'), size: 9 }), FakeFileReader), { reason: 'invalid_image' });
});
