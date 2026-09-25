# Dependency Security Remediation Design

## Scope

Remediate the current dependency advisories with the smallest compatible package changes. Preserve the existing Vinext/Node SSR architecture, React Server Components, same-origin APIs, image and screenshot flows, and all product behavior. Do not use `npm audit fix`, broad major upgrades, infrastructure changes, or a second dependency strategy.

## Baseline

- Hostinger scanner snapshot: 2 critical, 36 high, 23 medium, 5 low (66 total).
- Reproducible npm audit on 2026-09-25: 1 critical, 16 high, 6 moderate, 1 low (24 vulnerable package chains).
- Baseline application tests: 312 passed, 0 failed.
- Runtime contract: Node `>=22.13.0`; the local validation host currently runs Node 24.19.0.
- Next image configuration: `images.unoptimized: true`; this application does not expose the Next image optimizer or request AVIF output. The Next and Sharp patches are still mandatory defense in depth and for environments that may enable optimization later.

The Hostinger and npm totals are not directly comparable: Hostinger reports its own scanner snapshot/advisory instances, while npm reports vulnerable package chains from the current lockfile. Both baselines will remain explicit in the final report.

## Pre-change remediation table

| Package | Direct / transitive | Installed | Vulnerable range | Minimum/current safe target | Introducing parent | Project code uses it? | Planned action |
| --- | --- | ---: | --- | ---: | --- | --- | --- |
| `next` | direct runtime | 16.2.6 | npm currently flags through 16.3.2; AVIF and Windows RCE are `<16.3.3` | 16.3.6 | root; also an optional peer of `@unpic/react` | Yes, types and `next/*` imports; Vinext supplies runtime shims | Upgrade within Next 16 and align `eslint-config-next` |
| `sharp` | transitive runtime/dev | 0.34.5 | `<0.35.4` | 0.35.4 | `next`, `miniflare` | No direct import | Prefer resolution through patched parents; use an exact semver-compatible override only if the lock still resolves a vulnerable copy |
| `fast-uri` | transitive runtime | 3.1.2 | 3.0.0–3.1.5 | 3.1.6 | `@hookform/resolvers` -> `ajv` (`^3.0.1`) | No | Refresh the lock within AJV's declared compatible range; no override expected |
| `js-yaml` | transitive dev | 4.1.1 | 4.0.0–4.3.1 | 4.3.2 | `eslint` -> `@eslint/eslintrc` (`^4.1.1`) | No | Refresh the lock within the declared compatible range; no override expected |
| `vinext` | direct dev/runtime framework | 1.0.0-beta.5 | through beta.5 via `image-size` | 1.0.0-beta.12 | root | Yes, build and SSR runtime | Upgrade within the same beta line; verify its declared Vite 8, React 19.2.6+, RSC 19.2.6+ peers and full SSR behavior |
| `vite` | direct dev/build | 8.0.13 | 8.0.0–8.0.15 | 8.3.1 | root and Vinext plugins | Yes, build pipeline | Upgrade within Vite 8 |
| `react-server-dom-webpack` | direct dev/runtime | 19.2.6 | 19.2.0–19.2.7 | 19.2.8 | root, Vinext, RSC plugin | Yes, RSC | Upgrade React, React DOM, and RSC together to 19.2.8 to keep peer versions aligned |
| `@cloudflare/vite-plugin` | direct dev | 1.37.1 | through 1.46.0 | 1.60.1 | root | Build/deploy only | Upgrade within 1.x; its published peers require Wrangler `^4.140.0` |
| `wrangler` | direct dev | 4.92.0 | 4.16.0–4.113.0 | 4.140.0 | root and Cloudflare plugin | Build/deploy only | Upgrade to the exact version paired by Cloudflare plugin 1.60.1 |
| `@cloudflare/workers-types` | direct dev compatibility peer | 4.20260515.1 | not itself vulnerable | 5.20260923.1 | root; required by Wrangler 4.140.0 | Types only | Upgrade to Wrangler's minimum published peer; do not bypass peer resolution with `--force` |
| `ws`, `undici`, `miniflare` | transitive dev | vulnerable locked versions | advisory-specific | versions selected by Cloudflare plugin 1.60.1 | Cloudflare plugin/Wrangler | No | Resolve through the patched Cloudflare parents |
| `image-size` | transitive dev/runtime | 2.0.2 | `<=2.0.2` | removed/patched parent resolution | Vinext beta.5 | No | Resolve by upgrading Vinext to beta.12 |
| `postcss`, `brace-expansion`, `browserslist`, `nanoid`, `baseline-browser-mapping`, `@babel/core`, `fflate` | transitive | lockfile versions vary | advisory-specific | newest compatible locked patch | framework/build parents | No direct vulnerable API use | Targeted compatible lock refresh after parent upgrades; no incompatible override |
| `drizzle-kit` / `@esbuild-kit/*` | direct dev / transitive dev | 0.31.10 | npm flags current line | no safe npm-proposed upgrade | root -> legacy loader | Schema generation only | Do not accept npm's unsafe downgrade to 0.18.1; reassess after 0.31.11 and document any remaining dev-only advisory |

