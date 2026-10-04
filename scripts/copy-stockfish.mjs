import { copyFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "../node_modules/stockfish/src");
const out = join(root, "../public/vendor");
mkdirSync(out, { recursive: true });
copyFileSync(join(src, "stockfish-nnue-16-single.js"), join(out, "stockfish-nnue-16-single.js"));
copyFileSync(join(src, "stockfish-nnue-16-single.wasm"), join(out, "stockfish-nnue-16-single.wasm"));
console.log("Stockfish assets copied to public/vendor");
