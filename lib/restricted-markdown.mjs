function parseInline(value, options = {}) {
  const tokens = [];
  let cursor = 0;
  const articleUrls = options.articleUrls instanceof Map ? options.articleUrls : new Map();
  const pattern = /(\[([^\]]+)\]\((\/help\/article\/([a-z0-9-]+)(?:\?locale=(?:en|tr|ar))?)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g;
  for (const match of value.matchAll(pattern)) {
    if (match.index > cursor) tokens.push({ type: 'text', value: value.slice(cursor, match.index) });
    const expectedHref = articleUrls.get(match[4]);
    const sameArticleRoute = expectedHref && match[3].split('?')[0] === expectedHref.split('?')[0];
    if (match[3] && sameArticleRoute) tokens.push({ type: 'link', value: match[2], href: expectedHref });
    else if (match[5]) tokens.push({ type: 'bold', value: match[5] });
    else if (match[6]) tokens.push({ type: 'code', value: match[6] });
    else tokens.push({ type: 'text', value: match[0] });
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length) tokens.push({ type: 'text', value: value.slice(cursor) });
  return tokens.length ? tokens : [{ type: 'text', value }];
}

function parseParagraph(lines, options) {
  const children = [];
  lines.forEach((line, index) => {
    if (index > 0) children.push({ type: 'break' });
    children.push(...parseInline(line, options));
  });
  return { type: 'paragraph', children };
}

export function parseRestrictedMarkdown(source, options = {}) {
  if (typeof source !== 'string' || !source) return [];
  const lines = source.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let index = 0;
  const flushParagraph = () => {
    if (paragraph.length) blocks.push(parseParagraph(paragraph, options));
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
        items.push(parseInline(itemMatch[1], options));
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
