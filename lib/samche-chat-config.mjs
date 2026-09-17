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
  welcome_message: 'I can help identify the right setup for your business. What type of business do you operate?',
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

/** Merge a dashboard-shaped public presentation into the website defaults. */
export function resolveSamcheChatConfig(source = {}) {
  const merged = { ...defaultSamcheChatConfig, ...source };
  const quickActions = Array.isArray(merged.quick_actions)
    ? merged.quick_actions.filter((action) => allowedQuickActions.has(action))
    : defaultSamcheChatConfig.quick_actions;
  return {
    ...merged,
    quick_actions: quickActions.length ? quickActions : defaultSamcheChatConfig.quick_actions,
    logo_url: isSafeAssetUrl(merged.logo_url) ? merged.logo_url : null,
    avatar_url: isSafeAssetUrl(merged.avatar_url) ? merged.avatar_url : null,
  };
}
