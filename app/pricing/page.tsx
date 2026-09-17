import type { Metadata } from 'next';
import { PricingTable } from '../components/pricing-table';
import { SectionEyebrow, SiteShell } from '../components/site-shell';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Compare SamChe AI subscription plans, monthly AI interaction allowances, one-time setup fees, and approved platform add-ons.',
  alternates: { canonical: 'https://samche.ai/pricing' },
};

export default function PricingPage() {
  return <SiteShell><main id="main-content" className="pricing-wrap">
    <div className="pricing-intro"><SectionEyebrow>Subscription plans</SectionEyebrow><h1>Choose the right SamChe AI plan.</h1><p>Monthly subscriptions and transparent one-time setup fees for the SamChe AI Platform.</p><PricingTable /></div>
  </main></SiteShell>;
}
