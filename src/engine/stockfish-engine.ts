import { getEngineSettingsForStrength, pickMoveIndex } from "./difficulty";
import { enrichMoveWithSan, parsePrincipalVariation, uciToMove } from "./analysis";
import type { ChessEngine } from "./chess-engine";
import type {
  AnalysisResult,
  AnalysisSettings,
  ChessMove,
  ChessPosition,
  RankedMove,
} from "../shared/types";

interface PvLine {
  multipv: number;
  move: ChessMove;
  score: number;
  depth: number;
  pv: string[];
}

export class StockfishWorkerEngine implements ChessEngine {
  private worker: Worker | null = null;
  private ready = false;
  private initPromise: Promise<void> | null = null;

  private createWorker(): Worker {
    const wasm = encodeURIComponent("stockfish-nnue-16-single.wasm");
    const workerUrl = `${chrome.runtime.getURL("vendor/stockfish-nnue-16-single.js")}#${wasm},worker`;
    return new Worker(workerUrl);
  }

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = new Promise((resolve, reject) => {
      this.worker = this.createWorker();
      const timeout = setTimeout(() => reject(new Error("Engine init timeout")), 20000);

      this.worker.onmessage = (event: MessageEvent) => {
        const line = typeof event.data === "string" ? event.data : "";
        if (line === "uciok") {
          this.worker?.postMessage("isready");
          return;
        }
        if (line === "readyok") {
          clearTimeout(timeout);
          this.ready = true;
          resolve();
        }
      };

      this.worker.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      this.worker.postMessage("uci");
    });
    return this.initPromise;
  }

  async analyze(position: ChessPosition, settings: AnalysisSettings): Promise<AnalysisResult> {
    if (!this.worker || !this.ready) await this.initialize();
    const engineCfg = getEngineSettingsForStrength(settings.strength, settings.engine);
    const topN = Math.min(3, Math.max(1, Math.round(settings.topMovesCount)));

    return new Promise((resolve, reject) => {
      const started = performance.now();
      const pvByLine = new Map<number, PvLine>();
      let bestLine: string[] = [];
      let lastDepth = 0;
      let finished = false;

      const buildRanked = (fen: string): RankedMove[] => {
        const lines = [...pvByLine.values()].sort((a, b) => a.multipv - b.multipv);
        return lines.slice(0, topN).map((line) => {
          const enriched = enrichMoveWithSan(fen, line.move);
          return {
            rank: line.multipv,
            move: enriched,
            evaluation: line.score,
            san: enriched.san,
          };
        });
      };

      const finish = (move: ChessMove, depth?: number, evaluation?: number) => {
        if (finished) return;
        finished = true;
        cleanup();
        const enriched = enrichMoveWithSan(position.fen, move);
        const rankedMoves = buildRanked(position.fen);
        resolve({
          bestMove: enriched,
          rankedMoves: rankedMoves.length > 0 ? rankedMoves : undefined,
          evaluation: evaluation ?? rankedMoves[0]?.evaluation,
          depth: depth ?? lastDepth,
          principalVariation: parsePrincipalVariation(position.fen, bestLine),
          analysisTime: performance.now() - started,
          san: enriched.san,
        });
      };

      const onMessage = (event: MessageEvent) => {
        const line = typeof event.data === "string" ? event.data : "";
        if (!line) return;

        if (line.startsWith("info ")) {
          const depthMatch = / depth (\d+)/.exec(line);
          const scoreMatch = / score (cp|mate) (-?\d+)/.exec(line);
          const pvMatch = / pv (.+)$/.exec(line);
          const multipvMatch = / multipv (\d+)/.exec(line);
          const depth = depthMatch ? Number(depthMatch[1]) : undefined;
          const pv = pvMatch?.[1]?.split(" ").filter(Boolean) ?? [];
          const multipv = multipvMatch ? Number(multipvMatch[1]) : 1;
          let score = 0;
          if (scoreMatch) {
            score = Number(scoreMatch[2]);
            if (scoreMatch[1] === "mate") score = score > 0 ? 100000 : -100000;
          }
          if (depth) lastDepth = depth;
          if (pv.length && multipv === 1) bestLine = pv;
          if (pv[0]) {
            const m = uciToMove(pv[0]);
            if (m) {
              pvByLine.set(multipv, {
                multipv,
                move: m,
                score,
                depth: depth ?? lastDepth,
                pv,
              });
            }
          }
        }

        if (line.startsWith("bestmove ")) {
          const uci = line.split(" ")[1];
          if (!uci || uci === "(none)") {
            reject(new Error("No best move"));
            return;
          }

          const ranked = buildRanked(position.fen);
          const unique: PvLine[] = [];
          const seen = new Set<string>();
          for (const line of ranked.length > 0
            ? ranked.map((r, i) => ({
                multipv: i + 1,
                move: r.move,
                score: r.evaluation ?? 0,
                depth: lastDepth,
                pv: [],
              }))
            : [...pvByLine.values()]) {
            const key = `${line.move.from}${line.move.to}${line.move.promotion ?? ""}`;
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(line);
          }
          unique.sort((a, b) => b.score - a.score);

          const idx = pickMoveIndex(settings.strength, unique.length || 1);
          const chosen = unique[idx]?.move ?? uciToMove(uci);
          if (!chosen) {
            reject(new Error("Invalid move"));
            return;
          }
          finish(chosen, lastDepth, unique[idx]?.score);
        }
      };

      const cleanup = () => {
        if (this.worker) this.worker.onmessage = null;
        clearTimeout(timer);
      };

      const timer = setTimeout(() => {
        if (finished) return;
        finished = true;
        cleanup();
        this.worker?.postMessage("stop");
        reject(new Error("Analysis timeout"));
      }, engineCfg.maxAnalysisTimeMs + 2500);

      if (!this.worker) {
        reject(new Error("Worker missing"));
        return;
      }

      const multiPv = Math.max(topN, settings.strength <= 6 ? 3 : 1);

      this.worker.onmessage = onMessage;
      this.worker.postMessage("stop");
      this.worker.postMessage("ucinewgame");
      if (engineCfg.hashMb) {
        this.worker.postMessage(`setoption name Hash value ${engineCfg.hashMb}`);
      }
      if (engineCfg.threads) {
        this.worker.postMessage(`setoption name Threads value ${engineCfg.threads}`);
      }
      if (engineCfg.skillLevel !== undefined) {
        this.worker.postMessage(`setoption name Skill Level value ${engineCfg.skillLevel}`);
      }
      if (engineCfg.limitStrength && engineCfg.uciElo) {
        this.worker.postMessage("setoption name UCI_LimitStrength value true");
        this.worker.postMessage(`setoption name UCI_Elo value ${engineCfg.uciElo}`);
      } else {
        this.worker.postMessage("setoption name UCI_LimitStrength value false");
      }
      this.worker.postMessage(`setoption name MultiPV value ${multiPv}`);
      this.worker.postMessage(`position fen ${position.fen}`);
      const depth = engineCfg.depthCap ?? engineCfg.maxDepth ?? 18;
      this.worker.postMessage(`go movetime ${engineCfg.maxAnalysisTimeMs} depth ${depth}`);
    });
  }

  async stop(): Promise<void> {
    this.worker?.postMessage("stop");
  }

  async dispose(): Promise<void> {
    await this.stop();
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.initPromise = null;
  }
}
