'use client';

import { FormEvent, useId, useState } from 'react';
import { plans } from '../../lib/site-data.mjs';
import { SectionEyebrow } from './site-shell';

interface SupportKnowledgeItem {
  id: string;
  category: string;
  title: string;
  summary: string;
  steps: string[];
  planRequired?: string;
}

const verifiedKnowledgeItems: SupportKnowledgeItem[] = [
  {
    id: 'kb-web-chat',
    category: 'Web Chatbot',
    title: 'Troubleshooting Web Chatbot Embedding & Page Context',
    summary: 'How to verify the Web Chatbot script installation and enable page-aware context on your website.',
    steps: [
      'Navigate to Channels > Web Chatbot in your SamChe AI workspace.',
      'Verify that your domain is allow-listed under Widget Settings.',
      'Ensure the JavaScript embed snippet is placed before the closing </body> tag.',
      'Check browser console for any Content Security Policy (CSP) blocking external script execution.',
    ],
  },
  {
    id: 'kb-whatsapp-ai',
    category: 'WhatsApp AI',
    title: 'WhatsApp AI Connection Status & Message Routing',
    summary: 'Verifying business number connection and channel availability for Growth, Business, and Enterprise plans.',
    steps: [
      'Confirm your account is on Growth plan or higher (WhatsApp AI is not included in Starter).',
      'Navigate to Channels > WhatsApp AI in the tenant dashboard.',
      'Check the connection status badge; if disconnected, use Re-authenticate QR/API link.',
      'Verify that team members have appropriate permissions in Settings > Team.',
    ],
    planRequired: 'Growth / Business / Enterprise',
  },
  {
    id: 'kb-knowledge-intel',
    category: 'Knowledge Intelligence',
    title: 'Managing Documents, Ingestion States & Retrieval Previews',
    summary: 'Uploading business documents (PDF, DOCX, TXT, PNG, JPG) and inspecting grounded answers.',
    steps: [
      'Open Knowledge Intelligence from the main dashboard sidebar.',
      'Check the processing status of recent source files (Indexed, Processing, or Failed).',
      'Use the Retrieval Preview tab to test sample queries against your knowledge base.',
      'Review pending updates in the Knowledge Approval Workflow before publishing.',
    ],
  },
  {
    id: 'kb-live-inbox',
    category: 'Inbox / Conversations',
    title: 'Human Handover & Team Message Handling',
    summary: 'Moving conversations seamlessly between AI assistance and human support agents.',
    steps: [
      'Open Live Inbox to view incoming conversations across enabled channels.',
      'Click "Take over from AI" on any active thread to pause automated responses.',
      'Reply directly to the customer as a team agent.',
      'Click "Return to AI" once the human support exchange is complete.',
    ],
  },
  {
    id: 'kb-ai-visual',
    category: 'AI Visual',
    title: 'AI Visual Generation Entitlements & Verification',
    summary: 'Enterprise multimodal visual product generation and personalization.',
    steps: [
      'Verify account is on the Enterprise plan (AI Visual is exclusively an Enterprise feature).',
      'Confirm tenant workspace has AI Visual Generation enabled in tenant settings.',
      'Ensure the customer image or catalog reference was provided in a supported format (PNG, JPG, WEBP).',
      'Check monthly visual generation usage against the included 200 generations/month allowance.',
    ],
    planRequired: 'Enterprise only',
  },
];

