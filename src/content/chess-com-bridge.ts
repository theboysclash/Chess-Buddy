import { normalizeFen } from "./dom-board";
import type { ChessMove } from "../shared/types";

const PAGE_SOURCE = "chess-buddy-chesscom-page";
const ISOLATED_SOURCE = "chess-buddy-chesscom-isolated";

let latestFen: string | null = null;
let initialized = false;
const fenListeners = new Set<(fen: string | null) => void>();

function notifyFen(fen: string | null): void {
  if (fen === latestFen) return;
  latestFen = fen;
  for (const listener of fenListeners) listener(fen);
}

export function initChessComBridge(): void {
  if (initialized) return;
  initialized = true;

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data) return;
    const data = event.data as { source?: string; type?: string; fen?: string };
    if (data.source !== PAGE_SOURCE) return;
    if (data.type === "FEN_UPDATE" && typeof data.fen === "string") {
      notifyFen(normalizeFen(data.fen));
    }
  });

  requestChessComFen();
  window.setInterval(requestChessComFen, 2000);
}

export function subscribeChessComFen(listener: (fen: string | null) => void): () => void {
  fenListeners.add(listener);
  listener(latestFen);
  return () => fenListeners.delete(listener);
}

export function getChessComMainWorldFen(): string | null {
  return latestFen;
}

export function requestChessComFen(): void {
  window.postMessage({ source: ISOLATED_SOURCE, type: "REQUEST_FEN" }, "*");
}

export function executeChessComMoveViaPage(move: ChessMove): Promise<boolean> {
  return new Promise((resolve) => {
    const onResult = (event: MessageEvent) => {
      if (event.source !== window || !event.data) return;
      const data = event.data as {
        source?: string;
        type?: string;
        ok?: boolean;
        from?: string;
        to?: string;
      };
      if (data.source !== PAGE_SOURCE || data.type !== "MOVE_RESULT") return;
      if (data.from !== move.from || data.to !== move.to) return;
      window.removeEventListener("message", onResult);
      resolve(Boolean(data.ok));
    };
    window.addEventListener("message", onResult);
    window.postMessage(
      {
        source: ISOLATED_SOURCE,
        type: "EXECUTE_MOVE",
        from: move.from,
        to: move.to,
        promotion: move.promotion ?? "q",
      },
      "*",
    );
    window.setTimeout(() => {
      window.removeEventListener("message", onResult);
      resolve(false);
    }, 3000);
  });
}
