import { getHelpCoverageMatrix, validateHelpCenterRegistry } from './troubleshooting-schema.mjs';
import { accountAccessArticles } from './troubleshooting/account-access.mjs';
import { dashboardOverviewArticles } from './troubleshooting/dashboard-overview.mjs';
import { webChatbotArticles } from './troubleshooting/web-chatbot.mjs';
import { whatsappArticles } from './troubleshooting/whatsapp-ai.mjs';
import { instagramDmArticles } from './troubleshooting/instagram-dm-ai.mjs';
import { aiGuideArticles } from './troubleshooting/ai-guide.mjs';
import { knowledgeIntelligenceArticles } from './troubleshooting/knowledge-intelligence.mjs';
import { conversationsArticles } from './troubleshooting/conversations-inbox.mjs';
import { crmPipelineArticles } from './troubleshooting/crm-pipeline.mjs';
import { integrationArticles } from './troubleshooting/integrations.mjs';
import { aiVisualArticles } from './troubleshooting/ai-visual.mjs';
import { aiVoiceArticles } from './troubleshooting/ai-voice.mjs';
import { plansSupportBillingArticles } from './troubleshooting/plans-support-billing.mjs';
import { articles } from './articles.mjs';

export const troubleshootingArticles = Object.freeze([
  ...accountAccessArticles, ...dashboardOverviewArticles, ...webChatbotArticles, ...whatsappArticles, ...instagramDmArticles, ...aiGuideArticles,
  ...knowledgeIntelligenceArticles, ...conversationsArticles, ...crmPipelineArticles, ...integrationArticles, ...aiVisualArticles,
  ...aiVoiceArticles, ...plansSupportBillingArticles,
]);

export function validateTroubleshootingArticles(records = troubleshootingArticles) {
  return validateHelpCenterRegistry(records, { knownSlugs: articles.map((article) => article.slug) });
}

export function getPublishedTroubleshootingArticles(locale = 'en') {
  return troubleshootingArticles
    .filter((article) => article.verification?.status === 'Published')
    .map((article) => ({ ...article, locale }));
}

export { getHelpCoverageMatrix };
