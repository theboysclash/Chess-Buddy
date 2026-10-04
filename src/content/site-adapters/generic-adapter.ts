import type { SiteAdapter } from "./base-adapter";
import type { ChessPosition, SiteInfo } from "../../shared/types";

/** Fallback adapter: reports unsupported unless a data attribute is present. */
export class GenericAdapter implements SiteAdapter {
  id = "generic";

  matches(): boolean {
    return true;
  }

  detectBoard(): boolean {
    const el = document.querySelector("[data-chess-buddy-fen]");
    return Boolean(el);
  }

  getSiteInfo(): SiteInfo {
    const supported = this.detectBoard();
    return {
      id: this.id,
      name: location.hostname,
      hostname: location.hostname,
      supported,
      boardDetected: supported,
      automationAvailable: false,
      enabled: true,
    };
  }

  getPosition(): ChessPosition | null {
    const el = document.querySelector("[data-chess-buddy-fen]");
    const fen = el?.getAttribute("data-chess-buddy-fen");
    if (!fen) return null;
    return {
      fen,
      turn: fen.includes(" w ") ? "w" : "b",
      isGameOver: false,
    };
  }

  isOurTurn(): boolean {
    const el = document.querySelector("[data-chess-buddy-our-turn]");
    return el?.getAttribute("data-chess-buddy-our-turn") === "true";
  }

  canAutomate(): boolean {
    return false;
  }

  async executeMove(): Promise<boolean> {
    return false;
  }

  onBoardChange(callback: (position: ChessPosition | null) => void): () => void {
    const observer = new MutationObserver(() => callback(this.getPosition()));
    observer.observe(document.body, { subtree: true, attributes: true, childList: true });
    callback(this.getPosition());
    return () => observer.disconnect();
  }
}
