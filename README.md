# World War II Simulation

Bilingual historical world simulation beginning with the origins of World War II (1918–1939). Midway is a campaign module, not the product's main structure.

## Architecture
- `src/engine/`: shared simulation kernel and player identity progression.
- `shared/history.js`: global chronology and historical figure dossiers.
- `functions/api/character.js`: MiniMax-powered historical character roleplay, bounded by year and figure knowledge.
- `src/campaigns/midway/`: Midway campaign UI, rules, manifest and styling.
- `functions/api/campaigns/midway/`: campaign-specific AI command/adjudication endpoints.

## Player story
Create a fictional historical participant in diplomacy, journalism, intelligence, military liaison or industry. Progress from probationary liaison toward intelligence and special operations roles through induction exercises, assignments and relationships. A codename is granted after sufficient progression. Public historical events remain grounded; the player's private story can branch.

## Character simulation
Historical figures have biographies, offices, political positions, personalities, first active years and knowledge horizons. The model must not use future knowledge or assign later offices early. Dialogues are clearly labeled AI roleplay, not authentic transcripts.

## Development
`npm install`, `npm run dev`, `npm run build`.
