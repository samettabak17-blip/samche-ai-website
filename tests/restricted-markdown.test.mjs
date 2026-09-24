import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRestrictedMarkdown, stripHelpArticleLinks } from '../lib/restricted-markdown.mjs';

function textValues(tokens) {
  return tokens.flatMap((token) => token.children || [token]).map((token) => token.type === 'break' ? '\n' : token.value || '').join('');
}

test('parses bold and inline code without HTML', () => {
  const blocks = parseRestrictedMarkdown('Use **Channels** and `Status` here.');
  assert.equal(blocks[0].type, 'paragraph');
  assert.deepEqual(blocks[0].children, [
    { type: 'text', value: 'Use ' },
    { type: 'bold', value: 'Channels' },
    { type: 'text', value: ' and ' },
    { type: 'code', value: 'Status' },
    { type: 'text', value: ' here.' },
  ]);
});

test('parses paragraphs, line breaks, and ordered and unordered lists', () => {
  const blocks = parseRestrictedMarkdown('First line\nsecond line.\n\n- Check status\n- Check assistant\n\n1. Open Channels\n2. Save changes');
  assert.deepEqual(blocks.map(({ type }) => type), ['paragraph', 'ul', 'ol']);
  assert.equal(blocks[0].children[1].type, 'break');
  assert.equal(blocks[1].items[1][0].value, 'Check assistant');
  assert.equal(blocks[2].items[0][0].value, 'Open Channels');
});

test('keeps raw HTML and scripts inert as plain text', () => {
  const blocks = parseRestrictedMarkdown('<img src=x onerror=alert(1)>\n<script>alert(1)</script>');
  assert.equal(textValues(blocks), '<img src=x onerror=alert(1)>\n<script>alert(1)</script>');
  assert.equal(blocks.some((block) => block.type === 'html'), false);
});

test('preserves unsupported punctuation and empty input safely', () => {
  assert.deepEqual(parseRestrictedMarkdown(''), []);
  assert.equal(textValues(parseRestrictedMarkdown('5 > 3 and https://example.test/?x=1')), '5 > 3 and https://example.test/?x=1');
});

test('removes Help Center markdown and raw URLs when structured article cards are present', () => {
  const body = 'Use these steps.\n\n[Open the article](/help/article/whatsapp-ai-not-replying?locale=en)\nhttps://samche.ai/help/article/whatsapp-ai-not-replying';
  assert.equal(stripHelpArticleLinks(body), 'Use these steps.');
  assert.equal(stripHelpArticleLinks('Keep this plain explanation.'), 'Keep this plain explanation.');
});
