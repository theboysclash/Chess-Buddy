import type { SiteAdapter } from "./base-adapter";
import type { ChessMove, ChessPosition, SiteInfo } from "../../shared/types";
import {
  clickSquare,
  collectPieces,
  findBoardElement,
  piecesToFen,
  readBoardFen,
} from "../dom-board";
import {
  executeChessComMoveViaPage,
  getChessComMainWorldFen,
  requestChessComFen,
  subscribeChessComFen,
} from "../chess-com-bridge";

export class ChessComAdapter implements SiteAdapter {
  id = "chesscom";

  matches(hostname: string): boolean {
    return hostname === "chess.com" || hostname.endsWith(".chess.com");
  }

  detectBoard(): boolean {
    return Boolean(findBoardElement());
  }

  private board(): HTMLElement | null {
    return findBoardElement();
  }

  getSiteInfo(): SiteInfo {
    const detected = this.detectBoard();
    return {
      id: this.id,
      name: "Chess.com",
      hostname: location.hostname,
      supported: detected,
      boardDetected: detected,
      automationAvailable: detected,
      enabled: true,
    };
  }

  getPosition(): ChessPosition | null {
    const board = this.board();
    if (!board) return null;

    const mainWorldFen = getChessComMainWorldFen();
    const apiFen = mainWorldFen ?? readBoardFen(board);
    const turn = this.readTurn();
    const fen =
      apiFen ??
      piecesToFen(collectPieces(board), turn);

    if (!fen) return null;

    const gameOver = this.isGameOver();
    return {
      fen,
      turn: fen.includes(" w ") ? "w" : "b",
      isGameOver: gameOver,
      result: gameOver ? "complete" : undefined,
    };
  }

  isOurTurn(): boolean {
    if (this.isGameOver()) return false;
    const bottomClock =
      document.querySelector(".clock-bottom.clock-player-turn") ??
      document.querySelector(".clock-bottom .clock-player-turn") ??
      document.querySelector("#board-layout-player-bottom .clock-player-turn") ??
      document.querySelector(".player-bottom .clock-player-turn");
    if (bottomClock) return true;

    const topClock =
      document.querySelector(".clock-top.clock-player-turn") ??
      document.querySelector("#board-layout-player-top .clock-player-turn");
    if (topClock) return false;

    const board = this.board();
    if (!board) return false;
    const turn = this.readTurn();
    const playingWhite = !board.classList.contains("flipped");
    return playingWhite ? turn === "w" : turn === "b";
  }

  canAutomate(): boolean {
    return this.detectBoard();
  }

  async executeMove(move: ChessMove): Promise<boolean> {
    const pageOk = await executeChessComMoveViaPage(move);
    if (pageOk) return true;

    const board = this.board();
    if (!board) return false;
    const fromOk = clickSquare(board, move.from);
    if (!fromOk) return false;
    await delay(80);
    return clickSquare(board, move.to);
  }

  onBoardChange(callback: (position: ChessPosition | null) => void): () => void {
    const board = this.board();
    let lastFen: string | null = null;
    let debounce: ReturnType<typeof setTimeout> | null = null;

    const emitIfChanged = () => {
      const position = this.getPosition();
      const fen = position?.fen ?? null;
      if (fen === lastFen) return;
      lastFen = fen;
      callback(position);
    };

    const schedule = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(emitIfChanged, 300);
    };

    const observer = new MutationObserver(schedule);
    if (board) {
      const root = board.shadowRoot ?? board;
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "data-fen"],
      });
    }
    emitIfChanged();
    const interval = window.setInterval(emitIfChanged, 2500);
    requestChessComFen();
    const unsubFen = subscribeChessComFen(() => schedule());
    return () => {
      observer.disconnect();
      if (debounce) clearTimeout(debounce);
      window.clearInterval(interval);
      unsubFen();
    };
  }

  private readTurn(): "w" | "b" {
    const whiteTurn =
      document.querySelector(".clock-white.clock-player-turn") ??
      document.querySelector('.icon-font-chess[data-color="w"].clock-player-turn');
    if (whiteTurn) return "w";
    const blackTurn =
      document.querySelector(".clock-black.clock-player-turn") ??
      document.querySelector('.icon-font-chess[data-color="b"].clock-player-turn');
    if (blackTurn) return "b";

    const moveList = document.querySelectorAll(".move-text-component, .node-highlight-content");
    if (moveList.length % 2 === 1) return "b";
    return "w";
  }

  private isGameOver(): boolean {
    return Boolean(
      document.querySelector(".game-over-modal-component") ??
        document.querySelector(".game-result") ??
        document.querySelector('[data-cy="game-over"]'),
    );
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
