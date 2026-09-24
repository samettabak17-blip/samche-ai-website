'use client';

import { FormEvent, type ClipboardEvent, type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { resolveSamcheChatConfig } from '../../lib/samche-chat-config.mjs';
import { buildWhatsAppSalesUrl, createInitialSalesState, editLeadField, filterSalesActionsForLead, generateSalesTurn, getSalesInputLanguage, getSalesProcessingStatus, hasRequiredDemoContact, isDemoQualificationReady, isLeadSummaryReady, toContactHandoff } from '../../lib/samche-sales-assistant.mjs';
import { clearChatSession, LEAD_HANDOFF_KEY, loadChatSession, saveChatSession } from '../../lib/samche-chat-persistence.mjs';
import { resolveConversationLanguage, resolveSalesChatTurn } from '../../lib/samche-sales-chat-client.mjs';
import { translateText } from '../../lib/samche-localization.mjs';
import { extractClipboardImage, readImageFile } from '../../lib/chat-attachment.mjs';
import { parseRestrictedMarkdown, stripHelpArticleLinks } from '../../lib/restricted-markdown.mjs';
import { getRevealedText } from '../../lib/chat-reveal.mjs';
import { getPublishedArticlePresentation } from '../../lib/help-center/index.mjs';
import InternalLink from './internal-link';
import { useSiteLocale } from './site-localization';

type ChatLanguage = 'en' | 'tr' | 'ar';
type Message = { role: 'assistant' | 'user'; text: string; title?: string; time: string; language?: ChatLanguage; imageContext?: boolean; articleRefs?: string[] };
type SalesState = ReturnType<typeof createInitialSalesState>;
type SalesAction = { label: string; type: 'link' | 'demo' | 'whatsapp'; href?: string };
type ChatAttachment = { name: string; mimeType: string; data: string; preview: string };
type ChatContext = { mode: 'sales' | 'support'; product: string; plan: string; supportIssue: string; articleRefs: string[]; imageSummary: string; imageModule: string };
type ViewportMetrics = { height: number; offsetTop: number; offsetLeft: number };
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

function timestamp(locale: 'en' | 'tr' | 'ar') {
  return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : locale === 'ar' ? 'ar' : 'en', { hour: 'numeric', minute: '2-digit', hour12: locale === 'en' ? undefined : false }).format(new Date());
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

function deriveChatContext(state: SalesState, messages: Message[]): ChatContext {
  const support = messages.some((message) => /support|issue|error|problem|troubleshoot|sorun|hata|destek|مشكلة|خطأ|دعم/u.test(message.text));
  const articleRefs = [...new Set(messages.flatMap((message) => message.articleRefs || []))].slice(0, 6);
  const imageIndex = messages.map((message, index) => ({ message, index })).reverse().find(({ message }) => message.imageContext)?.index;
  const imageReply = imageIndex === undefined ? '' : messages.slice(imageIndex + 1).find((message) => message.role === 'assistant')?.text || '';
  return {
    mode: support ? 'support' : 'sales',
    product: state.lead.products[0] || state.lead.channels[0] || '',
    plan: state.lead.recommendedPlan || state.lead.likelyPlan || state.lead.preferredPlan || '',
    supportIssue: support ? (messages.filter((message) => message.role === 'user').at(-1)?.text || '').slice(0, 500) : '',
    articleRefs,
    imageSummary: imageReply.slice(0, 600),
    imageModule: imageIndex === undefined ? '' : state.lead.products[0] || 'SamChe AI',
  };
}

type RestrictedInlineToken = { type: 'text' | 'bold' | 'code' | 'break' | 'link'; value?: string; href?: string };
type RestrictedMarkdownBlock = { type: 'paragraph'; children: RestrictedInlineToken[] } | { type: 'ul' | 'ol'; items: RestrictedInlineToken[][] };

function renderAssistantText(text: string) {
  const renderToken = (token: RestrictedInlineToken, tokenIndex: number) => token.type === 'bold'
    ? <strong key={tokenIndex}>{token.value}</strong>
    : token.type === 'code' ? <code key={tokenIndex}>{token.value}</code>
      : token.type === 'link' ? <InternalLink key={tokenIndex} href={token.href || '#'}>{token.value}</InternalLink>
        : token.type === 'break' ? <br key={tokenIndex} />
          : <span key={tokenIndex}>{token.value}</span>;
  return (parseRestrictedMarkdown(text, { articleUrls: new Map() }) as RestrictedMarkdownBlock[]).map((block, blockIndex) => {
    if (block.type === 'ul' || block.type === 'ol') {
      const List = block.type === 'ul' ? 'ul' : 'ol';
      return <List key={`list-${blockIndex}`}>{block.items.map((item, itemIndex) => <li key={`item-${itemIndex}`}>{item.map(renderToken)}</li>)}</List>;
    }
    const paragraphBlock = block as Extract<RestrictedMarkdownBlock, { type: 'paragraph' }>;
    return <p key={`paragraph-${blockIndex}`}>{paragraphBlock.children.map(renderToken)}</p>;
  });
}

export function SamCheChatWidget({ configuration }: { configuration?: Record<string, unknown> }) {
  const { locale } = useSiteLocale();
  const config = resolveSamcheChatConfig(configuration, locale);
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
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const recentImageRef = useRef<ChatAttachment | null>(null);
  const [processingStatus, setProcessingStatus] = useState('Reviewing your request…');
  const [conversationLanguage, setConversationLanguage] = useState<ChatLanguage>(locale);
  const [revealedMessages, setRevealedMessages] = useState<Record<string, string>>({});
  const revealedMessagesRef = useRef<Record<string, string>>({});
  const revealTimersRef = useRef<Map<string, number>>(new Map());
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [visualViewport, setVisualViewport] = useState<ViewportMetrics>({ height: 0, offsetTop: 0, offsetLeft: 0 });
  const salesStateRef = useRef<SalesState>(createInitialSalesState());
  const sessionIdRef = useRef('');
  const chatContextRef = useRef<ChatContext>(deriveChatContext(createInitialSalesState(), []));
  const conversationLanguageRef = useRef<ChatLanguage>(locale);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener('samche:open-chat', openChat);
    return () => window.removeEventListener('samche:open-chat', openChat);
  }, []);

  useLayoutEffect(() => {
    if (!open || !performance.getEntriesByName('samche-chat-open-click').length) return;
    performance.mark('samche-chat-panel-visible');
    const panelMeasure = performance.measure('samche-chat-click-to-panel', 'samche-chat-open-click', 'samche-chat-panel-visible');
    document.documentElement.dataset.samcheChatPanelMs = panelMeasure.duration.toFixed(2);
    if (inputRef.current && !inputRef.current.disabled) {
      performance.mark('samche-chat-composer-ready');
      const composerMeasure = performance.measure('samche-chat-click-to-composer', 'samche-chat-open-click', 'samche-chat-composer-ready');
      document.documentElement.dataset.samcheChatComposerMs = composerMeasure.duration.toFixed(2);
    }
  }, [open]);

  useEffect(() => {
    const timers = revealTimersRef.current;
    const latestAssistant = [...messages].map((message, index) => ({ message, index })).reverse().find(({ message }) => message.role === 'assistant' && !message.title);
    if (!latestAssistant) return;
    const { message, index } = latestAssistant;
    const key = `${index}-${message.time}`;
    const revealText = message.articleRefs?.length ? stripHelpArticleLinks(message.text) : message.text;
    if (revealedMessagesRef.current[key] === revealText) return;
    const previousTimer = timers.get(key);
    if (previousTimer) window.cancelAnimationFrame(previousTimer);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      revealedMessagesRef.current[key] = revealText;
      return;
    }
    const startedAt = performance.now();
    revealedMessagesRef.current[key] = '';
    const revealFrame = (now: number) => {
      const visible = getRevealedText(revealText, now - startedAt);
      revealedMessagesRef.current[key] = visible;
      setRevealedMessages((current) => ({ ...current, [key]: visible }));
      if (visible === revealText) {
        timers.delete(key);
        return;
      }
      timers.set(key, window.requestAnimationFrame(revealFrame));
    };
    timers.set(key, window.requestAnimationFrame(revealFrame));
  }, [messages]);

  useEffect(() => {
    const timers = revealTimersRef.current;
    return () => timers.forEach((timer) => window.cancelAnimationFrame(timer));
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (!sessionIdRef.current) sessionIdRef.current = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const saved = loadChatSession();
      if (saved) {
        setMessages(saved.messages as Message[]);
        salesStateRef.current = saved.state as SalesState;
        setSalesState(saved.state as SalesState);
        setActions(saved.actions as SalesAction[]);
        conversationLanguageRef.current = saved.conversationLanguage as ChatLanguage;
        setConversationLanguage(saved.conversationLanguage as ChatLanguage);
        chatContextRef.current = (saved.context as ChatContext) || deriveChatContext(saved.state as SalesState, saved.messages as Message[]);
        setOpen(saved.open);
        if (saved.sessionId) sessionIdRef.current = saved.sessionId;
      } else {
        const initial = createInitialSalesState();
        salesStateRef.current = initial;
        setSalesState(initial);
        setMessages([welcomeMessage(config)]);
        setActions([]);
        conversationLanguageRef.current = locale;
        setConversationLanguage(locale);
        chatContextRef.current = deriveChatContext(initial, []);
        setOpen(false);
      }
      setHydrated(true);
    });
    return () => { active = false; };
  // Hydrate once. Locale changes may update an untouched greeting below, but
  // must never discard a conversation after the visitor has sent a message.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveChatSession(undefined, { messages, state: salesState, actions, open, siteLocale: locale, conversationLanguage, sessionId: sessionIdRef.current, context: chatContextRef.current });
  }, [messages, salesState, actions, open, hydrated, locale, conversationLanguage]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      if (window.matchMedia?.('(pointer: fine)').matches) inputRef.current?.focus({ preventScroll: true });
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open || !messages.length) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending, open]);

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
      const nextViewport = {
        height: Math.round(viewport.height),
        offsetTop: Math.round(viewport.offsetTop),
        offsetLeft: Math.round(viewport.offsetLeft),
      };
      const layoutHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
      const keyboardHeight = layoutHeight - (nextViewport.height + nextViewport.offsetTop);
      setVisualViewport(nextViewport);
      setKeyboardOpen(keyboardHeight > 120);
    };
    updateViewport();
    viewport.addEventListener('resize', updateViewport);
    viewport.addEventListener('scroll', updateViewport);
    return () => { viewport.removeEventListener('resize', updateViewport); viewport.removeEventListener('scroll', updateViewport); };
  }, [open]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if ((!trimmed && !attachment) || sending) return;
    const imageForTurn = attachment || recentImageRef.current;
    if (attachment) recentImageRef.current = attachment;
    else recentImageRef.current = null;
    setInput('');
    setErrorMessage('');
    const previousConversationLanguage = conversationLanguageRef.current;
    const screenshotLanguage = previousConversationLanguage || locale;
    const userText = trimmed || (screenshotLanguage === 'tr' ? 'Bu SamChe AI ekran görüntüsüne bakabilir misiniz?' : screenshotLanguage === 'ar' ? 'هل يمكنكم مراجعة لقطة شاشة SamChe AI هذه؟' : 'Can you review this SamChe AI screenshot?');
    const turnLanguage = resolveConversationLanguage(userText, previousConversationLanguage, locale) as ChatLanguage;
    conversationLanguageRef.current = turnLanguage;
    setConversationLanguage(turnLanguage);
    const userMessage = { role: 'user' as const, text: userText, time: timestamp(turnLanguage), language: turnLanguage, imageContext: Boolean(imageForTurn) };
    setProcessingStatus(getSalesProcessingStatus(userText, salesStateRef.current, turnLanguage));
    setSending(true);
    setMessages((current) => [...current, userMessage]);
    const stateCandidate = generateSalesTurn(salesStateRef.current, userText, messages, turnLanguage);
    const resolved = await resolveSalesChatTurn({ state: salesStateRef.current, stateCandidate, messages, userMessage, locale, conversationLanguage: turnLanguage, attachment: imageForTurn ? { mimeType: imageForTurn.mimeType, data: imageForTurn.data } : undefined, time: timestamp(turnLanguage), apiBaseUrl: salesChatApiBaseUrl });
    salesStateRef.current = resolved.state;
    setMessages(resolved.messages as Message[]);
    setSalesState(resolved.state);
    setActions(resolved.actions as SalesAction[]);
    chatContextRef.current = deriveChatContext(resolved.state as SalesState, resolved.messages as Message[]);
    saveChatSession(undefined, { messages: resolved.messages, state: resolved.state, actions: resolved.actions, open: true, siteLocale: locale, conversationLanguage: turnLanguage, sessionId: sessionIdRef.current, context: chatContextRef.current });
    if (import.meta.env.DEV && resolved.diagnostic) console.debug('[sales-chat] error', { source: resolved.diagnostic.source, httpStatus: 'httpStatus' in resolved.diagnostic ? resolved.diagnostic.httpStatus : undefined, contractReason: 'contractReason' in resolved.diagnostic ? resolved.diagnostic.contractReason : undefined, inputLanguage: getSalesInputLanguage(trimmed) });
    setErrorMessage(resolved.retryMessage);
    setProcessingStatus(resolved.retryMessage || getSalesProcessingStatus(userText, resolved.state, turnLanguage));
    setSending(false);
    setAttachment(null);
  }

  function attachmentFeedback(reason: string) {
    if (reason === 'unsupported_format') return translateText('This image format is not supported. Use PNG, JPG, JPEG, or WEBP.', locale);
    if (reason === 'image_too_large') return translateText('This image is larger than 5 MB.', locale);
    return translateText('We could not read the clipboard image. Try the attachment button.', locale);
  }

  async function selectAttachment(file: File | undefined, source: 'picker' | 'clipboard' = 'picker') {
    if (!file) return;
    const hadAttachment = Boolean(attachment);
    try {
      const nextAttachment = await readImageFile(file);
      setAttachment(nextAttachment);
      setErrorMessage(hadAttachment && source === 'clipboard' ? translateText('A new image replaced the previous attachment.', locale) : '');
    } catch (error) {
      setErrorMessage(attachmentFeedback((error as { reason?: string })?.reason || 'clipboard_access_failure'));
    }
  }

  async function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const clipboard = extractClipboardImage(event.clipboardData);
    if (clipboard.kind === 'error') {
      event.preventDefault();
      setErrorMessage(attachmentFeedback(clipboard.reason || 'clipboard_access_failure'));
      return;
    }
    if (clipboard.kind === 'text' || clipboard.kind === 'empty') return;
    event.preventDefault();
    await selectAttachment(clipboard.file, 'clipboard');
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
    chatContextRef.current = deriveChatContext(updated, messages);
    saveChatSession(undefined, { messages, state: updated, actions: nextActions, open, siteLocale: locale, conversationLanguage: conversationLanguageRef.current, sessionId: sessionIdRef.current, context: chatContextRef.current });
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
    conversationLanguageRef.current = locale;
    setConversationLanguage(locale);
    chatContextRef.current = deriveChatContext(initial, freshMessages);
    clearChatSession();
    saveChatSession(undefined, { messages: freshMessages, state: initial, actions: [], open: true, siteLocale: locale, conversationLanguage: locale, sessionId: sessionIdRef.current, context: chatContextRef.current });
  }

  const summaryReady = isLeadSummaryReady(salesState.lead, salesState.intent);
  const hasUserMessage = messages.some((message) => message.role === 'user');
  const displayedMessages = hasUserMessage ? messages : [welcomeMessage(config)];
  const salesActions = filterSalesActionsForLead(salesState.lead, actions).filter((action) => action.type === 'demo' || action.type === 'whatsapp');
  const contextualQuickActions = salesState.intent === 'HOT' || summaryReady
    ? config.quick_actions
    : salesState.turns >= 2 ? config.quick_actions.filter((action) => action !== 'Pricing') : [];
  const viewportStyle = {
    '--samche-visual-viewport-height': `${visualViewport.height}px`,
    '--samche-visual-viewport-offset-top': `${visualViewport.offsetTop}px`,
    '--samche-visual-viewport-offset-left': `${visualViewport.offsetLeft}px`,
  } as CSSProperties;

  return <div className={`samche-chat-root${keyboardOpen ? ' samche-keyboard-open' : ''}`} style={viewportStyle}>
    <section className={`samche-chat-panel${open ? ' is-open' : ''}${keyboardOpen ? ' samche-keyboard-open' : ''}`} aria-hidden={!open} role="dialog" aria-label={config.assistant_display_name} aria-modal="false">
      <header className="samche-chat-header"><Orb small header avatarUrl={config.avatar_url || config.logo_url} /><div className="samche-chat-title"><strong>{config.assistant_display_name}</strong><span><i /> {config.assistant_status_label}</span><small>{config.subtitle}</small></div><div className="samche-chat-menu-wrap"><button className="samche-icon-button samche-menu" type="button" aria-label={config.more_options_label} aria-expanded={menuOpen} title={config.more_options_label} onClick={() => setMenuOpen((value) => !value)}>···</button>{menuOpen && <div className="samche-chat-menu"><button type="button" onClick={() => { setMenuOpen(false); setConfirmReset(true); }}>{locale === 'tr' ? 'Yeni Sohbet' : locale === 'ar' ? 'محادثة جديدة' : 'New Chat'}</button></div>}</div><button className="samche-icon-button" type="button" aria-label="Close chat" onClick={() => setOpen(false)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></header>
      {confirmReset && <div className="samche-reset-backdrop"><section className="samche-reset-dialog" role="alertdialog" aria-modal="true" aria-labelledby="samche-reset-title" aria-describedby="samche-reset-copy"><h2 id="samche-reset-title">Clear conversation?</h2><p id="samche-reset-copy">Clear this conversation and start again?</p><div><button type="button" onClick={() => setConfirmReset(false)}>CANCEL</button><button type="button" onClick={resetConversation}>CLEAR CONVERSATION</button></div></section></div>}
      <div className="samche-chat-messages" ref={listRef} aria-live="polite" data-no-translate>
        {displayedMessages.map((message, index) => {
          const messageKey = `${index}-${message.time}`;
          const assistantText = message.articleRefs?.length ? stripHelpArticleLinks(message.text) : message.text;
          const visibleText = message.role === 'assistant' && !message.title ? (revealedMessages[messageKey] ?? assistantText) : assistantText;
          const messageLanguage = message.language || conversationLanguage;
          const visibleArticleRecommendations = [...new Set(message.articleRefs || [])].map((slug) => getPublishedArticlePresentation(slug, messageLanguage)).filter((article): article is NonNullable<typeof article> => Boolean(article)).slice(0, 3);
          return <div className={`samche-message-row ${message.role}`} key={messageKey}>
          {message.role === 'assistant' && <Orb small avatarUrl={config.avatar_url || config.logo_url} />}
          <div className="samche-message-content">{message.title && <strong className="samche-welcome-title">{index === 0 ? config.welcome_title : message.title}</strong>}<div className="samche-message-bubble">{index === 0 && message.title ? renderAssistantText(config.welcome_message) : message.role === 'assistant' ? renderAssistantText(visibleText) : message.text}</div>{message.role === 'assistant' && visibleArticleRecommendations.length ? <nav className="samche-chat-article-links" aria-label={messageLanguage === 'tr' ? 'İlgili yardım makaleleri' : messageLanguage === 'ar' ? 'مقالات المساعدة ذات الصلة' : 'Related help articles'}><strong className="samche-chat-article-heading">{messageLanguage === 'tr' ? 'İlgili Yardım Makaleleri' : messageLanguage === 'ar' ? 'مقالات المساعدة ذات الصلة' : 'Related Help Articles'}</strong>{visibleArticleRecommendations.map((article) => <InternalLink className="samche-chat-article-link" key={article.slug} href={article.url}><span><strong>{article.title}</strong><small>{article.summary}</small></span><b aria-hidden="true">→</b></InternalLink>)}</nav> : null}<time>{message.time === 'Now' ? (locale === 'tr' ? 'Şimdi' : locale === 'ar' ? 'الآن' : 'Now') : message.time}</time></div>
          {message.role === 'user' && <span className="samche-user-avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.4-4 2.8-6 7-6s6.6 2 7 6" /></svg></span>}
        </div>;
        })}
        {sending && <div className="samche-message-row assistant" role="status" aria-live="polite"><Orb small /><div className="samche-typing"><span>{processingStatus}</span><i /><i /><i /></div></div>}
        {!sending && errorMessage && <div className="samche-message-row assistant" role="status" aria-live="polite"><Orb small /><div className="samche-message-content"><div className="samche-message-bubble">{errorMessage}</div></div></div>}
      </div>
      <div className={`samche-chat-composer${attachment ? ' has-attachment' : ''}`}>
      {summaryReady && <section className="samche-lead-card" aria-label="Your requirements"><div className="samche-lead-heading"><strong>YOUR REQUIREMENTS</strong><button type="button" onClick={() => setEditing((value) => !value)}>{editing ? 'Done' : 'Edit details'}</button></div>{editing ? <div className="samche-lead-edit">{leadEditFields.map(([key,label]) => <label key={key}>{label}<input value={leadInputValue(salesState.lead, key)} onChange={(event) => updateLead(key, event.target.value)} /></label>)}</div> : <dl>{leadSummaryFields(salesState.lead).map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}{salesActions.length > 0 && <div className="samche-lead-actions">{salesActions.map((action) => action.type === 'demo' ? <button type="button" key={action.label} onClick={openDemoRequest}>{action.label}</button> : <a key={action.label} href={buildWhatsAppSalesUrl(salesState.lead, locale)} target="_blank" rel="noreferrer">{action.label}</a>)}</div>}</section>}
      {contextualQuickActions.length > 0 && <div className="samche-chat-actions" aria-label="Product shortcuts">{contextualQuickActions.map((action, index) => <button className={index === 0 ? 'selected' : ''} type="button" key={action} onClick={() => void ask(action)} disabled={sending}>{action}</button>)}</div>}
      {actions.some((action) => action.type === 'link') && <div className="samche-sales-actions" aria-label="Product demos">{actions.filter((action) => action.type === 'link').map((action) => <a key={action.label} href={action.href} target="_blank" rel="noreferrer">{action.label}</a>)}</div>}
      {!summaryReady && salesActions.length > 0 && <div className="samche-sales-actions" aria-label="Sales next steps">{salesActions.map((action) => action.type === 'demo' ? <button type="button" key={action.label} onClick={openDemoRequest}>{action.label}</button> : <a key={action.label} href={buildWhatsAppSalesUrl(salesState.lead, locale)} target="_blank" rel="noreferrer">{action.label}</a>)}</div>}
      {attachment && <div className="samche-attachment-preview"><img src={attachment.preview} alt={attachment.name} /><span>{attachment.name}</span><button type="button" onClick={() => setAttachment(null)} aria-label={translateText('Remove attachment', locale)}>×</button></div>}
      <form className="samche-chat-form" onSubmit={handleSubmit}><label className="sr-only" htmlFor="samche-chat-input">{translateText('Ask SamChe AI Assistant', locale)}</label><label className="samche-clip" title={translateText('Attach screenshot', locale)}><input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void selectAttachment(event.target.files?.[0])} /><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 12.5 6.8-6.8a3.2 3.2 0 0 1 4.5 4.5l-8.5 8.5a5 5 0 0 1-7.1-7.1l8-8" /></svg></label><input ref={inputRef} id="samche-chat-input" value={input} onPaste={handlePaste} onChange={(event) => setInput(event.target.value)} placeholder={translateText(config.input_placeholder, locale)} autoComplete="off" /><button className="samche-send" type="submit" aria-label={translateText('Send message', locale)} disabled={sending || (!input.trim() && !attachment)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 17 8-17 8 3-8-3-8Zm3 8h14" /></svg></button></form>
      <p className="samche-chat-disclaimer">{translateText(config.scope_disclaimer, locale)}</p>
      </div>
    </section>
    <button id="samche-chat-launcher" className={`samche-chat-launcher${open ? ' is-open' : ''}`} type="button" aria-label={open ? `Close ${config.assistant_display_name} chat` : config.launcher_label} aria-expanded={open} onClick={() => { if (!open) { performance.clearMarks('samche-chat-open-click'); performance.clearMeasures('samche-chat-click-to-panel'); performance.clearMeasures('samche-chat-click-to-composer'); performance.mark('samche-chat-open-click'); } setOpen((value) => !value); }}>{open ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg> : <Orb avatarUrl={config.avatar_url || config.logo_url} />}</button>
  </div>;
}
