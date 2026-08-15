# Time Shield — From Hobby to Product: Plan

## Positioning (decided)

- **Local-first, privacy-first, open source** — "Your screen-time data never leaves your device."
- Differentiator vs StayFocusd/Freedom/Opal.
- Freemium later: insights stay free; cross-device sync is the natural paid tier.
- Chrome first, port to Firefox/Edge later.
- **Single shared global daily limit** across all restricted sites (per-site limits were tried and reverted — see "Product model decisions" below).

---

## Strategy, monetization & launch decisions (recorded)

**Product model (decided 2026-08):**
- Reverted to a **single shared global daily limit**. All restricted sites draw from one pool (`remainingTime`), which resets at midnight. Per-site limits/budgets were removed (confusing overlap, `min(site, global)` semantics).
- Per-site usage stats (today/total) remain visible in the popup — only the *limits* are global.

**Monetization (decided 2026-08):**
- **Launch free (freemium baseline).** No paywall at launch.
- **Donations are the near-term funding mechanism:** Ko-fi + a public Bitcoin address in the README/DONATIONS. (GitHub Sponsors rejected by owner — prefers Ko-fi/Bitcoin.)
- **Paid features come later, only if** the free tier gains traction and donations don't sustain it. Candidate paid tiers (keep data layer ready without rewrite): cross-device sync, insights/statistics dashboard, schedule-based blocking, categories, dark mode. See Phase 5.4.
- Do NOT design paid gating into the code now — keep it clean and free.

**Repository (decided 2026-08):**
- **Keep the repo public, MIT, open source** while there are ~0 users. It builds trust (privacy story), invites contributions/bug reports, and doubles as a portfolio piece.
- Revisit **open-core** (free tier OSS, paid tier closed) only if/when there are real users and a paid tier launches.

**Launch blockers (from Phase 4):**
- [ ] Privacy policy hosted (see `PRIVACY.md`) — required by Chrome Web Store even with zero data collection
- [ ] Ko-fi page created + real Bitcoin address in `DONATIONS.md` / `FUNDING.yml`
- [ ] Real author email in `public/manifest.json` (currently `timeshield@example.com`)
- [ ] Store listing assets (screenshots 1280×800, promo tile 440×280, icons)
- [ ] `unlimitedStorage` permission before shipping usage history (Phase 2.2)

---

## Current state (verified in code)

**What works:** MV3 + Vite/React/Tailwind stack, daily timer with badge, block-page on limit, local storage, lock feature UI.

**Real bugs found:**
1. `updateCurrentTimer()` resets budget to full on every popup save (`src/background/index.ts:294-306`).
2. Time accounting adds fixed +10s per alarm tick (`src/background/index.ts:271-276`) — loses time when SW sleeps/tab backgrounded.
3. Lock never unlocks at midnight while browser stays open (`isNewDay` only checked in `runBackground()`).
4. URL matching is substring-based (`src/background/index.ts:208`) + popup strips TLDs (`src/popup/Popup.tsx` `getUrl`) — blocks wrong sites.
5. Block page destroys the page DOM (`src/content/content.ts`) — breaks SPAs, no grace/bypass.
6. README promises notifications that don't exist.
7. `setTimeout` ping unreliable in MV3; no tests, no CI, no web store assets; options page is a placeholder; single global daily limit.
  8. When adding a 5 minute snooze, the reminder never comes back if you stay in the same screen.

> ⚠️ **NO TESTING EXISTS.** Zero test files, no test framework installed, no CI. Every bug above went to production unnoticed. Tests must be added before scaling — see Phase 1.5/4.

> ⚠️ **MONOLITH:** `src/background/index.ts` is one 370-line module mixing state, timer logic, storage, badge updates, and Chrome event wiring. Refactor for modularity before adding features — see Phase 1.5.

**Strengths to build on:** privacy-first (all local), clean stack, permission-light, MIT open source.

---

## Phase 1 — Make it trustworthy (the "trust" layer)

- [x] 1.1 Timestamp-based time accounting: store `activeSinceTs`, compute elapsed wall-clock time on alarm/focus/tab events instead of +10s ticks
- [x] 1.2 Persist `activeSinceTs` on suspend/focus-loss; clamp on SW restart
- [x] 1.3 Fix `updateCurrentTimer()` reset bug — read saved `remainingTime`, never overwrite with full budget
- [x] 1.4 Clamp remaining ≥ 0; stop subtracting past zero (done in tracker: `Math.max(0, ...)` in tick/endSession/setRemaining)
- [x] 1.5 Midnight rollover on alarm tick: check `isNewDay`, auto-unlock lock, reset per-day data, clear badge
- [x] 1.6 Hostname-only URL matching with wildcards (`*.youtube.com`); remove `includes()` on full URL (done in 1.5.2)
- [x] 1.7 Decide: simple hostname matching vs bundled Public Suffix List (start simple)
- [x] 1.8 Non-destructive block overlay: fixed-position layer, no DOM wipe
- [x] 1.9 "Give me 5 more minutes" grace option on block screen
- [x] 1.10 Guard against duplicate overlay injection (per-tab state)
- [x] 1.11 ~~Real notifications: warnings at 50/75/90%, limit reached~~ (cancelled — removed from README, not planned)
- [x] 1.12 Logging utility (levels, disabled in production); strip console noise

