import { getHelpCoverageMatrix, validateHelpCenterRegistry } from './troubleshooting-schema.mjs';

export const troubleshootingArticles = Object.freeze([]);

export function validateTroubleshootingArticles(records = troubleshootingArticles) {
  return validateHelpCenterRegistry(records);
}

export function getPublishedTroubleshootingArticles(locale = 'en') {
  return troubleshootingArticles
    .filter((article) => article.verification?.status === 'Published')
    .map((article) => ({ ...article, locale }));
}

export { getHelpCoverageMatrix };
