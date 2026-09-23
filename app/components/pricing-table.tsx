"use client";

import Link from './internal-link';
import { Fragment, useState } from 'react';
import { addons, addonNotes, agenticExpansionNote, comparisonStateLegend, comparisonUsageNotes, interactionAllowanceCards, planInheritanceNotes, plans, platformFeatureGroups, setupPrice } from '../../lib/site-data.mjs';
import { PlatformFAQ } from './platform-faq';
import { SectionEyebrow } from './site-shell';

function planCta(plan: (typeof plans)[number]) {
  return plan.slug === 'enterprise' ? 'CONTACT SALES' : plan.cta;
}

function priceParts(plan: (typeof plans)[number], yearly: boolean) {
  return {
    prefix: plan.from ? 'From ' : '',
    amount: (yearly ? plan.yearly : plan.monthly).toLocaleString('en-US'),
    period: yearly ? '/ year' : '/ month',
  };
}

function indexForPlan(slug: string) {
  return plans.findIndex((plan) => plan.slug === slug);
}

function comparisonStateClass(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.startsWith('included')) return 'included';
  if (normalized.startsWith('not included')) return 'not-included';
  if (normalized.startsWith('add-on')) return 'add-on';
  if (normalized.startsWith('upgrade')) return 'add-on';
  if (normalized.startsWith('by scope')) return 'by-scope';
  if (normalized.startsWith('custom')) return 'custom';
  if (normalized.startsWith('roadmap')) return 'roadmap';
  return 'neutral';
}

function comparisonMobileLabel(value: string) {
  const labels: Record<string, string> = {
    'Not included': 'No', 'Included': 'Yes', 'Included / Custom scale': 'Yes · Custom',
    '1 CRM or Booking integration': '1 CRM/Booking', 'Up to 3 external integrations': 'Up to 3',
    '100,000+': '100K+', '50,000': '50K', '20,000': '20K', '5,000': '5K',
    'Core access': 'Core', 'Enterprise scale': 'Enterprise', 'Custom scale': 'Custom',
    'Roadmap / By scope': 'Roadmap', 'Add-on / By scope': 'Add-on', 'Upgrade / Add-on': 'Upgrade',
    '200 / month included': '200/mo', '200 / month': '200/mo',
    '300 min / month included': '300 min', '300 / month': '300 min',
    '2 concurrent calls included': '2 calls', '2': '2 calls',
    'Business Hours': 'Office Hrs',
    'Priority / 24x7 critical path': 'Priority / 24x7',
    'Standard Email': 'Standard',
    'Expanded Priority': 'Expanded',
    'Enterprise Priority': 'Enterprise',
  };
  return labels[value] || value;
}

