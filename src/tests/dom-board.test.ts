import { describe, expect, it } from "vitest";
import { normalizeFen, piecesToFen } from "../content/dom-board";

const START =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("dom-board", () => {
  it("normalizes valid FEN", () => {
    expect(normalizeFen(START)).toBe(START);
  });

  it("builds FEN from piece list", () => {
    const pieces = [
      { square: "a1", fenChar: "R" },
      { square: "e1", fenChar: "K" },
      { square: "a8", fenChar: "r" },
      { square: "e8", fenChar: "k" },
    ];
    const fen = piecesToFen(pieces, "w");
    expect(fen).toContain("R");
    expect(fen).toContain("k");
  });
});
