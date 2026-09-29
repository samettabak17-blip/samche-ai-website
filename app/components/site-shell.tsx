import Link from './internal-link';
import Image from 'next/image';
import { SamCheChatLoader } from './samche-chat-loader';
import { LanguageSwitcher } from './site-localization';
import { SiteHeaderNavigation } from './site-header-navigation';

export function SiteHeader() {
  return <header className="site-header">
    <Link className="brand" href="/" aria-label="SamChe AI Platform home"><Image className="brand-logo" src="/samche-ai-platform-approved.png" alt="SamChe AI Platform" width={1800} height={900} priority /></Link>
    <SiteHeaderNavigation />
    <LanguageSwitcher />
    <details className="mobile-nav"><summary aria-label="Open navigation"><span /><span /></summary><SiteHeaderNavigation mobile /></details>
  </header>;
}

export function SiteFooter() {
  return <footer className="site-footer">
    <Link className="brand footer-brand" href="/"><Image className="brand-logo" src="/samche-ai-platform-approved.png" alt="SamChe AI Platform" width={1800} height={900} /></Link>
    <p>SamChe AI Platform · <a href="https://samche.ai">samche.ai</a> · <a className="github-footer-link" href="https://github.com/samchecompany/samche-ai-platform" target="_blank" rel="noopener noreferrer" aria-label="SamChe AI Platform on GitHub"><svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path fill="currentColor" d="M12 .7a11.3 11.3 0 0 0-3.58 22.02c.57.1.78-.25.78-.55v-2.1c-3.18.7-3.85-1.34-3.85-1.34-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.54-.29-5.2-1.27-5.2-5.64 0-1.25.45-2.26 1.18-3.06-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.13 1.17a10.9 10.9 0 0 1 5.7 0c2.17-1.48 3.13-1.17 3.13-1.17.62 1.57.23 2.73.11 3.02.73.8 1.18 1.81 1.18 3.06 0 4.38-2.66 5.35-5.2 5.63.41.36.78 1.07.78 2.16v3.2c0 .3.2.65.79.55A11.3 11.3 0 0 0 12 .7Z" /></svg><span>GitHub</span></a></p>
    <div className="footer-links"><Link href="/platform">Platform</Link><Link href="/pricing">Pricing</Link><Link href="/support">Support</Link><Link href="/security">Security</Link><Link href="/privacy">Privacy Policy</Link><Link href="/contact">Contact</Link></div>
  </footer>;
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  return <><a className="skip-link" href="#main-content">Skip to content</a><SamCheChatLoader /><SiteHeader />{children}<SiteFooter /></>;
}

export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow"><span aria-hidden="true" />{children}</p>;
}

export function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <div className="page-intro"><SectionEyebrow>{eyebrow}</SectionEyebrow><h1>{title}</h1><p>{children}</p></div>;
}

export function ProductCTA({ href = '/contact', children = 'Start with SamChe AI', secondary = false }: { href?: string; children?: React.ReactNode; secondary?: boolean }) {
  return <Link className={`button ${secondary ? 'button-outline' : 'button-primary'}`} href={href}>{children}<span aria-hidden="true">↗</span></Link>;
}
