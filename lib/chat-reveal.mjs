const FIRST_CHUNK_DELAY_MS = 120;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function splitRevealTokens(text) {
  return String(text || '').match(/\s*\S+(?:\s+|$)/g) || [];
}

export function getRevealProfile(text) {
  const tokenCount = splitRevealTokens(text).length;
  if (!tokenCount) return { tokenCount: 0, chunkSize: 0, firstChunkDelayMs: 0, durationMs: 0 };
  const chunkSize = tokenCount <= 12 ? 1 : tokenCount <= 40 ? 3 : tokenCount <= 90 ? 6 : 12;
  const durationMs = tokenCount <= 12 ? 320 : tokenCount <= 40 ? 1_200 : tokenCount <= 90 ? 2_100 : 3_200;
  return { tokenCount, chunkSize, firstChunkDelayMs: FIRST_CHUNK_DELAY_MS, durationMs };
}

export function getRevealedText(text, elapsedMs, { reducedMotion = false } = {}) {
  const source = String(text || '');
  const profile = getRevealProfile(source);
  if (!profile.tokenCount || reducedMotion || elapsedMs >= profile.durationMs) return source;
  if (elapsedMs < profile.firstChunkDelayMs) return '';
  const tokens = splitRevealTokens(source);
  const progress = clamp((elapsedMs - profile.firstChunkDelayMs) / (profile.durationMs - profile.firstChunkDelayMs), 0, 1);
  const chunksShown = Math.max(1, Math.ceil(progress * profile.tokenCount / profile.chunkSize));
  const visibleTokens = Math.min(profile.tokenCount, chunksShown * profile.chunkSize);
  return tokens.slice(0, visibleTokens).join('');
}
