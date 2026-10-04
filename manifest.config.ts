import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Chess Buddy",
  version: "1.0.0",
  description:
    "Analyze chess positions and find the best move with a polished, local-first assistant.",
  action: {
    default_popup: "src/popup/index.html",
    default_title: "Chess Buddy",
  },
  options_page: "src/options/index.html",
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  icons: {
    "16": "public/icons/icon-16.png",
    "32": "public/icons/icon-32.png",
    "48": "public/icons/icon-48.png",
    "128": "public/icons/icon-128.png",
  },
  permissions: ["storage", "activeTab"],
  host_permissions: ["http://localhost/*", "https://localhost/*"],
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/content.ts"],
      run_at: "document_idle",
    },
  ],
  web_accessible_resources: [
    {
      resources: [
        "vendor/stockfish-nnue-16-single.js",
        "vendor/stockfish-nnue-16-single.wasm",
        "test-board.html",
      ],
      matches: ["<all_urls>"],
    },
  ],
});
