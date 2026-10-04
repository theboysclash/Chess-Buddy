import { mergeAnalysisResult } from "../engine/analysis";
import { getEngineSettingsForStrength } from "../engine/difficulty";
import { StockfishWorkerEngine } from "../engine/stockfish-engine";
import type { AnalysisResult, EngineSettings } from "../shared/types";
import { logger } from "../shared/logger";

let engine: StockfishWorkerEngine | null = null;

async function getEngine(): Promise<StockfishWorkerEngine> {
  if (!engine) engine = new StockfishWorkerEngine();
  await engine.initialize();
  return engine;
}

interface OffscreenAnalyzePayload {
  fen: string;
  strength: number;
  topMovesCount: 1 | 2 | 3;
  engineSettings: EngineSettings;
}

async function analyzePosition(payload: OffscreenAnalyzePayload): Promise<AnalysisResult> {
  const instance = await getEngine();
  const result = await instance.analyze(
    { fen: payload.fen, turn: payload.fen.includes(" w ") ? "w" : "b", isGameOver: false },
    {
      strength: payload.strength,
      engine: getEngineSettingsForStrength(payload.strength, payload.engineSettings),
      topMovesCount: payload.topMovesCount,
    },
  );
  return mergeAnalysisResult(payload.fen, result);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.target !== "offscreen") return false;

  if (message.type === "OFFSCREEN_ANALYZE") {
    void analyzePosition(message as OffscreenAnalyzePayload)
      .then((result) => sendResponse({ ok: true, data: result }))
      .catch((error: unknown) => {
        logger.error("Offscreen analysis failed", error);
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Analysis failed",
        });
      });
    return true;
  }

  if (message.type === "OFFSCREEN_STOP") {
    void engine?.stop().then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});

logger.info("Offscreen engine page ready");
