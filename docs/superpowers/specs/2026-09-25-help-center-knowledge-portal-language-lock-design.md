# Help Center Knowledge Portal and Conversation Language Lock Design

## Purpose

Transform the existing Help Center into a mature, navigation-first knowledge portal while preserving the canonical 68-article registry, and guarantee that every chatbot response path uses the latest user message language rather than the site UI locale or earlier conversation state.

## Success Criteria

- `/help` leads with search, live knowledge totals, and a localized category directory instead of a flat article grid.
- Published totals, troubleshooting totals, category totals, status totals, and locale coverage are derived from one canonical registry helper.
- Only records with `verification.status === 'Published'` and complete verification evidence are public or counted.
- Category pages show localized counts and compact, semantically grouped article rows.
- Search exposes the full result count, localized category and article-type labels, excerpts, destinations, and the visible range when results are limited.
- Article pages use documentation hierarchy: localized breadcrumbs and badges, applicability, verification date, contents, steps, notices, related articles, Ask SamChe AI, and Contact Support.
- No raw category slug, internal article type, or registry status appears in EN, TR, or AR UI.
- The latest detectable user-message language controls provider output validation, safe salvage, network/HTTP/JSON/timeout fallback, link/article recovery, screenshot follow-up, support recovery, and refreshed/restored chat state.
- EN, TR, and AR layouts remain usable without horizontal overflow at 320, 375, 390, 430, 768, 1024, 1440, and 1920 pixels; AR is RTL.
- Existing OpenAI text/vision, screenshot and clipboard support, persistence, fast-open/reveal behavior, SMTP, Support Portal, pricing, feature comparison, SSR, weekly Dashboard sync, and infrastructure remain intact.

## Current State and Root Cause

The repository already combines the legacy guide records and troubleshooting records into one public registry in `lib/help-center/index.mjs`. It currently produces 68 public records, of which 50 come from the troubleshooting registry. Existing category routes and basic counts are present, but the view model is incomplete: there is no category total, no search-result total, no localized article-type presentation, no semantic category grouping, and several components render internal category slugs directly.

Local regression tests already demonstrate Turkish, English, and Arabic latest-message recovery for selected paths. The live failure can therefore be caused by either an uncovered response path or deployment drift. The feature branch contains language-lock changes that are absent from `main`. The implementation must close uncovered paths and test them, but public production remains unverified until the pushed revision is deployed and exercised in a real browser.

## Canonical Registry and Publication Gate

`lib/help-center/index.mjs` remains the only public content adapter. No component, support surface, sitemap, or chatbot may import category content modules directly.

A record is public only when all of these are true:

- `verification.status` is exactly `Published`.
- `verification.verifiedOn` is a non-empty date string.
- `verification.sourceFiles` is a non-empty array.
- `verification.reviewTriggers` is a non-empty array.
- The record has a stable slug and complete EN/TR/AR localized content under the existing validation rules.

The existing combined array remains the canonical 68-record source. Publication filtering may be strengthened, but content must not be copied into a second registry.

## Derived Knowledge Statistics

Add `getHelpCenterStats(locale, records?)`, with the production default bound to the canonical registry. It returns:

```ts
{
  totalPublished: number;
  totalTroubleshooting: number;
  totalCategories: number;
  byCategory: Array<{ slug: string; label: string; count: number }>;
  byStatus: Record<string, number>;
  byLocale: Record<'en' | 'tr' | 'ar', number>;
}
```

`totalTroubleshooting` is derived from an explicit normalized article kind assigned while composing the canonical registry, not from UI labels or text matching. `byLocale` counts public records with complete display content in each locale. `getHelpArticleStatistics()` remains as a compatibility alias during migration so existing callers and weekly sync behavior are not broken.

## Localized Presentation Model

Public article results expose presentation-safe fields:

- localized `categoryLabel` derived from category metadata;
- normalized `articleType` (`guide` or `troubleshooting`);
- localized `articleTypeLabel`;
- localized title, summary, excerpt, navigation, plan, and URL;
- verified date and canonical slug.

Internal slugs and enum values remain data keys only. The localized labels are:

| Value | English | Turkish | Arabic |
| --- | --- | --- | --- |
| guide | Guide | Rehber | دليل |
| troubleshooting | Troubleshooting | Sorun Giderme | استكشاف المشكلات |

All surrounding Help Center copy is stored in the existing local component dictionary and completed for EN/TR/AR. Product names may remain branded English terms; generic UI language may not leak.

## Help Center Homepage

The homepage order is:

1. Help Center heading, concise description, and prominent search.
2. Three live summary metrics: published articles, troubleshooting guides, and categories.
3. Two-column desktop / one-column mobile category directory. Each entry includes localized name, localized description, article count, and clear navigation affordance.
4. Popular Troubleshooting, populated only from verified published troubleshooting records and shown as compact rows.
5. Recently Verified, ordered by verification date and shown as compact rows.
6. Getting Started, sourced from the canonical getting-started category.
7. Ask SamChe AI call-to-action targeting the existing chat launcher.
8. Contact Support call-to-action targeting the existing support workflow.

The homepage never renders all 68 articles.

## Search Experience

Add a paginated/search-summary adapter that scores all public records before applying the limit:

