# Chess Buddy

Chess Buddy is a modern Chrome extension (Manifest V3) that analyzes the current chess position on supported pages and recommends the next best move. Analysis runs locally with Stockfish in a Web Worker.

## Features

- Premium compact popup with liquid-glass-inspired surfaces (light/dark)
- Playing strength slider with human-readable labels
- Auto Play with configurable move delay and safety checks
- Modular site adapters (local test board included)
- Full settings page (engine, automation, appearance, sites, advanced)
- Typed messaging between popup, background, and content scripts

## Development

```bash
npm install
node scripts/generate-icons.mjs
npm run dev
```

Load the unpacked extension from `dist/` in Chrome (`chrome://extensions` → Developer mode → Load unpacked).

### Local test board

Open `public/test-board.html` via a local server (Vite dev serves it) to test board detection, analysis, and Auto Play without a live chess site.

```bash
npm run dev
# visit the served test-board.html URL shown in the Vite output
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Build/watch extension |
| `npm run build` | Production build |
| `npm test` | Unit tests (Vitest) |

## Architecture

- `src/background` — service worker, analysis orchestration, tab state
- `src/content` — board detection, site adapters, Auto Play execution
- `src/engine` — Stockfish worker, difficulty mapping, analysis helpers
- `src/popup` — primary UI
- `src/options` — settings UI

## Permissions

- `storage` — persist user settings
- `activeTab` — interact with the active chess tab
- `host_permissions` for localhost — local test board

## Safety

Auto Play defaults to **off** and requires an explicit toggle. Automation is only enabled on adapters that declare support (currently the local test board).