export function PricingTable() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const yearly = billing === 'yearly';
  return <>
    <div className="billing-switch" role="group" aria-label="Subscription billing period">
      <button type="button" aria-pressed={!yearly} onClick={() => setBilling('monthly')}>Monthly</button>
      <button type="button" aria-pressed={yearly} onClick={() => setBilling('yearly')}>Yearly <span className="save-note">−15%</span></button>
    </div>
    <div className="pricing-grid">
      {plans.map((plan) => <article className={`plan-card plan-${plan.slug} ${plan.slug === 'growth' ? 'popular' : ''}`} data-plan={plan.slug} key={plan.slug}>
        {plan.badge && <span className="popular-label">{plan.badge}</span>}
        <h2 className="plan-name">{plan.name}</h2>
        <p className="plan-inheritance">{planInheritanceNotes[indexForPlan(plan.slug)]}</p>
        <p className="plan-description">{plan.description}</p>
        <p className="plan-price"><span className="price-prefix">{priceParts(plan, yearly).prefix}AED</span> <span className="price-amount">{priceParts(plan, yearly).amount}</span> <span className="price-period">{priceParts(plan, yearly).period}</span></p>
        <p className="plan-cycle-note">{yearly ? 'Billed annually' : 'Subscription billed monthly'}</p>
        <div className="setup-box">
          <small>{plan.implementationLabel}</small>
          <strong>{setupPrice(plan)}</strong>
          <span className="implementation-note">{plan.implementationNote}</span>
        </div>
        <div className="interaction-box"><strong>{plan.interactions}</strong><small>AI Interactions / Month</small></div>
        <ul className="plan-features">{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
        <Link className="button plan-cta" href={`/contact?plan=${plan.slug}`}>{planCta(plan)} <span aria-hidden="true">↗</span></Link>
      </article>)}
    </div>
    <div className="implementation-value-note">
      <p>One-time implementation covers the initial SamChe AI setup required for the selected plan, including AI configuration, enabled channel setup, knowledge preparation, integration configuration, testing and launch support. The exact Enterprise implementation scope may vary based on complexity.</p>
    </div>
    <section className="comparison-section" aria-labelledby="compare-plans-heading">
      <div className="comparison-heading"><SectionEyebrow>Platform capabilities</SectionEyebrow><h2 id="compare-plans-heading">Platform Feature Comparison</h2><p>Compare the channels, intelligence, CRM, integration and operational capabilities included at each SamChe AI plan level.</p></div>
      <div className="comparison-scroll" role="region" aria-label="SamChe AI plan comparison" tabIndex={0}>
        <table className="plan-comparison">
          <thead><tr><th scope="col">FEATURE</th>{plans.map((plan) => <th scope="col" data-plan={plan.slug} key={plan.slug}>{plan.name}</th>)}</tr></thead>
          <tbody>{platformFeatureGroups.map((group) => <Fragment key={group.label}><tr className="comparison-group"><th colSpan={5}>{group.label}</th></tr>{group.rows.map((row) => <tr key={`${group.label}-${row.label}`}><th scope="row">{row.label}</th>{row.values.map((value, index) => <td data-plan={plans[index].slug} key={plans[index].slug}><span className={`comparison-state comparison-state-${comparisonStateClass(value)}`} aria-label={value}><span className="comparison-desktop-label">{value}</span><span className="comparison-mobile-label">{comparisonMobileLabel(value)}</span></span></td>)}</tr>)}{group.label === 'Integrations & Automation' && <tr className="comparison-group-note"><th colSpan={5}>{agenticExpansionNote}</th></tr>}</Fragment>)}</tbody>
        </table>
      </div>
      <ul className="comparison-usage-notes">{comparisonUsageNotes.map((note) => <li key={note}>{note}</li>)}</ul>
      <div className="comparison-state-legend" aria-label="Comparison state legend">{comparisonStateLegend.map((item) => <div className="comparison-legend-item" key={item.state}><span className={`comparison-state comparison-state-${comparisonStateClass(item.state)}`}>{item.state}</span><span>{item.description}</span></div>)}</div>
    </section>
    <section className="interaction-explanation" aria-labelledby="interaction-explanation-heading">
      <div className="comparison-heading"><SectionEyebrow>Usage explained</SectionEyebrow><h2 id="interaction-explanation-heading">Understanding Your Monthly AI Interactions</h2><p>Each plan includes a monthly allowance for AI-powered customer interactions across supported SamChe AI channels.</p></div>
      <div className="interaction-explanation-grid">{interactionAllowanceCards.map((card) => <article className="interaction-explanation-card" key={card.title}><h3>{card.title}</h3><p>{card.body}</p></article>)}</div>
    </section>
    <section className="addons" aria-labelledby="addons-heading">
      <h2 id="addons-heading">PLATFORM ADD-ONS</h2>
      <p className="addons-intro">Optional product capacity and voice capabilities.</p>
      <div className="addon-grid">{addons.map((addon) => <article className="addon-card" key={addon.name}><h3>{addon.name}</h3><strong className="addon-price">{addon.price}</strong>{addon.setup && <small className="addon-setup">{addon.setup}</small>}<p>{addon.description}</p></article>)}</div>
      <ul className="pricing-notes">{addonNotes.map((note) => <li key={note}>{note}</li>)}</ul>
    </section>
    <PlatformFAQ />
    <section className="pricing-bottom"><div><h2>Want to see the platform first?</h2><p>Plan selection opens a product enquiry with your chosen plan preselected. It does not purchase or activate a subscription.</p></div><Link className="button button-primary" href="/contact">Request Demo <span aria-hidden="true">↗</span></Link></section>
  </>;
}
