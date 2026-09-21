'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_LOCALE, readLocale, readLocaleFromSearch, translateText, translationSourceForNode, writeLocale } from '../../lib/samche-localization.mjs';

type Locale = 'en' | 'ar' | 'tr';
const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({ locale: DEFAULT_LOCALE, setLocale: () => {} });
const translatedNodes = new WeakMap<Text, { source: string; translated: string }>();
const translatedAttributes = new WeakMap<Element, Map<string, string>>();
let englishDocumentTitle: string | null = null;
let englishMetaDescription: string | null = null;

function localizeDom(root: HTMLElement, locale: Locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const parent = node.parentElement;
    if (!parent || parent.closest('script,style,noscript,svg,[data-no-translate]')) continue;
    const current = node.nodeValue ?? '';
    const source = translationSourceForNode(current, translatedNodes.get(node));
    const target = translateText(source, locale);
    translatedNodes.set(node, { source, translated: target });
    if (node.nodeValue !== target) node.nodeValue = target;
  }
  const attributes = ['aria-label', 'aria-description', 'placeholder', 'title', 'alt'];
  root.querySelectorAll('*').forEach((element) => {
    let originals = translatedAttributes.get(element);
    if (!originals) { originals = new Map(); translatedAttributes.set(element, originals); }
    for (const attribute of attributes) {
      const current = element.getAttribute(attribute);
      if (current === null) continue;
      const source = originals.get(attribute) ?? current;
      originals.set(attribute, source);
      const target = translateText(source, locale);
      if (current !== target) element.setAttribute(attribute, target);
    }
  });
}

export function SiteLocalizationProvider({ children }: { children: ReactNode }) {
  const [locale, setCurrentLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);
  function setLocale(next: Locale) {
    const selected = writeLocale(next);
    setCurrentLocale(selected);
    try {
      const url = new URL(window.location.href);
      if (selected !== 'en') url.searchParams.set('locale', selected);
      else url.searchParams.delete('locale');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    } catch { /* Browser URL persistence is an additional fallback to local storage. */ }
  }

  useEffect(() => {
    const saved = readLocaleFromSearch(window.location.search) ?? readLocale();
    // Restore the browser-only preference after hydration to keep server and first client render consistent.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentLocale(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeLocale(locale);
  }, [locale, ready]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.locale = locale;
    const root = document.body;
    localizeDom(root, locale);
    const observer = new MutationObserver(() => localizeDom(root, locale));
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label','aria-description','placeholder','title','alt'] });
    const preserveLocaleOnInternalNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
      const rawHref = anchor.getAttribute('href') ?? '';
      if (!rawHref || rawHref.startsWith('#')) return;
      try {
        const destination = new URL(rawHref, window.location.href);
        if (destination.origin !== window.location.origin) return;
        if (locale !== 'en') destination.searchParams.set('locale', locale);
        else destination.searchParams.delete('locale');
        if (destination.href === anchor.href) return;
        event.preventDefault();
        window.location.assign(destination.href);
      } catch { /* Leave invalid or non-web links to the browser. */ }
    };
    document.addEventListener('click', preserveLocaleOnInternalNavigation);
    englishDocumentTitle ??= document.title;
    englishMetaDescription ??= document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null;
    if (englishDocumentTitle) document.title = translateText(englishDocumentTitle, locale);
    const description = document.querySelector('meta[name="description"]');
    if (description && englishMetaDescription) description.setAttribute('content', translateText(englishMetaDescription, locale));
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && englishDocumentTitle) ogTitle.setAttribute('content', translateText(englishDocumentTitle, locale));
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription && englishMetaDescription) ogDescription.setAttribute('content', translateText(englishMetaDescription, locale));
    return () => { observer.disconnect(); document.removeEventListener('click', preserveLocaleOnInternalNavigation); };
  }, [locale]);

  return <LocaleContext.Provider value={{ locale, setLocale }}><div className="localized-site" lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} data-locale={locale} data-locale-ready={ready ? 'true' : 'false'}>{children}</div></LocaleContext.Provider>;
}

export function useSiteLocale() { return useContext(LocaleContext); }

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useSiteLocale();
  return <div className={`language-switcher${compact ? ' compact' : ''}`} role="group" aria-label={locale === 'ar' ? 'اختيار اللغة' : locale === 'tr' ? 'Dil seçin' : 'Choose language'}>
    <button type="button" lang="en" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>EN</button>
    <button type="button" lang="ar" aria-pressed={locale === 'ar'} onClick={() => setLocale('ar')}>العربية</button>
    <button type="button" lang="tr" aria-pressed={locale === 'tr'} onClick={() => setLocale('tr')}>TR</button>
  </div>;
}
