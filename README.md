# Chess Buddy

Chess Buddy is a modern Chrome extension (Manifest V3) that analyzes the current chess position on supported pages and recommends the next best move. Analysis runs locally with Stockfish in a Web Worker.

## Install in Chrome (recommended)

The repository source **does not** include a loadable `manifest.json`. Chrome must load a **built** extension folder.

### Option A — GitHub Release (easiest)

1. Open [Releases](https://github.com/theboysclash/Chess-Buddy/releases) and download the latest **chess-buddy-chrome.zip**.
2. Unzip it to a folder (for example `chess-buddy-chrome`).
3. In Chrome, go to `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked** and choose the **unzipped folder** — the directory that directly contains `manifest.json`.

If you see *“Manifest file is missing or unreadable”*, you selected the wrong folder (often the repo root or the zip file itself). Select the unzipped build folder instead.

### Option B — Build locally

```bash
npm install
npm run package
```

This creates `chess-buddy-chrome.zip` and leaves a ready-to-load tree in `dist/`. In Chrome, **Load unpacked** → select the `dist/` folder.

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
| `npm run build` | Production build into `dist/` |
| `npm run package` | Build + zip for Chrome (`chess-buddy-chrome.zip`) |
| `npm test` | Unit tests (Vitest) |

## CI and releases

- **CI** runs on pull requests and pushes to `main` (test, build, upload artifact).
- **Release** runs on every merge to `main` and publishes a new GitHub Release with **chess-buddy-chrome.zip**.

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
