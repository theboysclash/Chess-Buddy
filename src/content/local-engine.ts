import { mergeAnalysisResult } from "../engine/analysis";
import { getEngineSettingsForStrength } from "../engine/difficulty";
import { StockfishWorkerEngine } from "../engine/stockfish-engine";
import type { AnalysisResult, UserSettings } from "../shared/types";

let engine: StockfishWorkerEngine | null = null;

async function getEngine(): Promise<StockfishWorkerEngine> {
  if (!engine) engine = new StockfishWorkerEngine();
  await engine.initialize();
  return engine;
}

export async function analyzeInPage(
  fen: string,
  settings: UserSettings,
): Promise<AnalysisResult> {
  const instance = await getEngine();
  const result = await instance.analyze(
    { fen, turn: fen.includes(" w ") ? "w" : "b", isGameOver: false },
    {
      strength: settings.strength,
      engine: getEngineSettingsForStrength(settings.strength, settings.engineSettings),
      topMovesCount: settings.topMovesCount,
    },
  );
  return mergeAnalysisResult(fen, result);
}

export async function stopAnalysis(): Promise<void> {
  await engine?.stop();
}
