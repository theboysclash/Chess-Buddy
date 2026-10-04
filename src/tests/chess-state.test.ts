import { describe, expect, it } from "vitest";
import { buildTabState } from "../content/chess-state";

const site = {
  id: "local-test",
  name: "Local",
  hostname: "localhost",
  supported: true,
  boardDetected: true,
  automationAvailable: true,
  enabled: true,
};

describe("buildTabState", () => {
  it("marks unsupported sites", () => {
    const state = buildTabState({
      site: { ...site, supported: false },
      position: null,
      isOurTurn: false,
      autoPlay: false,
    });
    expect(state.buddyState).toBe("UNSUPPORTED");
  });

  it("marks waiting when not our turn", () => {
    const state = buildTabState({
      site,
      position: {
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        turn: "w",
        isGameOver: false,
      },
      isOurTurn: false,
      autoPlay: false,
    });
    expect(state.buddyState).toBe("WAITING");
  });
});