## Compatibility strategy

Vinext targets Next.js 16.x and declares Vite 8 plus React/RSC 19.2.6 or newer peers. The chosen versions stay inside those lines. Compatibility is accepted only if typecheck, lint, Vinext build, Node production server, document rendering, RSC navigation, same-origin API boundaries, and static assets pass.

`server/server.mjs`, `dist/client`, and the existing production smoke harness remain unchanged unless a demonstrated compatibility failure requires a narrowly scoped fix. Node 22 compatibility is enforced by package engine ranges (`>=22.13.0`, Vite `>=22.12.0`, Wrangler `>=22.0.0`, Sharp `>=20.9.0`) and the existing Hostinger runtime contract; validation will record that the available local executable is Node 24.

## Override policy

No override is planned for `fast-uri` or `js-yaml` because their parents declare compatible caret ranges. An override may be added only when a vulnerable transitive copy survives normal parent upgrades, the patched version is inside every parent's declared range, and the complete regression suite passes. Every override will be named in the final report.

## Image security

The application accepts PNG/JPEG/WEBP screenshots for support and OpenAI vision and validates MIME type and source bytes before provider submission. It does not accept AVIF uploads. `next.config.ts` keeps Next image optimization disabled, so the vulnerable AVIF optimizer path is not exposed by the current configuration. Regression coverage must still confirm patched Next/Sharp resolution and preserve PNG/JPEG/WEBP, clipboard, vision, and static image behavior.

## Acceptance gates

1. A security regression test fails on the current vulnerable lockfile and passes after remediation.
2. Full tests, typecheck, lint, and Vinext build pass.
3. The built server returns 200 for `/`, `/platform`, `/pricing`, `/help`, `/support`, `/security`, `/contact`, and `/privacy`; returns a real 404 for an unknown route; and serves health, API boundaries, RSC, JS, CSS, and image assets correctly.
4. `npm audit --omit=dev` and `npm audit` are captured verbatim and no zero-vulnerability claim is made unless both prove it.
5. A secret audit finds no committed credentials.
6. Only dependency manifests, necessary compatibility code/tests, and security documentation are committed on `codex/security-dependency-remediation`.

## Post-remediation result

The final resolved security versions are Next 16.3.6, Sharp 0.35.4, fast-uri 3.1.8, js-yaml 4.3.2, Vinext 1.0.0-beta.12, Vite 8.3.1, React/RSC 19.2.8, Cloudflare Vite plugin 1.60.1, and Wrangler 4.140.0. No npm override was needed: Next and Cloudflare selected Sharp 0.35.4, while AJV and ESLint accepted the patched fast-uri/js-yaml releases through their existing caret ranges.

Vinext beta.12 changed two production contracts that were verified and handled narrowly:

- Cloudflare plugin builds now externalize `cloudflare:workers` for workerd. Hostinger uses the documented Node server, so normal production builds omit the Cloudflare plugin; local development still uses it, and an explicit `SAMCHE_CLOUDFLARE_BUILD=true` preserves Worker builds.
- The Node build's default server export is now a `(Request) => Response` function. `server/server.mjs` accepts that supported shape and retains compatibility with the existing Worker `{ fetch() }` shape.

The built Node server passes complete document rendering, HTML 404, RSC, health, API-boundary, static JavaScript/CSS/image, and screenshot-size tests. PNG/JPEG/WEBP remain the only accepted customer screenshot formats; AVIF is not accepted and Next image optimization remains disabled.

## Remaining advisories

After remediation, both `npm audit --omit=dev` and `npm audit` report 0 critical, 0 high, 4 moderate, and 0 low. All four records are the same development-only chain and the lockfile marks every package below with `dev: true`. npm 11 still includes this chain in its `--omit=dev` advisory summary.

| Package | Severity | Direct / transitive | Why it remains | Application exploitability | Planned fix |
| --- | --- | --- | --- | --- | --- |
| `drizzle-kit@0.31.11` | moderate | direct dev dependency | Latest stable patch still depends on deprecated `@esbuild-kit/esm-loader`; npm proposes a breaking downgrade to 0.18.1 | Not imported by the website, SSR server, APIs, or client; available only through the manual `db:generate` command | Upgrade when Drizzle publishes a stable release that removes the legacy loader |
| `@esbuild-kit/esm-loader@2.6.5` | moderate | transitive dev | Required by Drizzle Kit 0.31.11 | Not loaded by `npm start`; schema-generation tooling only | Removed with the parent Drizzle fix |
| `@esbuild-kit/core-utils@3.3.2` | moderate | transitive dev | The loader requires it | Not loaded by `npm start`; schema-generation tooling only | Removed with the parent Drizzle fix |
| `esbuild@0.18.20` | moderate | transitive dev | `core-utils` pins `~0.18.20`, so a patched override is semver-incompatible | The advisory concerns an exposed esbuild development server; SamChe production never starts this copy or exposes a dev server | Do not override; remove through a compatible upstream Drizzle/loader release |

The other locked esbuild copies are 0.25.12 and 0.28.1 and are not in the reported vulnerable path. The project does not run Drizzle Kit in Hostinger's build or start commands.
