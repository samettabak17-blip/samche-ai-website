export const platformFaqItems = [
  {
    question: 'What is SamChe AI Platform?',
    answer: 'SamChe AI Platform is a multi-tenant SaaS workspace for customer-facing AI assistants, business knowledge, conversations, leads and connected customer operations.',
  },
  {
    question: 'Which AI channels can I use?',
    answer: 'Depending on the selected plan, you can use Web Chatbot, WhatsApp AI and AI Guide. Channel availability follows the approved plan scope.',
  },
  {
    question: 'Can SamChe AI learn from my business documents?',
    answer: 'Knowledge Intelligence supports managed knowledge sources, processing states and grounded retrieval previews. The quality and scope of answers depend on the sources and workspace configuration.',
  },
  {
    question: 'Can the AI understand the page a visitor is viewing?',
    answer: 'Page-aware context is included in Starter and can help the Web Chatbot answer with awareness of the relevant website page.',
  },
  {
    question: 'Can I connect SamChe AI to my CRM or booking system?',
    answer: 'Growth includes one CRM or booking integration. Business and Enterprise support broader integrations according to the approved plan scope and implementation requirements.',
  },
  {
    question: 'Does SamChe AI support multiple languages?',
    answer: 'Yes. The plans support up to 2, 3 or 5 languages, while Enterprise provides extended multilingual support.',
  },
  {
    question: 'Can a human take over an AI conversation?',
    answer: 'Human handover is included in Starter, and Growth includes shared inbox capabilities for team follow-through where configured. Higher-scope arrangements can be reviewed with sales.',
  },
  {
    question: 'What happens if I exceed my monthly AI interaction allowance?',
    answer: 'If your usage approaches or exceeds your plan allowance, SamChe AI can recommend a higher plan or a custom usage arrangement. Exact commercial terms depend on the selected plan and agreed scope.',
  },
  {
    question: 'How long does implementation take?',
    answer: 'Implementation depends on the selected channels, knowledge sources, integrations and operating requirements. The sales team confirms the practical scope during review; no fixed deployment time is promised here.',
  },
  {
    question: 'Can SamChe AI be configured for multiple brands or websites?',
    answer: 'Enterprise supports multiple brands or sites as part of its custom scope, with the final configuration reviewed against your operating requirements.',
  },
] as const;

export function PlatformFAQ() {
  return <section className="platform-faq" aria-labelledby="platform-faq-heading">
    <div className="platform-faq-heading">
      <p className="eyebrow">Platform questions</p>
      <h2 id="platform-faq-heading">SamChe AI Platform FAQ</h2>
      <p>Clear answers about channels, knowledge, integrations and implementation scope.</p>
    </div>
    <div className="platform-faq-list">
      {platformFaqItems.map((item, index) => {
        const answerId = `platform-faq-answer-${index + 1}`;
        return <details className="platform-faq-item" key={item.question}>
          <summary aria-controls={answerId}><span>{item.question}</span><b aria-hidden="true">+</b></summary>
          <p id={answerId}>{item.answer}</p>
        </details>;
      })}
    </div>
  </section>;
}
