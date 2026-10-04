import { DEFAULT_SETTINGS } from "./constants";
import type { UserSettings } from "./types";

const SETTINGS_KEY = "chess_buddy_settings";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function isTheme(v: unknown): v is UserSettings["theme"] {
  return v === "system" || v === "light" || v === "dark";
}

export function validateSettings(raw: Partial<UserSettings> | null | undefined): UserSettings {
  const base = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== "object") return base;

  const merged: UserSettings = {
    ...base,
    ...raw,
    engineSettings: { ...base.engineSettings, ...(raw.engineSettings ?? {}) },
    siteToggles: { ...base.siteToggles, ...(raw.siteToggles ?? {}) },
  };

  if (!isTheme(merged.theme)) merged.theme = base.theme;
  if (!["slate", "forest", "ocean"].includes(merged.accent)) merged.accent = base.accent;
  if (!["standard", "glass"].includes(merged.surfaceStyle)) merged.surfaceStyle = base.surfaceStyle;
  merged.strength = clamp(Math.round(merged.strength), 1, 10);
  merged.moveDelay = clamp(Number(merged.moveDelay) || base.moveDelay, 0.5, 10);
  merged.autoPlay = Boolean(merged.autoPlay);
  merged.randomDelayJitterSec = clamp(Number(merged.randomDelayJitterSec) || 0.5, 0, 2);
  if (!["san", "uci", "coordinates"].includes(merged.moveNotation)) {
    merged.moveNotation = base.moveNotation;
  }
  const top = Math.round(Number(merged.topMovesCount) || 1);
  merged.topMovesCount = top <= 1 ? 1 : top === 2 ? 2 : 3;
  if (!["always-manual", "remember", "always-auto"].includes(merged.startState)) {
    merged.startState = base.startState;
  }

  const time = merged.engineSettings.maxAnalysisTimeMs;
  merged.engineSettings.maxAnalysisTimeMs = clamp(time, 500, 10000);

  return merged;
}

export async function loadSettings(): Promise<UserSettings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return validateSettings(result[SETTINGS_KEY] as Partial<UserSettings> | undefined);
}

export async function saveSettings(partial: Partial<UserSettings>): Promise<UserSettings> {
  const current = await loadSettings();
  const next = validateSettings({ ...current, ...partial });
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

export function subscribeSettings(
  callback: (settings: UserSettings) => void,
): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    if (area !== "local" || !changes[SETTINGS_KEY]) return;
    callback(validateSettings(changes[SETTINGS_KEY].newValue as Partial<UserSettings>));
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
