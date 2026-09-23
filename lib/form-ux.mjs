export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const SCREENSHOT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function validateScreenshot(file) {
  if (!file || !SCREENSHOT_TYPES.has(file.type)) return { ok: false, reason: 'attachmentType' };
  if (!Number.isFinite(file.size) || file.size < 0 || file.size > MAX_SCREENSHOT_BYTES) return { ok: false, reason: 'attachmentSize' };
  return { ok: true };
}

export function formatScreenshotSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Number((bytes / (1024 * 1024)).toFixed(1))} MB`;
}
