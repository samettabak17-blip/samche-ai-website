"use client";

import Link from './internal-link';
import { Fragment, useState } from 'react';
import { addons, addonNotes, planComparisonRows, plans, setupPrice } from '../../lib/site-data.mjs';
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

const comparisonRowValues = new Map(planComparisonRows.map((row) => [row.label, row.values]));
const featureValues = (label: string) => comparisonRowValues.get(label) ?? ['—', '—', '—', '—'];
const featureGroups = [
  {
    label: 'AI Channels',
    rows: [
      ['Web Chatbot', featureValues('Web Chatbot')],
      ['WhatsApp AI', featureValues('WhatsApp AI')],
      ['AI Guide', featureValues('AI Guide')],
      ['AI Voice Receptionist', ['Add-on', 'Add-on', 'Add-on', 'By scope']],
      ['Multiple websites / brands', featureValues('Multiple brands / sites')],
    ],
  },
  {
    label: 'Knowledge & Intelligence',
    rows: [
      ['Knowledge Intelligence', featureValues('Knowledge Intelligence')],
      ['Advanced Knowledge Intelligence', featureValues('Advanced Knowledge Intelligence')],
      ['Page-aware Context', featureValues('Page-aware context')],
      ['Entity-aware Intelligence', featureValues('Entity-aware Intelligence')],
      ['Approved knowledge workflow', featureValues('Knowledge Intelligence')],
    ],
  },
  {
    label: 'CRM & Lead Management',
    rows: [
      ['Basic Lead Capture', featureValues('Lead capture')],
      ['Lead Qualification', featureValues('Lead qualification')],
      ['Lead Routing', ['—', 'Included', '—', 'By scope']],
      ['Shared Inbox', featureValues('Shared Inbox')],
      ['AI Lead Scoring', featureValues('AI lead scoring')],
      ['CRM Integration', featureValues('CRM / Booking integration')],
    ],
  },
  {
    label: 'Integrations & Automation',
    rows: [
      ['External Integrations', featureValues('External integrations')],
      ['Booking Integration', featureValues('CRM / Booking integration')],
      ['API Access', featureValues('API access')],
      ['Custom Workflows', featureValues('Custom workflows')],
      ['Agentic AI / Skills / Actions / Workflow Engine', ['Roadmap', 'Roadmap', 'Roadmap', 'Roadmap / scope']],
    ],
  },
  {
    label: 'Team & Operations',
    rows: [
      ['Team Users', featureValues('Team Users')],
      ['Shared Inbox', featureValues('Shared Inbox')],
      ['Human Handover', featureValues('Human Handover')],
      ['Multiple brands/sites', featureValues('Multiple brands / sites')],
      ['Dedicated Support', featureValues('Support')],
    ],
  },
  {
    label: 'Usage & Language',
    rows: [
      ['Monthly interactions', plans.map((plan) => plan.interactions)],
      ['Languages', featureValues('Languages')],
      ['External integrations', featureValues('External integrations')],
      ['Team users', featureValues('Team Users')],
    ],
  },
] as const;

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
        <p className="plan-description">{plan.description}</p>
        <p className="plan-price"><span className="price-prefix">{priceParts(plan, yearly).prefix}AED</span> <span className="price-amount">{priceParts(plan, yearly).amount}</span> <span className="price-period">{priceParts(plan, yearly).period}</span></p>
        <p className="plan-cycle-note">{yearly ? 'Billed annually' : 'Subscription billed monthly'}</p>
        <div className="setup-box"><small>One-time setup</small><strong>{setupPrice(plan)}</strong></div>
        <div className="interaction-box"><strong>{plan.interactions}</strong><small>AI Interactions / Month</small></div>
        <ul className="plan-features">{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
        <Link className="button plan-cta" href={`/contact?plan=${plan.slug}`}>{planCta(plan)} <span aria-hidden="true">↗</span></Link>
      </article>)}
    </div>
    <section className="comparison-section" aria-labelledby="compare-plans-heading">
      <div className="comparison-heading"><SectionEyebrow>Platform capabilities</SectionEyebrow><h2 id="compare-plans-heading">Platform Feature Comparison</h2><p>Compare the capabilities included in each SamChe AI plan and choose the configuration that fits your business.</p></div>
      <div className="comparison-scroll" role="region" aria-label="SamChe AI plan comparison" tabIndex={0}>
        <table className="plan-comparison">
          <thead><tr><th scope="col">FEATURE</th>{plans.map((plan) => <th scope="col" data-plan={plan.slug} key={plan.slug}>{plan.name}</th>)}</tr></thead>
          <tbody>{featureGroups.map((group) => <Fragment key={group.label}><tr className="comparison-group"><th colSpan={5}>{group.label}</th></tr>{group.rows.map(([label, values]) => <tr key={`${group.label}-${label}`}><th scope="row">{label}</th>{values.map((value, index) => <td data-plan={plans[index].slug} key={plans[index].slug}>{value}</td>)}</tr>)}</Fragment>)}</tbody>
        </table>
      </div>
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
