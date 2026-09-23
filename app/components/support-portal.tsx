'use client';

import { FormEvent, useId, useState } from 'react';
import { plans } from '../../lib/site-data.mjs';
import { SectionEyebrow } from './site-shell';
import { useSiteLocale } from './site-localization';

interface SupportKnowledgeItem {
  id: string;
  category: string;
  title: string;
  summary: string;
  steps: string[];
  planRequired?: string;
}

type SupportStatusCode = '' | 'attachment' | 'required' | 'success' | 'delivery';
function supportStatusText(code: SupportStatusCode, locale: 'en' | 'tr' | 'ar') {
  const messages = {
    attachment: { en: 'Attach a PNG, JPG, or WEBP screenshot up to 5 MB.', tr: 'En fazla 5 MB boyutunda PNG, JPG veya WEBP ekran görüntüsü ekleyin.', ar: 'أرفق لقطة شاشة بصيغة PNG أو JPG أو WEBP بحجم لا يتجاوز 5 ميغابايت.' },
    required: { en: 'Please fill in all required fields.', tr: 'Lütfen zorunlu alanları doldurun.', ar: 'يرجى تعبئة جميع الحقول المطلوبة.' },
    success: { en: 'Your support request has been successfully submitted. Our team will review it according to your plan’s support coverage and contact you through your preferred support channel.', tr: 'Destek talebiniz başarıyla iletildi. Ekibimiz, paketinizin destek kapsamına göre talebinizi inceleyerek sizinle iletişime geçecektir.', ar: 'تم إرسال طلب الدعم بنجاح. سيراجع فريقنا طلبكم وفق نطاق الدعم المتاح في خطتكم ويتواصل معكم عبر وسيلة التواصل المفضلة لديكم.' },
    delivery: { en: 'Your support request could not be sent right now. Please try again.', tr: 'Destek talebiniz şu anda gönderilemedi. Lütfen yeniden deneyin.', ar: 'تعذر إرسال طلب الدعم حالياً. يرجى المحاولة مرة أخرى.' },
  };
  return code ? messages[code][locale] : '';
}

const verifiedKnowledgeItems: SupportKnowledgeItem[] = [
  {
    id: 'kb-web-chat',
    category: 'Web Chatbot',
    title: 'Troubleshooting Web Chatbot Embedding & Page Context',
    summary: 'How to verify the Web Chatbot script installation and enable page-aware context on your website.',
    steps: [
      'Open Channels, then Web Chat Experience in your workspace.',
      'Check the Web Chat channel status and assigned assistant.',
      'Review the Web Chat Experience configuration for the affected site.',
    ],
  },
  {
    id: 'kb-whatsapp-ai',
    category: 'WhatsApp AI',
    title: 'WhatsApp AI Connection Status & Message Routing',
    summary: 'Verifying business number connection and channel availability for Growth, Business, and Enterprise plans.',
    steps: [
      'Confirm your account is on Growth plan or higher (WhatsApp AI is not included in Starter).',
      'Open Channels and select the affected WhatsApp channel.',
      'Check its Status and assigned active Assistant.',
      'If the channel cannot be repaired from those controls, submit the affected channel and example conversation for support review.',
    ],
    planRequired: 'Growth / Business / Enterprise',
  },
  {
    id: 'kb-knowledge-intel',
    category: 'Knowledge Intelligence',
    title: 'Managing Documents, Ingestion States & Retrieval Previews',
    summary: 'Uploading business documents (PDF, DOCX, TXT, PNG, JPG) and inspecting grounded answers.',
    steps: [
      'Open Knowledge Intelligence in the workspace sidebar.',
      'Find the affected source and review its displayed processing state.',
      'For product imagery, use Upload visual source and provide the product/entity context.',
    ],
  },
  {
    id: 'kb-live-inbox',
    category: 'Inbox / Conversations',
    title: 'Human Handover & Team Message Handling',
    summary: 'Moving conversations seamlessly between AI assistance and human support agents.',
    steps: [
      'Open Conversations and choose WhatsApp, Web Chatbot, or AI Guide.',
      'Select the affected conversation and review its available actions.',
      'If an action is unavailable for your role or channel, submit the conversation context for support review.',
    ],
  },
  {
    id: 'kb-ai-visual',
    category: 'AI Visual',
    title: 'AI Visual Generation Entitlements & Verification',
    summary: 'Enterprise multimodal visual product generation and personalization.',
    steps: [
      'Verify account is on the Enterprise plan (AI Visual is exclusively an Enterprise feature).',
      'There is no verified customer-facing AI Visual generation switch in the current dashboard.',
      'Check the affected WhatsApp flow and product or catalog context.',
      'Include an example prompt, image, and approximate time in a support request so the implementation team can review tenant configuration.',
    ],
    planRequired: 'Enterprise only',
  },
];

