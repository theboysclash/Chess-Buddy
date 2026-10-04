import { formatEvaluation, formatMoveDisplay } from "../../engine/analysis";
import type { AnalysisResult, MoveNotation } from "../../shared/types";

interface MoveDisplayProps {
  loading?: boolean;
  analysis: AnalysisResult | null;
  notation: MoveNotation;
  topMovesCount: 1 | 2 | 3;
}

export function MoveDisplay({ loading, analysis, notation, topMovesCount }: MoveDisplayProps) {
  const ranked =
    analysis?.rankedMoves?.slice(0, topMovesCount) ??
    (analysis?.bestMove
      ? [
          {
            rank: 1,
            move: analysis.bestMove,
            evaluation: analysis.evaluation,
            san: analysis.san,
          },
        ]
      : []);

  const showList = topMovesCount > 1 && ranked.length > 1;

  return (
    <div className="glass-panel move-panel">
      <div className="move-label">
        {topMovesCount > 1 ? "Top moves" : "Next best move"}
      </div>

      {loading ? (
        <div className="move-value move-value-loading" aria-live="polite">
          Analyzing position
        </div>
      ) : showList ? (
        <ol className="move-ranked-list" aria-live="polite">
          {ranked.map((line) => (
            <li key={`${line.rank}-${line.move.from}-${line.move.to}`}>
              <span className="move-ranked-index">{line.rank}</span>
              <span className="move-ranked-san">
                {formatMoveDisplay(line.move, notation)}
              </span>
              <span className="move-ranked-eval">{formatEvaluation(line.evaluation)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="move-value" aria-live="polite">
          {formatMoveDisplay(analysis?.bestMove, notation)}
        </div>
      )}

      {!loading && analysis && (
        <div className="move-meta">
          <span>Evaluation {formatEvaluation(analysis.evaluation)}</span>
          {analysis.depth ? <span>Depth {analysis.depth}</span> : null}
        </div>
      )}
    </div>
  );
}