```ts
searchHelpArticleResults(query, locale, { offset, limit }) -> {
  query: string;
  total: number;
  start: number;
  end: number;
  items: SearchResult[];
}
```

`searchHelpArticles()` remains compatible and delegates to the new adapter. Submitted results display a localized phrase such as “12 results for WhatsApp” and, when needed, “Showing 1–20 of 68.” Each result is a compact row containing title, localized category, excerpt, localized type badge, and canonical destination. Suggestions use the same presentation data and do not duplicate destinations.

## Category Pages

Category pages display localized breadcrumbs, localized title/description, and the total article count. Public articles are grouped into these presentation sections when non-empty:

- Getting Started
- Common Problems
- Troubleshooting
- Plan & Entitlement
- Implementation-managed Topics

Grouping is deterministic and derived from normalized article metadata (`articleType`, issue type, category, applicability, and intervention boundary), never from translated text. Articles appear once in the first matching group. Rows show title, summary, localized type, last verified date, and an arrow affordance.

## Article Pages

Article pages render localized category names everywhere. The article header contains type, applicable plan, and last-verified metadata. The existing section structure powers the table of contents and numbered steps. Existing `note` and `warning` fields render as localized information/warning blocks when present. Related articles are de-duplicated and shown as compact rows. Existing feedback remains, followed by Ask SamChe AI and Contact Support actions.

## Support Portal

The Support Portal imports `getHelpCenterStats()` and shows one compact localized line reporting the verified Help Center article total near knowledge search. Its search remains backed by the same registry and uses localized category/type presentation. The support form structure and SMTP submission path are unchanged.

## Chatbot Article Recommendations

Chat messages continue storing canonical article slugs only. Rendering resolves each slug through the canonical registry for the current `conversationLanguage`, de-duplicates slugs, and presents a localized heading followed by specific localized article titles. Raw Markdown URLs, placeholder URLs, invented slugs, and the generic “verified article” label are not valid substitutes for titles.

## Strict Conversation Language Ownership

`siteLocale` controls website chrome only. `conversationLanguage` controls chat content.

At the start of every submitted turn:

1. Detect language from the latest user message text.
2. If it is confidently EN/TR/AR, it wins over every stored value.
3. If the latest text is genuinely language-neutral, retain the previous `conversationLanguage`; only a brand-new neutral conversation may fall back to `siteLocale`.
4. Persist the resolved language separately from `siteLocale`.
5. Pass the resolved value explicitly to request payloads, provider prompting, provider-response validation, safe salvage, all error recovery, article selection and presentation, screenshot follow-up, refresh restoration, and rendered assistant messages.

No recovery function may independently reselect `siteLocale` after the turn language has been resolved. Server code treats `inputLanguage` derived from the current message as authoritative and uses a stored conversation language only for neutral input.

## Error and Recovery Paths

The following paths share the same resolved turn language and canonical article resolution:

- provider exception or unusable response;
- HTTP/network failure and timeout/abort;
- malformed JSON;
- contract/validator rejection;
- safe salvage of usable provider text;
- broken-link recovery;
- insufficient-article recovery;
- screenshot and clipboard follow-up;
- generic support recovery;
- refreshed/restored chat sessions.

Fallback text must be fully localized. Verified Dashboard control names and product brands may remain unchanged. Article recommendations must retain the prior relevant article when a follow-up such as “makale açılmıyor” contains no product name.

## Responsive and Accessibility Rules

- All grid children use `min-width: 0`; long titles and search terms wrap.
- Category directory is two columns on suitable desktop widths and one column on mobile.
- Article lists remain single-column compact rows.
- Summary metrics wrap without clipping.
- Search controls stack on narrow screens and retain 44-pixel minimum targets.
- Sticky article contents becomes in-flow below the desktop breakpoint.
- Direction-sensitive spacing and arrows use logical CSS; AR root direction is RTL.
- Search result updates use a polite live region and all sections have accessible headings.

## Testing Strategy

Tests are written and observed failing before production changes. Coverage includes:

- canonical publication gate and all count dimensions;
- draft, retired, unverified, roadmap, and incomplete-verification exclusion;
- per-category counts and compatibility alias behavior;
- localized category and type labels with no raw enum leakage;
- exact search totals and displayed result ranges;
- category count and one-time grouping;
- article page localized metadata and notice blocks;
- named, unique article recommendations;
- latest-message TR/EN/AR language across provider, validator, salvage, network, timeout, article, screenshot, support, and refresh paths;
- responsive structural contracts and RTL rules.

Final validation runs the full test suite, TypeScript check, lint, production build, production HTTP smoke, `git diff --check`, and a secret scan of the scoped diff. Browser acceptance runs the built application in EN/TR/AR at 320, 375, 390, 430, 768, 1024, 1440, and 1920 pixels. Public production is reported as `NOT VERIFIED` unless the pushed revision is deployed and the same live scenarios are executed successfully.

## Scope Boundaries

No changes are permitted to DNS, Render configuration, Hostinger environment values, or `samche-api-service`. No new content source, CMS, provider integration, dependency, or article corpus is introduced. The change is limited to the website registry adapter, Help Center and Support presentation, chatbot language/recommendation flow, styles, tests, and documentation.
