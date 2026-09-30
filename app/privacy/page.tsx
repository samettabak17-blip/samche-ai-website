import Link from '../components/internal-link';
import { PageIntro, SectionEyebrow, SiteShell } from '../components/site-shell';
import { buildPageMetadata } from '../../lib/seo';

export const metadata = buildPageMetadata({
  title: 'Privacy Policy',
  description: 'Privacy information for the SamChe AI website, product demo links, and contact request flow.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return <SiteShell><main id="main-content">
    <section className="page-hero"><div className="privacy-intro"><PageIntro eyebrow="Privacy Policy" title="Privacy information for samche.ai.">This policy covers the SamChe AI website and the demo/contact links presented here.</PageIntro><p className="policy-updated">Last updated: 16 September 2026</p></div></section>
    <section className="content-section">
      <article className="content-block"><SectionEyebrow>Website contact request</SectionEyebrow><h2>Information you choose to provide</h2><p>When you submit the Contact form, the name, work email, company, role, selected product or plan, and message you enter are processed by a service provider on behalf of the SamChe AI team so we can review and respond to your enquiry. We use these details for product demonstrations and subscription enquiries.</p></article>
      <article className="content-block"><SectionEyebrow>Plan selection</SectionEyebrow><h2>Your selected plan</h2><p>If you choose a plan before contacting us, it may be preselected in the enquiry form. You can update your selection before sending the enquiry.</p></article>
      <article className="content-block"><SectionEyebrow>Public product demos</SectionEyebrow><h2>External product experiences</h2><p>Some demo links open separate customer-facing product experiences. Information entered in those experiences is handled according to the privacy terms presented there. The WhatsApp demo opens a conversation with the approved SamChe AI number and may include a short message that you can review before sending. Do not include sensitive or confidential information in a public demo conversation.</p></article>
      <article className="content-block"><SectionEyebrow>Product workspace data</SectionEyebrow><h2>Product data is handled in the platform workflow</h2><p>SamChe AI includes tenant workspace features for knowledge sources and conversations. This website does not describe or promise product data storage locations, encryption methods, default retention periods, or certifications. Contact the product team for current product-specific privacy details before using sensitive data.</p></article>
      <article className="content-block"><SectionEyebrow>Cookies and analytics</SectionEyebrow><h2>Website analytics</h2><p>This website does not use an analytics cookie. Service providers may process technical information needed to deliver website pages.</p></article>
      <article className="content-block"><SectionEyebrow>Questions</SectionEyebrow><h2>Privacy enquiries</h2><p>For privacy or security questions about SamChe AI, contact the product team through the <Link href="/contact">Contact page</Link> or email <a href="mailto:support@samche.ai">support@samche.ai</a>. The form confirms when your enquiry has been received.</p></article>
    </section>
  </main></SiteShell>;
}
