import { Chess } from "chess.js";
import type { SiteAdapter } from "./base-adapter";
import type { ChessMove, ChessPosition, SiteInfo } from "../../shared/types";

/** Lichess cg-board piece parsing (analysis & live). */
export class LichessAdapter implements SiteAdapter {
  id = "lichess";

  matches(hostname: string): boolean {
    return hostname === "lichess.org" || hostname.endsWith(".lichess.org");
  }

  detectBoard(): boolean {
    return Boolean(document.querySelector(".cg-wrap, cg-board"));
  }

  getSiteInfo(): SiteInfo {
    const detected = this.detectBoard();
    return {
      id: this.id,
      name: "Lichess",
      hostname: location.hostname,
      supported: detected,
      boardDetected: detected,
      automationAvailable: detected,
      enabled: true,
    };
  }

  getPosition(): ChessPosition | null {
    const fen = this.readFenFromUrl() ?? this.fenFromPieces();
    if (!fen) return null;
    try {
      const chess = new Chess(fen);
      return {
        fen: chess.fen(),
        turn: chess.turn(),
        isGameOver: chess.isGameOver(),
      };
    } catch {
      return null;
    }
  }

  isOurTurn(): boolean {
    const bottom = document.querySelector(".rclock-bottom.rclock-turn");
    if (bottom) return true;
    const top = document.querySelector(".rclock-top.rclock-turn");
    if (top) return false;
    const pos = this.getPosition();
    if (!pos) return false;
    const orient = document.querySelector(".orientation-white") ? "w" : "b";
    return pos.turn === orient;
  }

  canAutomate(): boolean {
    return this.detectBoard();
  }

  async executeMove(move: ChessMove): Promise<boolean> {
    const board = document.querySelector("cg-board") as HTMLElement & {
      playMove?: (from: string, to: string, promotion?: string) => void;
    };
    if (board?.playMove) {
      board.playMove(move.from, move.to, move.promotion ?? "q");
      return true;
    }
    const from = document.querySelector<HTMLElement>(`square.${move.from}`);
    const to = document.querySelector<HTMLElement>(`square.${move.to}`);
    if (!from || !to) return false;
    from.click();
    await new Promise((r) => setTimeout(r, 60));
    to.click();
    return true;
  }

  onBoardChange(callback: (position: ChessPosition | null) => void): () => void {
    const observer = new MutationObserver(() => callback(this.getPosition()));
    const board = document.querySelector(".cg-wrap, cg-board");
    if (board) observer.observe(board, { childList: true, subtree: true, attributes: true });
    callback(this.getPosition());
    const interval = window.setInterval(() => callback(this.getPosition()), 1200);
    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }

  private readFenFromUrl(): string | null {
    const params = new URLSearchParams(location.search);
    const fen = params.get("fen");
    return fen ? decodeURIComponent(fen.replace(/\+/g, " ")) : null;
  }

  private fenFromPieces(): string | null {
    const wrap = document.querySelector(".cg-wrap");
    if (!wrap) return null;
    const orientWhite = wrap.classList.contains("orientation-white");
    const pieces = wrap.querySelectorAll("piece");
    if (pieces.length === 0) return null;

    const grid: (string | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
    const size = wrap.clientWidth / 8;

    pieces.forEach((piece) => {
      const style = (piece as HTMLElement).style.transform;
      const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(style);
      if (!match || !size) return;
      const x = Math.round(Number(match[1]) / size);
      const y = Math.round(Number(match[2]) / size);
      const classes = piece.className.split(" ");
      const color = classes.includes("white") ? "w" : "b";
      const role = classes.find((c) => ["pawn", "knight", "bishop", "rook", "queen", "king"].includes(c));
      if (!role) return;
      const map: Record<string, string> = {
        pawn: "p",
        knight: "n",
        bishop: "b",
        rook: "r",
        queen: "q",
        king: "k",
      };
      const ch = map[role];
      if (!ch) return;
      const fenChar = color === "w" ? ch.toUpperCase() : ch;
      const file = orientWhite ? x : 7 - x;
      const rank = orientWhite ? 7 - y : y;
      if (file >= 0 && file < 8 && rank >= 0 && rank < 8) grid[rank][file] = fenChar;
    });

    const rows: string[] = [];
    for (let r = 7; r >= 0; r--) {
      let row = "";
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const cell = grid[r][f];
        if (!cell) empty++;
        else {
          if (empty) {
            row += empty;
            empty = 0;
          }
          row += cell;
        }
      }
      if (empty) row += empty;
      rows.push(row);
    }

    const turn = document.querySelector(".rclock-bottom.rclock-turn") ? "w" : "b";
    const fen = `${rows.join("/")} ${turn} KQkq - 0 1`;
    try {
      new Chess(fen);
      return fen;
    } catch {
      return null;
    }
  }
}
