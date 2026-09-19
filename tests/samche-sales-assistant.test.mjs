import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialSalesState, generateSalesTurn, buildLeadSummary, buildWhatsAppSalesUrl, isLeadSummaryReady,
  buildOffTopicReply, getPendingQualificationField, applyValidatedSalesFields,
  getSalesDetectedIntent, getSalesProcessingStatus, getSalesResponseMode,
  SALES_ACTION_CAPABILITIES, hasRequiredDemoContact, isDemoQualificationReady,
  validateSalesReply, toContactHandoff, filterSalesActionsForLead,
} from '../lib/samche-sales-assistant.mjs';

test('generic business AI opener stays in discovery without requirements card or sales CTAs', () => {
  const turn = generateSalesTurn(createInitialSalesState(), 'I need AI for my business.');
  assert.match(turn.reply, /What type of business do you operate\?/i);
  assert.equal(turn.state.intent, 'COLD');
  assert.equal(isLeadSummaryReady(turn.state.lead), false);
  assert.equal(turn.actions.some((action) => ['REQUEST DEMO', 'TALK TO SALES ON WHATSAPP'].includes(action.label)), false);
});

test('off-topic replies vary while preserving the pending qualification field', () => {
  const initial = createInitialSalesState();
  const state = {
    ...initial,
    lead: { ...initial.lead, industry: 'Real Estate', channels: ['Website', 'WhatsApp'] },
    pendingQualificationField: 'teamUsers',
    lastPendingQuestion: 'How many people would use the shared inbox or lead workspace?',
    offTopicTurns: 0,
  };
  const first = buildOffTopicReply(state, 'What is the weather in Dubai?');
  const second = buildOffTopicReply({ ...state, offTopicTurns: 1 }, 'Who is Cristiano Ronaldo?');
  const third = buildOffTopicReply({ ...state, offTopicTurns: 2 }, 'Tell me something unrelated.');
  assert.notEqual(first.reply, second.reply);
  assert.notEqual(second.reply, third.reply);
  assert.equal(first.state.lead.industry, 'Real Estate');
  assert.equal(first.state.pendingQualificationField, 'teamUsers');
  assert.match(first.reply, /team members|shared inbox/i);
});

test('three off-topic turns do not block a later qualification answer', () => {
  const initial = createInitialSalesState();
  let state = {
    ...initial,
    lead: { ...initial.lead, industry: 'Real Estate', channels: ['Website', 'WhatsApp'], volume: '2,000/month', integrations: 'CRM / booking integration requested', leadQualification: 'Lead qualification requested', languages: 'English / Arabic', aiGuideNeed: 'Not required', apiWorkflow: 'Not required', externalIntegrations: 'One integration', aiLeadScoring: 'Not required' },
    lastQuestion: 'How many people would use the shared inbox or lead workspace?',
    pendingQualificationField: 'teamUsers',
    lastPendingQuestion: 'How many people would use the shared inbox or lead workspace?',
  };
  for (const question of ['What is the weather in Dubai?', 'Who is Cristiano Ronaldo?', 'Tell me something unrelated.']) {
    state = generateSalesTurn(state, question).state;
  }
  const resumed = generateSalesTurn(state, 'Three people will use the shared inbox.');
  assert.equal(resumed.state.lead.teamUsers, '3');
  assert.match(resumed.reply, /When would you ideally like to start/i);
});

test('natural-language team-user variants update only teamUsers', () => {
  const state = createInitialSalesState();
  for (const answer of ['Three people.', '3 users.', 'There are three of us.', 'Only our three sales reps.', 'My sales team is 3 people.']) {
    const result = applyValidatedSalesFields(state, { teamUsers: answer });
    assert.equal(result.lead.teamUsers, '3');
    assert.equal(result.lead.industry, '');
    assert.deepEqual(result.lead.channels, []);
  }
  assert.equal(getPendingQualificationField({ ...state, lead: {
    ...state.lead, industry: 'Real Estate', channels: ['Website'], volume: '100/month', integrations: 'CRM',
    leadQualification: 'Required', languages: 'English', aiGuideNeed: 'Not required', apiWorkflow: 'Not required',
    externalIntegrations: 'One integration', aiLeadScoring: 'Not required', teamUsers: '3',
  } }), 'timeline');
});

test('processing status uses short stage-aware labels without exposing private reasoning', () => {
  const state = createInitialSalesState();
  assert.match(getSalesProcessingStatus('I need AI for my business', state), /Understanding your business needs/i);
  assert.match(getSalesProcessingStatus('We are a real estate company in Dubai', state), /business model/i);
  assert.match(getSalesProcessingStatus('We use website and WhatsApp', state), /customer channels/i);
  assert.match(getSalesProcessingStatus('We need CRM integration and lead qualification', state), /Matching your requirements/i);
  assert.match(getSalesProcessingStatus('We want to start this month', state), /sales summary/i);
  assert.doesNotMatch(getSalesProcessingStatus('We need CRM integration', state), /reason|score|chain|prompt|step by step/i);
});

test('website and WhatsApp channels alone do not trigger a plan or sales escalation', () => {
  let state = generateSalesTurn(createInitialSalesState(), 'We are a real estate company in Dubai').state;
  const turn = generateSalesTurn(state, 'Most of our leads come from our website and WhatsApp.');
  assert.deepEqual(turn.state.lead.products, ['Web Chatbot', 'WhatsApp AI']);
  assert.equal(turn.state.lead.recommendedPlan, '');
  assert.match(turn.reply, /both your website and WhatsApp/i);
  assert.match(turn.reply, /how many.*enquiries/i);
  assert.match(turn.reply, /how many customer enquiries/i);
  assert.doesNotMatch(turn.reply, /and do you need CRM|lead qualification/i);
  assert.equal(isLeadSummaryReady(turn.state.lead), false);
  assert.equal(turn.actions.some((action) => ['REQUEST DEMO', 'TALK TO SALES ON WHATSAPP'].includes(action.label)), false);
});

