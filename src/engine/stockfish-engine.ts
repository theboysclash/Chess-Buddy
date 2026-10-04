import { getEngineSettingsForStrength, pickMoveIndex } from "./difficulty";
import { enrichMoveWithSan, parsePrincipalVariation, uciToMove } from "./analysis";
import type { ChessEngine } from "./chess-engine";
import type { AnalysisResult, AnalysisSettings, ChessMove, ChessPosition } from "../shared/types";

interface CandidateMove {
  move: ChessMove;
  score: number;
  depth: number;
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

    return new Promise((resolve, reject) => {
      const started = performance.now();
      const candidates: CandidateMove[] = [];
      let bestLine: string[] = [];
      let lastDepth = 0;
      let finished = false;

      const finish = (move: ChessMove, depth?: number, evaluation?: number) => {
        if (finished) return;
        finished = true;
        cleanup();
        const enriched = enrichMoveWithSan(position.fen, move);
        resolve({
          bestMove: enriched,
          evaluation,
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
          const depth = depthMatch ? Number(depthMatch[1]) : undefined;
          const pv = pvMatch?.[1]?.split(" ").filter(Boolean) ?? [];
          let score = 0;
          if (scoreMatch) {
            score = Number(scoreMatch[2]);
            if (scoreMatch[1] === "mate") score = score > 0 ? 100000 : -100000;
          }
          if (depth) lastDepth = depth;
          if (pv.length) bestLine = pv;
          if (pv[0]) {
            const m = uciToMove(pv[0]);
            if (m) candidates.push({ move: m, score, depth: depth ?? lastDepth });
          }
        }

        if (line.startsWith("bestmove ")) {
          const uci = line.split(" ")[1];
          if (!uci || uci === "(none)") {
            reject(new Error("No best move"));
            return;
          }
          const unique: CandidateMove[] = [];
          const seen = new Set<string>();
          for (const c of candidates) {
            const key = `${c.move.from}${c.move.to}${c.move.promotion ?? ""}`;
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(c);
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
      }, engineCfg.maxAnalysisTimeMs + 500);

      if (!this.worker) {
        reject(new Error("Worker missing"));
        return;
      }

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
      const multi = settings.strength <= 6 ? 3 : 1;
      this.worker.postMessage(`setoption name MultiPV value ${multi}`);
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
