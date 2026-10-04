import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        offscreen: resolve(__dirname, "src/offscreen/offscreen.html"),
      },
    },
  },
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["stockfish"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/tests/setup.ts"],
    include: ["src/tests/**/*.test.ts"],
  },
});