test('requirements stay hidden through discovery and core qualification until differentiators are resolved', () => {
  let turn = generateSalesTurn(createInitialSalesState(), 'I need AI for my business.');
  assert.equal(isLeadSummaryReady(turn.state.lead, turn.state.intent), false);
  turn = generateSalesTurn(turn.state, 'We are a real estate company in Dubai.');
  assert.equal(isLeadSummaryReady(turn.state.lead, turn.state.intent), false);
  turn = generateSalesTurn(turn.state, 'Most of our leads come from our website and WhatsApp.');
  assert.equal(isLeadSummaryReady(turn.state.lead, turn.state.intent), false);
  turn = generateSalesTurn(turn.state, 'We receive around 2,000 enquiries per month. We need CRM integration and lead qualification.');
  assert.equal(isLeadSummaryReady(turn.state.lead, turn.state.intent), false);
  assert.deepEqual(turn.state.lead.products, ['Web Chatbot', 'WhatsApp AI']);
  turn = generateSalesTurn(turn.state, 'We need English and Arabic.');
  assert.equal(isLeadSummaryReady(turn.state.lead, turn.state.intent), false);
  assert.match(turn.reply, /AI Guide|API|custom workflow/i);
});

test('resolved plan differentiators enable final summary and distinguish likely from recommended', () => {
  let state = createInitialSalesState();
  for (const input of [
    'We are a real estate company in Dubai and need website and WhatsApp AI.',
    'We receive around 2,000 enquiries per month. We need CRM integration and lead qualification.',
    'We need English and Arabic.',
    'We do not need AI Guide, API access, custom workflows, or AI lead scoring. We need one CRM integration and have 3 team users.',
  ]) state = generateSalesTurn(state, input).state;
  assert.equal(state.lead.recommendedPlan, 'growth');
  assert.equal(isLeadSummaryReady(state.lead, state.intent), true);
  assert.match(buildLeadSummary(state.lead), /▣ RECOMMENDED PLAN\nGROWTH/i);
  assert.doesNotMatch(buildLeadSummary(state.lead), /Likely plan: GROWTH/i);
});

test('explicit demo intent does not expose a premature requirements card', () => {
  const turn = generateSalesTurn(createInitialSalesState(), 'I want a demo');
  assert.equal(isLeadSummaryReady(turn.state.lead, turn.state.intent), false);
  assert.equal(turn.actions.some((action) => action.label === 'REQUEST DEMO'), false);
  assert.match(turn.reply, /business|industry/i);
});

test('generic main goal is refined when concrete channels are later provided', () => {
  let state = generateSalesTurn(createInitialSalesState(), 'I need AI for my business').state;
  state = generateSalesTurn(state, 'We are a real estate company in Dubai').state;
  const turn = generateSalesTurn(state, 'Most of our leads come from our website and WhatsApp.');
  assert.doesNotMatch(turn.state.lead.mainGoal, /I need AI for my business/i);
  assert.match(turn.state.lead.mainGoal, /website.*WhatsApp/i);
});

test('website AI request starts qualification instead of listing products', () => {
  const turn = generateSalesTurn(createInitialSalesState(), 'I need AI for my website');
  assert.match(turn.reply, /business|industry/i);
  assert.doesNotMatch(turn.reply, /Web Chatbot.*WhatsApp AI.*AI Guide/s);
  assert.equal(turn.state.lead.channels.includes('Website'), true);
});

