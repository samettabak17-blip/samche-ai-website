import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('chat panel stays mounted with an immediate open state and ready composer', async () => {
  const source = await readFile(new URL('../app/components/samche-chat-widget.tsx', import.meta.url), 'utf8');
  assert.match(source, /className=\{`samche-chat-panel\$\{open \? ' is-open' : ''\}/);
  assert.match(source, /aria-hidden=\{!open\}/);
  assert.doesNotMatch(source, /disabled=\{!hydrated\}/);
  assert.doesNotMatch(source, /sending \|\| !hydrated/);
  assert.doesNotMatch(source, /setTimeout\(\(\) => \{[\s\S]*loadChatSession/);
  assert.match(source, /saveChatSession\([^;]+context:/s);
  assert.match(source, /New Chat/);
  assert.match(source, /Yeni Sohbet/);
  assert.match(source, /محادثة جديدة/);
});

test('chat restoration is independent from the launcher click path', async () => {
  const source = await readFile(new URL('../app/components/samche-chat-widget.tsx', import.meta.url), 'utf8');
  const launcher = source.match(/<button id="samche-chat-launcher"[^\n]+/)?.[0] || '';
  assert.match(launcher, /setOpen/);
  assert.doesNotMatch(launcher, /loadChatSession|JSON\.parse|scrollTo|focus/);
  assert.match(source, /clearChatSession\(\);[\s\S]*?saveChatSession/);
  assert.match(source, /pointer:\s*fine/);
  assert.match(source, /requestAnimationFrame/);
});

test('chat open path emits browser timing marks for panel visibility and composer readiness', async () => {
  const source = await readFile(new URL('../app/components/samche-chat-widget.tsx', import.meta.url), 'utf8');
  assert.match(source, /samche-chat-open-click/);
  assert.match(source, /samche-chat-panel-visible/);
  assert.match(source, /samche-chat-composer-ready/);
  assert.match(source, /performance\.measure\('samche-chat-click-to-panel'/);
  assert.match(source, /performance\.measure\('samche-chat-click-to-composer'/);
  assert.match(source, /dataset\.samcheChatPanelMs/);
  assert.match(source, /dataset\.samcheChatComposerMs/);
});

test('chat panel uses a short transform transition and removes motion for reduced-motion users', async () => {
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /\.samche-chat-panel\s*\{[^}]*transition:opacity 120ms ease,transform 120ms ease/s);
  assert.match(css, /\.samche-chat-panel\.is-open\s*\{[^}]*visibility:visible[^}]*pointer-events:auto/s);
  assert.match(css, /\.samche-chat-panel\s*\{[^}]*transform:translateY\(6px\) scale\(\.985\)/s);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*?\.samche-chat-panel\s*\{[^}]*transition:none/s);
});

test('chat panel retains mobile viewport, safe-area, keyboard and attachment layout contracts', async () => {
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /\.samche-chat-panel\s*\{[^}]*100svh/s);
  assert.match(css, /env\(safe-area-inset-bottom\)/s);
  assert.match(css, /\.samche-chat-panel\.samche-keyboard-open/);
  assert.match(css, /\.samche-chat-panel\.samche-keyboard-open \.samche-attachment-preview/);
});
