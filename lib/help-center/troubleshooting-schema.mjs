export const TROUBLESHOOTING_STATUSES = Object.freeze(['Draft', 'Needs Review', 'Published', 'Retired']);
export const AUDIT_STATUSES = Object.freeze([
  'VERIFIED CUSTOMER-ACCESSIBLE', 'IMPLEMENTATION-MANAGED', 'ADMIN-ONLY', 'ROADMAP', 'UNVERIFIED', 'NO VERIFIED CONTENT',
]);
export const REQUIRED_HELP_LOCALES = Object.freeze(['en', 'tr', 'ar']);

const localizedTextFields = ['title', 'summary', 'prerequisites', 'navigation', 'interventionBoundary', 'expectedResult'];
const localizedListFields = ['symptoms', 'commonCauses', 'doNot', 'supportChecklist', 'keywords'];
const requiredFields = ['id', 'slug', 'category', 'productArea', 'issueType', 'title', 'summary', 'symptoms', 'appliesTo', 'prerequisites', 'navigation', 'decisionTree', 'selfServiceSteps', 'interventionBoundary', 'expectedResult', 'commonCauses', 'doNot', 'supportChecklist', 'keywords', 'related', 'verification'];

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  return value;
}

function isLocalizedText(value) {
  return value && typeof value === 'object' && REQUIRED_HELP_LOCALES.every((locale) => typeof value[locale] === 'string' && value[locale].trim());
}

function isLocalizedList(value) {
  return value && typeof value === 'object' && REQUIRED_HELP_LOCALES.every((locale) => Array.isArray(value[locale]) && value[locale].length > 0 && value[locale].every((item) => typeof item === 'string' && item.trim()));
}

function isDecisionTree(value) {
  return Array.isArray(value) && value.length > 0 && value.every((node) => isLocalizedText(node?.question) && typeof node.yes === 'string' && typeof node.no === 'string');
}

function isLocalizedStepList(value) {
  return Array.isArray(value) && value.length > 0 && value.every((step) => isLocalizedText(step));
}

export function createTroubleshootingArticle(input) {
  return Object.freeze(clone({
    ...input,
    coverageAreas: Array.isArray(input.coverageAreas) ? [...input.coverageAreas] : [input.productArea],
    related: Array.isArray(input.related) ? [...input.related] : [],
    verification: { ...input.verification },
  }));
}

function validateRecord(record, index, allRecords) {
  const errors = [];
  if (!record || typeof record !== 'object') return [`record ${index} is not an object`];
  for (const field of requiredFields) if (!(field in record)) errors.push(`${record.id || index} missing ${field}`);
  if (typeof record.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id)) errors.push(`${record.id || index} has invalid id`);
  if (typeof record.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug)) errors.push(`${record.id || index} has invalid slug`);
  for (const field of localizedTextFields) if (!isLocalizedText(record[field])) errors.push(`${record.id || index} has incomplete localized ${field}`);
  for (const field of localizedListFields) if (!isLocalizedList(record[field])) errors.push(`${record.id || index} has incomplete localized ${field}`);
  if (!record.appliesTo || !Array.isArray(record.appliesTo.plans) || !Array.isArray(record.appliesTo.roles)) errors.push(`${record.id || index} has invalid appliesTo`);
  if (!isDecisionTree(record.decisionTree)) errors.push(`${record.id || index} has invalid decisionTree`);
  if (!isLocalizedStepList(record.selfServiceSteps)) errors.push(`${record.id || index} has invalid selfServiceSteps`);
  if (!Array.isArray(record.related) || record.related.some((slug) => typeof slug !== 'string')) errors.push(`${record.id || index} has invalid related articles`);
  const verification = record.verification;
  if (!verification || !TROUBLESHOOTING_STATUSES.includes(verification.status)) errors.push(`${record.id || index} has invalid verification status`);
  if (!verification || typeof verification.verifiedOn !== 'string' || !verification.verifiedOn) errors.push(`${record.id || index} is missing verifiedOn`);
  if (!verification || !Array.isArray(verification.sourceFiles) || verification.sourceFiles.length === 0) errors.push(`${record.id || index} is missing source evidence`);
  if (!verification || !Array.isArray(verification.sourceRoutes) || !Array.isArray(verification.reviewTriggers) || verification.reviewTriggers.length === 0) errors.push(`${record.id || index} is missing verification metadata`);
  if (verification?.status === 'Published' && ['Needs Review', 'Retired'].includes(verification.status)) errors.push(`${record.id || index} cannot publish excluded status`);
  const knownSlugs = new Set(allRecords.map((item) => item?.slug));
  for (const related of record.related || []) if (!knownSlugs.has(related)) errors.push(`${record.id || index} has invalid related slug ${related}`);
  return errors;
}

