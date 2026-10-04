export type Theme = "system" | "light" | "dark";
export type SurfaceStyle = "standard" | "glass";
export type MoveNotation = "san" | "uci" | "coordinates";
export type StartState = "always-manual" | "remember" | "always-auto";

export type BuddyState =
  | "IDLE"
  | "DETECTING_BOARD"
  | "READY"
  | "ANALYZING"
  | "MOVE_READY"
  | "WAITING"
  | "AUTO_PLAYING"
  | "GAME_OVER"
  | "UNSUPPORTED"
  | "ERROR";

export interface ChessMove {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
  san?: string;
  uci?: string;
}

export interface ChessPosition {
  fen: string;
  turn: "w" | "b";
  isGameOver: boolean;
  result?: string;
}

export interface EngineSettings {
  maxAnalysisTimeMs: number;
  maxDepth?: number;
  threads?: number;
  hashMb?: number;
  skillLevel?: number;
  depthCap?: number;
  nodesCap?: number;
  uciElo?: number;
  limitStrength?: boolean;
}

export interface AnalysisSettings {
  strength: number;
  engine: EngineSettings;
  topMovesCount: number;
}

export interface RankedMove {
  rank: number;
  move: ChessMove;
  evaluation?: number;
  san?: string;
}

export interface AnalysisResult {
  bestMove: ChessMove;
  rankedMoves?: RankedMove[];
  evaluation?: number;
  depth?: number;
  confidence?: number;
  principalVariation?: ChessMove[];
  analysisTime?: number;
  san?: string;
}

export interface SiteInfo {
  id: string;
  name: string;
  hostname: string;
  supported: boolean;
  boardDetected: boolean;
  automationAvailable: boolean;
  enabled: boolean;
}

export interface TabGameState {
  buddyState: BuddyState;
  site: SiteInfo | null;
  position: ChessPosition | null;
  analysis: AnalysisResult | null;
  statusMessage: string;
  isOurTurn: boolean;
  autoPlayActive: boolean;
  lastError?: string;
  updatedAt: number;
}

export interface UserSettings {
  theme: Theme;
  accent: "slate" | "forest" | "ocean";
  surfaceStyle: SurfaceStyle;
  strength: number;
  autoPlay: boolean;
  moveDelay: number;
  reducedMotion: boolean;
  randomizedDelay: boolean;
  randomDelayJitterSec: number;
  autoAnalyze: boolean;
  rememberLastStrength: boolean;
  startState: StartState;
  confirmAutoPlay: boolean;
  moveNotation: MoveNotation;
  topMovesCount: 1 | 2 | 3;
  debugMode: boolean;
  engineSettings: EngineSettings;
  stopOnGameEnd: boolean;
  stopOnUnexpectedPosition: boolean;
  stopOnDisconnect: boolean;
  stopOnUnsupported: boolean;
  siteToggles: Record<string, boolean>;
  onboardingComplete: boolean;
}

export type ExtensionMessage =
  | { type: "GET_STATE" }
  | { type: "GET_SETTINGS" }
  | { type: "SET_SETTINGS"; settings: Partial<UserSettings> }
  | { type: "ANALYZE_POSITION"; fen: string; strength: number }
  | { type: "STOP_ANALYSIS" }
  | { type: "SET_STRENGTH"; value: number }
  | { type: "SET_TOP_MOVES"; value: 1 | 2 | 3 }
  | { type: "SET_AUTO_PLAY"; enabled: boolean }
  | { type: "SET_DELAY"; value: number }
  | { type: "EXECUTE_MOVE"; move: ChessMove }
  | { type: "REFRESH_TAB" }
  | { type: "STATE_UPDATE"; state: TabGameState }
  | { type: "SETTINGS_UPDATE"; settings: UserSettings }
  | { type: "ANALYSIS_RESULT"; result: AnalysisResult | null; error?: string }
  | { type: "PING" }
  | { type: "PONG" };

export interface MessageResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
