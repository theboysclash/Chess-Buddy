import { Chess } from "chess.js";
import { applyRandomizedDelay } from "../engine/difficulty";
import { movesEqual } from "../engine/analysis";
import { logger } from "../shared/logger";
import type { AnalysisResult, ChessMove, ChessPosition, UserSettings } from "../shared/types";
import type { SiteAdapter } from "./site-adapters/base-adapter";

export class AutoPlayController {
  private delayTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  stop(reason?: string): void {
    this.stopped = true;
    if (this.delayTimer) clearTimeout(this.delayTimer);
    this.delayTimer = null;
    if (reason) logger.warn("Auto Play stopped", reason);
  }

  reset(): void {
    this.stopped = false;
  }

  async maybeExecute(params: {
    settings: UserSettings;
    adapter: SiteAdapter;
    position: ChessPosition;
    analysis: AnalysisResult;
    onStop: (message: string) => void;
  }): Promise<void> {
    const { settings, adapter, position, analysis, onStop } = params;
    if (!settings.autoPlay || this.stopped) return;
    if (!adapter.canAutomate()) {
      onStop("Automation unavailable on this site");
      return;
    }
    if (position.isGameOver) {
      onStop("Game complete");
      return;
    }
    if (!adapter.isOurTurn()) return;

    if (!this.isMoveLegal(position.fen, analysis.bestMove)) {
      onStop("The board changed unexpectedly");
      return;
    }

    const delaySec = applyRandomizedDelay(
      settings.moveDelay,
      settings.randomizedDelay,
      settings.randomDelayJitterSec,
    );

    if (this.delayTimer) clearTimeout(this.delayTimer);
    this.delayTimer = setTimeout(async () => {
      this.delayTimer = null;
      if (!settings.autoPlay || this.stopped) return;

      const latest = adapter.getPosition();
      if (!latest || latest.fen !== position.fen) {
        onStop("The board changed unexpectedly");
        return;
      }
      if (!adapter.isOurTurn()) return;
      if (!this.isMoveLegal(latest.fen, analysis.bestMove)) {
        onStop("The board changed unexpectedly");
        return;
      }

      const ok = await adapter.executeMove(analysis.bestMove);
      if (!ok) onStop("Auto Play stopped");
    }, delaySec * 1000);
  }

  private isMoveLegal(fen: string, move: ChessMove): boolean {
    try {
      const chess = new Chess(fen);
      const legal = chess.moves({ verbose: true });
      return legal.some((m) =>
        movesEqual(
          { from: m.from, to: m.to, promotion: m.promotion as ChessMove["promotion"] },
          move,
        ),
      );
    } catch {
      return false;
    }
  }
}
