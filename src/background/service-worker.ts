import { StockfishWorkerEngine } from "../engine/stockfish-engine";
import { mergeAnalysisResult } from "../engine/analysis";
import { getEngineSettingsForStrength } from "../engine/difficulty";
import { onMessage } from "../shared/messaging";
import { loadSettings, saveSettings, subscribeSettings } from "../shared/storage";
import { setDebugMode, logger } from "../shared/logger";
import type { MessageResponse, TabGameState, UserSettings } from "../shared/types";
import { DEFAULT_SETTINGS } from "../shared/constants";

const engine = new StockfishWorkerEngine();
const tabStates = new Map<number, TabGameState>();
let settings: UserSettings = DEFAULT_SETTINGS;
let engineReady = false;

async function ensureEngine(): Promise<void> {
  if (engineReady) return;
  await engine.initialize();
  engineReady = true;
}

function defaultTabState(): TabGameState {
  return {
    buddyState: "IDLE",
    site: null,
    position: null,
    analysis: null,
    statusMessage: "Ready",
    isOurTurn: false,
    autoPlayActive: false,
    updatedAt: Date.now(),
  };
}

function getTabState(tabId: number): TabGameState {
  if (!tabStates.has(tabId)) tabStates.set(tabId, defaultTabState());
  return tabStates.get(tabId)!;
}

function setTabState(tabId: number, partial: Partial<TabGameState>): TabGameState {
  const next = { ...getTabState(tabId), ...partial, updatedAt: Date.now() };
  tabStates.set(tabId, next);
  void chrome.runtime.sendMessage({ type: "STATE_UPDATE", state: next }).catch(() => {
    /* popup may be closed */
  });
  return next;
}

async function analyzeForTab(tabId: number, fen: string): Promise<void> {
  setTabState(tabId, { buddyState: "ANALYZING", statusMessage: "Analyzing position" });
  try {
    await ensureEngine();
    const result = await engine.analyze(
      { fen, turn: fen.includes(" w ") ? "w" : "b", isGameOver: false },
      {
        strength: settings.strength,
        engine: getEngineSettingsForStrength(settings.strength, settings.engineSettings),
      },
    );
    const merged = mergeAnalysisResult(fen, result);
    setTabState(tabId, {
      buddyState: "MOVE_READY",
      analysis: merged,
      statusMessage: "Best move ready",
    });
  } catch (error) {
    logger.error("Analysis failed", error);
    setTabState(tabId, {
      buddyState: "ERROR",
      statusMessage: "Analysis unavailable",
      lastError: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function init(): Promise<void> {
  settings = await loadSettings();
  setDebugMode(settings.debugMode);
  if (settings.autoAnalyze) {
    void ensureEngine().catch((e) => logger.warn("Engine preload failed", e));
  }
}

subscribeSettings((next) => {
  settings = next;
  setDebugMode(next.debugMode);
});

void init();

onMessage(async (message, sender): Promise<MessageResponse> => {
  const tabId = sender.tab?.id;

  switch (message.type) {
    case "GET_SETTINGS":
      return { ok: true, data: settings };

    case "SET_SETTINGS": {
      settings = await saveSettings(message.settings);
      return { ok: true, data: settings };
    }

    case "GET_STATE": {
      const active = await chrome.tabs.query({ active: true, currentWindow: true });
      const id = tabId ?? active[0]?.id;
      if (!id) return { ok: true, data: defaultTabState() };
      return { ok: true, data: getTabState(id) };
    }

    case "SET_STRENGTH": {
      settings = await saveSettings({ strength: message.value });
      if (tabId) {
        const state = getTabState(tabId);
        if (state.position?.fen) void analyzeForTab(tabId, state.position.fen);
      }
      return { ok: true, data: settings };
    }

    case "SET_AUTO_PLAY": {
      settings = await saveSettings({ autoPlay: message.enabled });
      if (tabId) {
        setTabState(tabId, {
          autoPlayActive: message.enabled,
          statusMessage: message.enabled ? "Auto Play active" : "Manual move mode",
          buddyState: message.enabled ? "AUTO_PLAYING" : "MOVE_READY",
        });
      }
      return { ok: true, data: settings };
    }

    case "SET_DELAY": {
      settings = await saveSettings({ moveDelay: message.value });
      return { ok: true, data: settings };
    }

    case "ANALYZE_POSITION": {
      if (!tabId) return { ok: false, error: "No tab" };
      setTabState(tabId, {
        position: {
          fen: message.fen,
          turn: message.fen.includes(" w ") ? "w" : "b",
          isGameOver: false,
        },
      });
      void analyzeForTab(tabId, message.fen);
      return { ok: true };
    }

    case "STOP_ANALYSIS": {
      await engine.stop();
      if (tabId) setTabState(tabId, { buddyState: "READY", statusMessage: "Ready" });
      return { ok: true };
    }

    case "STATE_UPDATE": {
      if (!tabId) return { ok: false, error: "No tab" };
      const prev = getTabState(tabId);
      const next = setTabState(tabId, message.state);
      if (
        settings.autoAnalyze &&
        next.position?.fen &&
        next.position.fen !== prev.position?.fen &&
        next.buddyState !== "UNSUPPORTED"
      ) {
        void analyzeForTab(tabId, next.position.fen);
      }
      return { ok: true, data: next };
    }

    case "PING":
      return { ok: true, data: "PONG" };

    default:
      return { ok: false, error: "Unknown message" };
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId);
});

logger.info("Service worker started");
