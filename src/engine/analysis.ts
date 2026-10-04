import { Chess } from "chess.js";
import type { AnalysisResult, ChessMove } from "../shared/types";

export function fenToPosition(fen: string): { valid: boolean; turn: "w" | "b" } {
  try {
    const chess = new Chess(fen);
    return { valid: true, turn: chess.turn() };
  } catch {
    return { valid: false, turn: "w" };
  }
}

export function uciToMove(uci: string): ChessMove | null {
  const match = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/i.exec(uci.trim());
  if (!match) return null;
  const promotion = match[3]?.toLowerCase() as ChessMove["promotion"] | undefined;
  return {
    from: match[1],
    to: match[2],
    promotion,
    uci: uci.toLowerCase(),
  };
}

export function enrichMoveWithSan(fen: string, move: ChessMove): ChessMove {
  try {
    const chess = new Chess(fen);
    const result = chess.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    });
    if (!result) return move;
    return { ...move, san: result.san, uci: `${move.from}${move.to}${move.promotion ?? ""}` };
  } catch {
    return move;
  }
}

export function formatMoveDisplay(
  move: ChessMove | null | undefined,
  notation: "san" | "uci" | "coordinates",
): string {
  if (!move) return "—";
  if (notation === "uci") return move.uci ?? `${move.from}${move.to}`;
  if (notation === "coordinates") return `${move.from} → ${move.to}`;
  return move.san ?? `${move.from} → ${move.to}`;
}

export function formatEvaluation(cp?: number): string {
  if (cp === undefined || Number.isNaN(cp)) return "—";
  if (Math.abs(cp) > 20000) return cp > 0 ? "Mate" : "-Mate";
  const pawns = cp / 100;
  const sign = pawns > 0 ? "+" : "";
  return `${sign}${pawns.toFixed(1)}`;
}

export function isGameOverFen(fen: string): boolean {
  try {
    const chess = new Chess(fen);
    return chess.isGameOver();
  } catch {
    return false;
  }
}

export function movesEqual(a: ChessMove, b: ChessMove): boolean {
  return (
    a.from === b.from &&
    a.to === b.to &&
    (a.promotion ?? "") === (b.promotion ?? "")
  );
}

export function parsePrincipalVariation(fen: string, uciLine: string[]): ChessMove[] {
  const moves: ChessMove[] = [];
  let currentFen = fen;
  for (const uci of uciLine) {
    const m = uciToMove(uci);
    if (!m) break;
    moves.push(enrichMoveWithSan(currentFen, m));
    try {
      const chess = new Chess(currentFen);
      chess.move({ from: m.from, to: m.to, promotion: m.promotion });
      currentFen = chess.fen();
    } catch {
      break;
    }
  }
  return moves;
}

export function mergeAnalysisResult(
  fen: string,
  partial: AnalysisResult,
): AnalysisResult {
  const enriched = enrichMoveWithSan(fen, partial.bestMove);
  const rankedMoves = partial.rankedMoves?.map((line) => {
    const move = enrichMoveWithSan(fen, line.move);
    return { ...line, move, san: move.san };
  });
  return { ...partial, bestMove: enriched, san: enriched.san, rankedMoves };
}
