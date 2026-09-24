import { dashboardSupportMap } from '../support-dashboard-map.mjs';
import { articles, categories, unpublishedGaps } from './articles.mjs';
import { HELP_LOCALES } from './article-types.mjs';
import { troubleshootingArticles, validateTroubleshootingArticles, getHelpCoverageMatrix } from './troubleshooting-registry.mjs';

const troubleshootingValidation = validateTroubleshootingArticles();
if (!troubleshootingValidation.valid) throw new Error(`Invalid troubleshooting registry: ${troubleshootingValidation.errors.join('; ')}`);
export function filterPublishedHelpArticles(records = []) {
  return records.filter((article) => article?.verification?.status === 'Published');
}
const published = filterPublishedHelpArticles([...articles, ...troubleshootingArticles]);

function localeOf(locale) { return HELP_LOCALES.includes(locale) ? locale : 'en'; }
function fold(value) {
  return String(value || '').toLocaleLowerCase('en-US').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[ıİ]/g, 'i').replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
}
function words(value) { return fold(value).split(/\s+/).filter(Boolean); }
function localizedArticle(article, locale) {
  const language = localeOf(locale);
  const content = { title: article.title[language], summary: article.summary[language], keywords: article.keywords[language], plan: article.plan[language], permissions: article.permissions[language], prerequisites: article.prerequisites[language], navigation: article.navigation[language], expected: article.expected[language], problems: article.problems[language], sections: article.sections.map((item) => ({ heading: item.heading[language], body: item.body[language], steps: item.steps.map((step) => step[language]), note: item.note?.[language] || '', warning: item.warning?.[language] || '' })) };
  return { ...article, locale: language, ...content };
}

function articleText(article, locale) {
  const value = localizedArticle(article, locale);
  return [value.title, value.summary, value.keywords.join(' '), value.navigation, value.expected, value.problems, ...value.sections.flatMap((item) => [item.heading, item.body, ...item.steps, item.note, item.warning])].join(' ');
}

function scoreArticle(article, query, locale) {
  const language = localeOf(locale);
  const queryFolded = fold(query);
  const queryWords = words(query);
  if (!queryFolded) return 0;
  const value = localizedArticle(article, language);
  const title = fold(value.title);
  const summary = fold(value.summary);
  const keywords = value.keywords.map(fold);
  const body = fold(articleText(article, language));
  let score = 0;
  if (title === queryFolded) score += 1000;
  if (title.includes(queryFolded)) score += 500;
  if (keywords.some((keyword) => keyword === queryFolded)) score += 420;
  if (keywords.some((keyword) => keyword.includes(queryFolded))) score += 240;
  if (summary.includes(queryFolded)) score += 160;
  if (body.includes(queryFolded)) score += 80;
  for (const word of queryWords) {
    if (title.split(/\s+/).some((candidate) => candidate === word)) score += 130;
    else if (keywords.some((keyword) => keyword.includes(word))) score += 100;
    else if (body.includes(word)) score += 18;
    else if (word.length > 3 && body.includes(word.slice(0, -1))) score += 5;
  }
  return score;
}

export function getPublishedArticles(locale = 'en') {
  return published.map((article) => localizedArticle(article, locale));
}

export function getArticleBySlug(slug, locale = 'en') {
  const article = published.find((item) => item.slug === slug);
  return article ? localizedArticle(article, locale) : null;
}

export function getPublishedArticleUrl(slug, locale = 'en') {
  const article = getArticleBySlug(slug, locale);
  if (!article) return null;
  const path = `/help/article/${article.slug}`;
  return article.locale === 'en' ? path : `${path}?locale=${article.locale}`;
}

export function getPublishedArticlePresentation(slug, locale = 'en') {
  const article = getArticleBySlug(slug, locale);
  const url = getPublishedArticleUrl(slug, locale);
  if (!article || !url || !article.title || !article.summary) return null;
  return { slug: article.slug, title: article.title, summary: article.summary, url };
}

export function getPublishedCategories(locale = 'en') {
  const language = localeOf(locale);
  return categories.filter((category) => published.some((article) => article.category === category.slug)).map((category) => ({ ...category, locale: language, label: category.label[language], description: category.description[language], articleCount: published.filter((article) => article.category === category.slug).length }));
}

export function getHelpArticleStatistics(locale = 'en') {
  const language = localeOf(locale);
  return {
    totalPublished: published.length,
    totalTroubleshooting: filterPublishedHelpArticles(troubleshootingArticles).length,
    categories: getPublishedCategories(language).map((category) => ({
      slug: category.slug,
      label: category.label,
      count: category.articleCount,
    })),
  };
}

export function getCategoryBySlug(categorySlug, locale = 'en') {
  const category = getPublishedCategories(locale).find((item) => item.slug === categorySlug);
  if (!category) return null;
  return { ...category, articles: getPublishedArticles(locale).filter((article) => article.category === categorySlug) };
}

export function searchHelpArticles(query, locale = 'en', { limit = 20 } = {}) {
  return published.map((article) => ({ article, score: scoreArticle(article, query, locale) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.article.slug.localeCompare(b.article.slug)).slice(0, limit).map(({ article, score }) => {
    const value = localizedArticle(article, locale);
    return { slug: value.slug, title: value.title, category: getPublishedCategories(locale).find((item) => item.slug === value.category)?.label || value.category, summary: value.summary, navigation: value.navigation, score, url: getPublishedArticleUrl(value.slug, locale) || `/help/article/${value.slug}` };
  });
}

export function getHelpArticleSources(query, locale = 'en', limit = 3) {
  return searchHelpArticles(query, locale, { limit }).map((result) => {
    const article = getArticleBySlug(result.slug, locale);
    return { slug: result.slug, url: result.url, title: result.title, excerpt: article.summary, navigation: article.navigation, content: article.sections.slice(0, 3).map((section) => `${section.heading}: ${section.body} ${section.steps.join(' ')}`).join('\n'), status: 'Published', sourceFiles: article.verification.sourceFiles, verifiedOn: article.verification.verifiedOn };
  });
}

export function getHelpCoverageInventory() {
  const verified = dashboardSupportMap.filter((entry) => entry.status === 'implemented_customer_accessible');
  const coveredAreas = new Set(published.flatMap((article) => article.coverageAreas));
  return {
    auditedEntries: dashboardSupportMap.length,
    verifiedCustomerAccessibleEntries: verified.length,
    publishedEntriesCovered: verified.filter((entry) => coveredAreas.has(entry.area)).length,
    publishedArticleCount: published.length,
    categories: categories.filter((category) => published.some((article) => article.category === category.slug)).map((category) => category.slug),
    gaps: unpublishedGaps.map((gap) => ({ ...gap, published: false })),
    publishedSlugs: published.map((article) => article.slug),
    troubleshooting: getHelpCoverageMatrix({ records: troubleshootingArticles }),
  };
}

export function getHelpArticleRecord(slug) { return published.find((article) => article.slug === slug) || null; }
export function getUnpublishedHelpGaps() { return unpublishedGaps.map((gap) => ({ ...gap })); }
export function getAllPublishedArticleUrls() { return published.map((article) => `/help/article/${article.slug}`); }
export function getHelpArticleText(slug, locale = 'en') { const article = getArticleBySlug(slug, locale); return article ? articleText(article, locale) : ''; }
