import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const distDir = join(root, "dist");
const manifest = join(distDir, "manifest.json");
const output = join(root, "chess-buddy-chrome.zip");

if (!existsSync(manifest)) {
  console.error("dist/manifest.json is missing. Run: npm run build");
  process.exit(1);
}

if (existsSync(output)) {
  rmSync(output);
}

execSync(`cd "${distDir}" && zip -r "${output}" .`, { stdio: "inherit" });
console.log(`Created ${output}`);
