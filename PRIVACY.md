# Time Shield Privacy Policy

**Effective date:** 2026-08-17

This privacy policy applies to the Time Shield browser extension ("the extension") for
Google Chrome. Time Shield is developed and maintained by VASHvic.

## Short version

Time Shield is **local-first and privacy-first**. Everything the extension does happens on
your device. It does **not** collect, transmit, or sell any of your data.

## What the extension does

Time Shield helps you limit how much time you spend on websites you choose. It:

- Tracks how long you spend on websites you add to your restricted list.
- Shows a countdown / remaining-time badge.
- Blocks a restricted website once your daily limit is reached (with an optional
  "5 more minutes" grace).
- Lets you pause enforcement or lock your limits for the rest of the day.

## Data we collect and store

**We collect nothing.**

All data is stored **locally in your browser** using Chrome's `storage.local` API:

- The list of websites you restrict.
- Your daily time limit and the time remaining today.
- Time spent per site (today and total).
- Transient state needed to track an active session across browser restarts.

None of this data is ever transmitted. There are no servers, no analytics, no tracking, and
no third-party SDKs.

## Permissions

The extension uses the minimum Chrome permissions needed to do its job:

- `storage` — to save your settings and usage locally.
- `tabs` — to read the URL of the active tab so it knows which site you are on.
- `alarms` — to check the timer periodically, even in the background.
- `windows` — to pause tracking when you switch away from the browser.
- `scripting` — to show the block overlay on a restricted site.

Permission requests appear in Chrome's extension detail page and are limited to what the
extension needs.

## What we do NOT do

- No account, login, or registration.
- No cloud sync (today). Usage never leaves your device.
- No advertising or data selling.
- No fingerprinting.
- No background phone-home.

## Donations

If you choose to donate (for example via Ko-fi or Bitcoin), the only information
you share is whatever the payment method itself requires. Donations are processed by those
third parties under their own privacy policies; Time Shield itself never sees or stores
payment details.

## Changes to this policy

If this policy changes, the "Effective date" at the top of this page will be updated.
Material changes will be announced in the extension's release notes.

## Contact

Questions about this policy or the extension can be sent to:

- GitHub: [VASHvic/time-shield](https://github.com/VASHvic/time-shield) (open an issue)
- Email: [timeshield@example.com](mailto:timeshield@example.com)

---

*Last reviewed: 2026-08-17.*