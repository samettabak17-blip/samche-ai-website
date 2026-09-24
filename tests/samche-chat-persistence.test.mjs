import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSalesState } from '../lib/samche-sales-assistant.mjs';

for (const boundary of ['validate', 'load', 'save']) {
  test(`final regression: ${boundary} uses canonical keys at every session level`, async () => {
    const { CHAT_STORAGE_KEY, validateChatSession, loadChatSession, saveChatSession } = await loadPersistenceModule();
    const storage = new MemoryStorage();
    const canonical = {
      version: 3, messages: [{ role: 'user', text: 'Tomorrow is preferred.', time: '10:00' }],
      state: createInitialSalesState(), actions: [], open: true, siteLocale: 'en', conversationLanguage: 'en', lastActiveAt: '2026-09-24T00:00:00.000Z',
      context: { mode: 'sales', product: '', plan: '', supportIssue: '', articleRefs: [], imageSummary: '', imageModule: '' },
    };
    const contaminated = {
      ...canonical, meetingConfirmed: true, arbitrarySession: 'unsupported',
      state: { ...canonical.state, meetingConfirmed: true, arbitraryState: 'unsupported',
        lead: { ...canonical.state.lead, meetingConfirmed: true, arbitraryLead: 'unsupported' } },
    };
    let result;
    if (boundary === 'validate') result = validateChatSession(contaminated);
    if (boundary === 'load') {
      storage.setItem(CHAT_STORAGE_KEY, JSON.stringify(contaminated));
      result = loadChatSession(storage);
    }
    if (boundary === 'save') {
      assert.equal(saveChatSession(storage, contaminated), true);
      result = JSON.parse(storage.getItem(CHAT_STORAGE_KEY));
    }
    assert.deepEqual(result, canonical);
  });
}

for (const claim of ['No problem, your demo is confirmed.', 'No problem — we have set a meeting for tomorrow.', "We've successfully booked your appointment.", 'تم تأكيد موعد العرض غداً.']) {
  test(`final regression: persistence removes affirmative claim ${claim}`, async () => {
    const { CHAT_STORAGE_KEY, loadChatSession, saveChatSession } = await loadPersistenceModule();
    const storage = new MemoryStorage();
    const safe = { role: 'assistant', text: 'No appointment has been confirmed.', time: '10:00' };
    const user = { role: 'user', text: claim, time: '10:00' };
    const session = { version: 3, messages: [safe, user, { ...safe, text: claim }], state: createInitialSalesState(), actions: [], open: true, siteLocale: 'en', conversationLanguage: 'en', lastActiveAt: '2026-09-24T00:00:00.000Z', context: { mode: 'sales', product: '', plan: '', supportIssue: '', articleRefs: [], imageSummary: '', imageModule: '' } };
    storage.setItem(CHAT_STORAGE_KEY, JSON.stringify(session));
    assert.deepEqual(loadChatSession(storage).messages, [safe, user]);
    assert.equal(saveChatSession(storage, session), true);
    assert.deepEqual(JSON.parse(storage.getItem(CHAT_STORAGE_KEY)).messages, [safe, user]);
  });
}


