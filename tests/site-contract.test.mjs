import test from 'node:test';
import assert from 'node:assert/strict';
import { plans, addons, comparisonStateLegend, comparisonUsageNotes, demoLinks, planComparisonRows, platformFeatureGroups, interactionAllowanceCards, planFromSearch, productScreenshots, yearlyPrice } from '../lib/site-data.mjs';
import { getSamcheChatReply, sendSamcheChatMessage } from '../lib/samche-chat.mjs';
import { defaultSamcheChatConfig } from '../lib/samche-chat-config.mjs';

test('approved annual plan prices remain exact', () => {
  assert.deepEqual(plans.map((plan) => plan.monthly), [1790, 3990, 7990, 12500]);
  assert.deepEqual(plans.map((plan) => plan.setup), [2500, 5000, 9500, 20000]);
  assert.deepEqual(plans.map((plan) => plan.yearly), [18258, 40698, 81498, 127500]);
  assert.deepEqual(plans.map((plan) => plan.interactions), ['5,000', '20,000', '50,000', '100,000+']);
});

test('approved platform entitlement matrix is complete and exact', () => {
  const expected = [
    { label: 'Core Channels', rows: [
      { label: 'Web Chatbot', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'WhatsApp AI', values: ['Not included', 'Included', 'Included', 'Included'] },
      { label: 'AI Guide', values: ['Not included', 'Not included', 'Included', 'Included'] },
      { label: 'Human Handover', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Shared Inbox', values: ['Not included', 'Included', 'Included', 'Included'] },
      { label: 'Omnichannel Conversation Context', values: ['Basic', 'Included', 'Advanced', 'Enterprise scale'] },
    ] },
    { label: 'Knowledge & Intelligence', rows: [
      { label: 'Knowledge Intelligence', values: ['Included', 'Advanced', 'Advanced', 'Enterprise'] },
      { label: 'Page-aware Context', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Entity-aware Intelligence', values: ['Not included', 'Not included', 'Included', 'Included'] },
      { label: 'Approved Knowledge Workflow', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Conversation-derived Knowledge Recommendations', values: ['Not included', 'By scope', 'Included', 'Advanced'] },
      { label: 'Business Document / Knowledge Ingestion', values: ['Included', 'Included', 'Included', 'Enterprise scale'] },
    ] },
    { label: 'CRM & Lead Management', rows: [
      { label: 'Basic Lead Capture', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Lead Qualification', values: ['Basic', 'Included', 'Included', 'Advanced'] },
      { label: 'Lead Routing', values: ['Not included', 'Included', 'Included', 'Advanced'] },
      { label: 'AI Lead Scoring', values: ['Not included', 'Not included', 'Included', 'Advanced'] },
      { label: 'CRM Integration', values: ['Not included', '1 CRM or Booking integration', 'Up to 3 external integrations', 'Custom scale'] },
      { label: 'Booking Integration', values: ['Not included', '1 CRM or Booking integration', 'Up to 3 external integrations', 'Custom scale'] },
      { label: 'CRM & Pipeline', values: ['Not included', 'Included', 'Included', 'Advanced'] },
    ] },
    { label: 'Integrations & Automation', rows: [
      { label: 'External Integrations', values: ['Not included', '1', 'Up to 3', 'Custom scale'] },
      { label: 'API Access', values: ['Not included', 'Not included', 'Included', 'Included'] },
      { label: 'Custom Workflows', values: ['Not included', 'Not included', 'Included', 'Advanced'] },
      { label: 'ERP Integrations', values: ['Not included', 'Not included', 'By scope', 'Included / Custom scale'] },
      { label: 'Payment Integrations', values: ['Not included', 'Not included', 'By scope', 'Included / Custom scale'] },
      { label: 'Agentic AI', values: ['Roadmap', 'Roadmap', 'Roadmap / By scope', 'Roadmap / By scope'] },
      { label: 'Skills', values: ['Roadmap', 'Roadmap', 'Roadmap / By scope', 'Roadmap / By scope'] },
      { label: 'Actions', values: ['Roadmap', 'Roadmap', 'Roadmap / By scope', 'Roadmap / By scope'] },
      { label: 'Workflow Engine', values: ['Roadmap', 'Roadmap', 'Roadmap / By scope', 'Roadmap / By scope'] },
    ] },
    { label: 'AI Visual', rows: [
      { label: 'AI Visual Generation', values: ['Not included', 'Not included', 'Not included', 'Included'] },
      { label: 'Visual Product Personalization', values: ['Not included', 'Not included', 'Not included', 'Included'] },
      { label: 'Screenshot / Image Understanding', values: ['Not included', 'By scope', 'By scope', 'Included'] },
      { label: 'AI Visual Generations', values: ['—', '—', '—', '200 / month included'] },
    ] },
    { label: 'AI Voice', rows: [
      { label: 'AI Voice Receptionist', values: ['Add-on', 'Add-on', 'Add-on', 'Included'] },
      { label: 'Inbound Voice Minutes', values: ['Add-on', 'Add-on', 'Add-on', '300 min / month included'] },
      { label: 'Concurrent AI Calls', values: ['Add-on', 'Add-on', 'Add-on', '2 concurrent calls included'] },
      { label: 'Outbound AI Calling', values: ['Add-on', 'Add-on', 'Add-on', 'Add-on / By scope'] },
      { label: 'Voice AI Pro', values: ['Add-on', 'Add-on', 'Add-on', 'Upgrade / Add-on'] },
    ] },
    { label: 'Team & Operations', rows: [
      { label: 'Team Users', values: ['Core access', 'Up to 5', 'Up to 10', 'Custom'] },
      { label: 'Multiple Brands / Sites', values: ['Not included', 'Not included', 'By scope', 'Included'] },
      { label: 'Advanced Controls', values: ['Not included', 'Not included', 'Not included', 'Included'] },
      { label: 'Custom Data Retention', values: ['Not included', 'Not included', 'Not included', 'Custom'] },
      { label: 'Dedicated Support', values: ['Not included', 'Not included', 'Not included', 'Included'] },
    ] },
    { label: 'Usage & Language', rows: [
      { label: 'Monthly AI Interactions', values: ['5,000', '20,000', '50,000', '100,000+'] },
      { label: 'Languages', values: ['Up to 2', 'Up to 3', 'Up to 5', 'Custom'] },
      { label: 'AI Visual Generations', values: ['—', '—', '—', '200 / month'] },
      { label: 'Inbound Voice Minutes', values: ['Add-on', 'Add-on', 'Add-on', '300 / month'] },
      { label: 'Concurrent AI Calls', values: ['Add-on', 'Add-on', 'Add-on', '2'] },
    ] },
    { label: 'Support & Success', rows: [
      { label: '24/7 AI Support', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Human Email Support', values: ['Business Hours', 'Business Hours', 'Priority', 'Priority'] },
      { label: 'Human WhatsApp Support', values: ['Not included', 'Business Hours', 'Priority', 'Priority'] },
      { label: 'Support Portal', values: ['Included', 'Included', 'Included', 'Included'] },
      { label: 'Priority Support', values: ['Standard', 'Priority', 'Expanded Priority', 'Enterprise Priority'] },
      { label: '24/7 Critical Human Support', values: ['Not included', 'Not included', 'Not included', 'Included'] },
      { label: 'Dedicated Customer Advisor', values: ['Not included', 'Not included', 'Not included', 'Included'] },
    ] },
  ];

  assert.deepEqual(platformFeatureGroups, expected);
  assert.equal(planComparisonRows.length, 54);
});

test('Enterprise visual and voice commercial entitlements remain bounded and separate', () => {
  const enterprise = plans.find((plan) => plan.slug === 'enterprise');
  assert.match(enterprise.description, /visual AI.*voice AI.*multi-brand.*operational control/i);
  assert.deepEqual(comparisonUsageNotes, [
    'Enterprise includes 200 AI Visual Generations per month; extra visual usage is available through an agreed usage-based or custom commercial arrangement.',
    'Enterprise includes 300 inbound AI voice minutes per month and up to two concurrent AI calls; extra minutes, higher concurrency, Voice AI Pro, and outbound calling are available separately through an agreed commercial arrangement.',
    'AI Voice Minutes and AI Visual Generations are separate from the standard monthly AI interaction allowance.',
  ]);
  const commercialCopy = [...addons.flatMap((addon) => [addon.name, addon.price, addon.setup, addon.description]), ...interactionAllowanceCards.flatMap((card) => [card.title, card.body])].filter(Boolean).join(' ');
  assert.match(commercialCopy, /one shared pool of 200/i);
  assert.match(commercialCopy, /not charged the base AED 1,990\/month/i);
  assert.match(commercialCopy, /additional minutes.*higher concurrency.*Voice AI Pro.*outbound calling/is);
  assert.match(commercialCopy, /three separate commercial usage dimensions/i);
  assert.match(commercialCopy, /No automatic overage billing or suspension is promised/i);
  assert.doesNotMatch(commercialCopy, /will automatically (?:bill|suspend)/i);
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
  assert.deepEqual(rows.Languages, ['Up to 2', 'Up to 3', 'Up to 5', 'Custom']);
  assert.deepEqual(rows['AI Guide'], ['Not included', 'Not included', 'Included', 'Included']);
  assert.deepEqual(rows['Custom Data Retention'], ['Not included', 'Not included', 'Not included', 'Custom']);
  assert.equal(rows['Team Users'][0], 'Core access');
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

test('pricing renderer exposes controlled multimodal notes and concise mobile values', async () => {
  const { readFile } = await import('node:fs/promises');
  const component = await readFile(new URL('../app/components/pricing-table.tsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(component, /comparisonUsageNotes/);
  assert.match(component, /comparisonUsageNotes\.map/);
  for (const compact of ['200/mo', '300 min', '2 calls', 'Yes · Custom', 'Upgrade']) {
    assert.ok(component.includes(compact), `missing compact label ${compact}`);
  }
  assert.match(component, /normalized\.startsWith\('upgrade'\)/);
  assert.doesNotMatch(css, /\.comparison-scroll\s*\{[^}]*overflow-x\s*:\s*auto/s);
  assert.match(css, /\.plan-comparison\s*\{[^}]*table-layout\s*:\s*fixed/s);
  assert.doesNotMatch(css, /@media[^}]+\{[\s\S]*?\.plan-comparison[^}]+display\s*:\s*none/s);
});

test('Enterprise visual and voice FAQ uses the approved commercial contract', async () => {
  const { readFile } = await import('node:fs/promises');
  const faq = await readFile(new URL('../app/components/platform-faq.tsx', import.meta.url), 'utf8');
  for (const question of [
    'Is AI Voice included in Enterprise?',
    'What is included with AI Visual Generation?',
    'What happens when Enterprise exceeds included voice or visual usage?',
  ]) assert.ok(faq.includes(question), `FAQ should include ${question}`);
  assert.match(faq, /300 inbound minutes per month and up to 2 concurrent AI calls/);
  assert.match(faq, /one shared allowance of 200 AI Visual Generations per month/);
  assert.match(faq, /Additional minutes, higher concurrency, Voice AI Pro, and outbound calling are available separately/);
  assert.match(faq, /agreed usage-based or custom commercial arrangement/);
  assert.match(faq, /Automatic billing, rollover, or suspension is not assumed unless separately contracted/);
});

test('expanded platform comparison uses cumulative explicit capability states', () => {
  assert.equal(platformFeatureGroups.length, 9);
  const rows = platformFeatureGroups.flatMap((group) => group.rows);
  assert.equal(rows.length, 54);
  assert.ok(rows.every((row) => row.values.length === 4));
  for (const row of rows) {
    for (let index = 1; index < row.values.length; index += 1) {
      if (row.values[index - 1] === 'Included') assert.notEqual(row.values[index], 'Not included', `${row.label} must be inherited by ${index}`);
    }
  }
  assert.ok(rows.filter((row) => row.values.includes('—')).every((row) => row.label === 'AI Visual Generations'));
  assert.ok(rows.some((row) => row.label === 'Agentic AI'));
  assert.deepEqual(rows.find((row) => row.label === 'Monthly AI Interactions')?.values, ['5,000', '20,000', '50,000', '100,000+']);
});

test('interaction allowance explanation is present and separates Voice AI usage', async () => {
  assert.equal(interactionAllowanceCards.length, 8);
  const copy = interactionAllowanceCards.map((card) => `${card.title} ${card.body}`).join(' ');
  for (const value of ['5,000 AI interactions / month', '20,000 AI interactions / month', '50,000 AI interactions / month', '100,000+ AI interactions / month']) assert.match(copy, new RegExp(value.replace(/[+,]/g, '\\$&')));
  for (const title of ['Monthly Allowance', 'What Counts', 'What Does Not Count', 'AI Visual Usage', 'AI Voice Usage', 'Separate Usage Dimensions', 'Higher Usage', 'Billing Period']) assert.ok(interactionAllowanceCards.some((card) => card.title === title), `missing ${title}`);
  assert.match(copy, /OpenAI.*Gemini|Gemini.*OpenAI/i);
  assert.match(copy, /website visits|website page views/i);
  assert.match(copy, /human-only inbox activity/i);
  assert.match(copy, /AI Voice Usage/);
  assert.match(copy, /three separate commercial usage dimensions/i);
  assert.match(copy, /commercial agreement/i);
  assert.match(copy, /No automatic overage billing or suspension is promised/i);
  assert.doesNotMatch(copy, /will automatically (?:bill|suspend)|fair use|1 message\s*=\s*1 interaction/i);
  const faq = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../app/components/platform-faq.tsx', import.meta.url), 'utf8'));
  assert.match(faq, /What happens if I exceed my monthly AI interaction allowance\?/);
  assert.match(faq, /If your usage approaches or exceeds your plan allowance, SamChe AI can recommend a higher plan or a custom usage arrangement\. Exact commercial terms depend on the selected plan and agreed scope\./);
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
  for (const text of ['Core AI foundation', 'Everything in Starter + growth capabilities', 'Understanding Your Monthly AI Interactions', 'Monthly Allowance', 'What Counts', 'AI Visual Usage', 'AI Voice Usage', 'Separate Usage Dimensions', 'Higher Usage']) assert.ok(component.includes(text) || data.includes(text), `missing ${text}`);
  for (const text of ['مقارنة ميزات المنصة', 'فهم حصة تفاعلات الذكاء الاصطناعي', 'البدل الشهري', 'ما الذي يُحتسب؟']) assert.ok(localization.includes(text), `missing Arabic ${text}`);
  assert.match(component, /<section className="interaction-explanation"[\s\S]*<section className="addons"/);
  assert.match(component, /interactionAllowanceCards\.map/);
  assert.match(component, /Understanding Your Monthly AI Interactions/);
  assert.match(component, /Each plan includes a monthly allowance for AI-powered customer interactions across supported SamChe AI channels\./);
  assert.match(css, /\.interaction-explanation-grid\s*\{[^}]*display:\s*grid/s);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.interaction-explanation-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(css, /\.interaction-explanation-card\s*\{[^}]*min-width:\s*0/s);
  assert.doesNotMatch(css, /\.interaction-explanation-card\s*\{[^}]*min-width:\s*\d{3,}px/s);
  assert.doesNotMatch(css, /@media\s*\(max-width:\s*760px\)[\s\S]*?\.plan-comparison\s*\{[^}]*min-width:\s*820px/s);
  assert.doesNotMatch(css, /\.plan-comparison\s*\{[^}]*min-width:\s*(?:790|820)px/s);
  assert.match(css, /\.plan-comparison\s*\{[^}]*table-layout:\s*fixed/s);
});

test('final comparison content preserves availability through Enterprise scale', async () => {
  const rows = platformFeatureGroups.flatMap((group) => group.rows);
  const firstByLabel = (label) => rows.find((row) => row.label === label);
  for (const row of rows) {
    for (let index = 1; index < row.values.length; index += 1) {
      if (row.values[index - 1] === 'Included') assert.notEqual(row.values[index], 'Not included', `${row.label} loses Included at ${index}`);
    }
  }
  assert.equal(firstByLabel('CRM Integration').values[3], 'Custom scale');
  assert.equal(firstByLabel('Booking Integration').values[3], 'Custom scale');
  assert.equal(firstByLabel('API Access').values[3], 'Included');
  assert.equal(firstByLabel('Custom Workflows').values[3], 'Advanced');
  assert.equal(rows.filter((row) => /Page-aware/i.test(row.label)).length, 1);
  assert.ok(firstByLabel('Approved Knowledge Workflow'));
  assert.deepEqual(['Agentic AI', 'Skills', 'Actions', 'Workflow Engine'].map((label) => firstByLabel(label)?.values), [
    ['Roadmap', 'Roadmap', 'Roadmap / By scope', 'Roadmap / By scope'],
    ['Roadmap', 'Roadmap', 'Roadmap / By scope', 'Roadmap / By scope'],
    ['Roadmap', 'Roadmap', 'Roadmap / By scope', 'Roadmap / By scope'],
    ['Roadmap', 'Roadmap', 'Roadmap / By scope', 'Roadmap / By scope'],
  ]);
});

test('comparison legend and agentic note are rendered from shared content', async () => {
  const { readFile } = await import('node:fs/promises');
  const component = await readFile(new URL('../app/components/pricing-table.tsx', import.meta.url), 'utf8');
  const data = await readFile(new URL('../lib/site-data.mjs', import.meta.url), 'utf8');
  assert.equal(comparisonStateLegend.length, 6);
  for (const state of ['Included', 'Not included', 'Add-on', 'By scope', 'Custom', 'Roadmap']) assert.ok(comparisonStateLegend.some((item) => item.state === state));
  assert.match(data, /Custom Workflows are a current capability/);
  assert.match(data, /broader Workflow Engine remain roadmap capabilities/);
  assert.match(component, /comparisonStateLegend/);
  assert.match(component, /comparison-state-legend/);
  assert.match(component, /agenticExpansionNote/);
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

test('public commercial copy separates live Custom Workflows from roadmap platform products', async () => {
  const { readFile } = await import('node:fs/promises');
  const home = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  const platform = await readFile(new URL('../app/platform/page.tsx', import.meta.url), 'utf8');
  const pricing = await readFile(new URL('../app/pricing/page.tsx', import.meta.url), 'utf8');
  assert.match(home, /Custom Workflows are available today for configured automations and integrations/);
  assert.match(home, /Agentic AI, Skills, Actions and the broader Workflow Engine remain roadmap capabilities/);
  assert.match(platform, /Custom Workflows are a currently supported plan capability/);
  assert.match(platform, /The broader Workflow Engine, Agentic AI, Skills and Actions remain roadmap capabilities/);
  assert.match(pricing, /visual AI, included base voice AI, multi-brand scale and deeper operational control/);
  const activeCommercialCopy = [home, platform, pricing, JSON.stringify(plans), JSON.stringify(addons), JSON.stringify(platformFeatureGroups)].join(' ');
  assert.doesNotMatch(activeCommercialCopy, /Enterprise[^.]{0,120}AI Voice[^.]{0,120}(paid-only|always separately priced)/i);
  assert.doesNotMatch(activeCommercialCopy, /(?:Agentic AI|Workflow Engine)[^.]{0,80}(?:standard live entitlement|included in Enterprise)/i);
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
    'Languages', 'Web Chatbot', 'WhatsApp AI', 'AI Guide', 'Knowledge Intelligence',
    'Entity-aware Intelligence', 'Page-aware Context', 'Basic Lead Capture', 'Shared Inbox',
    'Lead Qualification', 'AI Lead Scoring', 'CRM Integration',
    'External Integrations', 'API Access', 'Custom Workflows', 'Team Users',
    'Multiple Brands / Sites', 'ERP Integrations', 'AI Visual Generation', 'AI Voice Receptionist', 'Custom Data Retention',
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

test('mobile comparison uses concise labels without internal authoring notes', async () => {
  const { readFile } = await import('node:fs/promises');
  const data = await readFile(new URL('../lib/site-data.mjs', import.meta.url), 'utf8');
  const component = await readFile(new URL('../app/components/pricing-table.tsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.doesNotMatch(data, /if authoritative|current authoritative plan data|if current product data supports it/i);
  assert.match(component, /comparisonMobileLabel/);
  assert.match(component, /aria-label=\{value\}/);
  assert.match(css, /@media \(max-width:760px\)[\s\S]*?\.plan-comparison th, \.plan-comparison td \{[^}]*overflow-wrap:normal[^}]*word-break:normal/s);
  assert.match(css, /@media \(max-width:760px\)[\s\S]*?\.comparison-state \{[^}]*padding:0[^}]*border:0/s);
});

test('chat supports a compact visual viewport keyboard mode', async () => {
  const { readFile } = await import('node:fs/promises');
  const widget = await readFile(new URL('../app/components/samche-chat-widget.tsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(widget, /visualViewport/);
  assert.match(widget, /offsetTop/);
  assert.match(widget, /offsetLeft/);
  assert.match(widget, /addEventListener\('resize', updateViewport\)/);
  assert.match(widget, /addEventListener\('scroll', updateViewport\)/);
  assert.match(widget, /removeEventListener\('resize', updateViewport\)/);
  assert.match(widget, /removeEventListener\('scroll', updateViewport\)/);
  assert.match(widget, /keyboardOpen/);
  assert.match(widget, /samche-keyboard-open/);
  assert.match(css, /\.samche-chat-panel\.samche-keyboard-open/);
  assert.match(css, /\.samche-chat-panel \{[^}]*display:grid[^}]*grid-template-rows:auto minmax\(0,1fr\) auto/s);
  assert.match(css, /\.samche-chat-form input \{[^}]*font-size:16px/s);
  assert.match(css, /\.samche-chat-root\.samche-keyboard-open/);
  assert.match(css, /\.samche-chat-messages \{[^}]*overflow-y:auto/s);
  assert.match(css, /\.samche-chat-composer \{[^}]*flex-shrink:0/s);
  assert.doesNotMatch(css, /\.samche-chat-panel\.samche-keyboard-open[^}]*height:\s*100(?:d|s)?vh/s);
});

test('chat attachment preview stays inside a bounded one-row composer allocation', async () => {
  const { readFile } = await import('node:fs/promises');
  const widget = await readFile(new URL('../app/components/samche-chat-widget.tsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(widget, /samche-chat-composer\$\{attachment \? ' has-attachment' : ''\}/);
  assert.match(widget, /type="file"[^>]*accept="image\/png,image\/jpeg,image\/webp"/);
  assert.doesNotMatch(widget, /type="file"[^>]*multiple/);
  assert.match(css, /\.samche-chat-composer\.has-attachment \{ max-height:126px; \}/);
  assert.match(css, /\.samche-chat-composer \{[\s\S]*?max-height:176px[\s\S]*?overflow:hidden/s);
  assert.match(css, /\.samche-attachment-preview \{[\s\S]*?min-height:48px[\s\S]*?max-height:48px[\s\S]*?overflow:hidden/s);
  assert.match(css, /\.samche-attachment-preview img \{[\s\S]*?width:48px[\s\S]*?height:48px[\s\S]*?object-fit:cover/s);
  assert.match(css, /\.samche-attachment-preview span \{[^}]*white-space:nowrap[^}]*text-overflow:ellipsis/s);
  assert.match(css, /\.samche-chat-panel\.samche-keyboard-open \.samche-chat-composer\.has-attachment \{ max-height:112px; \}/);
});
