import type { Metadata } from 'next';
import { PageIntro, SiteShell } from '../components/site-shell';
import { SupportPortal } from '../components/support-portal';

export const metadata: Metadata = {
  title: 'Support Center',
  description: 'SamChe AI Support Center: platform troubleshooting, plan-based entitlements, knowledge base, and support request submission.',
  alternates: { canonical: 'https://samche.ai/support' },
};

export default function SupportPage() {
  return (
    <SiteShell>
      <main id="main-content" className="support-wrap">
        <section className="page-hero">
          <PageIntro
            eyebrow="PRODUCT SUPPORT & HELP CENTER"
            title="Knowledge, troubleshooting and plan-based assistance."
          >
            Find verified step-by-step guides for your SamChe AI workspace, check plan support entitlements, or submit a structured support request for technical review.
          </PageIntro>
        </section>
        <SupportPortal />
      </main>
    </SiteShell>
  );
}
