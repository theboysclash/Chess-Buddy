import type { AnalysisResult, AnalysisSettings, ChessPosition } from "../shared/types";

export interface ChessEngine {
  initialize(): Promise<void>;
  analyze(position: ChessPosition, settings: AnalysisSettings): Promise<AnalysisResult>;
  stop(): Promise<void>;
  dispose(): Promise<void>;
}
