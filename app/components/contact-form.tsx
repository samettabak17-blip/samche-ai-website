"use client";

import { FormEvent, useEffect, useState } from 'react';
import { plans, productModules } from '../../lib/site-data.mjs';

export function ContactForm({ initialPlan = '', initialInterest = '' }: { initialPlan?: string; initialInterest?: string }) {
  const [interest, setInterest] = useState(initialPlan ? `plan:${initialPlan}` : initialInterest);
  const [fields, setFields] = useState({ name: '', email: '', company: '', role: '', message: '' });
  const [structuredLead, setStructuredLead] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem('samche:website-chat-lead');
        if (!raw) return;
        const lead = JSON.parse(raw);
        setStructuredLead(lead);
        setFields({ name: lead.name || '', email: lead.email || '', company: lead.company || '', role: lead.role || lead.industry || '', message: lead.message || '' });
        if (lead.plan && ['starter', 'growth', 'business', 'enterprise'].includes(lead.plan)) setInterest(`plan:${lead.plan}`);
        else if (lead.interest) setInterest(lead.interest);
      } catch { /* Ignore invalid handoff data; the enquiry form remains usable. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const selection = interest.startsWith('plan:')
      ? `Plan: ${plans.find((plan) => plan.slug === interest.slice(5))?.name ?? 'Not selected'}`
      : `Interested in: ${productModules.find((module) => module.name === interest)?.name ?? (['Web Chatbot', 'WhatsApp AI'].includes(interest) ? interest : 'Not selected')}`;
    form.set('interest', selection);
    form.set('_subject', `SamChe AI product enquiry — ${selection}`);
    if (interest.startsWith('plan:')) form.set('selected_plan', plans.find((plan) => plan.slug === interest.slice(5))?.name ?? '');
    setIsSubmitting(true);
    setStatus('Sending…');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      if (!response.ok) throw new Error('Form submission was not accepted');
      formElement.reset();
      setInterest('');
      setFields({ name: '', email: '', company: '', role: '', message: '' });
      try { localStorage.removeItem('samche:website-chat-lead'); } catch { /* Request already succeeded. */ }
      setStatus('Your enquiry has been received. Our team will be in touch shortly.');
    } catch {
      setStatus('Your enquiry could not be sent. Please try again or email sales@samche.ai.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return <form className="contact-form" onSubmit={submit}>
    <div className="field"><label htmlFor="contact-name">Name</label><input id="contact-name" name="name" autoComplete="name" value={fields.name} onChange={(event) => setFields({ ...fields, name: event.target.value })} required /></div>
    <div className="field"><label htmlFor="contact-email">Work email</label><input id="contact-email" name="email" type="email" autoComplete="email" value={fields.email} onChange={(event) => setFields({ ...fields, email: event.target.value })} required /></div>
    <div className="field"><label htmlFor="contact-company">Company</label><input id="contact-company" name="company" autoComplete="organization" value={fields.company} onChange={(event) => setFields({ ...fields, company: event.target.value })} required /></div>
    <div className="field"><label htmlFor="contact-role">Role</label><input id="contact-role" name="role" autoComplete="organization-title" value={fields.role} onChange={(event) => setFields({ ...fields, role: event.target.value })} required /></div>
    <div className="field field-full"><label htmlFor="contact-interest">Interested product / plan</label><select id="contact-interest" name="interest" value={interest} onChange={(event) => setInterest(event.target.value)} required>
      <option value="">Select a product or plan</option>
      <optgroup label="Subscription plans">{plans.map((plan) => <option value={`plan:${plan.slug}`} key={plan.slug}>{plan.name}</option>)}</optgroup>
      <optgroup label="Product interests"><option value="Web Chatbot">Web Chatbot</option><option value="WhatsApp AI">WhatsApp AI</option>{productModules.filter((module) => module.name !== 'Dashboard & Tenant Analytics').map((module) => <option value={module.name} key={module.name}>{module.name}{module.status.startsWith('Roadmap') ? ' — Roadmap / Upcoming' : ''}</option>)}</optgroup>
    </select></div>
    <div className="field field-full"><label htmlFor="contact-message">Message</label><textarea id="contact-message" name="message" rows={5} value={fields.message} onChange={(event) => setFields({ ...fields, message: event.target.value })} required /></div>
    {['industry', 'country', 'website', 'mainGoal', 'channels', 'products', 'languages', 'integrations', 'volume', 'plan', 'timeline', 'teamUsers', 'leadQualification', 'aiGuideNeed', 'apiWorkflow', 'apiAccessNeed', 'customWorkflowNeed', 'externalIntegrations', 'aiLeadScoring', 'preferredDemoDate', 'preferredDemoTime', 'conversationSummary'].map((key) => {
      const value = structuredLead[key];
      return <input key={key} type="hidden" name={key} value={Array.isArray(value) ? value.join(' + ') : typeof value === 'string' ? value : ''} readOnly />;
    })}
    <p className="form-consent">Your enquiry will be reviewed by the SamChe AI sales team. See the <a href="/privacy">Privacy Policy</a>.</p>
    <button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Send demo request'} <span aria-hidden="true">↗</span></button>
    <p className="form-note">No subscription is activated until the commercial scope is confirmed with you.</p>
    <p className="form-status" role="status" aria-live="polite">{status}</p>
  </form>;
}
