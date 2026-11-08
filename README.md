# World War II Simulation

Bilingual historical world simulation beginning with the origins of World War II (1918–1939). Midway is a campaign module, not the product's main structure.

## Architecture
- `src/engine/`: shared simulation kernel and player identity progression.
- `shared/history.js`: global chronology and historical figure dossiers.
- `shared/missions.js`: career mission chapters from 1919 to 1939.
- `functions/api/character.js`: MiniMax-powered historical character roleplay, bounded by year and figure knowledge.
- `src/campaigns/midway/`: Midway campaign UI, rules, manifest and styling.
- `functions/api/campaigns/midway/`: campaign-specific AI command/adjudication endpoints.

## Player story
Create a fictional historical participant in diplomacy, journalism, intelligence, military liaison or industry. Progress from probationary liaison toward intelligence and special operations roles through training, AI-adjudicated assignments, relationships and chapter advancement from 1919 to 1939. Individual historical figures keep isolated memories and affinity scores. A codename is granted after sufficient progression. Public historical events remain grounded; the player's private story can branch.

## Character simulation
Historical figures have biographies, offices, political positions, personalities, first active years and knowledge horizons. The model must not use future knowledge or assign later offices early. Dialogues are clearly labeled AI roleplay, not authentic transcripts.

## Development
`npm install`, `npm run dev`, `npm run build`.

## Historical character model

- Browser requests use `POST /api/character`; the model key never enters the browser bundle.
- `MINIMAX_API_KEY` is a Cloudflare Pages production secret.
- Default China-region OpenAI-compatible endpoint: `https://api.minimaxi.com/v1/chat/completions`.
- Set optional `MINIMAX_BASE_URL` to the full Chat Completions URL when using another region (for example `https://api.minimax.io/v1/chat/completions`).
- Set optional `MINIMAX_MODEL` to a model available to the key; default is `MiniMax-M3.1-Flash`.
- `GET /api/character` reports whether the runtime has the key configured without exposing it.
- Each historical figure receives their own profile, agenda, year-specific role, event context, relationship score and isolated memory. The model generates dialogue and leads; the client applies validated relationship and career changes.
- The UI checks the runtime connection before a live audience. A missing key or provider error does not grant experience or relationship changes.
