import { formatEvaluation, formatMoveDisplay } from "../../engine/analysis";
import type { AnalysisResult, MoveNotation } from "../../shared/types";

interface MoveDisplayProps {
  loading?: boolean;
  analysis: AnalysisResult | null;
  notation: MoveNotation;
}

export function MoveDisplay({ loading, analysis, notation }: MoveDisplayProps) {
  const moveText = loading
    ? "Calculating best move"
    : formatMoveDisplay(analysis?.bestMove, notation);

  return (
    <div className="glass-panel move-panel">
      <div className="move-label">Next best move</div>
      <div className="move-value" aria-live="polite">{moveText}</div>
      {!loading && analysis && (
        <div className="move-meta">
          <span>Evaluation {formatEvaluation(analysis.evaluation)}</span>
          {analysis.depth ? <span>Depth {analysis.depth}</span> : null}
        </div>
      )}
    </div>
  );
}
