import test from 'node:test';
import assert from 'node:assert/strict';
import { plans, addons, demoLinks, planComparisonRows, platformFeatureGroups, interactionAllowanceCards, planFromSearch, productScreenshots, yearlyPrice } from '../lib/site-data.mjs';
import { getSamcheChatReply, sendSamcheChatMessage } from '../lib/samche-chat.mjs';
import { defaultSamcheChatConfig } from '../lib/samche-chat-config.mjs';

test('approved annual plan prices remain exact', () => {
  assert.deepEqual(plans.map((plan) => plan.monthly), [1790, 3990, 7990, 12500]);
  assert.deepEqual(plans.map((plan) => plan.setup), [2500, 5000, 9500, 20000]);
  assert.deepEqual(plans.map((plan) => plan.yearly), [18258, 40698, 81498, 127500]);
  assert.deepEqual(plans.map((plan) => plan.interactions), ['5,000', '20,000', '50,000', '100,000+']);
});

test('Automation / Agentic AI remains roadmap-only', async () => {
  const { productModules } = await import('../lib/site-data.mjs');
  assert.equal(productModules.find((module) => module.name === 'Automation / Agentic AI')?.status, 'Roadmap / Upcoming');
  assert.equal(productModules.find((module) => module.name === 'Dashboard & Tenant Analytics')?.status, 'Available');
});

test('annual display preserves Enterprise From pricing', () => {
  assert.equal(yearlyPrice(plans[0]), 'AED 18,258 / year');
  assert.equal(yearlyPrice(plans[3]), 'From AED 127,500 / year');
});

test('pricing cards bind all four displayed prices to one shared billing state and keep monthly allowances separate', async () => {
  const { readFile } = await import('node:fs/promises');
  const component = await readFile(new URL('../app/components/pricing-table.tsx', import.meta.url), 'utf8');
  assert.match(component, /const \[billing, setBilling\] = useState<'monthly' \| 'yearly'>\('monthly'\)/);
  assert.match(component, /amount: \(yearly \? plan\.yearly : plan\.monthly\)/);
  assert.match(component, /yearly \? 'Billed annually' : 'Subscription billed monthly'/);
  assert.match(component, /setupPrice\(plan\)/);
  assert.match(component, /plan\.interactions/);
  assert.match(component, /price-prefix/);
  assert.match(component, /price-amount/);
  assert.match(component, /price-period/);
  assert.doesNotMatch(component, /yearlyInteractions|annualInteractions|yearlySetup/);
});

test('pricing feature list uses compact logical-direction verification markers', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /\.plan-features li\s*\{[^}]*padding-inline-start:\s*18px/s);
  assert.match(css, /\.plan-features li:before\s*\{[^}]*inset-inline-start:\s*0/s);
  assert.match(css, /border-radius:\s*50%/);
});

test('contact plan query selects only approved plan slugs', () => {
  for (const slug of ['starter', 'growth', 'business', 'enterprise']) {
    assert.equal(planFromSearch(`?plan=${slug}`), slug);
  }
  assert.equal(planFromSearch('?plan=unknown'), '');
});

