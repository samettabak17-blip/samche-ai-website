import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, arText, hasLocaleTranslation, publicLocaleCoverage, readLocale, readLocaleFromSearch, translateText, translationSourceForNode, trText, turkishRequiredKeys, writeLocale } from '../lib/samche-localization.mjs';
import { buildLeadSummary, buildWhatsAppSalesUrl, createInitialSalesState, generateSalesTurn } from '../lib/samche-sales-assistant.mjs';
import { resolveSamcheChatConfig, welcomeCopyForLocale } from '../lib/samche-chat-config.mjs';
import { addons, addonNotes, comparisonStateLegend, comparisonUsageNotes, interactionAllowanceCards, planInheritanceNotes, plans, platformFeatureGroups, productModules } from '../lib/site-data.mjs';

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

test('Turkish is a persistent LTR locale with complete core pricing and chat copy', () => {
  const storage = storageMock();
  assert.equal(writeLocale('tr', storage), 'tr');
  assert.equal(readLocale(storage), 'tr');
  assert.equal(readLocaleFromSearch('?locale=tr'), 'tr');
  for (const [english, turkish] of [
    ['Platform Feature Comparison', 'Platform Özellik Karşılaştırması'], ['Included', 'Dahil'], ['Not included', 'Dahil değil'],
    ['Monthly AI Interactions', 'Aylık AI Etkileşimleri'], ['Dedicated Support', 'Özel Destek'],
    ['Human Handover', 'İnsan Temsilciye Devir'], ['Lead Qualification', 'Potansiyel Müşteri Nitelendirme'],
    ['Product demos, plans, recommendations and product support', 'Ürün demoları, planlar, öneriler ve ürün desteği'], ['Ask SamChe AI', 'SamChe AI’ye Sor'],
  ]) assert.equal(translateText(english, 'tr'), turkish, english);
});

test('homepage hero is product-led and natural in every public locale', () => {
  assert.equal(translateText('ONE AI PLATFORM.', 'en'), 'ONE AI PLATFORM.');
  assert.equal(translateText('AUTOMATE CUSTOMER COMMUNICATION,', 'en'), 'AUTOMATE CUSTOMER COMMUNICATION,');
  assert.equal(translateText('WORKFLOWS AND OPERATIONS.', 'en'), 'WORKFLOWS AND OPERATIONS.');
  assert.equal(translateText('ONE AI PLATFORM.', 'tr'), 'MÜŞTERİ İLETİŞİMİNİ,');
  assert.equal(translateText('AUTOMATE CUSTOMER COMMUNICATION,', 'tr'), 'İŞ AKIŞLARINI VE OPERASYONLARI');
  assert.equal(translateText('WORKFLOWS AND OPERATIONS.', 'tr'), 'TEK AI PLATFORMUNDA OTOMATİKLEŞTİRİN.');
  assert.match(translateText('ONE AI PLATFORM.', 'ar'), /منصة/);
  assert.match(translateText('AUTOMATE CUSTOMER COMMUNICATION,', 'ar'), /تواصل العملاء/);
});

test('static chatbot welcome copy follows the selected site locale without cross-language fallback', () => {
  assert.deepEqual(welcomeCopyForLocale('en'), {
    title: 'Your SamChe AI sales and product support assistant',
    message: 'Hello! I can help you with SamChe AI products, plans, features and product support. If you need guidance or troubleshooting, tell me what you’re trying to do and I’ll assist you step by step.',
  });
  assert.deepEqual(welcomeCopyForLocale('tr'), {
    title: 'SamChe AI satış ve ürün destek asistanınız',
    message: 'Merhaba! SamChe AI ürünleri, paketler, özellikler ve ürün desteği konusunda yardımcı olabilirim. Bir konuda yönlendirme veya sorun giderme desteğine ihtiyacınız varsa ne yapmak istediğinizi yazın, size adım adım yardımcı olayım.',
  });
  assert.deepEqual(welcomeCopyForLocale('ar'), {
    title: 'مساعد المبيعات ودعم المنتجات من SamChe AI',
    message: 'مرحبًا! يمكنني مساعدتك في منتجات SamChe AI والباقات والميزات ودعم المنتج. إذا كنت بحاجة إلى إرشاد أو مساعدة في حل مشكلة، فأخبرني بما تحاول القيام به وسأساعدك خطوة بخطوة.',
  });
  for (const locale of ['en', 'tr', 'ar']) {
    const config = resolveSamcheChatConfig({}, locale);
    const copy = welcomeCopyForLocale(locale);
    assert.equal(config.welcome_title, copy.title);
    assert.equal(config.welcome_message, copy.message);
  }
});

