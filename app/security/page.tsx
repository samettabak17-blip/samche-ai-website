import type { Metadata } from 'next';
import Link from '../components/internal-link';
import { PageIntro, ProductCTA, SectionEyebrow, SiteShell } from '../components/site-shell';

export const metadata: Metadata = {
  title: 'Security & Privacy',
  description: 'A factual overview of SamChe AI tenant workspaces, team access, product data workflows, and privacy boundaries.',
  alternates: { canonical: 'https://samche.ai/security' },
};

export default function SecurityPage() {
  return <SiteShell><main id="main-content">
    <section className="page-hero"><PageIntro eyebrow="Security & Privacy" title="Clear product boundaries. A transparent security posture.">SamChe AI is a multi-tenant SaaS platform. This page describes product workflows and the boundaries of what is currently verified.</PageIntro></section>
    <section className="content-section">
      <article className="content-block"><SectionEyebrow>01 · Tenant isolation</SectionEyebrow><h2>Each customer works within a tenant context.</h2><p>Customers operate in their own tenant/workspace context. The dashboard selects a tenant before opening its workspace areas, and product APIs use tenant-aware routes. This describes the platform architecture; it is not a claim that unauthorized access is impossible.</p></article>
      <article className="content-block"><SectionEyebrow>02 · Access &amp; team management</SectionEyebrow><h2>Manage workspace users from the product.</h2><p>The platform includes sign-in, invitation acceptance, password reset, team membership, and tenant-scoped dashboard access flows. The public product materials do not claim SSO, SCIM, MFA, granular RBAC, or enterprise identity management.</p></article>
      <article className="content-block"><SectionEyebrow>03 · Knowledge &amp; conversation data</SectionEyebrow><h2>Follow the product workflow.</h2><p>Knowledge Intelligence provides workspace source management, processing/indexing status, and a retrieval preview. Live Inbox conversations are presented within the tenant dashboard, where supported conversations can be handled by AI or a team member. This page does not state specific encryption standards, storage regions, or default retention periods.</p></article>
      <article className="content-block"><SectionEyebrow>04 · Transparent security boundaries</SectionEyebrow><h2>Claims stay within verified evidence.</h2><p>SamChe AI does not publish an ISO 27001, SOC 2, HIPAA, GDPR certification, data residency guarantee, or named encryption algorithm on this page. Enterprise plan Custom Data Retention is an available plan capability as described on the <Link href="/pricing">Pricing page</Link>; no retention duration is implied here.</p></article>
      <article className="content-block"><SectionEyebrow>05 · Privacy</SectionEyebrow><h2>Product questions go to the SamChe AI team.</h2><p>Read the <Link href="/privacy">Privacy Policy</Link> for this website and the demo/contact flows. For product privacy or security enquiries, email <a href="mailto:support@samche.ai">support@samche.ai</a>.</p><div className="hero-actions"><ProductCTA href="/contact">Contact the Product Team</ProductCTA><ProductCTA href="/privacy" secondary>Read Privacy Policy</ProductCTA></div></article>
      <div className="architecture-note"><p>This overview is factual and limited to the current product workflows. It does not represent a certification, legal compliance determination, or guarantee of a specific security control.</p></div>
    </section>
  </main></SiteShell>;
}
