import { useEffect } from "react";
import type { UserSettings } from "../../shared/types";

export function applyTheme(settings: UserSettings): void {
  const root = document.documentElement;
  const theme =
    settings.theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : settings.theme;
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-accent", settings.accent);
  root.setAttribute("data-surface", settings.surfaceStyle);
  root.setAttribute(
    "data-reduced-motion",
    settings.reducedMotion ? "true" : "false",
  );
}

export function useTheme(settings: UserSettings | null): void {
  useEffect(() => {
    if (!settings) return;
    applyTheme(settings);
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(settings);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [settings]);
}