export function SupportPortal() {
  const [search, setSearch] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [productArea, setProductArea] = useState('');
  const [issueType, setIssueType] = useState('technical');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [accountIdentifier, setAccountIdentifier] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMethod, setContactMethod] = useState('email');
  const [attachmentName, setAttachmentName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });

  const searchId = useId();

  const filteredKnowledge = verifiedKnowledgeItems.filter((item) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.summary.toLowerCase().includes(query) ||
      item.steps.some((step) => step.toLowerCase().includes(query))
    );
  });

  function handleAttachment(file?: File) {
    if (!file) {
      setAttachmentName('');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setFormStatus({ type: 'error', message: 'Attach a PNG, JPG, or WEBP screenshot up to 5 MB.' });
      return;
    }
    setAttachmentName(file.name);
    setFormStatus({ type: '', message: '' });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (!summary.trim() || !description.trim() || !contactEmail.trim()) {
      setFormStatus({ type: 'error', message: 'Please fill in all required fields.' });
      return;
    }

    setSubmitting(true);
    setFormStatus({ type: '', message: 'Validating support request…' });

    await new Promise((resolve) => setTimeout(resolve, 300));

    setSubmitting(false);
    setFormStatus({
      type: 'success',
      message: 'Support request validated and prepared. Direct ticketing backend integration is currently in rollout; for urgent assistance, please email support@samche.ai with your account details or reach out via your plan\'s dedicated priority channel.',
    });
  }

  return (
    <div className="support-portal page-width">
      <section className="support-search-hero" aria-labelledby="support-search-heading">
        <SectionEyebrow>Search knowledge &amp; verified guides</SectionEyebrow>
        <h2 id="support-search-heading">How can we help your team today?</h2>
        <div className="support-search-bar">
          <label htmlFor={searchId} className="sr-only">Search support topics</label>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Web Chatbot, WhatsApp AI, Knowledge Intelligence, CRM, AI Visual..."
          />
        </div>
      </section>

      <section className="support-tiers-overview" aria-labelledby="support-tiers-heading">
        <div className="section-heading">
          <div>
            <SectionEyebrow>Support tiers &amp; channels</SectionEyebrow>
            <h2 id="support-tiers-heading">Plan-Based Support Entitlements</h2>
          </div>
          <p>Every SamChe AI plan includes 24/7 AI-powered assistance and access to this Support Portal. Human support channels follow your commercial plan tier.</p>
        </div>
        <div className="support-plans-grid">
          {plans.map((plan) => (
            <article className={`support-plan-card plan-${plan.slug}`} key={plan.slug}>
              <h3>{plan.name}</h3>
              <p className="support-plan-summary"><strong>{plan.supportLevel}</strong></p>
              <ul className="support-plan-features">
                {plan.supportEntitlements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <section className="support-kb-section" aria-labelledby="kb-heading">
        <div className="section-heading">
          <div>
            <SectionEyebrow>Verified platform guides</SectionEyebrow>
            <h2 id="kb-heading">Knowledge Base &amp; Setup Guides</h2>
          </div>
          <p>Grounded troubleshooting steps based strictly on verified SamChe AI modules and platform settings.</p>
        </div>
        <div className="support-kb-grid">
          {filteredKnowledge.map((item) => (
            <article className="support-kb-card" key={item.id}>
              <div className="kb-meta">
                <span className="kb-category">{item.category}</span>
                {item.planRequired && <span className="kb-plan-tag">{item.planRequired}</span>}
              </div>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <ol className="kb-steps">
                {item.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </article>
          ))}
          {filteredKnowledge.length === 0 && (
            <div className="support-empty-state">
              <p>No guides found matching &quot;{search}&quot;. Try another term or submit a support request below.</p>
            </div>
          )}
        </div>
      </section>

      <section className="support-request-section" id="submit-ticket" aria-labelledby="request-heading">
        <div className="section-heading">
          <div>
            <SectionEyebrow>Technical assistance</SectionEyebrow>
            <h2 id="request-heading">Submit a Support Request</h2>
          </div>
          <p>Provide your account context, affected feature, and issue description for technical review by the SamChe AI team.</p>
        </div>

        <form className="support-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="support-plan">Your Plan *</label>
              <select
                id="support-plan"
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                required
              >
                <option value="">Select your plan</option>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="business">Business</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="support-area">Affected Product Area *</label>
              <select
                id="support-area"
                value={productArea}
                onChange={(e) => setProductArea(e.target.value)}
                required
              >
                <option value="">Select product area</option>
                <option value="web-chatbot">Web Chatbot</option>
                <option value="whatsapp-ai">WhatsApp AI</option>
                <option value="ai-guide">AI Guide</option>
                <option value="knowledge-intelligence">Knowledge Intelligence</option>
                <option value="crm-pipeline">CRM &amp; Pipeline</option>
                <option value="live-inbox">Live Inbox / Conversations</option>
                <option value="ai-visual">AI Visual (Enterprise)</option>
                <option value="ai-voice">AI Voice Receptionist</option>
                <option value="integrations">Integrations &amp; API</option>
                <option value="billing">Billing / Plan</option>
                <option value="account">Account &amp; Team Access</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="support-issue-type">Issue Type *</label>
              <select
                id="support-issue-type"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                required
              >
                <option value="technical">Technical Issue / Bug</option>
                <option value="configuration">Configuration Assistance</option>
                <option value="integration">Integration / API Issue</option>
                <option value="billing">Billing / Account Question</option>
                <option value="general">General Support</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="support-account-id">Account / Company Identifier</label>
              <input
                id="support-account-id"
                value={accountIdentifier}
                onChange={(e) => setAccountIdentifier(e.target.value)}
                placeholder="e.g. acme-corp or registered workspace"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="support-name">Your Name *</label>
              <input
                id="support-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="support-email">Work Email *</label>
              <input
                id="support-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="support-phone">Phone / WhatsApp Number</label>
              <input
                id="support-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                autoComplete="tel"
                placeholder="+971 50 000 0000"
              />
            </div>
            <div className="field">
              <label htmlFor="support-contact-method">Preferred Follow-Up Method</label>
              <select
                id="support-contact-method"
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value)}
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp (Growth/Business/Enterprise)</option>
                <option value="portal">Support Portal</option>
              </select>
            </div>
          </div>

          <div className="field field-full">
            <label htmlFor="support-summary">Issue Summary *</label>
            <input
              id="support-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Concise summary of the issue (e.g. WhatsApp AI not routing customer queries)"
              required
            />
          </div>

          <div className="field field-full">
            <label htmlFor="support-description">Detailed Description &amp; Error Messages *</label>
            <textarea
              id="support-description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what occurred, any visible error text, approximate time issue started, and whether all conversations or one conversation is affected..."
              required
            />
          </div>

          <div className="field field-full">
            <label htmlFor="support-screenshot">Attach Screenshot (PNG, JPG, WEBP — up to 5 MB)</label>
            <input
              id="support-screenshot"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => handleAttachment(e.target.files?.[0])}
            />
            {attachmentName && <span className="attached-file-badge">Attached: {attachmentName}</span>}
          </div>

          {formStatus.message && (
            <div
              className={`support-form-status ${formStatus.type}`}
              role="status"
              aria-live="polite"
            >
              {formStatus.message}
            </div>
          )}

          <div className="form-actions">
            <button
              className="button button-primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit Support Request'} <span aria-hidden="true">↗</span>
            </button>
            <p className="form-disclaimer">
              Support requests are handled according to your commercial plan entitlement. Starter and Growth requests are processed during business hours; Enterprise critical issues receive 24/7 human escalation.
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}


