import { Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { sendToBackground, sendToActiveTab } from "../shared/messaging";
import { subscribeSettings, saveSettings, loadSettings } from "../shared/storage";
import type { TabGameState, UserSettings } from "../shared/types";
import { EXTENSION_NAME } from "../shared/constants";
import { AutoPlayControl } from "./components/AutoPlayControl";
import { MoveDisplay } from "./components/MoveDisplay";
import { SiteStatus } from "./components/SiteStatus";
import { SpeedSlider } from "./components/SpeedSlider";
import { StatusIndicator } from "./components/StatusIndicator";
import { StrengthSlider } from "./components/StrengthSlider";
import { useTheme } from "./hooks/useTheme";

const defaultState: TabGameState = {
  buddyState: "IDLE",
  site: null,
  position: null,
  analysis: null,
  statusMessage: "Ready",
  isOurTurn: false,
  autoPlayActive: false,
  updatedAt: Date.now(),
};

export function App() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [state, setState] = useState<TabGameState>(defaultState);

  useTheme(settings);

  const refresh = useCallback(async () => {
    const [sRes, stRes] = await Promise.all([
      sendToBackground<UserSettings>({ type: "GET_SETTINGS" }),
      sendToBackground<TabGameState>({ type: "GET_STATE" }),
    ]);
    if (sRes.ok && sRes.data) setSettings(sRes.data);
    if (stRes.ok && stRes.data) setState(stRes.data);
    await sendToActiveTab({ type: "REFRESH_TAB" });
  }, []);

  useEffect(() => {
    void loadSettings().then(setSettings);
    void refresh();
    const unsub = subscribeSettings(setSettings);
    const onMessage = (message: { type?: string; state?: TabGameState }) => {
      if (message.type === "STATE_UPDATE" && message.state) setState(message.state);
    };
    chrome.runtime.onMessage.addListener(onMessage);
    return () => {
      unsub();
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, [refresh]);

  const onStrength = async (value: number) => {
    setSettings((s) => (s ? { ...s, strength: value } : s));
    await sendToBackground({ type: "SET_STRENGTH", value });
  };

  const onAutoPlay = async (enabled: boolean) => {
    if (settings?.confirmAutoPlay && enabled) {
      const ok = window.confirm("Enable Auto Play? Chess Buddy will perform moves automatically.");
      if (!ok) return;
    }
    const res = await sendToBackground<UserSettings>({ type: "SET_AUTO_PLAY", enabled });
    if (res.ok && res.data) setSettings(res.data);
    else setSettings((s) => (s ? { ...s, autoPlay: enabled } : s));
    await sendToActiveTab({ type: "SET_AUTO_PLAY", enabled });
    void refresh();
  };

  const onDelay = async (value: number) => {
    setSettings((s) => (s ? { ...s, moveDelay: value } : s));
    await sendToBackground({ type: "SET_DELAY", value });
  };

  const completeOnboarding = async () => {
    const next = await saveSettings({ onboardingComplete: true });
    setSettings(next);
  };

  if (!settings) {
    return <div className="app-shell">Loading…</div>;
  }

  if (!settings.onboardingComplete) {
    return (
      <div className="app-shell">
        <div className="app-header">
          <div className="app-title">{EXTENSION_NAME}</div>
        </div>
        <div className="onboarding">
          <p>Analyze positions. Find the best move. Control how strongly it plays.</p>
          <button type="button" className="pill-button" onClick={() => void completeOnboarding()}>
            Get Started
          </button>
        </div>
      </div>
    );
  }

  const analyzing = state.buddyState === "ANALYZING";
  const boardReady = state.site?.boardDetected && state.site?.supported;
  const autoHint =
    !boardReady
      ? "Open an active game to use Auto Play"
      : !state.isOurTurn && settings.autoPlay
        ? "Waiting for your turn"
        : undefined;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="app-title">{EXTENSION_NAME}</div>
          <StatusIndicator state={state.buddyState} message={state.statusMessage} />
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Open settings"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          <Settings size={16} strokeWidth={1.75} />
        </button>
      </header>

      <MoveDisplay
        loading={analyzing}
        analysis={state.analysis}
        notation={settings.moveNotation}
      />

      <StrengthSlider value={settings.strength} onChange={(v) => void onStrength(v)} />

      <AutoPlayControl
        enabled={settings.autoPlay}
        onChange={(v) => void onAutoPlay(v)}
        hint={autoHint}
      />

      <SpeedSlider
        value={settings.moveDelay}
        onChange={(v) => void onDelay(v)}
        disabled={!settings.autoPlay}
      />

      <SiteStatus site={state.site} />
    </div>
  );
}