test('approved add-ons and external demos use the approved values', () => {
  assert.deepEqual(addons.map((addon) => addon.name), [
    'Enhanced AI Capability', 'AI Voice Receptionist', 'Voice AI Pro',
  ]);
  assert.equal(demoLinks.webChatbot, 'https://demo.samchecompany.com/');
  assert.equal(demoLinks.whatsapp, 'https://wa.me/971506941372?text=Hello%2C%20I%20would%20like%20to%20try%20the%20SamChe%20AI%20demo.');
  assert.equal(demoLinks.aiGuide, 'https://rehber.samchecompany.ae/');
  assert.match(productScreenshots.knowledgeIntelligence, /^https:\/\/assets\.zyrosite\.com\//);
});

test('comparison source data remains limited to approved plan features', () => {
  assert.ok(planComparisonRows.length >= 22);
  assert.ok(planComparisonRows.every((row) => row.values.length === 4));
  const rows = Object.fromEntries(planComparisonRows.map((row) => [row.label, row.values]));
  assert.deepEqual(rows.Languages, ['Up to 2', 'Up to 3', 'Up to 5', 'Extended / Custom']);
  assert.deepEqual(rows['AI Guide'], ['Not included', 'Not included', 'Included', 'Included']);
  assert.deepEqual(rows['Custom Data Retention'], ['Not included', 'Not included', 'Not included', 'Custom']);
  assert.equal(rows['Team Users'][0], 'Standard access');
  assert.equal(rows['Team Users'][1], 'Up to 5');
  assert.equal(rows['Team Users'][2], 'Up to 10');
});

test('platform feature comparison replaces the old pricing-only matrix', async () => {
  const { readFile } = await import('node:fs/promises');
  const component = await readFile(new URL('../app/components/pricing-table.tsx', import.meta.url), 'utf8');
  for (const label of ['Platform Feature Comparison', 'platformFeatureGroups', 'interactionAllowanceCards']) assert.ok(component.includes(label), `comparison should include ${label}`);
  for (const plan of ['STARTER', 'GROWTH', 'BUSINESS', 'ENTERPRISE']) assert.ok(component.includes(`data-plan={plan.slug}`) || component.includes(plan), `comparison should include ${plan}`);
  assert.doesNotMatch(component, /Monthly subscription.*Yearly subscription.*One-time setup/s);
  assert.match(component, /Platform Feature Comparison/);
  assert.doesNotMatch(component, /overflow-x\s*:\s*auto/);
});

test('platform comparison and FAQ provide accessible bilingual contracts', async () => {
  const { readFile } = await import('node:fs/promises');
  const faq = await readFile(new URL('../app/components/platform-faq.tsx', import.meta.url), 'utf8');
  const pricing = await readFile(new URL('../app/pricing/page.tsx', import.meta.url), 'utf8');
  const pricingTable = await readFile(new URL('../app/components/pricing-table.tsx', import.meta.url), 'utf8');
  const localization = await readFile(new URL('../lib/samche-localization.mjs', import.meta.url), 'utf8');
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  for (const text of ['What is SamChe AI Platform?', 'Which AI channels can I use?', 'Can SamChe AI learn from my business documents?', 'Can a human take over an AI conversation?', 'Can SamChe AI be configured for multiple brands or websites?']) assert.ok(faq.includes(text), `FAQ should include ${text}`);
  for (const text of ['ما هي منصة SamChe AI؟', 'ما القنوات التي يدعمها SamChe AI؟', 'هل يستطيع SamChe AI التعلم من مستندات أعمالي؟', 'هل يمكن للإنسان تولي المحادثة؟', 'هل يمكن إعداد SamChe AI لعلامات أو مواقع متعددة؟']) assert.ok(localization.includes(text), `Arabic FAQ should include ${text}`);
  assert.match(faq, /<details/);
  assert.match(faq, /<summary/);
  assert.match(faq, /aria-controls/);
  assert.match(pricing, /PricingTable/);
  assert.match(pricingTable, /<PlatformFAQ \/>/);
  assert.match(css, /\.platform-faq/);
  assert.match(css, /\.platform-faq.*data-locale="ar"|data-locale="ar".*\.platform-faq/s);
});

test('expanded platform comparison uses cumulative explicit capability states', () => {
  assert.ok(platformFeatureGroups.length >= 6);
  const rows = platformFeatureGroups.flatMap((group) => group.rows);
  assert.ok(rows.length >= 30);
  assert.ok(rows.every((row) => row.values.length === 4));
  const rank = { 'Not included': 0, Roadmap: 0, 'Add-on': 1, 'By scope': 1, Custom: 1, Included: 2 };
  for (const row of rows) {
    for (let index = 1; index < row.values.length; index += 1) {
      if (rank[row.values[index - 1]] === 2) assert.match(row.values[index], /^Included/, `${row.label} must be inherited by ${index}`);
    }
  }
  assert.ok(rows.every((row) => row.values.every((value) => value !== '—' && value !== '-')));
  assert.ok(rows.some((row) => row.label === 'Agentic AI / Skills / Actions / Workflow Engine' && row.note));
  assert.deepEqual(rows.find((row) => row.label === 'Monthly AI Interactions')?.values, ['5,000 / month', '20,000 / month', '50,000 / month', '100,000+ / month']);
});

test('interaction allowance explanation is present and separates Voice AI usage', async () => {
  assert.equal(interactionAllowanceCards.length, 4);
  const copy = interactionAllowanceCards.map((card) => `${card.title} ${card.body}`).join(' ');
  for (const value of ['5,000 interactions / month', '20,000 interactions / month', '50,000 interactions / month', '100,000+ interactions / month']) assert.match(copy, new RegExp(value.replace(/[+,]/g, '\\$&')));
  assert.match(copy, /Voice AI/);
  assert.match(copy, /separate usage-based pricing/i);
  assert.doesNotMatch(copy, /automatic rollover|automatic billing|fair use/i);
});

test('platform page renders the same shared FAQ component as pricing', async () => {
  const { readFile } = await import('node:fs/promises');
  const faq = await readFile(new URL('../app/components/platform-faq.tsx', import.meta.url), 'utf8');
  const platform = await readFile(new URL('../app/platform/page.tsx', import.meta.url), 'utf8');
  assert.match(faq, /export const platformFaqItems/);
  assert.match(platform, /import \{ PlatformFAQ \} from ['"]\.\.\/components\/platform-faq['"];?/);
  assert.match(platform, /<PlatformFAQ \/>/);
  assert.doesNotMatch(platform, /What is SamChe AI Platform\?/);
});

test('comparison and allowance sections declare bilingual and mobile-safe contracts', async () => {
  const { readFile } = await import('node:fs/promises');
  const component = await readFile(new URL('../app/components/pricing-table.tsx', import.meta.url), 'utf8');
  const data = await readFile(new URL('../lib/site-data.mjs', import.meta.url), 'utf8');
  const localization = await readFile(new URL('../lib/samche-localization.mjs', import.meta.url), 'utf8');
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  for (const text of ['Core AI foundation', 'Everything in Starter + growth capabilities', 'Understanding Your AI Interaction Allowance', 'Monthly Allowance', 'What Counts', 'Voice AI', 'Higher Usage']) assert.ok(component.includes(text) || data.includes(text), `missing ${text}`);
  for (const text of ['مقارنة ميزات المنصة', 'فهم حصة تفاعلات الذكاء الاصطناعي', 'البدل الشهري', 'ما الذي يُحتسب؟']) assert.ok(localization.includes(text), `missing Arabic ${text}`);
  assert.doesNotMatch(css, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.plan-comparison\s*\{[^}]*min-width:\s*820px/s);
  assert.doesNotMatch(css, /\.plan-comparison\s*\{[^}]*min-width:\s*(?:790|820)px/s);
  assert.match(css, /\.plan-comparison\s*\{[^}]*table-layout:\s*fixed/s);
});

test('homepage is a product-led SaaS sales journey with real-product evidence', async () => {
  const { readFile } = await import('node:fs/promises');
  const home = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  for (const required of [
    'ONE AI PLATFORM', 'LIVE PRODUCTS', 'ONE DASHBOARD', 'REAL PRODUCT SCREENSHOTS',
    'WEB CHATBOT VS AI GUIDE', 'KNOWLEDGE INTELLIGENCE', 'LIVE INBOX + CRM',
    'Which plan is right for you?', 'Automation / Agentic AI', 'sales@samche.ai',
  ]) assert.ok(home.includes(required), `homepage should include ${required}`);
  assert.ok(home.includes('ProductScreenshot'), 'homepage should show verified product evidence');
  assert.ok(!home.match(/consulting|consultancy|agency|company formation|custom IT project/i));
});

test('live product cards use captured real product screenshots', async () => {
  const { readFile, stat } = await import('node:fs/promises');
  const home = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  for (const asset of ['web-chatbot-real.png', 'ai-guide-real.png']) {
    assert.ok(home.includes(`/assets/product/${asset}`), `homepage should reference ${asset}`);
    const info = await stat(new URL(`../public/assets/product/${asset}`, import.meta.url));
    assert.ok(info.size > 10_000, `${asset} should contain a captured image`);
  }
  assert.match(home, /alt="Real Web Chatbot UI screenshot/);
  assert.match(home, /alt="Real AI Guide UI screenshot/);
  assert.ok(!home.match(/mockup|placeholder|fake screenshot/i));
});

test('comparison table includes all approved commercial rows', () => {
  const labels = new Set(planComparisonRows.map((row) => row.label));
  for (const label of [
    'Languages', 'Web Chatbot', 'WhatsApp AI', 'AI Guide', 'Advanced Knowledge Intelligence',
    'Entity-aware Intelligence', 'Page-aware Context', 'Basic Lead Capture', 'SamChe Shared Inbox',
    'Lead Qualification', 'AI Lead Scoring', 'CRM Integration',
    'External Integrations', 'API Access', 'Custom Workflows', 'Team Users',
    'Multiple Websites / Brands', 'ERP Integrations', 'Support Level', 'Custom Data Retention',
  ]) assert.ok(labels.has(label), `comparison should include ${label}`);
});

test('responsive pricing layout defines desktop, tablet and mobile columns', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /\.pricing-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,/s);
  assert.match(css, /@media\s*\(max-width:\s*1050px\)[\s\S]*?\.pricing-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.pricing-grid\s*\{[^}]*grid-template-columns:\s*1fr/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.desktop-nav,\s*\.header-cta\s*\{\s*display:\s*none/);
});

test('homepage hero decoration stays inside the viewport on RTL desktop', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /\.new-hero:before\s*\{[^}]*left:\s*0(?:px)?\s*;/s);
});

test('pricing controls are centered, cards have plan-colored hover emphasis, and header demo CTA is absent', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  const shell = await readFile(new URL('../app/components/site-shell.tsx', import.meta.url), 'utf8');
  assert.match(css, /\.billing-switch\s*\{[^}]*margin:\s*\d+px\s+auto\s+0/s);
  assert.match(css, /\.plan-card:hover[^}]*box-shadow:[^}]*color-mix\(in srgb,var\(--plan-accent\) 4\d%/s);
  assert.match(css, /\.language-switcher\s*\{[^}]*border:\s*1px solid[^;]*#e[0-9a-f]{5,}/i);
  assert.doesNotMatch(shell, /className="button button-small button-primary header-cta"/);
  assert.doesNotMatch(shell, /className="mobile-demo"/);
});

test('internal app links use native navigation instead of broken Vinext Link runtime', async () => {
  const { readFile } = await import('node:fs/promises');
  const files = [
    '../app/page.tsx', '../app/platform/page.tsx', '../app/security/page.tsx',
    '../app/privacy/page.tsx', '../app/components/site-shell.tsx',
    '../app/components/pricing-table.tsx',
  ];
  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8');
    assert.match(source, /from ['"].*internal-link['"];/, `${file} should use the native internal link component`);
    assert.doesNotMatch(source, /from ['"]next\/link['"];/, `${file} should not use Vinext Link`);
  }
  const internalLink = await readFile(new URL('../app/components/internal-link.tsx', import.meta.url), 'utf8');
  assert.match(internalLink, /return\s*<a\s+href=\{href\}/);
});

test('contact form submits enquiries to the approved endpoint with professional confirmation copy', async () => {
  const { readFile } = await import('node:fs/promises');
  const form = await readFile(new URL('../app/components/contact-form.tsx', import.meta.url), 'utf8');
  assert.ok(form.includes("fetch('/api/contact'"));
  assert.ok(form.includes('method: \'POST\''));
  assert.ok(form.includes('Your enquiry has been received.'));
  assert.ok(form.includes('Your enquiry will be reviewed by the SamChe AI sales team.'));
  assert.doesNotMatch(form, /Formspree/);
  assert.ok(form.includes('samche:website-chat-lead'));
  assert.ok(form.includes('message: lead.message'));
  assert.ok(form.includes('email: lead.email'));
});

test('footer includes the approved SamChe AI GitHub project link', async () => {
  const { readFile } = await import('node:fs/promises');
  const shell = await readFile(new URL('../app/components/site-shell.tsx', import.meta.url), 'utf8');
  assert.ok(shell.includes('samche.ai'));
  assert.match(shell, /https:\/\/github\.com\/samchecompany\/samche-ai-platform/);
  assert.match(shell, /aria-label="SamChe AI Platform on GitHub"/);
  assert.match(shell, /target="_blank" rel="noopener noreferrer"/);
});

test('SamChe chatbot refuses unrelated questions and answers approved product topics', () => {
  assert.match(getSamcheChatReply('What is the weather today?'), /only help with SamChe AI Platform/i);
  assert.match(getSamcheChatReply('What does SamChe cost?'), /AED 1,790.*one-time setup.*5,000 AI interactions per month/i);
  assert.match(getSamcheChatReply('Is agentic automation available?'), /Roadmap \/ Upcoming/);
  assert.match(getSamcheChatReply('Which product is right for me?'), /what type of business.*where do most enquiries arrive/i);
  assert.doesNotMatch(getSamcheChatReply('How do I get a demo?'), /https?:\/\//);
});

test('SamChe chatbot scopes backend requests and never forwards unrelated questions', async () => {
  let requestCount = 0;
  const fetchImpl = async (_url, options) => {
    requestCount += 1;
    const body = JSON.parse(options.body);
    assert.match(body.scope, /Politely refuse unrelated questions/);
    return { ok: true, json: async () => ({ answer: 'SamChe supports AI Assistants.' }) };
  };
  assert.match(await sendSamcheChatMessage('How do AI Assistants work?', { endpoint: '/api/chat', fetchImpl }), /AI Assistants/);
  assert.match(await sendSamcheChatMessage('Tell me a joke', { endpoint: '/api/chat', fetchImpl }), /only help with SamChe AI Platform/);
  assert.equal(requestCount, 1);
});

test('website chat presentation defaults cover dashboard-compatible content and approved orb identity', async () => {
  assert.equal(defaultSamcheChatConfig.assistant_display_name, 'SamChe AI Assistant');
  assert.equal(defaultSamcheChatConfig.launcher_label, 'Ask SamChe AI');
  assert.ok(defaultSamcheChatConfig.welcome_title);
  assert.ok(defaultSamcheChatConfig.welcome_message);
  assert.deepEqual(defaultSamcheChatConfig.quick_actions, ['Web Chatbot', 'AI Guide', 'WhatsApp AI', 'Pricing']);
  assert.match(defaultSamcheChatConfig.product_scope, /SamChe AI Platform.*pricing.*demos/i);
  assert.equal(defaultSamcheChatConfig.avatar_url, null);
  const { readFile } = await import('node:fs/promises');
  const widget = await readFile(new URL('../app/components/samche-chat-widget.tsx', import.meta.url), 'utf8');
  assert.ok(widget.includes('resolveSamcheChatConfig'));
  assert.ok(widget.includes('samche-orb-logo-wrap'));
  assert.ok(widget.includes('<header className="samche-chat-header"><Orb small header'));
  assert.ok(!widget.includes('<b>S</b><b>C</b>'));
  assert.ok(widget.includes('{open ? <svg'));
  assert.ok(!widget.includes('<span>{config.launcher_label}</span>'));
  assert.ok(widget.includes('YOUR REQUIREMENTS'));
  assert.ok(widget.includes('contextualQuickActions'));
  assert.ok(widget.includes('Clear conversation'));
  assert.ok(widget.includes('role="alertdialog"'));
  assert.ok(widget.includes('role="status"'));
  assert.ok(widget.includes('loadChatSession'));
  assert.ok(widget.includes('saveChatSession'));
  assert.ok(widget.includes('clearChatSession'));
  assert.ok(widget.includes('buildWhatsAppSalesUrl'));
  assert.match(widget, /href=\{buildWhatsAppSalesUrl\(salesState\.lead, locale\)\}/);
  assert.doesNotMatch(widget, /navigator\.clipboard|COPY SALES SUMMARY|whatsappFallbackSummary/);
  assert.doesNotMatch(widget, /sessionStorage\.setItem\(salesSessionKey/);
  const persistence = await readFile(new URL('../lib/samche-chat-persistence.mjs', import.meta.url), 'utf8');
  assert.ok(persistence.includes('samche_ai_chat_v1'));
  assert.ok(persistence.includes('version !== VERSION'));
  assert.ok(persistence.includes('removeItem(LEAD_HANDOFF_KEY)'));
  const layout = await readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8');
  assert.match(layout, /url:\s*["']\/samche-ai-platform-favicon-v3\.ico["']/);
  assert.match(layout, /apple:\s*["']\/samche-ai-platform-apple-touch-v3\.png["']/);
  assert.doesNotMatch(layout, /favicon\.ico|favicon-16x16\.png|favicon-32x32\.png|apple-touch-icon\.png/);
  const { stat } = await import('node:fs/promises');
  for (const icon of ['samche-ai-platform-favicon-v3.ico', 'samche-ai-platform-favicon-16-v3.png', 'samche-ai-platform-favicon-32-v3.png', 'samche-ai-platform-apple-touch-v3.png']) {
    const info = await stat(new URL(`../public/${icon}`, import.meta.url));
    assert.ok(info.size > 0, `${icon} should exist and not be empty`);
  }
  const shell = await readFile(new URL('../app/components/site-shell.tsx', import.meta.url), 'utf8');
  assert.ok(shell.includes('src="/samche-ai-platform-approved.png"'));
  assert.ok((await import('node:fs/promises')).stat(new URL('../public/samche-ai-platform-approved.png', import.meta.url)));
  const salesAssistant = await readFile(new URL('../lib/samche-sales-assistant.mjs', import.meta.url), 'utf8');
  assert.ok(salesAssistant.includes('971506941372'));
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /\.samche-chat-launcher\s*\{[^}]*border-radius:\s*50%/s);
  assert.match(css, /@media\s*\(max-width:\s*350px\)[\s\S]*?\.samche-chat-panel/);
  assert.match(css, /\.samche-chat-header\s*>\s*\.samche-header-orb\s*\{[^}]*width:\s*42px[^}]*height:\s*42px/s);
  assert.doesNotMatch(css, /@media\s*\(max-width:\s*430px\)[\s\S]*?\.samche-chat-title small\s*\{\s*display:\s*none/);
  assert.doesNotMatch(css, /\.comparison-scroll\s*\{[^}]*overflow-x\s*:\s*auto/s);
  assert.match(css, /\.plan-comparison\s*\{[^}]*table-layout\s*:\s*fixed/s);
  assert.match(css, /@media\s*\(max-width:\s*430px\)[\s\S]*?\.plan-comparison\s*\{[^}]*min-width\s*:\s*0/s);
  assert.match(css, /\.samche-chat-panel\s*\{[^}]*100dvh/s);
  assert.match(css, /\.samche-chat-panel[\s\S]*env\(safe-area-inset-bottom/s);
  assert.match(css, /\.samche-chat-panel\s*\{[^}]*calc\(100%\s*-\s*24px\)/s);
  const pricingComponent = await readFile(new URL('../app/components/pricing-table.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(pricingComponent, /Swipe to compare plans/);
});

test('Sales Chat frontend targets the configured backend and never bundles a direct OpenAI transport', async () => {
  const { readFile } = await import('node:fs/promises');
  const widget = await readFile(new URL('../app/components/samche-chat-widget.tsx', import.meta.url), 'utf8');
  const salesClient = await readFile(new URL('../lib/samche-sales-chat-client.mjs', import.meta.url), 'utf8');
  assert.match(widget, /const salesChatApiBaseUrl = ''/);
  assert.match(salesClient, /\/api\/sales-chat/);
  assert.match(salesClient, /validateSalesReply\(request\.reply\.reply, SALES_ACTION_CAPABILITIES/);
  assert.match(salesClient, /actionCapabilities: SALES_ACTION_CAPABILITIES/);
  const form = await readFile(new URL('../app/components/contact-form.tsx', import.meta.url), 'utf8');
  assert.match(form, /preferredDemoDate/);
  assert.match(form, /conversationSummary/);
  assert.doesNotMatch(widget, /api\.openai\.com|OPENAI_API_KEY|chat\.completions/);
  assert.equal(await import('node:fs/promises').then(({ access }) => access(new URL('../app/api/sales-chat/route.ts', import.meta.url)).then(() => true).catch(() => false)), false);
});
