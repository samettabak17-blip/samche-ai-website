'use client';

import { FormEvent, type CSSProperties, useEffect, useRef, useState } from 'react';
import { defaultSamcheChatConfig, resolveSamcheChatConfig } from '../../lib/samche-chat-config.mjs';
import { buildWhatsAppSalesUrl, createInitialSalesState, editLeadField, filterSalesActionsForLead, generateSalesTurn, getSalesInputLanguage, getSalesProcessingStatus, hasRequiredDemoContact, isDemoQualificationReady, isLeadSummaryReady, toContactHandoff } from '../../lib/samche-sales-assistant.mjs';
import { clearChatSession, LEAD_HANDOFF_KEY, loadChatSession, saveChatSession } from '../../lib/samche-chat-persistence.mjs';
import { resolveSalesChatTurn } from '../../lib/samche-sales-chat-client.mjs';
import { useSiteLocale } from './site-localization';

type Message = { role: 'assistant' | 'user'; text: string; title?: string; time: string };
type SalesState = ReturnType<typeof createInitialSalesState>;
type SalesAction = { label: string; type: 'link' | 'demo' | 'whatsapp'; href?: string };
const salesChatApiBaseUrl = '';
function welcomeMessage(config: ReturnType<typeof resolveSamcheChatConfig>): Message {
  return { role: 'assistant', title: config.welcome_title, text: config.welcome_message, time: 'Now' };
}

function Orb({ small = false, header = false, avatarUrl }: { small?: boolean; header?: boolean; avatarUrl?: string | null }) {
  const { locale } = useSiteLocale();
  // Approved tenant avatar URLs are public-configurable; Next image optimization requires allow-listing each host.
  // eslint-disable-next-line @next/next/no-img-element
  if (avatarUrl) return <img className={`samche-orb-image${small ? ' samche-orb-small' : ''}${header ? ' samche-header-orb' : ''}`} src={avatarUrl} alt="" aria-hidden="true" />;
  const askLabel = locale === 'ar' ? 'اسألني' : locale === 'tr' ? 'BANA SOR' : 'ASK ME';
  return <span className={`samche-orb${small ? ' samche-orb-small' : ''}${header ? ' samche-header-orb' : ''}`} aria-hidden="true"><span className="samche-mobile-orb" dir="ltr"><span className="samche-orb-logo-wrap" dir="ltr"><span className="samche-logo-sam">SAM</span><span className="samche-logo-che">CHE</span></span>{!small && <span className="samche-orb-ai-tag" dir={locale === 'ar' ? 'rtl' : 'ltr'}>{askLabel}</span>}</span></span>;
}

function timestamp() {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date());
}

function leadInputValue(lead: SalesState['lead'], key: string) {
  const value = (lead as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : Array.isArray(value) ? value.join(', ') : '';
}

const leadEditFields = [
  ['name','Name'],['email','Email'],['company','Company'],['industry','Industry'],['country','Country'],['website','Website'],
  ['mainGoal','Main requirement'],['languages','Languages'],['volume','Monthly enquiries'],['integrations','Integrations'],
  ['leadQualification','Lead qualification'],['aiGuideNeed','AI Guide'],['apiWorkflow','API / custom workflows'],
  ['externalIntegrations','External integrations'],['aiLeadScoring','AI lead scoring'],['teamUsers','Team users'],
  ['timeline','Timeline'],['preferredDemoDate','Preferred demo date'],['preferredDemoTime','Preferred demo time'],['contactPreference','Contact preference'],
];

function leadSummaryFields(lead: SalesState['lead']): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ['Name', lead.name],['Email',lead.email],['Company',lead.company],['Business',lead.industry],['Country',lead.country],
    ['Website',lead.website],['Main requirement',lead.mainGoal],['Channels',lead.channels.join(' + ')],['Products',lead.products.join(' + ')],
    ['Languages',lead.languages],['Integrations',lead.integrations],['Lead qualification',lead.leadQualification ? (/requested/i.test(lead.leadQualification) ? 'Required' : lead.leadQualification) : ''],
    ['AI Guide',lead.aiGuideNeed],['API / custom workflows',lead.apiWorkflow],['External integrations',lead.externalIntegrations],
    ['AI lead scoring',lead.aiLeadScoring],['Monthly enquiries',lead.volume],['Team users',lead.teamUsers],
    [lead.recommendedPlan ? 'Recommended plan' : 'Likely plan', (lead.recommendedPlan || lead.likelyPlan).toUpperCase()],
    ['Timeline',lead.timeline],['Contact preference',lead.contactPreference],
  ];
  return rows.filter(([, value]) => value);
}

