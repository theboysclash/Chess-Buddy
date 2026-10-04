import type { UserSettings } from "../shared/types";
import { analyzeInPage } from "./local-engine";
import { normalizeFen } from "./dom-board";
import { logger } from "../shared/logger";

/** Board + side to move — ignore clock/halfmove churn from Chess.com. */
export function positionKey(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  const board = parts[0] ?? "";
  const turn = parts[1] === "b" ? "b" : "w";
  return `${board}|${turn}`;
}

const RETRY_COOLDOWN_MS = 12_000;
const DEBOUNCE_MS = 400;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;
let generation = 0;
let lastSuccessKey: string | null = null;
let lastErrorKey: string | null = null;
let lastErrorAt = 0;
let pendingKey: string | null = null;
let pendingFen: string | null = null;

export function resetAnalysisScheduler(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  lastSuccessKey = null;
  lastErrorKey = null;
  lastErrorAt = 0;
  pendingKey = null;
  pendingFen = null;
  generation++;
  inFlight = false;
}

export function shouldScheduleAnalysis(fen: string, settings: UserSettings): boolean {
  if (!settings.autoAnalyze) return false;
  const key = positionKey(fen);
  if (inFlight && pendingKey === key) return false;
  if (key === lastSuccessKey) return false;
  if (key === lastErrorKey && Date.now() - lastErrorAt < RETRY_COOLDOWN_MS) return false;
  return true;
}

export function scheduleAnalysis(
  fen: string,
  settings: UserSettings,
  onPhase: (phase: "start" | "success" | "error", payload?: unknown) => void,
): void {
  const key = positionKey(fen);
  pendingKey = key;
  pendingFen = fen;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (!pendingFen || !shouldScheduleAnalysis(pendingFen, settings)) return;
    void run(pendingFen, key, settings, onPhase);
  }, DEBOUNCE_MS);
}

async function run(
  fen: string,
  key: string,
  settings: UserSettings,
  onPhase: (phase: "start" | "success" | "error", payload?: unknown) => void,
): Promise<void> {
  if (inFlight) {
    pendingFen = fen;
    pendingKey = key;
    return;
  }

  inFlight = true;
  const gen = ++generation;
  onPhase("start");

  const validFen = normalizeFen(fen);
  if (!validFen) {
    inFlight = false;
    lastErrorKey = key;
    lastErrorAt = Date.now();
    onPhase("error", new Error("Invalid position"));
    return;
  }

  try {
    const result = await analyzeInPage(validFen, settings);
    if (gen !== generation) return;
    lastSuccessKey = key;
    lastErrorKey = null;
    onPhase("success", result);
  } catch (error) {
    if (gen !== generation) return;
    logger.error("Analysis failed", error);
    lastErrorKey = key;
    lastErrorAt = Date.now();
    onPhase("error", error);
  } finally {
    inFlight = false;
    if (pendingFen && pendingKey && pendingKey !== lastSuccessKey) {
      const nextFen = pendingFen;
      const nextKey = pendingKey;
      if (shouldScheduleAnalysis(nextFen, settings)) {
        void run(nextFen, nextKey, settings, onPhase);
      }
    }
  }
}

export function forceAnalysis(
  fen: string,
  settings: UserSettings,
  onPhase: (phase: "start" | "success" | "error", payload?: unknown) => void,
): void {
  lastSuccessKey = null;
  lastErrorKey = null;
  generation++;
  scheduleAnalysis(fen, settings, onPhase);
}
