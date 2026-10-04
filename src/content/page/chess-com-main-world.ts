/**
 * Runs in the page MAIN world (manifest world: "MAIN").
 * Must not use chrome.* APIs — communicates via window.postMessage only.
 */

const PAGE_SOURCE = "chess-buddy-chesscom-page";
const ISOLATED_SOURCE = "chess-buddy-chesscom-isolated";

type BoardElement = HTMLElement & {
  game?: {
    getFEN?: () => string;
    fen?: string;
    move?: (m: { from: string; to: string; promotion?: string }) => boolean;
  };
  getFEN?: () => string;
};

function findBoard(): BoardElement | null {
  return (
    document.querySelector<BoardElement>("wc-chess-board") ??
    document.querySelector<BoardElement>("chess-board")
  );
}

function readRawFen(board: BoardElement): string | null {
  const raw =
    board.game?.getFEN?.() ??
    board.game?.fen ??
    board.getFEN?.() ??
    board.getAttribute("data-fen") ??
    board.getAttribute("data-position");
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

let lastPostedFen: string | null = null;

function postFen(fen: string): void {
  if (fen === lastPostedFen) return;
  lastPostedFen = fen;
  window.postMessage({ source: PAGE_SOURCE, type: "FEN_UPDATE", fen }, "*");
}

function emitFen(): void {
  const board = findBoard();
  if (!board) return;
  const fen = readRawFen(board);
  if (fen) postFen(fen);
}

function executeMove(from: string, to: string, promotion?: string): boolean {
  const board = findBoard();
  if (!board?.game?.move) return false;
  try {
    return Boolean(
      board.game.move({
        from,
        to,
        promotion: promotion ?? "q",
      }),
    );
  } catch {
    return false;
  }
}

window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data) return;
  const data = event.data as { source?: string; type?: string };
  if (data.source !== ISOLATED_SOURCE) return;

  if (data.type === "REQUEST_FEN") {
    emitFen();
    return;
  }

  if (data.type === "EXECUTE_MOVE") {
    const detail = data as { from?: string; to?: string; promotion?: string };
    if (!detail.from || !detail.to) return;
    const ok = executeMove(detail.from, detail.to, detail.promotion);
    window.postMessage(
      {
        source: PAGE_SOURCE,
        type: "MOVE_RESULT",
        ok,
        from: detail.from,
        to: detail.to,
      },
      "*",
    );
    emitFen();
  }
});

let observing = false;

function attachObservers(): void {
  if (observing) {
    emitFen();
    return;
  }
  const board = findBoard();
  if (!board) return;
  observing = true;
  emitFen();
  const root = board.shadowRoot ?? board;
  const observer = new MutationObserver(() => emitFen());
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "data-fen"],
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", attachObservers, { once: true });
} else {
  attachObservers();
}

window.setInterval(emitFen, 400);

const boardPoll = window.setInterval(() => {
  if (findBoard()) {
    attachObservers();
    window.clearInterval(boardPoll);
  }
}, 500);
