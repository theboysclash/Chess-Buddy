import type { ChessMove, ChessPosition, SiteInfo } from "../../shared/types";

export interface SiteAdapter {
  id: string;
  matches(hostname: string): boolean;
  detectBoard(): boolean;
  getSiteInfo(): SiteInfo;
  getPosition(): ChessPosition | null;
  isOurTurn(): boolean;
  canAutomate(): boolean;
  executeMove(move: ChessMove): Promise<boolean>;
  onBoardChange(callback: (position: ChessPosition | null) => void): () => void;
}