## Phase 1.5 — Modular refactor (before feature work)

Split the background monolith so logic is pure, testable, and Chrome-API-free where possible.

- [x] 1.5.1 Split `src/background/index.ts`: extract tracking engine (state, settle, tick) into `src/background/tracker.ts`
- [x] 1.5.2 Extract URL matching into `src/utils/matching.ts` (pure functions — also enables 1.6)
- [x] 1.5.3 Extract badge helpers (`src/background/badge.ts`); keep UI logic out of tracker
- [x] 1.5.4 Extract message API into shared typed module (`src/messages.ts`) used by popup + background
- [x] 1.5.5 Extract storage key builders + schema into single source in `src/utils/storage.ts`
- [x] 1.5.6 Set up Vitest now (test-as-you-refactor: each extracted module gets tests immediately)
- [x] 1.5.7 Keep `src/background/index.ts` as thin wiring only (event listeners → services)
- [x] 1.5.8 Extract popup logic (site add/normalize, badge) into hooks/utils shared with options

## Phase 2 — Product model: per-site budgets + categories

- [ ] 2.1 Data schema v2 with migration from v1 (namespaced keys: `usage:site:date`, `ts:` prefix)
- [x] 2.2 Add `unlimitedStorage` permission to manifest
- [x] 2.3 ~~Per-site limits + optional global cap~~ — **superseded:** per-site limits removed (2026-08), single shared global daily limit only
- [ ] 2.4 Site groups/categories (Social / News / Entertainment) with per-group budgets
- [x] 2.5 Onboarding: guided setup on first run, quick-add current tab, site suggestions
- [x] 2.6 Popup redesign: per-site progress bars, green→yellow→red colors
- [x] 2.7 Pause/snooze (15m / 1h / until tomorrow)
- [ ] 2.8 Schedule support (block windows, e.g., work hours)

## Phase 3 — Insights & retention

- [ ] 3.1 Local usage history (90-day default, configurable)
- [ ] 3.2 Dashboard in options page with charts (recharts)
- [ ] 3.3 Weekly summary ("Last week: 4h on YouTube")
- [ ] 3.4 Streak counter (days under budget)
- [ ] 3.5 CSV/JSON export
- [ ] 3.6 Dark mode
- [ ] 3.7 i18n (English + Spanish first)
- [ ] 3.8 Real settings page content

## Phase 4 — Quality, distribution, multi-browser

> Full test suite (extends Phase 1.5 test-as-you-refactor):
- [ ] 4.1 Vitest unit tests: time utils, URL matching, storage, migration
- [ ] 4.2 Mocked-chrome background/service-worker logic tests
- [ ] 4.3 React component tests (RTL)
- [ ] 4.4 GitHub Actions CI: lint → typecheck → test → build → zip release (scaffold done, mark [x] once first green run passes)
- [ ] 4.5 Chrome Web Store dev account + listing assets (screenshots, promo tiles)
- [ ] 4.6 Privacy policy page (for store review) — draft in `PRIVACY.md`, host on GitHub Pages
- [ ] 4.7 Publish to Chrome Web Store
- [ ] 4.8 Port prep: `webextension-polyfill` boundary + per-browser manifest build
- [ ] 4.9 CHANGELOG, versioning, release notes
- [ ] 4.10 Donations live: Ko-fi page + Bitcoin address published

## Phase 5 — Growth

- [ ] 5.1 Landing page + docs site
- [ ] 5.2 GitHub community: issue templates, contributing guide
- [ ] 5.3 Opt-in, privacy-respecting usage metrics with clear consent
- [ ] 5.4 Freemium design: data layer ready for paid tier (cross-device sync) without rewrite
- [ ] 5.5 Firefox + Edge publishing

---

## Success metrics

- **Stability:** zero critical bugs in production
- **Accuracy:** timer within 1 second of wall clock
- **Activation:** ≥ 2 sites configured in first session
- **Retention:** 7-day retention trending up
- **Code quality:** lint/typecheck/tests green in CI on every PR

## Key files to touch

| Area | Files |
|---|---|
| Tracking core, rollover, per-site logic | `src/background/index.ts`, `src/background/tracker.ts` |
| Time helpers, elapsed windows | `src/utils/time.ts` |
| URL matching (pure) | `src/utils/matching.ts` |
| Namespaced data access + migration | `src/utils/storage.ts` |
| Message API (shared) | `src/messages.ts` |
| New schema types | `src/types/index.ts` |
| Block overlay rewrite | `src/content/content.ts` |
| New UX | `src/popup/Popup.tsx`, `src/components/SiteCard.tsx` |
| Dashboard/settings | `src/options/Options.tsx` |
| Manifest | `public/manifest.json` |
| Store/repo docs | `PRIVACY.md`, `DONATIONS.md`, `FUNDING.yml`, `.github/workflows/ci.yml` |

## Open decisions

- [ ] PSL (Public Suffix List) vs simple hostname matching
- [ ] History retention default (90 days?)
- [ ] Block default: hard block (current) vs nudge — grace confirmed
- [ ] Ko-fi username (need to create page)
- [ ] Bitcoin address to publish (need to generate/provide one)
- [ ] Real author email for `manifest.json` + CWS account
- [ ] Privacy policy hosting (GitHub Pages vs. custom domain)
