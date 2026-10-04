import { sendToBackground } from "../shared/messaging";
import type { AnalysisResult, UserSettings } from "../shared/types";

export async function analyzeInPage(
  fen: string,
  settings: UserSettings,
): Promise<AnalysisResult> {
  const response = await sendToBackground<AnalysisResult>({
    type: "ANALYZE_FEN",
    fen,
    strength: settings.strength,
    topMovesCount: settings.topMovesCount,
    engineSettings: settings.engineSettings,
  });

  if (!response.ok || !response.data) {
    throw new Error(response.error ?? "Analysis failed");
  }

  return response.data;
}

export async function stopAnalysis(): Promise<void> {
  await sendToBackground({ type: "STOP_ANALYSIS" });
}
