import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, readLocale, readLocaleFromSearch, translateText, translationSourceForNode, writeLocale } from '../lib/samche-localization.mjs';
import { buildLeadSummary, buildWhatsAppSalesUrl, createInitialSalesState, generateSalesTurn } from '../lib/samche-sales-assistant.mjs';

function storageMock() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

test('English is the default locale and Arabic preference persists independently', () => {
  const storage = storageMock();
  assert.equal(DEFAULT_LOCALE, 'en');
  assert.equal(readLocale(storage), 'en');
  assert.equal(writeLocale('ar', storage), 'ar');
  assert.equal(storage.getItem(LOCALE_STORAGE_KEY), 'ar');
  assert.equal(readLocale(storage), 'ar');
  assert.equal(writeLocale('en', storage), 'en');
  assert.equal(readLocale(storage), 'en');
});

test('DOM localization preserves React updates to dynamic text and restores its source across locales', () => {
  const monthlyEnglish = 'AED 1,790 / month';
  const monthlyArabic = translateText(monthlyEnglish, 'ar');
  const monthlyRecord = { source: monthlyEnglish, translated: monthlyArabic };

  const reactYearlyEnglish = 'AED 18,258 / year';
  assert.equal(translationSourceForNode(reactYearlyEnglish, monthlyRecord), reactYearlyEnglish);

  const yearlyArabic = translateText(reactYearlyEnglish, 'ar');
  const yearlyRecord = { source: reactYearlyEnglish, translated: yearlyArabic };
  assert.equal(translationSourceForNode(yearlyArabic, yearlyRecord), reactYearlyEnglish);
});

test('locale preference falls back to a first-party cookie when local storage is blocked', () => {
  const priorDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const documentMock = { cookie: '' };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: documentMock });
  try {
    const blockedStorage = { getItem() { throw new Error('storage blocked'); }, setItem() { throw new Error('storage blocked'); } };
    assert.equal(writeLocale('ar', blockedStorage), 'ar');
    assert.match(documentMock.cookie, /samche_ai_locale_v1=ar/);
    assert.equal(readLocale(blockedStorage), 'ar');
  } finally {
    if (priorDocument) Object.defineProperty(globalThis, 'document', priorDocument);
    else delete globalThis.document;
  }
});

test('Arabic locale can be restored from a URL while preserving existing plan context', () => {
  assert.equal(readLocaleFromSearch('?plan=growth&locale=ar'), 'ar');
  assert.equal(readLocaleFromSearch('?plan=growth&locale=en'), 'en');
  assert.equal(readLocaleFromSearch('?plan=growth'), null);
});

test('Arabic resource strings translate navigation, prices, and plan copy', () => {
  assert.equal(translateText('Pricing', 'ar'), 'الأسعار');
  assert.equal(translateText('Security & Privacy', 'ar'), 'الأمان والخصوصية');
  assert.equal(translateText('AED 3,990 / month', 'ar'), 'AED 3,990 / شهرياً');
  assert.equal(translateText('MOST POPULAR', 'ar'), 'الأكثر اختياراً');
  assert.equal(translateText('GROWTH', 'ar'), 'النمو');
  assert.equal(translateText('API Access', 'ar'), 'الوصول إلى API');
  assert.equal(translateText('Custom Workflows', 'ar'), 'مسارات عمل مخصصة');
});

