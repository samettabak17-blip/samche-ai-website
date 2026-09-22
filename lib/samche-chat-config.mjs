// Website defaults use the existing Guide Experience / Web Chat field names
// where those contracts already provide a matching setting. They are display
// defaults only; this website has no public dashboard configuration binding yet.
export const defaultSamcheChatConfig = Object.freeze({
  brand_name: 'SamChe AI',
  assistant_display_name: 'SamChe AI Assistant',
  assistant_status_label: 'Online',
  title: 'SamChe AI Assistant',
  subtitle: 'Product demos, plans & recommendations',
  welcome_title: 'Your SamChe AI sales representative',
  welcome_message: 'I can help you identify the right SamChe AI setup for your business. What type of business do you operate?',
  input_placeholder: 'Ask me anything about SamChe...',
  launcher_label: 'Ask SamChe AI',
  quick_actions: ['Web Chatbot', 'AI Guide', 'WhatsApp AI', 'Pricing'],
  product_scope: 'SamChe AI Platform, Web Chatbot, WhatsApp AI, AI Guide, Knowledge Intelligence, Live Inbox, CRM & Pipeline, pricing, plans, demos, and supported platform capabilities. Automation / Agentic AI is Roadmap / Upcoming.',
  scope_disclaimer: 'I can only provide information about SamChe products and services.',
  more_options_label: 'More options',
  logo_url: null,
  avatar_url: null,
});

const allowedQuickActions = new Set(defaultSamcheChatConfig.quick_actions);
const isSafeAssetUrl = (value) => typeof value === 'string' && (value.startsWith('/') && !value.startsWith('//') || /^https:\/\//i.test(value));

const welcomeCopyByLocale = Object.freeze({
  en: Object.freeze({
    title: 'Your SamChe AI sales representative',
    message: 'I can help you identify the right SamChe AI setup for your business. What type of business do you operate?',
  }),
  tr: Object.freeze({
    title: 'SamChe AI satış temsilciniz',
    message: 'İşletmeniz için en uygun SamChe AI çözümünü belirlemenize yardımcı olabilirim. Hangi sektörde faaliyet gösteriyorsunuz?',
  }),
  ar: Object.freeze({
    title: 'ممثل مبيعات SamChe AI',
    message: 'يمكنني مساعدتكم في تحديد إعداد SamChe AI الأنسب لنشاطكم. ما مجال عملكم؟',
  }),
});

/** The opening message always follows the selected website locale. */
export function welcomeCopyForLocale(locale = 'en') {
  return welcomeCopyByLocale[locale] ?? welcomeCopyByLocale.en;
}

/** Merge a dashboard-shaped public presentation into the website defaults. */
export function resolveSamcheChatConfig(source = {}, locale = 'en') {
  const merged = { ...defaultSamcheChatConfig, ...source };
  const quickActions = Array.isArray(merged.quick_actions)
    ? merged.quick_actions.filter((action) => allowedQuickActions.has(action))
    : defaultSamcheChatConfig.quick_actions;
  return {
    ...merged,
    welcome_title: source.welcome_title && source.welcome_title !== defaultSamcheChatConfig.welcome_title
      ? source.welcome_title
      : welcomeCopyForLocale(locale).title,
    welcome_message: source.welcome_message && source.welcome_message !== defaultSamcheChatConfig.welcome_message
      ? source.welcome_message
      : welcomeCopyForLocale(locale).message,
    quick_actions: quickActions.length ? quickActions : defaultSamcheChatConfig.quick_actions,
    logo_url: isSafeAssetUrl(merged.logo_url) ? merged.logo_url : null,
    avatar_url: isSafeAssetUrl(merged.avatar_url) ? merged.avatar_url : null,
  };
}