class MemoryStorage {
  #values = new Map();
  getItem(key) { return this.#values.get(key) ?? null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
  removeItem(key) { this.#values.delete(key); }
}

async function loadPersistenceModule() {
  let persistenceModule;
  try { persistenceModule = await import('../lib/samche-chat-persistence.mjs'); } catch { /* Assert below reports the expected missing behavior. */ }
  assert.ok(persistenceModule, 'versioned chatbot persistence module should exist');
  return persistenceModule;
}

test('versioned persistence restores chat, lead, stage, actions and open state across remounts', async () => {
  const { CHAT_STORAGE_KEY, saveChatSession, loadChatSession } = await loadPersistenceModule();
  const storage = new MemoryStorage();
  const session = {
    messages: [{ role: 'user', text: 'We are a real estate company.', time: '10:00 AM' }],
    state: { ...createInitialSalesState(), turns: 1, lead: { ...createInitialSalesState().lead, industry: 'Real Estate' } },
    actions: [{ label: 'TRY WEB CHATBOT', type: 'link', href: 'https://demo.samchecompany.com/' }],
    open: true,
  };
  saveChatSession(storage, session);
  const restored = loadChatSession(storage);
  assert.equal(CHAT_STORAGE_KEY, 'samche_ai_chat_v3');
  assert.deepEqual({ ...restored, lastActiveAt: 'stable' }, { ...session, version: 3, siteLocale: 'en', conversationLanguage: 'en', lastActiveAt: 'stable', context: { mode: 'sales', product: '', plan: '', supportIssue: '', articleRefs: [], imageSummary: '', imageModule: '' } });
});

test('invalid or incompatible persisted state fails safely without throwing', async () => {
  const { CHAT_STORAGE_KEY, loadChatSession } = await loadPersistenceModule();
  const storage = new MemoryStorage();
  storage.setItem(CHAT_STORAGE_KEY, '{broken');
  assert.equal(loadChatSession(storage), null);
  storage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ version: 9, messages: [], state: createInitialSalesState(), actions: [], open: false }));
  assert.equal(loadChatSession(storage), null);
});

test('clear removes persisted chat and lead handoff data', async () => {
  const { CHAT_STORAGE_KEY, LEAD_HANDOFF_KEY, saveChatSession, clearChatSession } = await loadPersistenceModule();
  const storage = new MemoryStorage();
  saveChatSession(storage, { messages: [], state: createInitialSalesState(), actions: [], open: false });
  storage.setItem(LEAD_HANDOFF_KEY, '{"industry":"Real Estate"}');
  clearChatSession(storage);
  assert.equal(storage.getItem(CHAT_STORAGE_KEY), null);
  assert.equal(storage.getItem(LEAD_HANDOFF_KEY), null);
});

test('full lead state and qualification metadata survive a refresh round trip', async () => {
  const { saveChatSession, loadChatSession } = await loadPersistenceModule();
  const storage = new MemoryStorage();
  const base = createInitialSalesState();
  const session = {
    messages: [{ role: 'assistant', text: 'Continuing your qualification.', time: '10:00 AM' }],
    state: {
      ...base,
      qualificationStage: 'differentiators',
      commercialIntent: 'WARM',
      summaryReadiness: false,
      lead: {
        ...base.lead,
        industry: 'Real Estate', country: 'United Arab Emirates', channels: ['Website', 'WhatsApp'],
        volume: '2,000/month', integrations: 'CRM / booking integration requested',
        leadQualification: 'Lead qualification requested', languages: 'English / Arabic',
        aiGuideNeed: 'Not required', apiAccessNeed: 'Not required', customWorkflowNeed: 'Not required',
        externalIntegrations: 'one', aiLeadScoring: 'Not required', likelyPlan: 'growth',
      },
    },
    actions: [], open: true, siteLocale: 'tr', conversationLanguage: 'tr', sessionId: 'session-test-1', lastActiveAt: '2026-09-24T00:00:00.000Z',
    context: { mode: 'sales', product: 'WhatsApp AI', plan: 'growth', supportIssue: 'WhatsApp replies are failing', articleRefs: ['whatsapp-ai-troubleshooting'], imageSummary: 'Visible inactive channel warning', imageModule: 'WhatsApp channel' },
  };
  assert.equal(saveChatSession(storage, session), true);
  assert.deepEqual(loadChatSession(storage), { ...session, version: 3 });
});

test('hybrid conversation metadata survives refresh round trip', async () => {
  const { saveChatSession, loadChatSession } = await loadPersistenceModule();
  const base = createInitialSalesState();
  const session = {
    messages: [],
    state: { ...base, pendingQualificationField: 'teamUsers', lastPendingQuestion: 'How many people would use the shared inbox?', offTopicTurns: 2 },
    actions: [], open: true, siteLocale: 'en', conversationLanguage: 'ar', sessionId: 'hybrid-session', lastActiveAt: '2026-09-24T00:00:00.000Z', context: { mode: 'support', product: 'WhatsApp AI', plan: '', supportIssue: 'Inactive channel', articleRefs: [], imageSummary: '', imageModule: '' },
  };
  const storage = new MemoryStorage();
  assert.equal(saveChatSession(storage, session), true);
  assert.deepEqual(loadChatSession(storage), { ...session, version: 3 });
});

