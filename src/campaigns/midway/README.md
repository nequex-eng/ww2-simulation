# Battle of Midway Campaign Module

This directory contains all Midway-specific browser code and configuration:
- `main.js` — campaign UI and client interaction
- `styles.css` — campaign-only styles
- `rules.js` — deterministic Midway adjudication rules
- `manifest.js` — campaign metadata and legal order registry

The matching Cloudflare Pages Functions are in `functions/api/campaigns/midway/`.
The global WWII entry point must not import Midway rules or state directly; it loads this module only when the player enters the campaign.
