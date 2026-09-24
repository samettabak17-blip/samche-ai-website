'use client';

import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { plans } from '../../lib/site-data.mjs';
import { formatScreenshotSize, validateScreenshot } from '../../lib/form-ux.mjs';
import { SectionEyebrow } from './site-shell';
import Link from './internal-link';
import { useSiteLocale } from './site-localization';
import { getHelpCenterStats, getPublishedArticles, getPublishedCategories, searchHelpArticles } from '../../lib/help-center/index.mjs';

type SupportStatusCode = '' | 'attachmentType' | 'attachmentSize' | 'required' | 'email' | 'success' | 'delivery';
function supportStatusText(code: SupportStatusCode, locale: 'en' | 'tr' | 'ar') {
  const messages = {
    attachmentType: { en: 'Choose a PNG, JPG, JPEG, or WEBP image.', tr: 'PNG, JPG, JPEG veya WEBP biçiminde bir görsel seçin.', ar: 'يرجى اختيار صورة بصيغة PNG أو JPG أو JPEG أو WEBP.' },
    attachmentSize: { en: 'File is larger than 5 MB.', tr: 'Dosya 5 MB sınırını aşıyor.', ar: 'حجم الملف يتجاوز 5 ميغابايت.' },
    required: { en: 'Please fill in all required fields.', tr: 'Lütfen zorunlu alanları doldurun.', ar: 'يرجى تعبئة جميع الحقول المطلوبة.' },
    email: { en: 'Enter a valid email address.', tr: 'Geçerli bir e-posta adresi girin.', ar: 'يرجى إدخال عنوان بريد إلكتروني صالح.' },
    success: { en: 'Your support request has been successfully submitted.', tr: 'Destek talebiniz başarıyla iletildi.', ar: 'تم إرسال طلب الدعم بنجاح.' },
    delivery: { en: 'Your support request could not be sent right now. Please try again.', tr: 'Destek talebiniz şu anda gönderilemedi. Lütfen yeniden deneyin.', ar: 'تعذر إرسال طلب الدعم حالياً. يرجى المحاولة مرة أخرى.' },
  };
  return code ? messages[code][locale] : '';
}

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
  const [attachment, setAttachment] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const previewUrlRef = useRef('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error' | ''; code: SupportStatusCode }>({ type: '', code: '' });

  const searchId = useId();
  const uploadText = {
    en: { attach: 'Attach Screenshot', replace: 'Replace Screenshot', remove: 'Remove screenshot', hint: 'PNG, JPG, JPEG or WEBP · max 5 MB' },
    tr: { attach: 'Ekran Görüntüsü Ekle', replace: 'Ekran Görüntüsünü Değiştir', remove: 'Ekran görüntüsünü kaldır', hint: 'PNG, JPG, JPEG veya WEBP · en fazla 5 MB' },
    ar: { attach: 'إرفاق لقطة شاشة', replace: 'استبدال لقطة الشاشة', remove: 'إزالة لقطة الشاشة', hint: 'PNG أو JPG أو JPEG أو WEBP · بحد أقصى 5 ميغابايت' },
  }[locale];

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const publishedArticles = getPublishedArticles(locale);
  const publishedCategories = getPublishedCategories(locale);
  const helpCenterStats = getHelpCenterStats(locale);
  const verifiedArticleCount = locale === 'tr'
    ? `${helpCenterStats.totalPublished} doğrulanmış Yardım Merkezi makalesi kullanılabilir`
    : locale === 'ar'
      ? `${helpCenterStats.totalPublished} مقالة معتمدة متاحة في مركز المساعدة`
      : `${helpCenterStats.totalPublished} verified Help Center articles available`;
  const readArticleLabel = locale === 'tr' ? 'Doğrulanmış makaleyi oku' : locale === 'ar' ? 'اقرأ المقالة المعتمدة' : 'Read verified article';
  const searchSuggestions = search.trim() ? searchHelpArticles(search, locale, { limit: 5 }) : [];
  function submitKnowledgeSearch(event: FormEvent) {
    event.preventDefault();
    const value = search.trim();
    if (typeof window !== 'undefined') window.location.assign(value ? `/help?locale=${locale}&q=${encodeURIComponent(value)}` : `/help?locale=${locale}`);
  }
  const filteredKnowledge = search.trim()
    ? searchHelpArticles(search, locale, { limit: 20 })
    : publishedArticles.slice(0, 8).map((article) => ({ slug: article.slug, category: publishedCategories.find((category) => category.slug === article.category)?.label || article.category, title: article.title, summary: article.summary, navigation: article.navigation, url: `/help/article/${article.slug}`, score: 0 }));

  function handleAttachment(file: File) {
    const validation = validateScreenshot(file);
    if (!validation.ok) {
      setFormStatus({ type: 'error', code: validation.reason as SupportStatusCode });
      return false;
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = URL.createObjectURL(file);
    setPreviewUrl(previewUrlRef.current);
    setAttachment(file);
    setFormStatus({ type: '', code: '' });
    return true;
  }

  function removeAttachment() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = '';
    setAttachment(null);
    setPreviewUrl('');
    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    setFormStatus({ type: '', code: '' });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    if (!summary.trim() || !description.trim() || !contactEmail.trim() || !selectedPlan || !productArea || !contactName.trim() || !accountIdentifier.trim()) {
      setFormStatus({ type: 'error', code: 'required' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      setFormStatus({ type: 'error', code: 'email' });
      return;
    }

    submittingRef.current = true;
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
    } finally { submittingRef.current = false; setSubmitting(false); }
  }

  return (
    <div className="support-portal page-width">
      <nav className="support-portal-links" aria-label={locale === 'tr' ? 'Destek seçenekleri' : locale === 'ar' ? 'خيارات الدعم' : 'Support options'}>
        <Link href="/help">{locale === 'tr' ? 'Yardım Merkezi’ni açın' : locale === 'ar' ? 'تصفح مركز المساعدة' : 'Browse Help Center'}</Link>
        <a href="#submit-ticket">{locale === 'tr' ? 'Destek talebi gönderin' : locale === 'ar' ? 'إرسال طلب دعم' : 'Submit Support Request'}</a>
        <a href="#samche-chat-launcher">{locale === 'tr' ? 'SamChe AI’ye sorun' : locale === 'ar' ? 'اسأل SamChe AI' : 'Ask SamChe AI'}</a>
      </nav>
      <section className="support-search-hero" aria-labelledby="support-search-heading">
        <SectionEyebrow>Search knowledge &amp; verified guides</SectionEyebrow>
        <h2 id="support-search-heading">How can we help your team today?</h2>
        <p className="support-help-count">{verifiedArticleCount}</p>
        <form className="support-search-bar" onSubmit={submitKnowledgeSearch} role="search">
          <label htmlFor={searchId} className="sr-only">Search support topics</label>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Web Chatbot, WhatsApp AI, Knowledge Intelligence, CRM, AI Visual..."
            aria-controls="support-search-suggestions"
            aria-autocomplete="list"
          />
          <button className="sr-only" type="submit">Search</button>
          {search.trim() && <div id="support-search-suggestions" className="support-search-suggestions" role="listbox" aria-label="Search suggestions">
            {searchSuggestions.length ? searchSuggestions.map((item) => <Link role="option" aria-selected="false" className="support-search-suggestion" key={item.slug} href={item.url}><span className="kb-category">{item.category}</span><strong>{item.title}</strong><small>{item.summary}</small></Link>) : <p className="support-search-empty">No verified guides found for this search.</p>}
          </div>}
        </form>
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
            <article className="support-kb-card" key={item.slug}>
              <div className="kb-meta"><span className="kb-category">{item.category}</span></div>
              <h3>{item.title}</h3><p>{item.summary}</p><p className="kb-navigation">{item.navigation}</p>
              <Link className="text-link" href={item.url}>{readArticleLabel} <span aria-hidden="true">↗</span></Link>
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

        <form className="support-form" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
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
            <span className="attachment-field-label">{uploadText.attach}</span>
            <label className="attachment-picker">
              <input
                ref={attachmentInputRef}
                id="support-screenshot"
                className="attachment-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-describedby="support-attachment-help"
                disabled={submitting}
                onClick={(event) => { event.currentTarget.value = ''; }}
                onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file && !handleAttachment(file)) event.currentTarget.value = ''; }}
              />
              <span className="attachment-trigger-content"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 12.5 6.8-6.8a3.2 3.2 0 0 1 4.5 4.5l-8.5 8.5a5 5 0 0 1-7.1-7.1l8-8" /></svg>{attachment ? uploadText.replace : uploadText.attach}</span>
            </label>
            <span id="support-attachment-help" className="attachment-help">{uploadText.hint}</span>
            {attachment && <div className="attachment-preview">
              {/* Object URLs from the native file picker cannot use remote image optimization. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {previewUrl && <img src={previewUrl} alt="" />}
              <div className="attachment-preview-details"><strong>{attachment.name}</strong><span>{formatScreenshotSize(attachment.size)}</span></div>
              <button className="attachment-remove" type="button" onClick={removeAttachment} disabled={submitting} aria-label={uploadText.remove}><span aria-hidden="true">×</span><span>{uploadText.remove}</span></button>
            </div>}
          </div>

          {formStatus.code && (
            <div
              className={`support-form-status ${formStatus.type}`}
              role={formStatus.type === 'error' ? 'alert' : 'status'}
              aria-live={formStatus.type === 'error' ? 'assertive' : 'polite'}
            >
              {supportStatusText(formStatus.code, locale)}
            </div>
          )}

          <div className="form-actions">
            <button
              className="button button-primary form-submit-button"
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              data-state={submitting ? 'loading' : formStatus.type}
            >
              {submitting ? (locale === 'tr' ? 'Gönderiliyor…' : locale === 'ar' ? 'جارٍ الإرسال…' : 'Sending…') : (locale === 'tr' ? 'Destek Talebini Gönder' : locale === 'ar' ? 'إرسال طلب الدعم' : 'Submit Support Request')} <span className="form-submit-icon" aria-hidden="true">→</span>
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


