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
    <section className="site-footer-cta" aria-labelledby="site-footer-cta-title">
      <div className="site-footer-cta-copy"><p className="eyebrow"><span aria-hidden="true" />Put SamChe AI to work</p><h2 id="site-footer-cta-title">Bring AI into<br /><em>customer operations.</em></h2><p>Explore the platform, try the verified customer-facing experiences, or speak with the product team about plans.</p></div>
      <div className="site-footer-cta-actions"><Link className="button button-primary" href="/contact">Request Demo <span aria-hidden="true">↗</span></Link><a className="button button-outline" href="mailto:sales@samche.ai">sales@samche.ai <span aria-hidden="true">↗</span></a></div>
    </section>
    <div className="site-footer-main">
      <Link className="brand footer-brand" href="/"><Image className="brand-logo" src="/samche-ai-platform-approved.png" alt="SamChe AI Platform" width={1800} height={900} /></Link>
      <div className="site-footer-contacts" aria-label="Product contact details"><div><span>PRODUCT DEMOS &amp; PLANS</span><a href="mailto:sales@samche.ai">sales@samche.ai</a></div><div><span>PRODUCT SUPPORT</span><a href="mailto:support@samche.ai">support@samche.ai</a></div></div>
      <div className="footer-links"><Link href="/platform">Platform</Link><Link href="/pricing">Pricing</Link><Link href="/support">Support</Link><Link href="/security">Security</Link><Link href="/privacy">Privacy Policy</Link><Link href="/contact">Contact</Link></div>
    </div>
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
