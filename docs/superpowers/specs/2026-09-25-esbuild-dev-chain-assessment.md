# Esbuild Development-Chain Security Assessment

## Decision

Do not change dependencies or add npm overrides in this release. `drizzle-kit@0.31.11` is already the latest stable release and still publishes the legacy esbuild chain. The only newer Drizzle Kit lines are prerelease beta/RC builds. Replacing either locked esbuild copy would cross its parent's declared `0.x` compatibility range, so a scanner-only override is not a safe remediation.

Production remains unaffected: a clean install with `npm ci --include=prod --omit=dev` contains no esbuild package, and the corresponding npm audit reports zero vulnerabilities at every severity.

## Reproduced dependency tree

```text
drizzle-kit@0.31.11 (direct dev dependency)
├─ @esbuild-kit/esm-loader@2.6.5
│  └─ @esbuild-kit/core-utils@3.3.2
│     └─ esbuild@0.18.20 (dev-only; core-utils declares ~0.18.20)
├─ esbuild@0.25.12 (dev-only; drizzle-kit declares ^0.25.4)
└─ tsx@4.22.1
   └─ esbuild@0.28.1 (dev-only, deduped)

vite@8.3.1
└─ esbuild@0.28.1 (dev-only, deduped)

wrangler@4.140.0
└─ esbuild@0.28.1 (dev-only, deduped)
```

All three lockfile esbuild entries have `dev: true`. `npm ls esbuild --include=prod --omit=dev --all` returns an empty tree.

## Command exposure

| Command surface | Esbuild copy used | Finding exposure |
| --- | --- | --- |
| `npm run build` / Vinext / Vite | `0.28.1` | Neither reported finding applies |
| `npm run db:generate` | Drizzle Kit tooling; direct `0.25.12`, with the legacy loader/core-utils/`0.18.20` package chain installed beneath Drizzle Kit | Development-only; generation completed with no schema diff |
| `npm run typecheck` | None (`tsc`) | None |
| `npm run lint` | None (`eslint`) | None |
| `npm test` | None at runtime; the security test reads lockfile metadata | None |
| `npm start` | None | None |
| Clean production install | No esbuild installed | None |

## Advisory status

### GHSA-gv7w-rqvm-qjhr

GitHub marks this advisory **withdrawn as of 2026-06-17** because esbuild was incorrectly identified and the actual affected package is outside the supported ecosystem. Hostinger continues to display the withdrawn record for esbuild 0.18.20 and 0.25.12. These scanner entries are false positives and are not treated as active vulnerabilities.

Primary source: <https://github.com/advisories/GHSA-gv7w-rqvm-qjhr>

### GHSA-67mh-4wv8-2f99

This advisory is active and affects esbuild `<=0.24.2`; `0.25.0` is the first patched version. It concerns esbuild's development server returning `Access-Control-Allow-Origin: *`, allowing a malicious website visited by a developer to read content from an exposed local esbuild serve endpoint.

The repository does not invoke the `serve` API of the nested `0.18.20` copy, does not expose an esbuild development server in production, and does not install this copy in the production dependency tree. The affected copy exists only because `@esbuild-kit/core-utils@3.3.2` pins `esbuild ~0.18.20` under the direct development dependency `drizzle-kit`.

Primary source: <https://github.com/advisories/GHSA-67mh-4wv8-2f99>

## Parent-upgrade and override analysis

- npm registry `latest` for Drizzle Kit is `0.31.11`, already installed.
- `drizzle-kit@0.31.11` depends on `esbuild ^0.25.4` and `@esbuild-kit/esm-loader ^2.5.5`.
- `@esbuild-kit/esm-loader@2.6.5` is the latest release and is deprecated in favor of `tsx`.
- `@esbuild-kit/core-utils@3.3.2` is the latest release and pins `esbuild ~0.18.20`.
- Moving the nested copy to `0.25.x` would exceed `core-utils`' declared range.
- Moving Drizzle Kit's direct copy from `0.25.x` to `0.28.1` would exceed Drizzle Kit's declared range and would only suppress a withdrawn advisory.
- Drizzle Kit `1.0.0` is only available as beta/RC prereleases, so it is not eligible for this stable-only task.

No override was tested or added because no candidate satisfies the compatibility policy before testing. Passing tests cannot retroactively make an out-of-range override a supported dependency contract.

## Future remediation path

Upgrade Drizzle Kit when a stable release removes `@esbuild-kit/esm-loader`/`@esbuild-kit/core-utils` or updates the nested esbuild range to a patched compatible version. Re-run `db:generate`, compare generated output, and execute the full release validation before merging that upgrade.

