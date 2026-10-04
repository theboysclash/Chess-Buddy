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

export function findBoardElement(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>("wc-chess-board") ??
    document.querySelector<HTMLElement>("chess-board") ??
    document.querySelector<HTMLElement>(".board") ??
    document.querySelector<HTMLElement>("#board-single")
  );
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

export function collectPieces(board: HTMLElement): { square: string; fenChar: string }[] {
  const root = boardRoot(board);
  const pieces = root.querySelectorAll(".piece");
  const found: { square: string; fenChar: string }[] = [];

  pieces.forEach((piece) => {
    const classes = piece.className.split(/\s+/);
    const squareClass = classes.find((c) => c.startsWith("square-"));
    const pieceClass = classes.find((c) => PIECE_MAP[c]);
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

  const fen = `${rows.join("/")} ${turn} ${castling} - 0 1`;
  try {
    new Chess(fen);
    return fen;
  } catch {
    return `${rows.join("/")} ${turn} - - 0 1`;
  }
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
