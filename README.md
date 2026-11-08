# WWII Simulation — Multi-theater historical war simulation

Bilingual English / Chinese historical war simulation platform. Battle of Midway is the first campaign module, not the product boundary.

## Features
- U.S. and Imperial Japanese command perspectives
- Time-responsive Pacific operational plot showing both carrier forces and search coverage (schematic, not to scale)
- Sector-based reconnaissance coverage (north, northeast, east, south), with selectable patrol focus and independent coverage accumulation
- Contact quality, flight-cycle status, airborne aircraft and sortie counts passed into AI staff briefings
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

Natural-language command execution calls the server-side Cloudflare Pages Function at `/api/agents`. The endpoint makes three independent MiniMax model requests in parallel. The API key remains server-side in the `MINIMAX_API_KEY` secret.

- **Order interpreter:** maps the commander's free-form instruction to one legal order from the active campaign registry.
- **Friendly staff:** evaluates only the player's known state and intelligence, then provides an assessment, recommendation, risk, and question.
- **Enemy commander:** chooses an adversarial action from its own force state and observed player activity. It does not receive the player's private force and resource values.

The older `/api/adjudicate` endpoint remains available for the manual-order fallback. Optional environment variables:

- `MINIMAX_MODEL`: model ID (defaults to `MiniMax-M3.1-Flash`)
- `MINIMAX_BASE_URL`: full Chat Completions URL (defaults to `https://api.minimax.io/v1/chat/completions`)

## Campaign-agnostic simulation architecture (v1)

The project now introduces a reusable simulation kernel in `src/engine/kernel.js`. It defines a versioned world state, validated order types, command history, simulation clock, event ledger, and separate agent memory. The shared campaign registry lives in `shared/campaigns.js`; Midway-specific combat adjudication is being moved into `src/campaigns/midway.js`. Future theaters can add their own adapters without rewriting the common agent and world-state services.

The `/api/agents` endpoint runs three distinct model roles in parallel:

1. **Order interpreter** — translates free-form commander instructions into one legal campaign order.
2. **Friendly staff** — assesses the player's known situation, uncertainty, risks, and recommendations.
3. **Enemy commander** — chooses an opposing response using only its own force state and observable activity, not the player's private state.

The browser validates the interpreted order against campaign-legal commands. Search, defensive, readiness, and hold instructions can become persistent standing orders; they continue to execute on subsequent time steps until cancelled or replaced. Each manual time advance runs another autonomous staff/enemy cycle. The deterministic campaign adapter adjudicates resource and force effects; model text does not directly set losses or rewrite world state. Agent memory, standing orders, and command events are retained in the local campaign state. The original button controls are collapsed under a manual fallback section.

This is the first working migration slice, not yet a complete multi-theater engine. Historical milestones remain reference reports only; they no longer force carrier losses in the live simulation. Further work is to move the remaining Midway player-order rules into the campaign adapter, expand the event scheduler, and make campaign modules plug into the same continuous decision loop.
