// Verified against samche-api-service/dashboard/src/app/router.tsx,
// components/layout/sidebar.tsx, and the named feature components on 2026-09-23.
// Paths are tenant-relative; no public dashboard host is assumed.
export const dashboardSupportMap = Object.freeze([
  { area: 'Overview', nav: 'Overview', path: '/app/:tenantId/overview', owner: 'automatic', controls: ['date-filtered analytics'], plan: 'all', checks: ['Confirm the selected tenant and date range.'] },
  { area: 'AI Assistants', nav: 'AI Assistants', path: '/app/:tenantId/assistants', owner: 'customer', controls: ['New assistant', 'assistant detail'], plan: 'all', checks: ['Check the assigned assistant on the affected channel.'] },
  { area: 'Channels', nav: 'Channels', path: '/app/:tenantId/channels', owner: 'customer', controls: ['New channel', 'Edit channel', 'Status', 'Assigned assistant', 'Save changes'], plan: 'all', checks: ['Open the affected channel and check its status and assigned assistant. Editing requires channel management access.'] },
  { area: 'Web Chatbot', nav: 'Channels → Web Chat Experience', path: '/app/:tenantId/channels/web-chat', owner: 'customer', controls: ['Web Chat Experience'], plan: 'all', checks: ['Check the Web Chat channel and its experience configuration.'] },
  { area: 'WhatsApp AI', nav: 'Channels', path: '/app/:tenantId/channels', owner: 'customer', controls: ['WhatsApp channel', 'Edit channel', 'Status', 'Assigned assistant', 'External channel ID', 'Save changes'], plan: 'Growth+', checks: ['Check the WhatsApp channel status and assigned active assistant. Editing requires channel management access.'], cannot: ['No customer-facing QR re-authentication control is verified.'] },
  { area: 'AI Guide', nav: 'Guide Experience', path: '/app/:tenantId/guide-experience', owner: 'customer', controls: ['Guide Experience'], plan: 'Business+', checks: ['Confirm the affected Guide experience.'] },
  { area: 'Knowledge Intelligence', nav: 'Knowledge Intelligence', path: '/app/:tenantId/knowledge', owner: 'customer', controls: ['Upload visual source', 'Create visual entity source'], plan: 'all', checks: ['Check the source and its processing state.'] },
  { area: 'Conversations / Shared Inbox', nav: 'Conversations', path: '/app/:tenantId/conversations/:channel', owner: 'customer', controls: ['WhatsApp', 'Web Chatbot', 'AI Guide'], plan: 'channel dependent', checks: ['Choose the affected channel and conversation.'] },
  { area: 'CRM Leads', nav: 'Leads', path: '/app/:tenantId/leads', owner: 'customer', controls: [], plan: 'all', checks: ['Find the affected lead.'] },
  { area: 'Pipeline', nav: 'Pipeline', path: '/app/:tenantId/pipeline', owner: 'customer', controls: [], plan: 'all', checks: ['Find the affected deal.'] },
  { area: 'Team', nav: 'Team', path: '/app/:tenantId/team', owner: 'customer', controls: [], plan: 'role dependent', checks: ['Check the affected team member’s workspace access.'] },
  { area: 'Settings', nav: 'Settings', path: '/app/:tenantId/settings', owner: 'customer', controls: [], plan: 'role dependent', checks: ['Confirm the active workspace.'] },
  { area: 'Integrations', nav: null, path: null, owner: 'implementation', controls: [], plan: 'plan dependent', checks: ['Collect the integration name and affected workflow.'], cannot: ['No dedicated Integrations dashboard route is verified.'] },
  { area: 'AI Visual generation', nav: null, path: null, owner: 'implementation', controls: [], plan: 'Enterprise', checks: ['Verify the affected WhatsApp flow and catalog/product context.'], cannot: ['There is no verified customer-facing AI Visual generation switch or settings route.'] },
  { area: 'AI Voice', nav: null, path: null, owner: 'implementation', controls: [], plan: 'Enterprise base entitlement', checks: ['Collect the affected inbound call and approximate time.'], cannot: ['No customer-facing AI Voice route is verified.'] },
  { area: 'Support', nav: null, path: '/support', owner: 'customer', controls: ['Submit Support Request'], plan: 'all', checks: ['Submit a support request if self-service checks do not resolve the issue.'] },
]);
