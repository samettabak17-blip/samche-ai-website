function parseInline(value) {
  const tokens = [];
  let cursor = 0;
  const pattern = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  for (const match of value.matchAll(pattern)) {
    if (match.index > cursor) tokens.push({ type: 'text', value: value.slice(cursor, match.index) });
    tokens.push(match[1].startsWith('**') ? { type: 'bold', value: match[2] } : { type: 'code', value: match[3] });
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length) tokens.push({ type: 'text', value: value.slice(cursor) });
  return tokens.length ? tokens : [{ type: 'text', value }];
}

function parseParagraph(lines) {
  const children = [];
  lines.forEach((line, index) => {
    if (index > 0) children.push({ type: 'break' });
    children.push(...parseInline(line));
  });
  return { type: 'paragraph', children };
}

export function parseRestrictedMarkdown(source) {
  if (typeof source !== 'string' || !source) return [];
  const lines = source.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let index = 0;
  const flushParagraph = () => {
    if (paragraph.length) blocks.push(parseParagraph(paragraph));
    paragraph = [];
  };
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { flushParagraph(); index += 1; continue; }
    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const type = unordered ? 'ul' : 'ol';
      const items = [];
      while (index < lines.length) {
        const itemMatch = lines[index].match(type === 'ul' ? /^\s*[-*]\s+(.+)$/ : /^\s*\d+[.)]\s+(.+)$/);
        if (!itemMatch) break;
        items.push(parseInline(itemMatch[1]));
        index += 1;
      }
      blocks.push({ type, items });
      continue;
    }
    paragraph.push(line);
    index += 1;
  }
  flushParagraph();
  return blocks;
}