export function SupportPortal() {
  const { locale } = useSiteLocale();
  const [search, setSearch] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [productArea, setProductArea] = useState('');
  const [issueType, setIssueType] = useState('technical');
  const [severity, setSeverity] = useState('normal');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [accountIdentifier, setAccountIdentifier] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMethod, setContactMethod] = useState('email');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error' | ''; code: SupportStatusCode }>({ type: '', code: '' });

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
      setAttachment(null);
      return true;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setAttachment(null); setAttachmentName('');
      setFormStatus({ type: 'error', code: 'attachment' });
      return false;
    }
    setAttachment(file);
    setAttachmentName(file.name);
    setFormStatus({ type: '', code: '' });
    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (!summary.trim() || !description.trim() || !contactEmail.trim() || !selectedPlan || !productArea || !contactName.trim() || !accountIdentifier.trim()) {
      setFormStatus({ type: 'error', code: 'required' });
      return;
    }

    setSubmitting(true);
    setFormStatus({ type: '', code: '' });
    try {
      const image = attachment ? await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.onerror = reject; reader.readAsDataURL(attachment); }) : null;
      const response = await fetch('/api/support', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({
        accountIdentifier, name: contactName, email: contactEmail, phone: contactPhone, plan: selectedPlan,
        productArea, issueCategory: issueType, severity, subject: summary, description, preferredContactMethod: contactMethod,
        ...(image && attachment ? { attachment: { name: attachment.name, mimeType: attachment.type, data: image } } : {}),
      }) });
      if (!response.ok) throw new Error('delivery_failed');
      setFormStatus({ type: 'success', code: 'success' });
    } catch {
      setFormStatus({ type: 'error', code: 'delivery' });
    } finally { setSubmitting(false); }
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
                onChange={(e) => { setSelectedPlan(e.target.value); if (e.target.value === 'starter' && contactMethod === 'whatsapp') setContactMethod('email'); }}
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
              <label htmlFor="support-severity">Severity *</label>
              <select id="support-severity" value={severity} onChange={(e) => setSeverity(e.target.value)} required>
                <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="support-account-id">Account / Company Identifier *</label>
              <input
                id="support-account-id"
                value={accountIdentifier}
                onChange={(e) => setAccountIdentifier(e.target.value)}
                placeholder="e.g. acme-corp or registered workspace"
                required
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
                <option value="whatsapp" disabled={selectedPlan === 'starter'}>WhatsApp (Growth/Business/Enterprise)</option>
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
              onChange={(e) => { if (!handleAttachment(e.target.files?.[0])) e.currentTarget.value = ''; }}
            />
            {attachmentName && <span className="attached-file-badge">Attached: {attachmentName}</span>}
          </div>

          {formStatus.code && (
            <div
              className={`support-form-status ${formStatus.type}`}
              role="status"
              aria-live="polite"
            >
              {supportStatusText(formStatus.code, locale)}
            </div>
          )}

          <div className="form-actions">
            <button
              className="button button-primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? (locale === 'tr' ? 'Gönderiliyor…' : locale === 'ar' ? 'جارٍ الإرسال…' : 'Sending…') : (locale === 'tr' ? 'Destek Talebini Gönder' : locale === 'ar' ? 'إرسال طلب الدعم' : 'Submit Support Request')} <span aria-hidden="true">↗</span>
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


