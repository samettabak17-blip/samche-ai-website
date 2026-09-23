import { readFile } from 'node:fs/promises';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3100';
const examples = [
  { file: '../tests/fixtures/order-sc-4827.png', question: 'Bu ekrandaki sipariş numarası nedir?', expected: 'SC-4827' },
  { file: '../tests/fixtures/dashboard-channels.png', question: 'Bu ekranda hangi bölüm açık?', expected: 'WhatsApp AI' },
];
let prior = [];
for (const [index, example] of examples.entries()) {
  const attachment = { mimeType: 'image/png', data: (await readFile(new URL(example.file, import.meta.url))).toString('base64') };
  const response = await fetch(`${baseUrl}/api/sales-chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userMessage: example.question, conversationHistory: prior, attachment }) });
  const body = await response.json();
  console.log(JSON.stringify({ stage: `image_${index + 1}`, status: response.status, matched: typeof body.reply === 'string' && body.reply.includes(example.expected), reply: body.reply || null, error: body.error || null }));
  prior = [{ role: 'user', text: example.question, imageContext: true }, { role: 'assistant', text: body.reply || '' }];
  if (index === 1) {
    const next = await fetch(`${baseUrl}/api/sales-chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userMessage: 'Burada nereden yapacağım?', conversationHistory: prior, attachment }) });
    const followUp = await next.json();
    console.log(JSON.stringify({ stage: 'image_follow_up', status: next.status, grounded: typeof followUp.reply === 'string' && /Channels|WhatsApp|Kanal/i.test(followUp.reply), reply: followUp.reply || null, error: followUp.error || null }));
  }
}
