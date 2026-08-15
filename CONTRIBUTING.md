# Contributing to Time Shield

Thanks for considering contributing! Time Shield is a local-first, privacy-first Chrome
extension. Every contribution — code, translations, docs, bug reports — helps.

## Code of conduct

Be respectful and constructive. This is a small open-source project; assume good intent.

## Getting started

Requires **Node.js v22+** (see `.nvmrc`).

```bash
npm install        # install dependencies
npm run dev        # dev mode with hot reload
npm test           # run the test suite (vitest)
npm run lint       # biome check
npm run build      # production build → dist/
```

### Project layout

```
src/background/   Service worker: tracker (pure logic) + thin Chrome wiring
src/popup/        Popup UI
src/options/      Options page
src/components/   Shared UI components
src/utils/        Pure helpers (time, matching, storage) — Chrome-API free
src/types/        Shared TypeScript types
public/           Manifest, locales (_locales), static assets
```

## Guidelines

- **Keep the core testable.** Put logic in pure modules (no direct `chrome.*` calls) and
  write Vitest tests for it. Wiring (`chrome.*` listeners) stays thin.
- **Follow existing conventions.** TypeScript strict, Biome for lint/format, Tailwind for
  styling, i18n via `src/i18n.ts` + `public/_locales/*/messages.json`.
- **No comments unless they explain "why".** Match the surrounding style.
- **Tests must pass.** Run `npm test`, `npm run lint`, and `npm run build` before pushing.

## Making changes

1. Fork the repo and create a branch: `git checkout -b feat/my-change`.
2. Make your change with tests.
3. Run the checks above.
4. Open a pull request. Reference the issue it fixes, if any.

## Releases

- Versions follow [SemVer](https://semver.org/).
- Update `CHANGELOG.md` under "Unreleased".
- Maintainers tag releases as `vX.Y.Z`; CI builds and packages the extension zip.
- The version in `public/manifest.json` must match the tagged version.

## Translations

Add or update strings in `public/_locales/en/messages.json` and mirror them in every other
locale file. Prefer English as the source of truth.

## Reporting bugs / requesting features

Use the issue templates: [bug report](.github/ISSUE_TEMPLATE/bug_report.yml) and
[feature request](.github/ISSUE_TEMPLATE/feature_request.yml).