test('Arabic page copy covers privacy, platform, security, contact and orb helper text', () => {
  const sourceCopy = [
    'This policy covers the SamChe AI website and the demo/contact links presented here.',
    'Product modules for customer-facing AI and team workflows.',
    'Each customer works within a tenant context.',
    'Try a customer-facing product experience, then share your product or subscription requirements with our team.',
    'Choose the right SamChe AI plan.',
    'Monthly subscriptions and transparent one-time setup fees for the SamChe AI Platform.',
    'Customers operate in their own tenant/workspace context. The dashboard selects a tenant before opening its workspace areas, and product APIs use tenant-aware routes. This describes the platform architecture; it is not a claim that unauthorized access is impossible.',
    'The platform includes sign-in, invitation acceptance, password reset, team membership, and tenant-scoped dashboard access flows. The public product materials do not claim SSO, SCIM, MFA, granular RBAC, or enterprise identity management.',
    'When you submit the Contact form, the name, work email, company, role, selected product or plan, and message you enter are processed by a service provider on behalf of the SamChe AI team so we can review and respond to your enquiry. We use these details for product demonstrations and subscription enquiries.',
    'Some demo links open separate customer-facing product experiences. Information entered in those experiences is handled according to the privacy terms presented there. The WhatsApp demo opens a conversation with the approved SamChe AI number and may include a short message that you can review before sending. Do not include sensitive or confidential information in a public demo conversation.',
    'The form confirms when your enquiry has been received.',
    'This page does not state specific encryption standards, storage regions, or default retention periods.',
    'The platform includes sign-in, invitation acceptance, password reset, team membership, and tenant-scoped dashboard access flows.',
    'Your enquiry will be reviewed by the SamChe AI sales team. See the',
    'No subscription is activated until the commercial scope is confirmed with you.',
    'Monthly subscription',
    'ASK ME',
    'API Access',
    'Custom Workflows',
    'Choose language',
    'Tenant overview pages surface workspace KPIs and date-filtered analytics.',
    'Manage sources and test grounded answers.',
    'Connected experiences',
    'Verified existing asset',
    'Private sample details obscured',
  ];
  for (const text of sourceCopy) {
    assert.match(translateText(text, 'ar'), /\p{Script=Arabic}/u, `Arabic translation missing for: ${text}`);
  }
});

test('Arabic chatbot opens with a professional discovery question and keeps sales state', () => {
  let turn = generateSalesTurn(createInitialSalesState(), 'أحتاج حلاً بالذكاء الاصطناعي لشركتي', [], 'ar');
  assert.match(turn.reply, /ما طبيعة نشاط شركتكم/);
  assert.equal(turn.state.intent, 'COLD');
  turn = generateSalesTurn(turn.state, 'نحن شركة عقارية في دبي', [], 'ar');
  assert.equal(turn.state.lead.industry, 'Real Estate');
  assert.equal(turn.state.lead.country, 'United Arab Emirates');
  assert.match(turn.reply, /استفسارات العملاء|موقعكم الإلكتروني/);
  turn = generateSalesTurn(turn.state, 'معظم الاستفسارات عبر الموقع وواتساب', [], 'ar');
  assert.deepEqual(turn.state.lead.channels, ['Website', 'WhatsApp']);
  assert.match(turn.reply, /يمكن لـ SamChe AI دعم موقعكم وWhatsApp/);
  assert.match(turn.reply, /كم استفساراً من العملاء/);
});

test('Arabic WhatsApp handoff keeps the approved number and localizes the summary', () => {
  const lead = createInitialSalesState().lead;
  const message = buildLeadSummary(lead, 'ar');
  const url = buildWhatsAppSalesUrl(lead, 'ar');
  assert.match(message, /استفسار مبيعات — SamChe AI/);
  assert.match(message, /بيانات العميل المحتمل/);
  assert.match(message, /لم تتم مشاركته بعد/);
  assert.match(url, /^https:\/\/wa\.me\/971506941372\?text=/);
  assert.ok(decodeURIComponent(url).includes('القنوات'));
});

test('clear-chat implementation leaves the independent locale preference untouched', async () => {
  const { readFile } = await import('node:fs/promises');
  const widget = await readFile(new URL('../app/components/samche-chat-widget.tsx', import.meta.url), 'utf8');
  const persistence = await readFile(new URL('../lib/samche-chat-persistence.mjs', import.meta.url), 'utf8');
  assert.match(widget, /clearChatSession\(\)/);
  assert.doesNotMatch(persistence, /samche_ai_locale_v1/);
  assert.match(widget, /generateSalesTurn\(salesStateRef\.current, trimmed, messages, locale\)/);
});

test('the restored locale is written only after preference hydration', async () => {
  const { readFile } = await import('node:fs/promises');
  const provider = await readFile(new URL('../app/components/site-localization.tsx', import.meta.url), 'utf8');
  assert.match(provider, /if\s*\(!ready\)\s*return;\s*writeLocale\(locale\);/);
  assert.match(provider, /readLocaleFromSearch\(window\.location\.search\)/);
  assert.match(provider, /preserveLocaleOnInternalNavigation/);
});

test('localized price strings can wrap without escaping their plan cards', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /\.plan-price,\s*\.home-plan-price\s*\{[^}]*white-space:\s*normal[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.localized-site\[data-locale="ar"\]\s+:is\(\.plan-price,\s*\.home-plan-price\)\s*\{[^}]*unicode-bidi:\s*isolate/s);
});
