'use client';

import { lazy, useEffect, useState } from 'react';
import { useSiteLocale } from './site-localization';

const LazySamCheChatWidget = lazy(() => import('./samche-chat-widget').then(({ SamCheChatWidget }) => ({ default: SamCheChatWidget })));

function LauncherOrb({ locale }: { locale: 'en' | 'tr' | 'ar' }) {
  const askLabel = locale === 'ar' ? 'اسألني' : locale === 'tr' ? 'BANA SOR' : 'ASK ME';
  return <span className="samche-orb" aria-hidden="true"><span className="samche-mobile-orb" dir="ltr"><span className="samche-orb-logo-wrap" dir="ltr"><span className="samche-logo-sam">SAM</span><span className="samche-logo-che">CHE</span></span><span className="samche-orb-ai-tag" dir={locale === 'ar' ? 'rtl' : 'ltr'}>{askLabel}</span></span></span>;
}

export function SamCheChatLoader() {
  const { locale } = useSiteLocale();
  const [loadFullWidget, setLoadFullWidget] = useState(false);
  const [openRequested, setOpenRequested] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => { if (!cancelled) setLoadFullWidget(true); };
    const browser = window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (browser.requestIdleCallback) {
      const id = browser.requestIdleCallback(load, { timeout: 2500 });
      return () => { cancelled = true; browser.cancelIdleCallback?.(id); };
    }
    const id = window.setTimeout(load, 0);
    return () => { cancelled = true; window.clearTimeout(id); };
  }, []);

  if (loadFullWidget) return <LazySamCheChatWidget initiallyOpen={openRequested} />;

  const launcherLabel = locale === 'tr' ? 'SamChe AI’a Sor' : locale === 'ar' ? 'اسأل SamChe AI' : 'Ask SamChe AI';
  return <div className="samche-chat-root">
    <button id="samche-chat-launcher" className="samche-chat-launcher" type="button" aria-label={launcherLabel} aria-expanded={false} onClick={() => {
      performance.clearMarks('samche-chat-open-click');
      performance.clearMeasures('samche-chat-click-to-panel');
      performance.clearMeasures('samche-chat-click-to-composer');
      performance.mark('samche-chat-open-click');
      setOpenRequested(true);
      setLoadFullWidget(true);
    }}><LauncherOrb locale={locale} /></button>
  </div>;
}