test('every declared public route string has an explicit Arabic and Turkish translation', () => {
  for (const [route, strings] of Object.entries(publicLocaleCoverage)) {
    for (const source of strings) {
      assert.ok(hasLocaleTranslation(source, 'tr'), `Turkish translation missing for ${route}: ${source}`);
      assert.ok(hasLocaleTranslation(source, 'ar'), `Arabic translation missing for ${route}: ${source}`);
      assert.notEqual(translateText(source, 'tr'), source, `Turkish fallback leaked on ${route}: ${source}`);
      assert.notEqual(translateText(source, 'ar'), source, `Arabic fallback leaked on ${route}: ${source}`);
    }
  }
  assert.ok(Object.keys(arText).length > 0);
  assert.ok(Object.keys(trText).length > 0);
});

test('Turkish selector is always available outside the mobile menu and keeps LTR direction', async () => {
  const { readFile } = await import('node:fs/promises');
  const localization = await readFile(new URL('../app/components/site-localization.tsx', import.meta.url), 'utf8');
  const shell = await readFile(new URL('../app/components/site-shell.tsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(localization, /type Locale = 'en' \| 'ar' \| 'tr'/);
  assert.match(localization, />TR</);
  assert.doesNotMatch(shell, /<details className="mobile-nav">[\s\S]*<LanguageSwitcher compact/);
  assert.doesNotMatch(css, /\.site-header > \.language-switcher \{ display:none/);
  assert.match(css, /\[data-locale="tr"\][^{]*\{[^}]*direction:ltr/);
});

test('every required Turkish public string has an explicit dictionary entry', () => {
  for (const source of turkishRequiredKeys) assert.ok(Object.hasOwn(trText, source), source);
});

test('Turkish and Arabic localize every customer-facing string from shared platform and pricing data', () => {
  const sharedCopy = [
    ...plans.flatMap((plan) => [plan.name, plan.description, plan.cta, ...plan.features]),
    ...addons.flatMap((addon) => [addon.name, addon.description, addon.setup].filter(Boolean)),
    ...addonNotes,
    ...productModules.flatMap((module) => [module.name, module.status, module.description]),
    ...planInheritanceNotes,
    ...comparisonStateLegend.flatMap((item) => [item.state, item.description]),
    ...platformFeatureGroups.flatMap((group) => [group.label, ...group.rows.flatMap((row) => [row.label, ...row.values])]),
    ...comparisonUsageNotes,
    ...interactionAllowanceCards.flatMap((card) => [card.title, card.body]),
  ];

  for (const locale of ['tr', 'ar']) {
    for (const source of sharedCopy) {
      if (/^\d[\d,]*$/.test(source) || source === '—') continue;
      assert.notEqual(translateText(source, locale), source, `${locale} translation missing for: ${source}`);
    }
  }
});

test('main navigation exposes localized Product Support immediately before Contact', async () => {
  const { readFile } = await import('node:fs/promises');
  const shell = await readFile(new URL('../app/components/site-shell.tsx', import.meta.url), 'utf8');
  const nav = await readFile(new URL('../app/components/site-header-navigation.tsx', import.meta.url), 'utf8');
  assert.equal(translateText('Product Support', 'en'), 'Product Support');
  assert.equal(translateText('Product Support', 'tr'), 'Ürün Desteği');
  assert.equal(translateText('Product Support', 'ar'), 'دعم المنتجات');
  assert.match(nav, /href: '\/support', label: 'Product Support'/);
  assert.match(nav, /aria-current=\{isActive \? 'page' : undefined\}/);
  assert.match(nav, /usePathname/);
  assert.doesNotMatch(shell, /href: '\/support', label: 'Product Support'/);
});

test('support chat and footer labels stay localized in Turkish and Arabic', async () => {
  const { readFile } = await import('node:fs/promises');
  const widget = await readFile(new URL('../app/components/samche-chat-widget.tsx', import.meta.url), 'utf8');
  for (const source of ['I can only provide information about SamChe products and services.', 'Ask SamChe AI Assistant', 'Attach screenshot', 'Send message', 'Security', 'SamChe AI Platform home', 'SamChe AI Platform on GitHub']) {
    assert.notEqual(translateText(source, 'tr'), source, `Turkish fallback: ${source}`);
    assert.notEqual(translateText(source, 'ar'), source, `Arabic fallback: ${source}`);
  }
  assert.match(widget, /translateText\(config\.scope_disclaimer, locale\)/);
  assert.match(widget, /translateText\('Ask SamChe AI Assistant', locale\)/);
  assert.match(widget, /message\.time === 'Now' \? \(locale === 'tr' \? 'Şimdi'/);
  assert.match(widget, /renderAssistantText\(visibleText\)/);
  assert.match(widget, /timestamp\(locale\)/);
  assert.match(widget, /locale === 'tr' \? 'tr-TR'/);
});

test('Turkish and Arabic localize Enterprise visual, voice, FAQ, and compact comparison contracts', () => {
  const required = [
    'Core Channels', 'AI Visual', 'AI Voice', 'Omnichannel Conversation Context',
    'AI Visual Generation', 'Visual Product Personalization', 'Screenshot / Image Understanding',
    'AI Visual Generations', 'Inbound Voice Minutes', 'Concurrent AI Calls', 'Outbound AI Calling',
    '200 / month included', '300 min / month included', '2 concurrent calls included',
    '200 / month', '300 / month', '2 calls', '200/mo', '300 min', 'Upgrade',
    'Is AI Voice included in Enterprise?',
    'Enterprise includes the base AI Voice Receptionist entitlement with 300 inbound minutes per month and up to 2 concurrent AI calls. Additional minutes, higher concurrency, Voice AI Pro, and outbound calling are available separately.',
    'What is included with AI Visual Generation?',
    'Enterprise includes one shared allowance of 200 AI Visual Generations per month across enabled AI Visual Generation and Visual Product Personalization experiences. Additional usage is available by agreed scope.',
    'What happens when Enterprise exceeds included voice or visual usage?',
    'Additional usage is handled through an agreed usage-based or custom commercial arrangement. Automatic billing, rollover, or suspension is not assumed unless separately contracted.',
  ];
  for (const locale of ['tr', 'ar']) {
    for (const source of required) {
      assert.ok(hasLocaleTranslation(source, locale), `${locale} explicit translation missing: ${source}`);
      assert.notEqual(translateText(source, locale), source, `${locale} fallback: ${source}`);
    }
  }
});

test('visible customer-facing UI fragments never fall back to English in Turkish or Arabic', () => {
  const expectations = {
    tr: {
      'CORE PLATFORM CAPABILITIES · AI ASSISTANTS · KNOWLEDGE INTELLIGENCE · LIVE INBOX · CRM & PIPELINE · AI GUIDE': 'TEMEL PLATFORM YETENEKLERİ · AI ASİSTANLARI · BİLGİ ZEKÂSI · CANLI GELEN KUTUSU · CRM VE SATIŞ HATTI · AI REHBER',
      'Configure business-specific assistants and manage their behavior from the tenant workspace.': 'İşletmenize özel AI asistanlarını yapılandırın ve davranışlarını çalışma alanından yönetin.',
      'Yes': 'Evet', 'No': 'Hayır', 'Attach screenshot': 'Ekran görüntüsü ekle', 'Remove attachment': 'Eki kaldır',
      'From AED 12,500 / month': 'Başlangıç AED 12.500 / ay', 'AED 2,500 one-time': 'Tek seferlik AED 2.500',
    },
    ar: {
      'CORE PLATFORM CAPABILITIES · AI ASSISTANTS · KNOWLEDGE INTELLIGENCE · LIVE INBOX · CRM & PIPELINE · AI GUIDE': 'إمكانات المنصة الأساسية · المساعدات الذكية · إدارة المعرفة الذكية · صندوق المحادثات الموحد · إدارة العملاء ومسار المبيعات · مرشد الذكاء الاصطناعي',
      'Yes': 'نعم', 'No': 'لا', 'Attach screenshot': 'إرفاق لقطة شاشة', 'Remove attachment': 'إزالة المرفق',
      'From AED 12,500 / month': 'ابتداءً من AED 12,500 / شهرياً', 'AED 2,500 one-time': 'AED 2,500 لمرة واحدة',
    },
  };
  for (const [locale, values] of Object.entries(expectations)) {
    for (const [source, expected] of Object.entries(values)) {
      assert.equal(translateText(source, locale), expected, `${locale}: ${source}`);
    }
  }
});

test('route and chatbot visible copy has no unintended English fallback', () => {
  const visibleCopy = [
    'Manage knowledge sources, processing states and grounded retrieval previews.',
    'Review conversations, reply as a team, and manage AI or human handling where supported.',
    'Work with leads and pipeline records inside the workspace.',
    'Tenant Analytics', 'Multi-channel AI', 'Tenant workspaces', 'Tenant analytics', 'Team / workspace settings',
    'Real Estate', 'Hospitality', 'Professional Services', 'Automotive', 'Healthcare', 'E-commerce', 'Startups & SMEs',
    'Team and workspace settings', 'Subscription billing period', 'SamChe AI plan comparison',
    'Your requirements', 'Product shortcuts', 'Product demos', 'Sales next steps',
    'Main requirement', 'Lead qualification', 'External integrations', 'AI lead scoring', 'Team users',
    'Matching your requirements to SamChe AI products…', 'Understanding your requirements…',
    'Close chat', 'Attach a PNG, JPG, or WEBP screenshot up to 5 MB.',
    'From', '/ month', '/ year', 'one-time', 'Yes · Custom', 'Yes · Scope', '1 CRM/Booking',
    'API / custom workflows', 'Preferred demo date', 'Preferred demo time', 'Recommended plan', 'Likely plan',
    'Mobile navigation', 'Not selected',
  ];
  for (const locale of ['tr', 'ar']) {
    for (const source of visibleCopy) assert.notEqual(translateText(source, locale), source, `${locale} fallback: ${source}`);
  }
});

test('Turkish localizes compact prices and every lead-summary label', () => {
  const expectations = {
    'AED 1,500/month': 'Aylık AED 1.500',
    'From AED 1,990/month': 'Aylık AED 1.990’dan başlayan fiyatlarla',
    'From AED 3,990/month': 'Aylık AED 3.990’dan başlayan fiyatlarla',
    'Email': 'E-posta', 'Industry': 'Sektör', 'Country': 'Ülke', 'Website': 'Web sitesi', 'Business': 'İşletme',
    'Products': 'Ürünler', 'Integrations': 'Entegrasyonlar', 'Monthly enquiries': 'Aylık talepler', 'Timeline': 'Zaman çizelgesi',
    'Contact preference': 'İletişim tercihi', 'Required': 'Gerekli', 'Channels': 'Kanallar',
    'Live Inbox / Conversations': 'Canlı Gelen Kutusu / Konuşmalar', 'Platform capabilities': 'Platform yetenekleri',
  };
  for (const [source, expected] of Object.entries(expectations)) assert.equal(translateText(source, 'tr'), expected, source);
});

test('Turkish and Arabic localize route-owned platform and plan recommendation copy without mixed-language fragments', () => {
  const routeCopy = [
    'Configure customer-facing, guided AI experiences beyond a simple Q&A exchange.',
    'See workspace KPIs and date-filtered analytics in the dashboard.',
    'Bring Web Chatbot, WhatsApp AI and AI Guide into connected customer operations.',
    'Keep product areas organized around a customer workspace and its configuration.',
    '12 · Choose your starting point', 'CHOOSE YOUR STARTING POINT', 'Which plan is right for you?', 'Explore plan ↗',
  ];
  for (const locale of ['tr', 'ar']) {
    for (const source of routeCopy) assert.notEqual(translateText(source, locale), source, `${locale} route translation missing for: ${source}`);
  }
  assert.equal(translateText(routeCopy[2], 'tr'), 'Web Sohbet Botu, WhatsApp Yapay Zekâ ve AI Rehberi müşteri operasyonlarında birlikte kullanın.');
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

test('Arabic localization covers every AI interaction allowance concept', () => {
  for (const text of [
    'Understanding Your Monthly AI Interactions',
    'Each plan includes a monthly allowance for AI-powered customer interactions across supported SamChe AI channels.',
    'Monthly Allowance', 'What Counts', 'What Does Not Count', 'Voice AI Usage', 'Higher Usage', 'Billing Period',
    'OpenAI tokens', 'Gemini tokens', 'website visits', 'human-only inbox activity',
    'What happens if I exceed my monthly AI interaction allowance?',
  ]) assert.match(translateText(text, 'ar'), /\p{Script=Arabic}/u, `Arabic translation missing for: ${text}`);
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