test('Web Chatbot price answer gives only the relevant plan and asks about volume', () => {
  const turn = generateSalesTurn(createInitialSalesState(), 'How much is Web Chatbot?');
  assert.match(turn.reply, /AED 1,790\/month/);
  assert.match(turn.reply, /AED 2,500 one-time setup/);
  assert.match(turn.reply, /5,000 AI interactions per month/);
  assert.match(turn.reply, /enquiries.*month|volume/i);
  assert.doesNotMatch(turn.reply, /https?:\/\//);
});

test('demo intent presents product choices and a next qualification question', () => {
  const turn = generateSalesTurn(createInitialSalesState(), 'I want a demo');
  assert.equal(turn.actions.some((action) => action.label === 'REQUEST DEMO'), false);
  assert.match(turn.reply, /business|industry/i);
  assert.doesNotMatch(turn.reply, /https?:\/\//);
  const selected = generateSalesTurn(turn.state, 'Web Chatbot');
  assert.equal(selected.actions.some((action) => action.label === 'REQUEST DEMO'), false);
});

test('provisional Growth fit does not expose commercial CTAs before qualification is complete', () => {
  let state = createInitialSalesState();
  for (const input of [
    'I need AI for my business.',
    'We are a real estate company in Dubai.',
    'Most of our leads come through both our website and WhatsApp.',
    'Before we continue, can this AI actually replace one of my sales staff?',
  ]) state = generateSalesTurn(state, input).state;
  const turn = generateSalesTurn(state, 'We receive around 2,000 enquiries per month and we need CRM integration and lead qualification.');

  assert.equal(turn.state.lead.likelyPlan, 'growth');
  assert.equal(turn.state.lead.recommendedPlan, '');
  assert.match(turn.reply, /Which languages/i);
  assert.deepEqual(turn.actions, []);
});

test('explicit sales handoff on WhatsApp enables only the requested sales CTA', () => {
  const turn = generateSalesTurn(createInitialSalesState(), 'I want to speak to sales on WhatsApp');
  assert.ok(turn.actions.some((action) => action.label === 'TALK TO SALES ON WHATSAPP'));
  assert.equal(turn.actions.some((action) => action.label === 'REQUEST DEMO'), false);
});

test('final qualified lead enables commercial CTAs', () => {
  const initial = createInitialSalesState();
  const state = {
    ...initial,
    intent: 'HOT',
    lead: {
      ...initial.lead, industry: 'Real Estate', channels: ['Website', 'WhatsApp'], volume: '2,000/month',
      integrations: 'CRM / booking integration requested', leadQualification: 'Lead qualification requested', languages: 'English / Arabic',
      aiGuideNeed: 'Not required', apiWorkflow: 'Not required', externalIntegrations: 'One integration', aiLeadScoring: 'Not required',
      teamUsers: '3', recommendedPlan: 'growth', likelyPlan: 'growth', products: ['Web Chatbot', 'WhatsApp AI'],
      name: 'Synthetic Person', email: 'synthetic.person@example.com', company: 'Example',
    },
  };
  const turn = generateSalesTurn(state, 'We want to start this month.');

  assert.equal(isLeadSummaryReady(turn.state.lead, turn.state.intent), true);
  assert.ok(turn.actions.some((action) => action.label === 'TRY WEB CHATBOT'));
  assert.ok(turn.actions.some((action) => action.label === 'REQUEST DEMO'));
  assert.ok(turn.actions.some((action) => action.label === 'TALK TO SALES ON WHATSAPP'));
});

test('real estate with website and WhatsApp stays in qualification without premature plan recommendation', () => {
  const turn = generateSalesTurn(createInitialSalesState(), 'We are a real estate company and need WhatsApp + website AI');
  assert.equal(turn.state.lead.industry, 'Real Estate');
  assert.deepEqual([...turn.state.lead.channels].sort(), ['Website', 'WhatsApp'].sort());
  assert.equal(turn.state.lead.recommendedPlan, '');
  assert.doesNotMatch(turn.reply, /Growth/i);
  assert.match(turn.reply, /how many|monthly enquiries|volume/i);
  assert.equal(turn.actions.some((action) => ['REQUEST DEMO', 'TALK TO SALES ON WHATSAPP'].includes(action.label)), false);
});

test('AI Guide and CRM integration needs are captured before business/channel fit is assessed', () => {
  const turn = generateSalesTurn(createInitialSalesState(), 'I need AI Guide and CRM integration');
  assert.equal(turn.state.lead.recommendedPlan, '');
  assert.equal(turn.state.lead.aiGuideNeed, 'Required');
  assert.equal(turn.state.lead.integrations, 'CRM / booking integration requested');
  assert.match(turn.reply, /type of business|customer channels/i);
});

test('Growth remains provisional while qualification differentiators are unknown and CRM integration stays separate', () => {
  let turn = generateSalesTurn(createInitialSalesState(), 'We are a real estate company in Dubai and need website and WhatsApp AI.');
  turn = generateSalesTurn(turn.state, 'We need lead qualification, CRM integration, and around 2,000 enquiries per month.');
  assert.equal(turn.state.lead.likelyPlan, 'growth');
  assert.equal(turn.state.lead.recommendedPlan, '');
  assert.match(turn.reply, /Growth currently looks like the closest fit/i);
  assert.match(turn.reply, /Before I confirm that, which languages do you need/i);
  assert.doesNotMatch(turn.reply, /Growth is the closest fit/i);
  assert.deepEqual(turn.state.lead.products, ['Web Chatbot', 'WhatsApp AI']);
  assert.match(buildLeadSummary(turn.state.lead), /▣ LIKELY PLAN\nGROWTH/i);
  assert.match(buildLeadSummary(turn.state.lead), /⚡ INTEGRATIONS\nCRM \/ booking integration requested/i);
  assert.match(buildLeadSummary(turn.state.lead), /✳️ LEAD QUALIFICATION\nRequired/i);
  assert.doesNotMatch(buildLeadSummary(turn.state.lead), /Products:.*CRM & Pipeline/i);
  assert.doesNotMatch(buildLeadSummary(turn.state.lead), /▣ RECOMMENDED PLAN\nGROWTH/i);
  assert.doesNotMatch(turn.reply, /AI Guide|API\/custom workflow requirements/);
});

test('contextual cost question uses the current recommendation and does not restart discovery', () => {
  let state = generateSalesTurn(createInitialSalesState(), 'We are a real estate company in Dubai and need website and WhatsApp AI.').state;
  state = generateSalesTurn(state, 'We need lead qualification, CRM integration, English and Arabic, and around 2,000 enquiries per month.').state;
  const turn = generateSalesTurn(state, 'How much would that cost?');

  assert.equal(turn.state.lead.likelyPlan, 'growth');
  assert.equal(turn.state.lead.recommendedPlan, '');
  assert.match(turn.reply, /Growth currently looks like the closest fit.*AED 3,990\/month/i);
  assert.doesNotMatch(turn.reply, /What would you like to achieve with AI|2,000.*enquiries.*month/i);
});

test('proposal escalation reuses captured enquiry volume and gates demo on contact details', () => {
  const history = [
    { role: 'user', text: 'We are a real estate company in Dubai and need website and WhatsApp AI.' },
    { role: 'user', text: 'We need lead qualification, CRM integration, English and Arabic, and around 2,000 enquiries per month.' },
    { role: 'user', text: 'How much would that cost?' },
  ];
  const turn = generateSalesTurn(createInitialSalesState(), 'We want to start this month. Please send us a proposal.', history);

  assert.equal(turn.state.lead.volume, '2,000/month');
  assert.equal(turn.state.lead.industry, 'Real Estate');
  assert.equal(turn.state.lead.timeline, 'This month');
  assert.equal(turn.state.lead.recommendedPlan, '');
  assert.equal(turn.state.lead.likelyPlan, 'growth');
  assert.equal(turn.state.intent, 'HOT');
  assert.equal(turn.actions.some((action) => action.label === 'REQUEST DEMO'), false);
  assert.ok(turn.actions.some((action) => action.label === 'TALK TO SALES ON WHATSAPP'));
  assert.match(turn.reply, /requirements summary/i);
  assert.doesNotMatch(turn.reply, /Roughly how many customer enquiries/i);
});

test('start this month is recognized as high intent and offers sales escalation actions', () => {
  const turn = generateSalesTurn(createInitialSalesState(), 'We want to start this month');
  assert.equal(turn.state.intent, 'HOT');
  assert.ok(turn.actions.some((action) => action.label === 'TALK TO SALES ON WHATSAPP'));
  assert.equal(turn.actions.some((action) => action.label === 'REQUEST DEMO'), false);
});

test('lead summary retains provided qualification fields and WhatsApp URL contains structured summary', () => {
  let state = createInitialSalesState();
  for (const input of [
    'We are a real estate company in Dubai and need website and WhatsApp AI',
    'Name: John Smith, company: ABC Properties',
    'English and Arabic, around 2,000 enquiries per month, CRM integration required, within 30 days',
  ]) state = generateSalesTurn(state, input).state;
  const summary = buildLeadSummary(state.lead);
  for (const text of ['John Smith', 'ABC Properties', 'Real Estate', 'United Arab Emirates', 'English / Arabic', '2,000 enquiries/month', 'GROWTH', 'Within 30 days']) assert.ok(summary.includes(text), `summary should include ${text}`);
  const whatsapp = buildWhatsAppSalesUrl(state.lead);
  assert.ok(whatsapp.startsWith('https://wa.me/971506941372?text='));
  assert.ok(decodeURIComponent(whatsapp).includes('ABC Properties'));
});

test('unrelated request is refused and existing lead facts are not asked again', () => {
  let state = generateSalesTurn(createInitialSalesState(), 'We are a real estate company in Dubai').state;
  const turn = generateSalesTurn(state, 'Tell me a joke');
  assert.match(turn.reply, /focused on SamChe AI|SamChe AI sales/i);
  assert.match(turn.reply, /customer enquiries|volume/i);
  const next = generateSalesTurn(state, 'How many users are included in Growth?');
  assert.doesNotMatch(next.reply, /What industry|which country/i);
});

test('website channel discovery alone does not force a plan recommendation', () => {
  const turn = generateSalesTurn(createInitialSalesState(), 'We are a small business in Dubai and want website AI');
  assert.notEqual(turn.state.lead.preferredPlan, 'business');
  assert.equal(turn.state.lead.recommendedPlan, '');
});

test('industry answer leads to a channel question before volume qualification', () => {
  const first = generateSalesTurn(createInitialSalesState(), 'I need AI for my company');
  const second = generateSalesTurn(first.state, 'We are a real estate company in Dubai');
  assert.match(second.reply, /website, WhatsApp, or both/i);
  assert.doesNotMatch(second.reply, /how many enquiries/i);
});

test('qualification advances through volume, integrations, language, timeline and contact preference without repeating', () => {
  let state = generateSalesTurn(createInitialSalesState(), 'We are a real estate company and need website and WhatsApp AI').state;
  let turn = generateSalesTurn(state, 'Around 2,000 enquiries per month'); state = turn.state;
  assert.match(turn.reply, /CRM, booking, or other system integration/i);
  turn = generateSalesTurn(state, 'No integration needed'); state = turn.state;
  assert.match(turn.reply, /qualify leads/i);
  turn = generateSalesTurn(state, "We don't need lead qualification"); state = turn.state;
  assert.match(turn.reply, /Which languages/i);
  turn = generateSalesTurn(state, 'English and Arabic'); state = turn.state;
  assert.match(turn.reply, /AI Guide/i);
  turn = generateSalesTurn(state, 'No AI Guide needed'); state = turn.state;
  assert.match(turn.reply, /API access or custom workflows/i);
  turn = generateSalesTurn(state, 'No API or custom workflows needed'); state = turn.state;
  assert.match(turn.reply, /How many external system integrations/i);
  turn = generateSalesTurn(state, 'One CRM integration'); state = turn.state;
  assert.match(turn.reply, /AI lead scoring/i);
  turn = generateSalesTurn(state, 'We do not need AI lead scoring'); state = turn.state;
  assert.match(turn.reply, /How many people/i);
  turn = generateSalesTurn(state, '3 team users'); state = turn.state;
  assert.match(turn.reply, /When would you ideally like to start/i);
  assert.equal(turn.state.lead.recommendedPlan, 'growth');
  assert.equal(isLeadSummaryReady(turn.state.lead, turn.state.intent), true);
  turn = generateSalesTurn(state, 'Within 30 days'); state = turn.state;
  assert.match(turn.reply, /prefer a demo request or a WhatsApp conversation/i);
  turn = generateSalesTurn(state, 'WhatsApp');
  assert.equal(turn.state.lead.contactPreference, 'WhatsApp');
  assert.doesNotMatch(turn.reply, /Would you prefer/i);
});

test('worded shared-inbox team answer preserves qualification context', () => {
  let state = createInitialSalesState();
  for (const input of [
    'We are a real estate company and need website and WhatsApp AI',
    'Around 2,000 enquiries per month',
    'One CRM integration',
    'We need lead qualification',
    'English and Arabic',
    'No AI Guide needed',
    'No API or custom workflows needed',
    'One external integration',
    'We do not need AI lead scoring',
  ]) state = generateSalesTurn(state, input).state;

  const turn = generateSalesTurn(state, 'Three people will use the shared inbox.');

  assert.equal(turn.state.lead.teamUsers, '3');
  assert.notEqual(turn.reply, 'I’m the SamChe AI product assistant, so I can help with SamChe AI products, pricing, demos, features, and finding the right solution for your business. What would you like to achieve with AI?');
  assert.match(turn.reply, /When would you ideally like to start/i);
});

test('WhatsApp sales message is structured, encoded, complete, and keeps CRM integration out of selected products', () => {
  let state = createInitialSalesState();
  for (const input of [
    'We are a real estate company in Dubai and need website and WhatsApp AI.',
    'We receive around 2,000 enquiries per month. We need CRM integration and lead qualification.',
    'We need English and Arabic.',
    'No AI Guide, API, custom workflows, or AI lead scoring. We have one CRM integration and 3 team users.',
  ]) state = generateSalesTurn(state, input).state;
  const url = buildWhatsAppSalesUrl(state.lead);
  const message = decodeURIComponent(new URL(url).searchParams.get('text'));
  assert.equal(new URL(url).pathname, '/971506941372');
  assert.match(message, /⚙️ SAMCHE AI — SALES ENQUIRY/);
  assert.match(message, /☑️ LEAD DETAILS[\s\S]*• 🏷️ Industry: Real Estate[\s\S]*• 🌍 Country: United Arab Emirates/);
  assert.match(message, /✉️ CHANNELS\nWebsite \+ WhatsApp/);
  assert.match(message, /✳️ PRODUCTS\nWeb Chatbot \+ WhatsApp AI/);
  assert.match(message, /⚡ INTEGRATIONS\nCRM \/ booking integration requested/);
  assert.match(message, /✳️ LEAD QUALIFICATION\nRequired/);
  assert.match(message, /▣ RECOMMENDED PLAN\nGROWTH/);
  assert.doesNotMatch(message, /Products:[^\n]*CRM & Pipeline/i);
  assert.match(message, /Not shared yet/);
  assert.match(message, /— Generated via SamChe AI Assistant/);
});

test('WhatsApp prefill includes readable icon headings, every major field, and encoded line breaks', () => {
  const lead = createInitialSalesState().lead;
  const url = buildWhatsAppSalesUrl(lead);
  const encoded = new URL(url).searchParams.get('text');
  const message = decodeURIComponent(encoded);
  assert.match(message, /⚙️ SAMCHE AI — SALES ENQUIRY/);
  assert.match(message, /☑️ LEAD DETAILS\n• ☑️ Name: Not shared yet\n• ✉️ Email: Not shared yet/);
  for (const heading of ['✳️ REQUIREMENT', '✉️ CHANNELS', '✳️ PRODUCTS', '☀️ LANGUAGES', '⚡ INTEGRATIONS', '☑️ ESTIMATED VOLUME', '▣ LIKELY PLAN', '☑️ TIMELINE', '📞 CONTACT PREFERENCE', '☑️ TEAM USERS', '💰 BUDGET', '✳️ LEAD QUALIFICATION']) assert.ok(message.includes(heading), `missing ${heading}`);
  assert.match(message, /%0A|\n/);
  assert.match(message, /— Generated via SamChe AI Assistant/);
});

test('WhatsApp URL preserves the exact English Unicode message through one UTF-8 encoding pass', () => {
  const lead = {
    ...createInitialSalesState().lead,
    industry: 'Real Estate', country: 'United Arab Emirates',
    channels: ['Website', 'WhatsApp'], products: ['Web Chatbot', 'WhatsApp AI'],
    languages: 'English / Arabic', volume: '2,000/month', recommendedPlan: 'growth',
  };
  const originalMessage = buildLeadSummary(lead, 'en');
  const url = buildWhatsAppSalesUrl(lead, 'en');
  const encodedMessage = url.split('?text=')[1];

  assert.equal(encodedMessage.includes('�'), false);
  assert.match(encodedMessage, /%E2%9A%99%EF%B8%8F/);
  assert.equal(decodeURIComponent(encodedMessage), originalMessage);
  assert.equal(new URL(url).searchParams.get('text'), originalMessage);
  assert.equal(originalMessage.includes('�'), false);
});

test('WhatsApp URL preserves Arabic and other Unicode lead data without replacement characters', () => {
  const lead = {
    ...createInitialSalesState().lead,
    name: 'ليلى', company: 'شركة دبي', industry: 'العقارات', country: 'الإمارات العربية المتحدة',
    mainGoal: 'تحسين متابعة العملاء', channels: ['Website', 'WhatsApp'], languages: 'العربية / English',
  };
  const originalMessage = buildLeadSummary(lead, 'ar');
  const url = buildWhatsAppSalesUrl(lead, 'ar');
  const encodedMessage = url.split('?text=')[1];

  assert.equal(encodedMessage.includes('�'), false);
  assert.equal(decodeURIComponent(encodedMessage), originalMessage);
  assert.equal(new URL(url).searchParams.get('text'), originalMessage);
  assert.equal(originalMessage.includes('�'), false);
  assert.match(originalMessage, /ليلى|العقارات|الإمارات/);
});

test('all-plan comparison is only returned when explicitly requested', () => {
  const comparison = generateSalesTurn(createInitialSalesState(), 'Please compare all plans');
  assert.match(comparison.reply, /Starter.*Growth.*Business.*Enterprise/);
  const selective = generateSalesTurn(createInitialSalesState(), 'How much is Web Chatbot?');
  assert.doesNotMatch(selective.reply, /AED 3,990.*AED 7,990/);
});

test('explicit AI Guide rejection is persisted and never used to justify Business', () => {
  let state = createInitialSalesState();
  for (const input of [
    'We are a real estate company in Dubai and need website and WhatsApp AI.',
    'We receive around 2,000 enquiries per month. We need CRM integration and lead qualification.',
    'We need English and Arabic.',
    'We only need Web Chatbot and WhatsApp AI. We do not need AI Guide.',
  ]) state = generateSalesTurn(state, input).state;

  assert.equal(state.lead.aiGuideNeed, 'Not required');
  assert.equal(state.lead.products.includes('AI Guide'), false);
  assert.notEqual(state.lead.likelyPlan, 'business');
  assert.notEqual(state.lead.recommendedPlan, 'business');
});

test('comma-separated API and custom workflow rejection remains distinct from unknown', () => {
  let state = createInitialSalesState();
  for (const input of [
    'We are a real estate company in Dubai and need website and WhatsApp AI.',
    'We receive around 2,000 enquiries per month. We need CRM integration and lead qualification.',
    'We need English and Arabic.',
    'We only need Web Chatbot and WhatsApp AI. We do not need AI Guide.',
  ]) state = generateSalesTurn(state, input).state;
  const turn = generateSalesTurn(state, 'No, we don’t need API access or custom workflows.');

  assert.equal(turn.state.lead.apiAccessNeed, 'Not required');
  assert.equal(turn.state.lead.customWorkflowNeed, 'Not required');
  assert.equal(turn.state.lead.apiWorkflow, 'Not required');
  assert.notEqual(turn.state.lead.likelyPlan, 'business');
  assert.notEqual(turn.state.lead.recommendedPlan, 'business');
  assert.doesNotMatch(turn.reply, /Business.*AI Guide|Business.*API/i);
});

test('combined website WhatsApp qualification with explicit negatives keeps Growth as the closest fit', () => {
  let state = createInitialSalesState();
  for (const input of [
    'We are a real estate company in Dubai.',
    'Most of our leads come from our website and WhatsApp.',
    'We receive around 2,000 enquiries per month. We need CRM integration and lead qualification.',
    'We need English and Arabic.',
    'We only need Web Chatbot and WhatsApp AI. We do not need AI Guide.',
    'No, we don’t need API access or custom workflows.',
    'We do not need AI lead scoring. We have one CRM integration and 3 team users.',
  ]) state = generateSalesTurn(state, input).state;

  assert.equal(state.lead.aiGuideNeed, 'Not required');
  assert.equal(state.lead.apiAccessNeed, 'Not required');
  assert.equal(state.lead.customWorkflowNeed, 'Not required');
  assert.equal(state.lead.recommendedPlan, 'growth');
  assert.equal(state.lead.products.includes('CRM & Pipeline'), false);
});

test('capability question interrupts qualification, answers safely, and resumes volume without CTAs', () => {
  const initial = createInitialSalesState();
  const state = { ...initial, lead: { ...initial.lead, industry: 'Real Estate', country: 'United Arab Emirates', channels: ['Website', 'WhatsApp'] }, pendingQualificationField: 'volume', lastPendingQuestion: 'How many enquiries do you receive each month?' };
  const turn = generateSalesTurn(state, 'Before we continue, can this AI actually replace one of my sales staff?');

  assert.match(turn.reply, /automate|first-response|sales staff|negotiat|relationship|clos/i);
  assert.doesNotMatch(turn.reply, /guaranteed|replace one-for-one|reduce headcount|guaranteed ROI/i);
  assert.match(turn.reply, /enquiries|CRM|lead qualification/i);
  assert.equal(turn.state.lead.industry, 'Real Estate');
  assert.deepEqual(turn.state.lead.channels, ['Website', 'WhatsApp']);
  assert.equal(turn.state.pendingQualificationField, 'volume');
  assert.equal(turn.actions.length, 0);
});

test('AI Guide question interrupts qualification and resumes the pending language field', () => {
  const initial = createInitialSalesState();
  const state = { ...initial, lead: { ...initial.lead, industry: 'Real Estate', channels: ['Website'], volume: '2,000/month', integrations: 'CRM / booking integration requested', leadQualification: 'Lead qualification requested' }, pendingQualificationField: 'languages', lastPendingQuestion: 'Which languages do you need?' };
  const turn = generateSalesTurn(state, 'How does the AI Guide work?');

  assert.match(turn.reply, /AI Guide|guided/i);
  assert.match(turn.reply, /languages/i);
  assert.equal(turn.state.pendingQualificationField, 'languages');
  assert.equal(turn.actions.length, 0);
});

test('Growth pricing question answers with approved price and resumes pending team-user qualification', () => {
  const initial = createInitialSalesState();
  const state = { ...initial, lead: { ...initial.lead, industry: 'Real Estate', channels: ['Website', 'WhatsApp'], volume: '2,000/month', integrations: 'CRM / booking integration requested', leadQualification: 'Lead qualification requested', likelyPlan: 'growth' }, pendingQualificationField: 'teamUsers', lastPendingQuestion: 'How many people will use the shared inbox?' };
  const turn = generateSalesTurn(state, 'How much does Growth cost?');

  assert.match(turn.reply, /AED 3,990\/month/);
  assert.match(turn.reply, /team|shared inbox/i);
  assert.equal(turn.state.pendingQualificationField, 'teamUsers');
  assert.equal(turn.actions.length, 0);
});

test('after-hours capability question answers safely and resumes pending CRM qualification', () => {
  const initial = createInitialSalesState();
  const state = { ...initial, lead: { ...initial.lead, industry: 'Real Estate', channels: ['Website', 'WhatsApp'], volume: '2,000/month' }, pendingQualificationField: 'integrations', lastPendingQuestion: 'Will you need a CRM integration?' };
  const turn = generateSalesTurn(state, 'Can it answer customers at night?');

  assert.match(turn.reply, /answer|automate|after|night|24\/7/i);
  assert.doesNotMatch(turn.reply, /guaranteed|sales results|ROI/i);
  assert.match(turn.reply, /CRM|integration/i);
  assert.equal(turn.state.pendingQualificationField, 'integrations');
  assert.equal(turn.actions.length, 0);
});

test('Arabic capability interrupt remains safe and resumes the pending qualification field', () => {
  const initial = createInitialSalesState();
  const state = { ...initial, lead: { ...initial.lead, industry: 'Real Estate', channels: ['Website', 'WhatsApp'] }, pendingQualificationField: 'volume', lastPendingQuestion: 'How many enquiries do you receive each month?' };
  const turn = generateSalesTurn(state, 'هل يمكن للذكاء الاصطناعي استبدال موظف المبيعات؟', [], 'ar');

  assert.match(turn.reply, /أتمتة|الردود الأولية|المبيعات|التفاوض/i);
  assert.doesNotMatch(turn.reply, /ضمان|استبدال الموظفين|عائد استثمار مضمون/i);
  assert.equal(turn.state.pendingQualificationField, 'volume');
  assert.equal(turn.actions.length, 0);
});

test('response mode explicitly identifies current-turn interrupt priority', () => {
  assert.equal(getSalesResponseMode('Can this AI replace one of my sales staff?'), 'capability_interrupt');
  assert.equal(getSalesDetectedIntent('Can this AI replace one of my sales staff?'), 'capability_question');
  assert.equal(getSalesResponseMode('How does AI Guide work?'), 'in_scope_interrupt');
  assert.equal(getSalesResponseMode('How much does Growth cost?'), 'pricing_interrupt');
  assert.equal(getSalesResponseMode('I want a demo'), 'demo_interrupt');
  assert.equal(getSalesResponseMode('Ürünleri hemen teslim ediyor musunuz?'), 'in_scope_interrupt');
  assert.equal(getSalesResponseMode('I want to speak to sales on WhatsApp'), 'handoff');
  assert.equal(getSalesResponseMode('How many enquiries do you receive?'), 'qualification_answer');
});

for (const input of ['We want to start this month', 'Please prepare a quote']) {
  test(`final regression: commercial CTA requires qualification and contacts: ${input}`, () => {
    const initial = createInitialSalesState();
    const qualification = { industry: 'Retail', channels: ['Website'], volume: '2,000/month', integrations: 'CRM', leadQualification: 'Required' };
    const contacts = { name: 'Synthetic Person', email: 'synthetic.person@example.com', company: 'Example' };
    for (const fields of [{}, contacts, qualification,
      { ...qualification, ...contacts, name: '' }, { ...qualification, ...contacts, email: '' },
      { ...qualification, ...contacts, company: '' }]) {
      const turn = generateSalesTurn({ ...initial, lead: { ...initial.lead, ...fields } }, input);
      assert.equal(turn.actions.some((action) => action.type === 'demo'), false, JSON.stringify(fields));
    }
    const ready = generateSalesTurn({ ...initial, lead: { ...initial.lead, ...qualification, ...contacts } }, input);
    assert.equal(ready.actions.some((action) => action.type === 'demo'), true);
    assert.equal(ready.actions.some((action) => action.type === 'whatsapp'), true);
  });
}

test('demo intent never exposes a premature CTA or asks for scheduling details', () => {
  const turn = generateSalesTurn(createInitialSalesState(), 'I want a demo');
  assert.equal(turn.state.lead.demoInterest, true);
  assert.equal(turn.actions.some((action) => action.label === 'REQUEST DEMO'), false);
  assert.doesNotMatch(turn.reply, /date|time|slot|schedule|booked/i);
});

test('demo handoff requires name, work email and company before the CTA', () => {
  const initial = createInitialSalesState();
  const qualifiedLead = {
    ...initial.lead, demoInterest: true, industry: 'Real Estate', country: 'United Arab Emirates',
    mainGoal: 'Capture and qualify website and WhatsApp enquiries', channels: ['Website', 'WhatsApp'],
    products: ['Web Chatbot', 'WhatsApp AI'], volume: '500/month', integrations: 'CRM / booking integration requested',
    leadQualification: 'Lead qualification requested', languages: 'English / Arabic', aiGuideNeed: 'Not required',
    apiWorkflow: 'Not required', externalIntegrations: 'One integration', aiLeadScoring: 'Not required', teamUsers: '3',
    recommendedPlan: 'growth', likelyPlan: 'growth',
  };
  const waiting = generateSalesTurn({ ...initial, intent: 'HOT', lead: qualifiedLead }, 'I want to proceed with the demo');
  assert.equal(hasRequiredDemoContact(waiting.state.lead), false);
  assert.equal(waiting.actions.some((action) => action.label === 'REQUEST DEMO'), false);
  assert.match(waiting.reply, /name.*work email.*company/i);

  const readyLead = { ...qualifiedLead, name: 'Amina Noor', email: 'amina@example.com', company: 'Amina Properties' };
  assert.equal(isDemoQualificationReady(readyLead), true);
  const ready = generateSalesTurn({ ...initial, intent: 'HOT', lead: readyLead }, 'Please prepare the demo request');
  assert.ok(ready.actions.some((action) => action.label === 'REQUEST DEMO'));
  assert.match(ready.reply, /review and submit|sales team.*follow up/i);
});

test('final regression: demo CTA also requires lead qualification', () => {
  const initial = createInitialSalesState();
  const lead = {
    ...initial.lead, industry: 'Retail', channels: ['Website'], volume: '2,000/month', integrations: 'CRM',
    name: 'Synthetic Person', email: 'synthetic.person@example.com', company: 'Example',
  };
  const turn = generateSalesTurn({ ...initial, lead }, 'I want a demo');
  assert.equal(turn.actions.some((action) => action.type === 'demo'), false);
});

test('preferred demo date and time remain preferences, never confirmed booking fields', () => {
  let state = generateSalesTurn(createInitialSalesState(), 'I want a demo').state;
  state = generateSalesTurn(state, 'Today at 6:00 PM').state;
  assert.equal(state.lead.preferredDemoDate, 'Today');
  assert.equal(state.lead.preferredDemoTime, '6:00 PM');
  assert.equal(Object.hasOwn(state.lead, 'scheduledDemoDate'), false);
  assert.equal(Object.hasOwn(state.lead, 'confirmedDemoTime'), false);
  const spoken = generateSalesTurn(createInitialSalesState(), 'Tomorrow at 6 pm').state;
  assert.equal(spoken.lead.preferredDemoDate, 'Tomorrow');
  assert.equal(spoken.lead.preferredDemoTime, '6:00 PM');
});

test('CRM and booking are captured as product requirements, not demo scheduling', () => {
  const turn = generateSalesTurn(createInitialSalesState(), 'I want CRM and booking');
  assert.equal(turn.state.lead.integrations, 'CRM / booking integration requested');
  assert.equal(turn.state.lead.demoInterest, false);
  assert.doesNotMatch(turn.reply, /scheduled|appointment|confirmation email/i);
});

test('unsupported email and appointment claims are rewritten by the authoritative capability validator', () => {
  assert.equal(SALES_ACTION_CAPABILITIES.canSendEmail, false);
  assert.equal(SALES_ACTION_CAPABILITIES.canScheduleCalendarMeeting, false);
  assert.equal(SALES_ACTION_CAPABILITIES.canConfirmAppointment, false);
  const safe = validateSalesReply('Your demo is scheduled today at 6:00 PM. You will receive an email confirmation shortly.');
  assert.doesNotMatch(safe, /scheduled|booked|confirmed appointment|email confirmation|sent you an email/i);
  assert.match(safe, /preferred demo time|sales team.*confirm availability/i);
});

test('future tense scheduling and email promises are rewritten safely', () => {
  for (const unsafe of [
    'We will schedule your demo tomorrow.',
    'We will confirm your appointment tomorrow.',
    'We will email you a confirmation.',
    'Would you like to proceed with setting up a demo tomorrow at 18:00?',
    'Shall we proceed with scheduling your demo for tomorrow at 18:00?',
    'سنحدد موعد العرض غداً.',
    'سيقوم فريقنا بجدولة اجتماعك غداً.',
  ]) {
    const safe = validateSalesReply(unsafe);
    assert.notEqual(safe, unsafe, unsafe);
    assert.doesNotMatch(safe, /\b(?:will|going to)\s+(?:schedule|book|email)\b|\b(?:will|going to)\s+confirm(?!\s+availability)\b|(?:demo|appointment|meeting).{0,40}(?:scheduled|booked|confirmed)|(?:سنحدد|بجدولة|تأكيد موعد|حجز موعد)/i);
  }
});

test('sales actions are invalidated when current lead loses demo prerequisites', () => {
  const initial = createInitialSalesState();
  const qualified = { ...initial.lead, demoInterest: true, industry: 'Real Estate', channels: ['Website'], volume: '500/month', integrations: 'CRM / booking integration requested', leadQualification: 'Lead qualification requested', languages: 'English', aiGuideNeed: 'Not required', apiWorkflow: 'Not required', externalIntegrations: 'One integration', aiLeadScoring: 'Not required', teamUsers: '3', name: 'Amina', email: 'amina@example.com', company: 'Amina Properties', recommendedPlan: 'growth', likelyPlan: 'growth' };
  const ready = generateSalesTurn({ ...initial, intent: 'HOT', lead: qualified }, 'Please prepare the demo request');
  assert.equal(ready.actions.some((action) => action.type === 'demo'), true);
  const invalidated = filterSalesActionsForLead({ ...qualified, email: '' }, ready.actions);
  assert.equal(invalidated.some((action) => action.type === 'demo'), false);
  const restored = filterSalesActionsForLead(qualified, invalidated);
  assert.equal(restored.some((action) => action.type === 'demo'), true);
});

test('contact handoff carries structured demo requirements and preferred time', () => {
  const lead = {
    ...createInitialSalesState().lead, name: 'Amina Noor', email: 'amina@example.com', company: 'Amina Properties',
    industry: 'Real Estate', country: 'United Arab Emirates', website: 'https://amina.example',
    mainGoal: 'Capture qualified leads', channels: ['Website', 'WhatsApp'], products: ['Web Chatbot', 'WhatsApp AI'],
    languages: 'English / Arabic', integrations: 'CRM / booking integration requested', volume: '500/month',
    recommendedPlan: 'growth', timeline: 'This month', teamUsers: '3', leadQualification: 'Lead qualification requested',
    aiGuideNeed: 'Not required', apiWorkflow: 'Not required', externalIntegrations: 'One integration',
    aiLeadScoring: 'Not required', preferredDemoDate: 'Today', preferredDemoTime: '6:00 PM', demoInterest: true,
  };
  const handoff = toContactHandoff(lead);
  assert.equal(handoff.name, lead.name);
  assert.equal(handoff.industry, lead.industry);
  assert.deepEqual(handoff.channels, lead.channels);
  assert.equal(handoff.preferredDemoDate, 'Today');
  assert.equal(handoff.preferredDemoTime, '6:00 PM');
  assert.match(handoff.message, /preferred demo time/i);
});

test('repeated yes does not create booking state or booking claims', () => {
  const initial = createInitialSalesState();
  const waiting = {
    ...initial,
    lead: {
      ...initial.lead, demoInterest: true, preferredDemoDate: 'Tomorrow', preferredDemoTime: '6:00 PM',
      bookedDemo: true, appointmentConfirmed: true, emailConfirmationSent: true,
    },
    lastQuestion: 'Would you prefer a demo request or a WhatsApp conversation?',
  };

  const turn = generateSalesTurn(waiting, 'yes');

  for (const key of ['scheduledDemoDate', 'scheduledDemoTime', 'confirmedDemoDate', 'confirmedDemoTime', 'bookedDemo', 'appointmentConfirmed', 'emailConfirmationSent']) {
    assert.equal(Object.hasOwn(turn.state.lead, key), false, `repeated yes must not create ${key}`);
  }
  assert.doesNotMatch(turn.reply, /scheduled|booked|appointment confirmed|confirmation email/i);
  assert.equal(turn.state.lead.preferredDemoDate, 'Tomorrow');
  assert.equal(turn.state.lead.preferredDemoTime, '6:00 PM');
});
