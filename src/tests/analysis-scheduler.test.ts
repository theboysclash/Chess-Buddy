import { describe, expect, it } from "vitest";
import { positionKey } from "../content/analysis-scheduler";

describe("positionKey", () => {
  it("ignores halfmove clock differences", () => {
    const a =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    const b =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 2";
    expect(positionKey(a)).toBe(positionKey(b));
  });
});
