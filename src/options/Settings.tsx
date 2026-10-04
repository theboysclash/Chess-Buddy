import { useEffect, useState } from "react";
import { applyTheme } from "../popup/hooks/useTheme";
import { saveSettings, loadSettings } from "../shared/storage";
import { COMING_SOON_SITES, SUPPORTED_SITES, EXTENSION_NAME } from "../shared/constants";
import { StrengthSlider } from "../popup/components/StrengthSlider";
import type { UserSettings } from "../shared/types";

type Section = "general" | "engine" | "automation" | "appearance" | "sites" | "advanced";

const sections: { id: Section; label: string }[] = [
  { id: "general", label: "General" },
  { id: "engine", label: "Engine" },
  { id: "automation", label: "Automation" },
  { id: "appearance", label: "Appearance" },
  { id: "sites", label: "Sites" },
  { id: "advanced", label: "Advanced" },
];

export function SettingsPage() {
  const [section, setSection] = useState<Section>("general");
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    void loadSettings().then((s) => {
      setSettings(s);
      applyTheme(s);
    });
  }, []);

  const update = async (partial: Partial<UserSettings>) => {
    const next = await saveSettings(partial);
    setSettings(next);
    applyTheme(next);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  if (!settings) return <div className="settings-main">Loading…</div>;

  return (
    <div className="settings-shell">
      <aside className="settings-nav">
        <h1>{EXTENSION_NAME}</h1>
        <p>Settings {savedFlash ? "· Saved" : ""}</p>
        <nav>
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`nav-item ${section === s.id ? "active" : ""}`}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="settings-main">
        {section === "general" && (
          <section className="settings-section">
            <h2>General</h2>
            <p>Startup behavior and analysis defaults.</p>
            <div className="setting-row">
              <label>
                Default playing strength
                <span>Used when Chess Buddy starts</span>
              </label>
              <div style={{ minWidth: 220 }}>
                <StrengthSlider
                  value={settings.strength}
                  onChange={(v) => void update({ strength: v })}
                />
              </div>
            </div>
            <div className="setting-row">
              <label>
                Remember last strength
                <span>Keep your slider position between sessions</span>
              </label>
              <input
                type="checkbox"
                checked={settings.rememberLastStrength}
                onChange={(e) => void update({ rememberLastStrength: e.target.checked })}
              />
            </div>
            <div className="setting-row">
              <label>
                Start state
                <span>Auto Play defaults to manual for safety</span>
              </label>
              <select
                value={settings.startState}
                onChange={(e) =>
                  void update({ startState: e.target.value as UserSettings["startState"] })
                }
              >
                <option value="always-manual">Always Manual</option>
                <option value="remember">Remember Last Mode</option>
                <option value="always-auto">Always Auto Play</option>
              </select>
            </div>
            <div className="setting-row">
              <label>
                Automatically analyze detected games
                <span>Run analysis when the board changes</span>
              </label>
              <input
                type="checkbox"
                checked={settings.autoAnalyze}
                onChange={(e) => void update({ autoAnalyze: e.target.checked })}
              />
            </div>
            <div className="setting-row">
              <label>
                Move lines in popup
                <span>Show best move only, or top 2–3 engine lines</span>
              </label>
              <select
                value={settings.topMovesCount}
                onChange={(e) =>
                  void update({ topMovesCount: Number(e.target.value) as UserSettings["topMovesCount"] })
                }
              >
                <option value={1}>Best move only</option>
                <option value={2}>Top 2 moves</option>
                <option value={3}>Top 3 moves</option>
              </select>
            </div>
          </section>
        )}

        {section === "engine" && (
          <section className="settings-section">
            <h2>Engine</h2>
            <p>Advanced Stockfish configuration.</p>
            <div className="setting-row">
              <label>Engine</label>
              <span>Stockfish</span>
            </div>
            <div className="setting-row">
              <label>
                Maximum analysis time
                <span>Upper bound per move calculation</span>
              </label>
              <select
                value={settings.engineSettings.maxAnalysisTimeMs}
                onChange={(e) =>
                  void update({
                    engineSettings: {
                      ...settings.engineSettings,
                      maxAnalysisTimeMs: Number(e.target.value),
                    },
                  })
                }
              >
                {[500, 1000, 2000, 5000, 10000].map((ms) => (
                  <option key={ms} value={ms}>{ms / 1000}s</option>
                ))}
              </select>
            </div>
            <div className="setting-row">
              <label>Maximum depth</label>
              <input
                type="number"
                min={6}
                max={30}
                value={settings.engineSettings.maxDepth ?? 18}
                onChange={(e) =>
                  void update({
                    engineSettings: {
                      ...settings.engineSettings,
                      maxDepth: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div className="setting-row">
              <label>Threads</label>
              <input
                type="number"
                min={1}
                max={4}
                value={settings.engineSettings.threads ?? 1}
                onChange={(e) =>
                  void update({
                    engineSettings: {
                      ...settings.engineSettings,
                      threads: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div className="setting-row">
              <label>Hash memory (MB)</label>
              <input
                type="number"
                min={16}
                max={256}
                value={settings.engineSettings.hashMb ?? 64}
                onChange={(e) =>
                  void update({
                    engineSettings: {
                      ...settings.engineSettings,
                      hashMb: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
          </section>
        )}

        {section === "automation" && (
          <section className="settings-section">
            <h2>Automation</h2>
            <p>Control automatic move behavior and stop conditions.</p>
            <div className="setting-row">
              <label>Auto Play master toggle</label>
              <input
                type="checkbox"
                checked={settings.autoPlay}
                onChange={(e) => void update({ autoPlay: e.target.checked })}
              />
            </div>
            <div className="setting-row">
              <label>Default move delay (seconds)</label>
              <input
                type="number"
                min={0.5}
                max={10}
                step={0.1}
                value={settings.moveDelay}
                onChange={(e) => void update({ moveDelay: Number(e.target.value) })}
              />
            </div>
            <div className="setting-row">
              <label>Randomize move delay</label>
              <input
                type="checkbox"
                checked={settings.randomizedDelay}
                onChange={(e) => void update({ randomizedDelay: e.target.checked })}
              />
            </div>
            <div className="setting-row">
              <label>Random delay jitter (± seconds)</label>
              <input
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={settings.randomDelayJitterSec}
                onChange={(e) => void update({ randomDelayJitterSec: Number(e.target.value) })}
              />
            </div>
            <div className="setting-row">
              <label>Confirm before enabling Auto Play</label>
              <input
                type="checkbox"
                checked={settings.confirmAutoPlay}
                onChange={(e) => void update({ confirmAutoPlay: e.target.checked })}
              />
            </div>
            <div className="setting-row">
              <label>Stop when game ends</label>
              <input
                type="checkbox"
                checked={settings.stopOnGameEnd}
                onChange={(e) => void update({ stopOnGameEnd: e.target.checked })}
              />
            </div>
            <div className="setting-row">
              <label>Stop if position changes unexpectedly</label>
              <input
                type="checkbox"
                checked={settings.stopOnUnexpectedPosition}
                onChange={(e) => void update({ stopOnUnexpectedPosition: e.target.checked })}
              />
            </div>
            <div className="setting-row">
              <label>Stop on unsupported state</label>
              <input
                type="checkbox"
                checked={settings.stopOnUnsupported}
                onChange={(e) => void update({ stopOnUnsupported: e.target.checked })}
              />
            </div>
          </section>
        )}

        {section === "appearance" && (
          <section className="settings-section">
            <h2>Appearance</h2>
            <p>Theme, accent, and material style.</p>
            <div className="setting-row">
              <label>Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => void update({ theme: e.target.value as UserSettings["theme"] })}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div className="setting-row">
              <label>Accent</label>
              <select
                value={settings.accent}
                onChange={(e) => void update({ accent: e.target.value as UserSettings["accent"] })}
              >
                <option value="slate">Slate</option>
                <option value="forest">Forest</option>
                <option value="ocean">Ocean</option>
              </select>
            </div>
            <div className="setting-row">
              <label>Surface style</label>
              <select
                value={settings.surfaceStyle}
                onChange={(e) =>
                  void update({ surfaceStyle: e.target.value as UserSettings["surfaceStyle"] })
                }
              >
                <option value="glass">Glass</option>
                <option value="standard">Standard</option>
              </select>
            </div>
            <div className="setting-row">
              <label>Move notation</label>
              <select
                value={settings.moveNotation}
                onChange={(e) =>
                  void update({ moveNotation: e.target.value as UserSettings["moveNotation"] })
                }
              >
                <option value="san">SAN</option>
                <option value="coordinates">Board coordinates</option>
                <option value="uci">UCI</option>
              </select>
            </div>
            <div className="setting-row">
              <label>Reduced motion</label>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => void update({ reducedMotion: e.target.checked })}
              />
            </div>
          </section>
        )}

        {section === "sites" && (
          <section className="settings-section">
            <h2>Supported Sites</h2>
            <p>Site adapters and automation availability.</p>
            <ul className="site-list">
              {SUPPORTED_SITES.map((site) => (
                <li key={site.id}>
                  <span>{site.name}</span>
                  <span className="site-badge">
                    {site.automation ? "Analysis + Auto Play" : "Detection preview"}
                  </span>
                </li>
              ))}
            </ul>
            <h3 style={{ marginTop: 24, fontSize: 14 }}>Coming Soon</h3>
            <ul className="site-list">
              {COMING_SOON_SITES.map((site) => (
                <li key={site.id}>
                  <span>{site.name}</span>
                  <span className="site-badge">Planned</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {section === "advanced" && (
          <section className="settings-section">
            <h2>Advanced</h2>
            <p>Developer diagnostics.</p>
            <div className="setting-row">
              <label>Debug mode</label>
              <input
                type="checkbox"
                checked={settings.debugMode}
                onChange={(e) => void update({ debugMode: e.target.checked })}
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
