export const MAX_CHAT_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const SUPPORTED_IMAGE_TYPES = Object.freeze(new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']));
const IMAGE_BASE64_SIGNATURES = Object.freeze({ 'image/png': 'iVBORw0KGgo', 'image/jpeg': '/9j/', 'image/webp': 'UklGR' });

function normalizedMimeType(type) {
  return String(type || '').toLowerCase() === 'image/jpg' ? 'image/jpeg' : String(type || '').toLowerCase();
}

export function validateImageFile(file) {
  if (!file || typeof file !== 'object') return { ok: false, reason: 'invalid_image' };
  const mimeType = normalizedMimeType(file.type);
  if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) return { ok: false, reason: 'unsupported_format' };
  if (!Number.isFinite(file.size) || file.size < 0) return { ok: false, reason: 'invalid_image' };
  if (file.size > MAX_CHAT_ATTACHMENT_BYTES) return { ok: false, reason: 'image_too_large' };
  return { ok: true, mimeType };
}

export function extractClipboardImage(clipboardData) {
  const items = Array.from(clipboardData?.items || []);
  for (const item of items) {
    const type = normalizedMimeType(item?.type);
    if (!SUPPORTED_IMAGE_TYPES.has(type)) continue;
    let file;
    try { file = item.getAsFile?.(); } catch { return { kind: 'error', reason: 'clipboard_access_failure' }; }
    if (file) return { kind: 'image', file };
  }
  if (items.some((item) => item?.kind === 'string' && String(item.type || '').toLowerCase().startsWith('text/'))) return { kind: 'text' };
  return { kind: 'empty' };
}

export async function readImageFile(file, FileReaderCtor = globalThis.FileReader) {
  const validation = validateImageFile(file);
  if (!validation.ok) throw validation;
  if (typeof FileReaderCtor !== 'function') throw { ok: false, reason: 'clipboard_access_failure' };
  return new Promise((resolve, reject) => {
    const reader = new FileReaderCtor();
    reader.onerror = () => reject({ ok: false, reason: 'clipboard_access_failure' });
    reader.onload = () => {
      const preview = String(reader.result || '');
      const comma = preview.indexOf(',');
      if (comma < 0 || !preview.slice(comma + 1)) return reject({ ok: false, reason: 'invalid_image' });
      const data = preview.slice(comma + 1);
      if (!data.startsWith(IMAGE_BASE64_SIGNATURES[validation.mimeType])) return reject({ ok: false, reason: 'invalid_image' });
      resolve({ name: file.name || 'clipboard-image', mimeType: validation.mimeType, data, preview });
    };
    try { reader.readAsDataURL(file); } catch { reject({ ok: false, reason: 'clipboard_access_failure' }); }
  });
}
