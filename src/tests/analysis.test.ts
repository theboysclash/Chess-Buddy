import { describe, expect, it } from "vitest";
import {
  enrichMoveWithSan,
  fenToPosition,
  formatEvaluation,
  isGameOverFen,
  uciToMove,
} from "../engine/analysis";

const START =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("analysis helpers", () => {
  it("parses valid FEN", () => {
    expect(fenToPosition(START).valid).toBe(true);
    expect(fenToPosition(START).turn).toBe("w");
  });

  it("parses UCI moves", () => {
    expect(uciToMove("e2e4")).toEqual({ from: "e2", to: "e4", uci: "e2e4" });
  });

  it("enriches SAN", () => {
    const move = enrichMoveWithSan(START, { from: "e2", to: "e4" });
    expect(move.san).toBe("e4");
  });

  it("formats evaluation", () => {
    expect(formatEvaluation(70)).toBe("+0.7");
  });

  it("detects game over FEN", () => {
    expect(isGameOverFen(START)).toBe(false);
  });
});
