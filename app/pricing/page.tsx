import { PricingTable } from '../components/pricing-table';
import { SectionEyebrow, SiteShell } from '../components/site-shell';
import { buildPageMetadata } from '../../lib/seo';

export const metadata = buildPageMetadata({
  title: 'Pricing',
  description: 'Compare SamChe AI plans, including Instagram DM AI availability, interaction allowances, implementation and approved add-ons.',
  path: '/pricing',
  keywords: ['Instagram DM AI pricing', 'AI messaging plans', 'SamChe AI pricing'],
});

export default function PricingPage() {
  return <SiteShell><main id="main-content" className="pricing-wrap">
    <div className="pricing-intro"><SectionEyebrow>Subscription plans</SectionEyebrow><h1>Choose the right SamChe AI plan.</h1><p>Compare cumulative plans with transparent pricing, including Instagram DM AI availability, Enterprise visual AI, included base voice AI, multi-brand scale and deeper operational control.</p><p>Instagram DM AI: Starter — Not included; Growth — By scope; Business — Included; Enterprise — Included + advanced/custom setup. No separate fixed Instagram price is introduced.</p><PricingTable /></div>
  </main></SiteShell>;
}
