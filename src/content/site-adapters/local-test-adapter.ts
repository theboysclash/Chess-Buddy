import type { SiteAdapter } from "./base-adapter";
import type { ChessMove, ChessPosition, SiteInfo } from "../../shared/types";

export class LocalTestAdapter implements SiteAdapter {
  id = "local-test";

  matches(hostname: string): boolean {
    return hostname === "localhost" || hostname === "127.0.0.1";
  }

  detectBoard(): boolean {
    return Boolean(document.getElementById("cb-test-board"));
  }

  getSiteInfo(): SiteInfo {
    return {
      id: this.id,
      name: "Local Test Board",
      hostname: location.hostname,
      supported: true,
      boardDetected: this.detectBoard(),
      automationAvailable: true,
      enabled: true,
    };
  }

  getPosition(): ChessPosition | null {
    const fen = document.getElementById("cb-fen")?.textContent?.trim();
    if (!fen) return null;
    const turn = fen.includes(" w ") ? "w" : "b";
    const gameOver = document.getElementById("cb-game-over")?.dataset.active === "true";
    return { fen, turn, isGameOver: gameOver };
  }

  isOurTurn(): boolean {
    const el = document.getElementById("cb-our-turn");
    return el?.dataset.active === "true";
  }

  canAutomate(): boolean {
    return this.detectBoard();
  }

  async executeMove(move: ChessMove): Promise<boolean> {
    const detail = { from: move.from, to: move.to, promotion: move.promotion };
    document.dispatchEvent(new CustomEvent("chess-buddy-execute-move", { detail }));
    return true;
  }

  onBoardChange(callback: (position: ChessPosition | null) => void): () => void {
    const handler = () => callback(this.getPosition());
    const observer = new MutationObserver(handler);
    const fenEl = document.getElementById("cb-fen");
    if (fenEl) observer.observe(fenEl, { childList: true, characterData: true, subtree: true });
    document.addEventListener("chess-buddy-board-updated", handler);
    handler();
    return () => {
      observer.disconnect();
      document.removeEventListener("chess-buddy-board-updated", handler);
    };
  }
}
