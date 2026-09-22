import type { Metadata } from 'next';
import Link from '../components/internal-link';
import { demoLinks, productModules } from '../../lib/site-data.mjs';
import { ProductScreenshot } from '../components/product-screenshot';
import { PlatformFAQ } from '../components/platform-faq';
import { PageIntro, ProductCTA, SectionEyebrow, SiteShell } from '../components/site-shell';

export const metadata: Metadata = {
  title: 'Platform',
  description: 'Explore the SamChe AI multi-tenant SaaS platform: AI Assistants, Knowledge Intelligence, Live Inbox, CRM & Pipeline, and AI Guide.',
  alternates: { canonical: 'https://samche.ai/platform' },
};

export default function PlatformPage() {
  return <SiteShell><main id="main-content">
    <section className="page-hero"><PageIntro eyebrow="SamChe AI Platform" title="Product modules for customer-facing AI and team workflows.">A proprietary multi-tenant SaaS platform that organizes customer AI experiences, knowledge workflows, conversations, and leads within tenant workspaces.</PageIntro></section>
    <section className="platform-evidence-section page-width" aria-labelledby="platform-evidence-heading">
      <div className="dashboard-feature-heading"><SectionEyebrow>Inside the dashboard</SectionEyebrow><h2 id="platform-evidence-heading">One workspace for connected AI operations.</h2><p>See a real Knowledge Intelligence screen from the current SamChe AI product. Workspace-specific sample details are blurred.</p></div>
      <ProductScreenshot className="platform-product-shot" alt="Real SamChe AI Knowledge Intelligence product screen with tenant and sample source information blurred" caption="Existing SamChe AI Platform screenshot · Knowledge Intelligence source management" />
      <div className="dashboard-capability-grid">{['Dashboard & Tenant Analytics', 'AI Assistants', 'Channels', 'Knowledge Intelligence', 'Live Inbox / Conversations', 'CRM / Leads / Pipeline', 'AI Guide', 'Team and workspace settings'].map((name) => <span key={name}><i aria-hidden="true">✓</i>{name}</span>)}</div>
    </section>
    <section className="content-section">
      <div className="content-block"><SectionEyebrow>Platform architecture</SectionEyebrow><h2>One tenant workspace. Connected product areas.</h2><p>Customers work in a tenant context across the dashboard. The overview surfaces workspace KPIs and date-filtered analytics; other workspace-scoped areas cover assistants, knowledge, conversations, leads, pipeline, channels, team members, and settings. Product APIs are accessed through tenant-aware routes.</p></div>
      <div className="module-grid platform-modules">{productModules.map((module) => <article className={`module-card ${module.status.startsWith('Roadmap') ? 'module-roadmap' : ''}`} key={module.name}><div className="module-card-top"><span className={`availability-badge ${module.status.startsWith('Roadmap') ? 'roadmap' : ''}`}>{module.status}</span></div><h3>{module.name}</h3><p>{module.description}</p></article>)}</div>
      <div className="content-block"><SectionEyebrow>Knowledge workflow</SectionEyebrow><h2>Manage sources and test grounded answers.</h2><p>Knowledge Intelligence includes source management, processing and indexing states, and a retrieval preview workflow. Supported source formats in the current interface include PDF, DOCX, TXT, JPG/JPEG, and PNG. Availability and output depend on the configured workspace and source processing.</p></div>
      <div className="content-block"><SectionEyebrow>Live Inbox + CRM</SectionEyebrow><h2>Move between AI handling and team follow-up.</h2><p>Conversations are organized by channel in the tenant dashboard. Team members can review conversations, reply, take over from AI, and return handling to AI where the conversation supports those actions. Leads and pipeline records have dedicated workspace views.</p></div>
      <div className="content-block"><SectionEyebrow>Connected experiences</SectionEyebrow><h2>Use the live demos to explore customer-facing experiences.</h2><p>Explore the Web Chatbot, WhatsApp AI and existing AI Guide customer experiences. The Guide offers structured Roadmap, Planning, Assistant, and Analyze modes for a business-specific journey.</p><div className="hero-actions"><a className="button button-demo-gold" href={demoLinks.aiGuide} target="_blank" rel="noreferrer">TRY AI GUIDE <span aria-hidden="true">↗</span></a><a className="button button-demo-red" href={demoLinks.webChatbot} target="_blank" rel="noreferrer">TRY WEB CHATBOT <span aria-hidden="true">↗</span></a><a className="button button-demo-green" href={demoLinks.whatsapp} target="_blank" rel="noreferrer">TRY WHATSAPP AI <span aria-hidden="true">↗</span></a></div></div>
      <div className="architecture-note"><p><strong>Current product status:</strong> Dashboard &amp; Tenant Analytics, AI Assistants, Knowledge Intelligence, Live Inbox, CRM &amp; Pipeline, and AI Guide experience management are represented in the existing dashboard implementation. Custom Workflows are a currently supported plan capability for configured automations and integrations. The broader Workflow Engine, Agentic AI, Skills and Actions remain roadmap capabilities and are not standard live plan entitlements.</p></div>
      <PlatformFAQ />
      <div className="center-action"><ProductCTA href="/pricing" secondary>See Pricing</ProductCTA><Link className="text-link" href="/contact">Request Demo <span aria-hidden="true">↗</span></Link></div>
    </section>
  </main></SiteShell>;
}
