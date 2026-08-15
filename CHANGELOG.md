# Changelog

All notable changes to Time Shield are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Donation/support links in the Options page (Ko-fi + Bitcoin).
- CI pipeline (lint → typecheck → test → build → packaged zip on tags).
- `PRIVACY.md`, `DONATIONS.md`, `FUNDING.yml`, issue templates, contributing guide.

### Changed
- **Product model:** reverted to a single shared global daily limit across all
  restricted sites; per-site limits/budgets were removed to avoid confusion.
- Popup "Use current site" button replaced with a contextual hint row showing the
  current tab's hostname and an inline "Add" action.
- Manifest permissions trimmed (removed unused `notifications`) and future-proofed
  (`unlimitedStorage` for upcoming usage history).
- Toolchain pinned to **Node 22+** (`.nvmrc`, `engines`) — jsdom 30 fails to load on
  Node 20 in CI (`webidl.util.markAsUncloneable`), which broke the test step.

## [1.0.0] - 2025-12-06

Initial release: MV3 + Vite/React/Tailwind, daily timer with badge, block overlay with
grace ("5 more minutes"), pause/snooze, lock, per-site usage stats.

[Unreleased]: https://github.com/VASHvic/time-shield/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/VASHvic/time-shield/releases/tag/v1.0.0