import { Chess } from "chess.js";

const PIECE_MAP: Record<string, string> = {
  wp: "P",
  wr: "R",
  wn: "N",
  wb: "B",
  wq: "Q",
  wk: "K",
  bp: "p",
  br: "r",
  bn: "n",
  bb: "b",
  bq: "q",
  bk: "k",
};

type BoardElement = HTMLElement & {
  game?: { getFEN?: () => string; fen?: string };
  getFEN?: () => string;
};

export function findBoardElement(): HTMLElement | null {
  const candidates = [
    document.querySelector<BoardElement>("wc-chess-board"),
    document.querySelector<BoardElement>("chess-board"),
    document.querySelector<BoardElement>('[data-cy="board"]'),
    document.querySelector<BoardElement>(".board"),
    document.querySelector<BoardElement>("#board-single"),
  ].filter(Boolean) as BoardElement[];

  for (const board of candidates) {
    if (readBoardFen(board)) return board;
  }
  return candidates[0] ?? null;
}

export function readBoardFen(board: HTMLElement): string | null {
  const el = board as BoardElement;
  const raw =
    el.game?.getFEN?.() ??
    el.game?.fen ??
    el.getFEN?.() ??
    board.getAttribute("data-fen") ??
    board.getAttribute("data-position");

  return normalizeFen(raw);
}

export function normalizeFen(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const fen = raw.trim().replace(/\s+/g, " ");
  if (!fen) return null;
  try {
    const chess = new Chess(fen);
    return chess.fen();
  } catch {
    const parts = fen.split(" ");
    if (parts.length < 2) return null;
    const board = parts[0];
    const turn = parts[1] === "b" ? "b" : "w";
    const castling = parts[2] && parts[2] !== "-" ? parts[2] : "-";
    const ep = parts[3] && parts[3] !== "-" ? parts[3] : "-";
    const candidate = `${board} ${turn} ${castling} ${ep} 0 1`;
    try {
      return new Chess(candidate).fen();
    } catch {
      return null;
    }
  }
}

function boardRoot(board: HTMLElement): Document | ShadowRoot | HTMLElement {
  return board.shadowRoot ?? board;
}

export function parseChessComSquareClass(className: string): { file: number; rank: number } | null {
  const match = /square-(\d)(\d)/.exec(className);
  if (!match) return null;
  return { file: Number(match[1]), rank: Number(match[2]) };
}

export function squareClassFromUci(square: string): string {
  const file = square.charCodeAt(0) - 96;
  const rank = Number(square[1]);
  return `square-${file}${rank}`;
}

function pieceCodeFromClass(className: string): string | null {
  const tokens = className.split(/\s+/);
  for (const token of tokens) {
    if (PIECE_MAP[token]) return token;
    const compact = /^([wb])([pnbrqk])$/i.exec(token);
    if (compact) return `${compact[1].toLowerCase()}${compact[2].toLowerCase()}`;
  }
  return null;
}

export function collectPieces(board: HTMLElement): { square: string; fenChar: string }[] {
  const root = boardRoot(board);
  const pieces = root.querySelectorAll(".piece, [class*='square-']");
  const found: { square: string; fenChar: string }[] = [];

  pieces.forEach((piece) => {
    const classes = piece.className;
    if (!classes.includes("square-") && !classes.includes("piece")) return;
    const squareClass = classes.split(/\s+/).find((c) => c.startsWith("square-"));
    const pieceClass = pieceCodeFromClass(classes);
    if (!squareClass || !pieceClass) return;
    const coords = parseChessComSquareClass(squareClass);
    if (!coords) return;
    const fileLetter = String.fromCharCode(96 + coords.file);
    found.push({
      square: `${fileLetter}${coords.rank}`,
      fenChar: PIECE_MAP[pieceClass],
    });
  });

  return found;
}

export function piecesToFen(
  pieces: { square: string; fenChar: string }[],
  turn: "w" | "b",
  castling = "KQkq",
): string | null {
  if (pieces.length === 0) return null;
  const grid: (string | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));

  for (const { square, fenChar } of pieces) {
    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]) - 1;
    if (file < 0 || file > 7 || rank < 0 || rank > 7) continue;
    grid[rank][file] = fenChar;
  }

  const rows: string[] = [];
  for (let r = 7; r >= 0; r--) {
    let row = "";
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const cell = grid[r][f];
      if (!cell) {
        empty++;
      } else {
        if (empty > 0) {
          row += empty;
          empty = 0;
        }
        row += cell;
      }
    }
    if (empty > 0) row += empty;
    rows.push(row);
  }

  return normalizeFen(`${rows.join("/")} ${turn} ${castling} - 0 1`);
}

export function clickSquare(board: HTMLElement, square: string): boolean {
  const selector = `.${squareClassFromUci(square)}`;
  const root = boardRoot(board);
  const target =
    root.querySelector<HTMLElement>(selector) ??
    root.querySelector<HTMLElement>(`[class*="${squareClassFromUci(square)}"]`);
  if (!target) return false;
  target.dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }),
  );
  target.dispatchEvent(
    new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }),
  );
  target.click();
  return true;
}