test('v1 sessions migrate with safe defaults and never retain raw image payloads', async () => {
  const { CHAT_STORAGE_KEY, loadChatSession } = await loadPersistenceModule();
  const storage = new MemoryStorage();
  const base = createInitialSalesState();
  storage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
    version: 1,
    messages: [{ role: 'assistant', text: 'Check WhatsApp.', time: '10:00', imageContext: true, data: 'data:image/png;base64,secret', preview: 'blob:secret', articleRefs: ['whatsapp-ai-troubleshooting'] }],
    state: base, actions: [], open: true, locale: 'en',
  }));
  const restored = loadChatSession(storage);
  assert.equal(restored.version, 3);
  assert.equal(restored.messages[0].data, undefined);
  assert.equal(restored.messages[0].preview, undefined);
  assert.deepEqual(restored.context.articleRefs, ['whatsapp-ai-troubleshooting']);
  assert.equal(restored.context.imageSummary, '');
});

test('expired sessions fail safely without restoring stale conversation context', async () => {
  const { CHAT_STORAGE_KEY, loadChatSession } = await loadPersistenceModule();
  const storage = new MemoryStorage();
  const base = createInitialSalesState();
  storage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ version: 3, messages: [], state: base, actions: [], open: true, siteLocale: 'en', conversationLanguage: 'en', lastActiveAt: '2020-01-01T00:00:00.000Z', context: { mode: 'sales', product: '', plan: '', supportIssue: '', articleRefs: [], imageSummary: '', imageModule: '' } }));
  assert.equal(loadChatSession(storage), null);
});

