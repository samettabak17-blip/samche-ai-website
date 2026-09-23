export const HELP_LOCALES = Object.freeze(['en', 'tr', 'ar']);
export const ARTICLE_STATUSES = Object.freeze(['Draft', 'Needs Review', 'Verified', 'Published']);

export function localized(en, tr, ar) {
  return Object.freeze({ en, tr, ar });
}

export function section(heading, body, steps = [], note = '', warning = '') {
  return Object.freeze({ heading, body, steps, note, warning });
}

