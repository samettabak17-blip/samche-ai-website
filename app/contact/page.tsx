import { demoLinks, planFromSearch, plans } from '../../lib/site-data.mjs';
import { ContactForm } from '../components/contact-form';
import { PageIntro, SectionEyebrow, SiteShell } from '../components/site-shell';
import { buildPageMetadata } from '../../lib/seo';

export const metadata = buildPageMetadata({
  title: 'Contact',
  description: 'Request a SamChe AI product demo or ask about a subscription plan.',
  path: '/contact',
});

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ plan?: string; interest?: string }> }) {
  const params = await searchParams;
  const initialPlan = planFromSearch(`?plan=${encodeURIComponent(params.plan ?? '')}`);
  const selectedPlan = plans.find((plan) => plan.slug === initialPlan);
  const allowedInterests = ['Web Chatbot', 'WhatsApp AI', 'Instagram DM AI', 'AI Assistants', 'Knowledge Intelligence', 'Live Inbox', 'CRM & Pipeline', 'AI Guide', 'Automation / Agentic AI'];
  const initialInterest = allowedInterests.includes(params.interest ?? '') ? params.interest! : '';
  return <SiteShell><main id="main-content">
    <section className="page-hero"><PageIntro eyebrow="PRODUCT DEMO & SUBSCRIPTION ENQUIRIES" title="Let’s find the right SamChe AI setup for your business.">Tell us about your goals, preferred channels and requirements. Our team will help you identify the most suitable SamChe AI product and plan.</PageIntro></section>
    <section className="content-section contact-layout">
      <aside className="contact-aside"><SectionEyebrow>SEE THE PRODUCT</SectionEyebrow><h2>Explore the product demos.</h2><p>Try a customer-facing product experience, then share your product or subscription requirements with our team.</p>
        <div className="contact-links"><a className="contact-link" href={demoLinks.aiGuide} target="_blank" rel="noreferrer"><span><strong>TRY AI GUIDE</strong><small>Live public Guide experience</small></span><span aria-hidden="true">↗</span></a><a className="contact-link" href={demoLinks.webChatbot} target="_blank" rel="noreferrer"><span><strong>TRY WEB CHATBOT</strong><small>Live product demo</small></span><span aria-hidden="true">↗</span></a><a className="contact-link" href={demoLinks.whatsapp} target="_blank" rel="noreferrer"><span><strong>TRY WHATSAPP AI</strong><small>+971 50 694 1372</small></span><span aria-hidden="true">↗</span></a><a className="contact-link" href="mailto:support@samchecompany.com"><span><strong>PRODUCT SUPPORT</strong><small>support@samchecompany.com</small></span><span aria-hidden="true">↗</span></a></div>
        <p>For product demos and subscription enquiries, email <a href="mailto:sales@samche.ai">sales@samche.ai</a>.</p>
        {selectedPlan && <div className="architecture-note"><p>Selected plan: <strong>{selectedPlan.name}</strong>. You can change it in the enquiry form.</p></div>}
        <p>For privacy and security questions, visit <a className="text-link" href="/security">Security &amp; Privacy <span aria-hidden="true">↗</span></a>.</p>
      </aside>
      <ContactForm initialPlan={initialPlan} initialInterest={initialInterest} />
    </section>
  </main></SiteShell>;
}