test('legacy booking fields and unsafe assistant claims are sanitized at load and save boundaries', async () => {
  const { CHAT_STORAGE_KEY, loadChatSession, saveChatSession } = await loadPersistenceModule();
  const storage = new MemoryStorage();
  const base = createInitialSalesState();
  const legacy = {
    version: 1,
    messages: [
      { role: 'user', text: 'I want a demo tomorrow at 6 PM.', time: '10:00 AM' },
      { role: 'assistant', text: 'Your demo booking is confirmed.', time: '10:01 AM' },
      { role: 'assistant', text: 'Your appointment has now been confirmed.', time: '10:02 AM' },
      { role: 'assistant', text: 'We have sent an email confirming your demo.', time: '10:03 AM' },
      { role: 'assistant', text: 'I can record your preferred demo time only; no appointment has been confirmed.', time: '10:04 AM' },
    ],
    state: {
      ...base,
      scheduledDemoDate: 'Tomorrow', scheduledDemoTime: '6:00 PM',
      confirmedDemoDate: 'Tomorrow', confirmedDemoTime: '6:00 PM',
      bookedDemo: true, appointmentConfirmed: true, emailConfirmationSent: true,
      lead: {
        ...base.lead,
        preferredDemoDate: 'Tomorrow', preferredDemoTime: '6:00 PM',
        scheduledDemoDate: 'Tomorrow', scheduledDemoTime: '6:00 PM',
        confirmedDemoDate: 'Tomorrow', confirmedDemoTime: '6:00 PM',
        bookedDemo: true, appointmentConfirmed: true, emailConfirmationSent: true,
      },
    },
    scheduledDemoDate: 'Tomorrow', scheduledDemoTime: '6:00 PM',
    confirmedDemoDate: 'Tomorrow', confirmedDemoTime: '6:00 PM',
    bookedDemo: true, appointmentConfirmed: true, emailConfirmationSent: true,
    actions: [], open: true,
  };
  storage.setItem(CHAT_STORAGE_KEY, JSON.stringify(legacy));

  const loaded = loadChatSession(storage);
  assert.equal(loaded.state.lead.preferredDemoDate, 'Tomorrow');
  assert.equal(loaded.state.lead.preferredDemoTime, '6:00 PM');
  for (const key of ['scheduledDemoDate', 'scheduledDemoTime', 'confirmedDemoDate', 'confirmedDemoTime', 'bookedDemo', 'appointmentConfirmed', 'emailConfirmationSent']) {
    assert.equal(Object.hasOwn(loaded.state.lead, key), false, `legacy field ${key} should be removed`);
  }
  assert.equal(loaded.messages.some((message) => /booking is confirmed|appointment has now been confirmed|email confirming your demo/i.test(message.text)), false);
  assert.equal(loaded.messages.some((message) => /preferred demo time only; no appointment has been confirmed/i.test(message.text)), true);
  for (const key of ['scheduledDemoDate', 'scheduledDemoTime', 'confirmedDemoDate', 'confirmedDemoTime', 'bookedDemo', 'appointmentConfirmed', 'emailConfirmationSent']) {
    assert.equal(Object.hasOwn(loaded.state, key), false, `direct state field ${key} should be removed`);
    assert.equal(Object.hasOwn(loaded, key), false, `top-level field ${key} should be removed`);
  }

  assert.equal(saveChatSession(storage, legacy), true);
  const saved = JSON.parse(storage.getItem(CHAT_STORAGE_KEY));
  assert.equal(saved.state.lead.preferredDemoDate, 'Tomorrow');
  assert.equal(saved.state.lead.preferredDemoTime, '6:00 PM');
  assert.equal(saved.messages.some((message) => /booking is confirmed|appointment has now been confirmed|email confirming your demo/i.test(message.text)), false);
  assert.equal(saved.messages.some((message) => /preferred demo time only; no appointment has been confirmed/i.test(message.text)), true);
  for (const key of ['scheduledDemoDate', 'scheduledDemoTime', 'confirmedDemoDate', 'confirmedDemoTime', 'bookedDemo', 'appointmentConfirmed', 'emailConfirmationSent']) {
    assert.equal(Object.hasOwn(saved.state, key), false, `saved direct state field ${key} should be removed`);
    assert.equal(Object.hasOwn(saved, key), false, `saved top-level field ${key} should be removed`);
  }
});

test('v3 stores site locale and conversation language separately and migrates v2 locale', async () => {
  const { CHAT_STORAGE_KEY, PREVIOUS_CHAT_STORAGE_KEY, loadChatSession, saveChatSession } = await loadPersistenceModule();
  const storage = new MemoryStorage();
  const base = createInitialSalesState();
  const session = {
    messages: [{ role: 'user', text: 'WhatsApp çalışmıyor', time: '10:00', language: 'tr' }],
    state: base, actions: [], open: true, siteLocale: 'en', conversationLanguage: 'tr',
    lastActiveAt: '2026-09-24T00:00:00.000Z',
    context: { mode: 'support', product: 'WhatsApp AI', plan: 'growth', supportIssue: 'Yanıt yok', articleRefs: ['whatsapp-ai-not-replying'], imageSummary: 'Inactive warning', imageModule: 'WhatsApp AI' },
  };
  assert.equal(saveChatSession(storage, session), true);
  assert.equal(CHAT_STORAGE_KEY, 'samche_ai_chat_v3');
  assert.deepEqual(loadChatSession(storage), { ...session, version: 3 });

  storage.removeItem(CHAT_STORAGE_KEY);
  storage.setItem(PREVIOUS_CHAT_STORAGE_KEY, JSON.stringify({ ...session, version: 2, locale: 'ar', siteLocale: undefined, conversationLanguage: undefined }));
  const migrated = loadChatSession(storage);
  assert.equal(migrated.version, 3);
  assert.equal(migrated.siteLocale, 'ar');
  assert.equal(migrated.conversationLanguage, 'ar');
});
