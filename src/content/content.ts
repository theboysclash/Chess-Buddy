import { sendToBackground } from "../shared/messaging";
import { loadSettings } from "../shared/storage";
import { logger } from "../shared/logger";
import { buildTabState } from "./chess-state";
import { AutoPlayController } from "./move-executor";
import { LocalTestAdapter } from "./site-adapters/local-test-adapter";
import { ChessComAdapter } from "./site-adapters/chess-com-adapter";
import { LichessAdapter } from "./site-adapters/lichess-adapter";
import { GenericAdapter } from "./site-adapters/generic-adapter";
import type { SiteAdapter } from "./site-adapters/base-adapter";
import type { ExtensionMessage, MessageResponse, TabGameState, UserSettings } from "../shared/types";

const adapters: SiteAdapter[] = [
  new LocalTestAdapter(),
  new ChessComAdapter(),
  new LichessAdapter(),
  new GenericAdapter(),
];
const autoPlay = new AutoPlayController();

let settings: UserSettings | null = null;
let activeAdapter: SiteAdapter | null = null;
let lastState: TabGameState | null = null;

function pickAdapter(): SiteAdapter {
  const host = location.hostname;
  for (const adapter of adapters) {
    if (adapter.id !== "generic" && adapter.matches(host)) return adapter;
  }
  return adapters.find((a) => a.id === "generic")!;
}

async function refreshSettings(): Promise<UserSettings> {
  settings = await loadSettings();
  if (!settings.autoPlay) autoPlay.stop();
  else autoPlay.reset();
  return settings;
}

async function pushState(partial?: Partial<TabGameState>): Promise<void> {
  if (!activeAdapter || !settings) return;
  const site = activeAdapter.getSiteInfo();
  const position = activeAdapter.getPosition();
  const base = buildTabState({
    site,
    position,
    isOurTurn: activeAdapter.isOurTurn(),
    autoPlay: settings.autoPlay,
  });
  const state: TabGameState = {
    ...base,
    ...partial,
    analysis: partial?.analysis ?? lastState?.analysis ?? null,
    autoPlayActive: settings.autoPlay,
    updatedAt: Date.now(),
  };
  lastState = state;
  await sendToBackground({ type: "STATE_UPDATE", state });

}

function handleAnalysisReady(): void {
  if (!settings?.autoPlay || !activeAdapter || !lastState?.analysis || !lastState.position) return;
  if (!activeAdapter.isOurTurn()) return;
  void autoPlay.maybeExecute({
    settings,
    adapter: activeAdapter,
    position: lastState.position,
    analysis: lastState.analysis,
    onStop: (message) => {
      void sendToBackground({ type: "SET_AUTO_PLAY", enabled: false });
      void pushState({
        buddyState: "ERROR",
        statusMessage: message,
        autoPlayActive: false,
      });
    },
  });
}

async function init(): Promise<void> {
  await refreshSettings();
  activeAdapter = pickAdapter();
  logger.debug("Adapter selected", activeAdapter.id);

  activeAdapter.onBoardChange(() => {
    void pushState();
  });

  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area !== "local") return;
    void refreshSettings().then(() => pushState());
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void handleMessage(message as ExtensionMessage).then(sendResponse);
    return true;
  });

  await pushState();
}

async function handleMessage(message: ExtensionMessage): Promise<MessageResponse> {
  switch (message.type) {
    case "EXECUTE_MOVE": {
      if (!activeAdapter) return { ok: false, error: "No adapter" };
      const ok = await activeAdapter.executeMove(message.move);
      return { ok };
    }
    case "REFRESH_TAB": {
      await pushState();
      return { ok: true, data: lastState };
    }
    case "STATE_UPDATE": {
      if (message.state.analysis) {
        lastState = { ...lastState!, ...message.state };
        handleAnalysisReady();
      }
      return { ok: true };
    }
    case "SET_AUTO_PLAY": {
      if (!message.enabled) autoPlay.stop();
      else autoPlay.reset();
      settings = { ...(await loadSettings()), autoPlay: message.enabled };
      await pushState({
        autoPlayActive: message.enabled,
        statusMessage: message.enabled ? "Auto Play active" : "Manual move mode",
        buddyState: message.enabled ? "AUTO_PLAYING" : lastState?.buddyState,
      });
      if (message.enabled && lastState?.analysis && lastState.position) {
        handleAnalysisReady();
      }
      return { ok: true };
    }
    default:
      return { ok: false, error: "Unhandled in content" };
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "STATE_UPDATE" && message.state?.analysis) {
    lastState = message.state;
    handleAnalysisReady();
  }
});

void init();
