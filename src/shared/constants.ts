import type { UserSettings } from "./types";

export const EXTENSION_NAME = "Chess Buddy";
export const EXTENSION_VERSION = "1.0.0";

export const STRENGTH_MIN = 1;
export const STRENGTH_MAX = 10;

export const DELAY_MIN_SEC = 0.5;
export const DELAY_MAX_SEC = 10;

export const STRENGTH_LABELS: Record<number, string> = {
  1: "Casual",
  2: "Casual",
  3: "Beginner",
  4: "Beginner",
  5: "Balanced",
  6: "Strong",
  7: "Strong",
  8: "Expert",
  9: "Expert",
  10: "Maximum",
};

export const DEFAULT_ENGINE_SETTINGS = {
  maxAnalysisTimeMs: 2000,
  maxDepth: 18,
  threads: 1,
  hashMb: 64,
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  accent: "slate",
  surfaceStyle: "glass",
  strength: 5,
  autoPlay: false,
  moveDelay: 2.5,
  reducedMotion: false,
  randomizedDelay: false,
  randomDelayJitterSec: 0.5,
  autoAnalyze: true,
  rememberLastStrength: true,
  startState: "always-manual",
  confirmAutoPlay: false,
  moveNotation: "san",
  topMovesCount: 1,
  debugMode: false,
  engineSettings: DEFAULT_ENGINE_SETTINGS,
  stopOnGameEnd: true,
  stopOnUnexpectedPosition: true,
  stopOnDisconnect: true,
  stopOnUnsupported: true,
  siteToggles: {},
  onboardingComplete: false,
};

export const SUPPORTED_SITES = [
  {
    id: "local-test",
    name: "Local Test Board",
    hostnames: ["localhost", "127.0.0.1"],
    automation: true,
  },
  {
    id: "lichess",
    name: "Lichess",
    hostnames: ["lichess.org"],
    automation: true,
  },
  {
    id: "chesscom",
    name: "Chess.com",
    hostnames: ["chess.com", "www.chess.com"],
    automation: true,
  },
] as const;

export const COMING_SOON_SITES = [
  { id: "chess24", name: "Chess24" },
  { id: "puzzle", name: "Puzzle Rush Sites" },
] as const;