export function SamCheChatWidget({ configuration = defaultSamcheChatConfig }: { configuration?: Record<string, unknown> }) {
  const { locale } = useSiteLocale();
  const config = resolveSamcheChatConfig(configuration);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => [welcomeMessage(config)]);
  const [salesState, setSalesState] = useState<SalesState>(createInitialSalesState);
  const [actions, setActions] = useState<SalesAction[]>([]);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [processingStatus, setProcessingStatus] = useState('Matching your requirements to SamChe AI products…');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [visualViewportHeight, setVisualViewportHeight] = useState(0);
  const salesStateRef = useRef<SalesState>(createInitialSalesState());
  const sessionIdRef = useRef('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!sessionIdRef.current) sessionIdRef.current = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const saved = loadChatSession();
      if (saved) {
        setMessages(saved.messages as Message[]);
        salesStateRef.current = saved.state as SalesState;
        setSalesState(saved.state as SalesState);
        setActions(saved.actions as SalesAction[]);
        setOpen(saved.open);
        if (saved.sessionId) sessionIdRef.current = saved.sessionId;
      } else {
        const initial = createInitialSalesState();
        salesStateRef.current = initial;
        setSalesState(initial);
        setMessages([welcomeMessage(config)]);
        setActions([]);
        setOpen(false);
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  // Hydrate once per welcome-copy change; other configuration fields do not affect the initial greeting.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.welcome_message, config.welcome_title]);

  useEffect(() => {
    if (!hydrated) return;
    saveChatSession(undefined, { messages, state: salesState, actions, open, locale, sessionId: sessionIdRef.current });
  }, [messages, salesState, actions, open, hydrated, locale]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [open, messages, sending]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (confirmReset) setConfirmReset(false);
        else if (menuOpen) setMenuOpen(false);
        else setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, confirmReset, menuOpen]);

  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateViewport = () => {
      setVisualViewportHeight(Math.round(viewport.height));
      setKeyboardOpen(window.innerHeight - viewport.height > 140);
    };
    updateViewport();
    viewport.addEventListener('resize', updateViewport);
    viewport.addEventListener('scroll', updateViewport);
    return () => { viewport.removeEventListener('resize', updateViewport); viewport.removeEventListener('scroll', updateViewport); };
  }, [open]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || sending || !hydrated) return;
    setInput('');
    setErrorMessage('');
    const userMessage = { role: 'user' as const, text: trimmed, time: timestamp() };
    setProcessingStatus(getSalesProcessingStatus(trimmed, salesStateRef.current));
    setSending(true);
    setProcessingStatus('Understanding your requirements…');
    const stateCandidate = generateSalesTurn(salesStateRef.current, trimmed, messages, locale);
    const resolved = await resolveSalesChatTurn({ state: salesStateRef.current, stateCandidate, messages, userMessage, locale, time: timestamp(), apiBaseUrl: salesChatApiBaseUrl });
    salesStateRef.current = resolved.state;
    setMessages(resolved.messages as Message[]);
    setSalesState(resolved.state);
    setActions(resolved.actions as SalesAction[]);
    saveChatSession(undefined, { messages: resolved.messages, state: resolved.state, actions: resolved.actions, open: true, locale, sessionId: sessionIdRef.current });
    if (import.meta.env.DEV && resolved.diagnostic) console.debug('[sales-chat] error', { source: resolved.diagnostic.source, httpStatus: 'httpStatus' in resolved.diagnostic ? resolved.diagnostic.httpStatus : undefined, contractReason: 'contractReason' in resolved.diagnostic ? resolved.diagnostic.contractReason : undefined, inputLanguage: getSalesInputLanguage(trimmed) });
    setErrorMessage(resolved.retryMessage);
    setProcessingStatus(resolved.retryMessage || getSalesProcessingStatus(trimmed, resolved.state));
    setSending(false);
  }

  function openDemoRequest() {
    const lead = salesStateRef.current.lead;
    if (!isDemoQualificationReady(lead) || !hasRequiredDemoContact(lead)) return;
    try { window.localStorage.setItem(LEAD_HANDOFF_KEY, JSON.stringify(toContactHandoff(lead, locale))); }
    catch { /* Contact page will still open with the plan in the URL. */ }
    const plan = lead.recommendedPlan;
    const firstProduct = lead.products[0];
    const query = new URLSearchParams();
    if (plan) query.set('plan', plan);
    else if (firstProduct) query.set('interest', firstProduct);
    window.location.assign(`/contact${query.size ? `?${query.toString()}` : ''}`);
  }


  function updateLead(key: string, value: string) {
    const current = salesStateRef.current;
    const updated = { ...current, lead: editLeadField(current.lead, key, value) };
    salesStateRef.current = updated;
    setSalesState(updated);
    const nextActions = filterSalesActionsForLead(updated.lead, actions);
    setActions(nextActions);
    saveChatSession(undefined, { messages, state: updated, actions: nextActions, open, locale, sessionId: sessionIdRef.current });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(input);
  }

  function resetConversation() {
    const initial = createInitialSalesState();
    const freshMessages = [welcomeMessage(config)];
    salesStateRef.current = initial;
    setSalesState(initial);
    setMessages(freshMessages);
    setActions([]);
    setInput('');
    setErrorMessage('');
    setEditing(false);
    setMenuOpen(false);
    setConfirmReset(false);
    clearChatSession();
    saveChatSession(undefined, { messages: freshMessages, state: initial, actions: [], open: true, locale, sessionId: sessionIdRef.current });
  }

  const summaryReady = isLeadSummaryReady(salesState.lead, salesState.intent);
  const salesActions = filterSalesActionsForLead(salesState.lead, actions).filter((action) => action.type === 'demo' || action.type === 'whatsapp');
  const contextualQuickActions = salesState.intent === 'HOT' || summaryReady
    ? config.quick_actions
    : salesState.turns >= 2 ? config.quick_actions.filter((action) => action !== 'Pricing') : [];

  return <div className="samche-chat-root">
    {open && <section className={`samche-chat-panel${keyboardOpen ? ' samche-keyboard-open' : ''}`} style={{ '--samche-visual-viewport-height': `${visualViewportHeight || window.innerHeight}px` } as CSSProperties} role="dialog" aria-label={config.assistant_display_name} aria-modal="false">
      <header className="samche-chat-header"><Orb small header avatarUrl={config.avatar_url || config.logo_url} /><div className="samche-chat-title"><strong>{config.assistant_display_name}</strong><span><i /> {config.assistant_status_label}</span><small>{config.subtitle}</small></div><div className="samche-chat-menu-wrap"><button className="samche-icon-button samche-menu" type="button" aria-label={config.more_options_label} aria-expanded={menuOpen} title={config.more_options_label} onClick={() => setMenuOpen((value) => !value)}>···</button>{menuOpen && <div className="samche-chat-menu"><button type="button" onClick={() => { setMenuOpen(false); setConfirmReset(true); }}>Clear conversation</button></div>}</div><button className="samche-icon-button" type="button" aria-label="Close chat" onClick={() => setOpen(false)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></header>
      {confirmReset && <div className="samche-reset-backdrop"><section className="samche-reset-dialog" role="alertdialog" aria-modal="true" aria-labelledby="samche-reset-title" aria-describedby="samche-reset-copy"><h2 id="samche-reset-title">Clear conversation?</h2><p id="samche-reset-copy">Clear this conversation and start again?</p><div><button type="button" onClick={() => setConfirmReset(false)}>CANCEL</button><button type="button" onClick={resetConversation}>CLEAR CONVERSATION</button></div></section></div>}
      <div className="samche-chat-messages" ref={listRef} aria-live="polite">
        {messages.map((message, index) => <div className={`samche-message-row ${message.role}`} key={`${index}-${message.time}`}>
          {message.role === 'assistant' && <Orb small avatarUrl={config.avatar_url || config.logo_url} />}
          <div className="samche-message-content">{message.title && <strong className="samche-welcome-title">{message.title}</strong>}<div className="samche-message-bubble">{message.text}</div><time>{message.time}</time></div>
          {message.role === 'user' && <span className="samche-user-avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.4-4 2.8-6 7-6s6.6 2 7 6" /></svg></span>}
        </div>)}
        {sending && <div className="samche-message-row assistant" role="status" aria-live="polite"><Orb small /><div className="samche-typing"><span>{processingStatus}</span><i /><i /><i /></div></div>}
        {!sending && errorMessage && <div className="samche-message-row assistant" role="status" aria-live="polite"><Orb small /><div className="samche-message-content"><div className="samche-message-bubble">{errorMessage}</div></div></div>}
      </div>
      <div className="samche-chat-composer">
      {summaryReady && <section className="samche-lead-card" aria-label="Your requirements"><div className="samche-lead-heading"><strong>YOUR REQUIREMENTS</strong><button type="button" onClick={() => setEditing((value) => !value)}>{editing ? 'Done' : 'Edit details'}</button></div>{editing ? <div className="samche-lead-edit">{leadEditFields.map(([key,label]) => <label key={key}>{label}<input value={leadInputValue(salesState.lead, key)} onChange={(event) => updateLead(key, event.target.value)} /></label>)}</div> : <dl>{leadSummaryFields(salesState.lead).map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}{salesActions.length > 0 && <div className="samche-lead-actions">{salesActions.map((action) => action.type === 'demo' ? <button type="button" key={action.label} onClick={openDemoRequest}>{action.label}</button> : <a key={action.label} href={buildWhatsAppSalesUrl(salesState.lead, locale)} target="_blank" rel="noreferrer">{action.label}</a>)}</div>}</section>}
      {contextualQuickActions.length > 0 && <div className="samche-chat-actions" aria-label="Product shortcuts">{contextualQuickActions.map((action, index) => <button className={index === 0 ? 'selected' : ''} type="button" key={action} onClick={() => void ask(action)} disabled={sending || !hydrated}>{action}</button>)}</div>}
      {actions.some((action) => action.type === 'link') && <div className="samche-sales-actions" aria-label="Product demos">{actions.filter((action) => action.type === 'link').map((action) => <a key={action.label} href={action.href} target="_blank" rel="noreferrer">{action.label}</a>)}</div>}
      {!summaryReady && salesActions.length > 0 && <div className="samche-sales-actions" aria-label="Sales next steps">{salesActions.map((action) => action.type === 'demo' ? <button type="button" key={action.label} onClick={openDemoRequest}>{action.label}</button> : <a key={action.label} href={buildWhatsAppSalesUrl(salesState.lead, locale)} target="_blank" rel="noreferrer">{action.label}</a>)}</div>}
      <form className="samche-chat-form" onSubmit={handleSubmit}><label className="sr-only" htmlFor="samche-chat-input">Ask {config.assistant_display_name}</label><span className="samche-clip" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m8 12.5 6.8-6.8a3.2 3.2 0 0 1 4.5 4.5l-8.5 8.5a5 5 0 0 1-7.1-7.1l8-8" /></svg></span><input ref={inputRef} id="samche-chat-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder={config.input_placeholder} autoComplete="off" disabled={!hydrated} /><button className="samche-send" type="submit" aria-label="Send message" disabled={!hydrated || sending || !input.trim()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 17 8-17 8 3-8-3-8Zm3 8h14" /></svg></button></form>
      <p className="samche-chat-disclaimer">{config.scope_disclaimer}</p>
      </div>
    </section>}
    <button className={`samche-chat-launcher${open ? ' is-open' : ''}`} type="button" aria-label={open ? `Close ${config.assistant_display_name} chat` : config.launcher_label} aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg> : <Orb avatarUrl={config.avatar_url || config.logo_url} />}</button>
  </div>;
}