export function validateHelpCenterRegistry(records, { knownSlugs = [] } = {}) {
  const values = Array.isArray(records) ? records : [];
  const errors = [];
  const ids = new Set();
  const slugs = new Set();
  for (const [index, record] of values.entries()) {
    if (ids.has(record?.id)) errors.push(`duplicate article id ${record.id}`);
    if (slugs.has(record?.slug)) errors.push(`duplicate article slug ${record.slug}`);
    if (record?.id) ids.add(record.id);
    if (record?.slug) slugs.add(record.slug);
    errors.push(...validateRecord(record, index, [...values, ...knownSlugs.map((slug) => ({ slug }))]));
  }
  return { valid: errors.length === 0, errors, records: values };
}

const coverageCategories = Object.freeze([
  ['Account / Access', 'VERIFIED CUSTOMER-ACCESSIBLE'], ['Dashboard / Overview', 'VERIFIED CUSTOMER-ACCESSIBLE'], ['Web Chatbot', 'VERIFIED CUSTOMER-ACCESSIBLE'],
  ['WhatsApp AI', 'VERIFIED CUSTOMER-ACCESSIBLE'], ['AI Guide', 'VERIFIED CUSTOMER-ACCESSIBLE'], ['Knowledge Intelligence', 'VERIFIED CUSTOMER-ACCESSIBLE'],
  ['Conversations / Shared Inbox', 'VERIFIED CUSTOMER-ACCESSIBLE'], ['CRM / Contacts / Leads / Pipeline', 'VERIFIED CUSTOMER-ACCESSIBLE'], ['Integrations', 'IMPLEMENTATION-MANAGED'],
  ['AI Visual', 'IMPLEMENTATION-MANAGED'], ['AI Voice', 'IMPLEMENTATION-MANAGED'], ['Team / Permissions', 'VERIFIED CUSTOMER-ACCESSIBLE'],
  ['Plans / Entitlements', 'VERIFIED CUSTOMER-ACCESSIBLE'], ['Support / Service', 'VERIFIED CUSTOMER-ACCESSIBLE'], ['Billing / Usage', 'VERIFIED CUSTOMER-ACCESSIBLE'],
  ['Security / Privacy', 'NO VERIFIED CONTENT'], ['Troubleshooting / Cross-product issues', 'NO VERIFIED CONTENT'],
]);

export function getHelpCoverageMatrix({ records = [], evidence = [] } = {}) {
  const byArea = new Map();
  for (const record of records) for (const area of record.coverageAreas || []) byArea.set(area, (byArea.get(area) || 0) + 1);
  return coverageCategories.map(([category, auditStatus]) => ({
    category, auditStatus, verifiedCustomerAccessibleAreas: auditStatus === 'VERIFIED CUSTOMER-ACCESSIBLE' ? [category] : [],
    implementationManagedAreas: auditStatus === 'IMPLEMENTATION-MANAGED' ? [category] : [], adminOnlyAreas: auditStatus === 'ADMIN-ONLY' ? [category] : [],
    roadmapAreas: auditStatus === 'ROADMAP' ? [category] : [], unverifiedAreas: auditStatus === 'UNVERIFIED' ? [category] : [],
    publishedArticleCount: byArea.get(category) || 0, draftOrNeedsReviewCount: 0,
    sourceEvidence: evidence.filter((item) => item.category === category).map((item) => item.source), remainingDocumentationGaps: [],
  }));
}
