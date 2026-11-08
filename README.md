# WWII Simulation — Battle of Midway

Bilingual English / Chinese historical decision simulation prototype.

## Features
- U.S. and Imperial Japanese command perspectives
- Time-responsive Pacific operational plot showing both carrier forces and search coverage (schematic, not to scale)
- Intelligence reports with confidence labels
- Command orders with state changes, time advancement, and side-specific consequences
- Separate friendly and enemy operational carrier counts, affected by strike timing, rearming vulnerability, and defensive orders
- Historical milestone intelligence from 4–7 June, displayed separately from simulated outcomes
- Local campaign persistence and restoration (browser localStorage)
- After-action comparison with the historical record

## Local development
```bash
npm install
npm run dev
npm run build
```

## Deployment
Cloudflare Pages build command: `npm run build`; output directory: `dist`.

## Historical references
- U.S. Naval History and Heritage Command — Battle of Midway: https://www.history.navy.mil/browse-by-topic/wars-conflicts-and-operations/world-war-ii/1942/midway.html
- National WWII Museum — Battle of Midway: https://www.nationalww2museum.org/war/articles/battle-midway

This remains an educational prototype, not a validated operational wargame. The map is schematic and not to scale. Historical milestones are reference events; carrier losses and command effects are simplified game mechanics, not a validated reconstruction of the battle.


## AI operations staff

The command phase calls a server-side Cloudflare Pages Function at `/api/adjudicate`. It uses the MiniMax OpenAI-compatible Chat Completions endpoint; the API key remains server-side in the `MINIMAX_API_KEY` secret. Optional environment variables:

- `MINIMAX_MODEL`: model ID (defaults to `MiniMax-M3`)
- `MINIMAX_BASE_URL`: full Chat Completions URL (defaults to `https://api.minimax.io/v1/chat/completions`)

The model generates contextual command narration and uncertain intelligence reports only. Deterministic game code remains authoritative for aircraft, fuel, readiness, time, carrier counts, and score. If the model is unavailable, the campaign continues with the built-in rule-based feedback.
