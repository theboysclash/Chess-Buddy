import { onMessage } from "../shared/messaging";
import { loadSettings, saveSettings, subscribeSettings } from "../shared/storage";
import { setDebugMode, logger } from "../shared/logger";
import type { AnalysisResult, MessageResponse, TabGameState, UserSettings } from "../shared/types";
import { DEFAULT_SETTINGS } from "../shared/constants";
import { ensureOffscreenDocument } from "./offscreen-manager";

const tabStates = new Map<number, TabGameState>();
let settings: UserSettings = DEFAULT_SETTINGS;

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

async function notifyTab(tabId: number, message: { type: string }): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    logger.warn("Tab message failed", error);
  }
}

async function activeTabId(tabId?: number): Promise<number | undefined> {
  if (tabId) return tabId;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function init(): Promise<void> {
  settings = await loadSettings();
  setDebugMode(settings.debugMode);
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
      const id = await activeTabId(tabId);
      if (!id) return { ok: true, data: defaultTabState() };
      return { ok: true, data: getTabState(id) };
    }

    case "SET_STRENGTH": {
      settings = await saveSettings({ strength: message.value });
      const id = await activeTabId(tabId);
      if (id) await notifyTab(id, { type: "TRIGGER_ANALYSIS" });
      return { ok: true, data: settings };
    }

    case "SET_TOP_MOVES": {
      settings = await saveSettings({ topMovesCount: message.value });
      const id = await activeTabId(tabId);
      if (id) await notifyTab(id, { type: "TRIGGER_ANALYSIS" });
      return { ok: true, data: settings };
    }

    case "SET_AUTO_PLAY": {
      settings = await saveSettings({ autoPlay: message.enabled });
      const id = await activeTabId(tabId);
      if (id) {
        setTabState(id, {
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

    case "STOP_ANALYSIS": {
      await chrome.runtime
        .sendMessage({ target: "offscreen", type: "OFFSCREEN_STOP" })
        .catch(() => undefined);
      const id = await activeTabId(tabId);
      if (id) await notifyTab(id, { type: "STOP_ANALYSIS" });
      return { ok: true };
    }

    case "ANALYZE_FEN": {
      try {
        await ensureOffscreenDocument();
      } catch (error) {
        logger.error("Offscreen setup failed", error);
        return { ok: false, error: "Engine failed to start" };
      }

      const offscreenResponse = (await chrome.runtime.sendMessage({
        target: "offscreen",
        type: "OFFSCREEN_ANALYZE",
        fen: message.fen,
        strength: message.strength,
        topMovesCount: message.topMovesCount,
        engineSettings: message.engineSettings,
      })) as MessageResponse<AnalysisResult>;

      if (!offscreenResponse?.ok) {
        return {
          ok: false,
          error: offscreenResponse?.error ?? "Analysis failed",
        };
      }

      if (tabId && offscreenResponse.data) {
        setTabState(tabId, {
          analysis: offscreenResponse.data,
          buddyState: "MOVE_READY",
          statusMessage: "Best move ready",
        });
      }

      return offscreenResponse;
    }

    case "STATE_UPDATE": {
      if (!tabId) return { ok: false, error: "No tab" };
      const next = setTabState(tabId, message.state);
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
