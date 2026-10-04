import type { EngineSettings } from "../shared/types";

/** Approximate target Elo per strength step (1–10). */
export const STRENGTH_ELO_TABLE: readonly number[] = [
  800,
  1000,
  1200,
  1400,
  1600,
  1800,
  2000,
  2200,
  2400,
  3200,
];

const TIER_LABELS: { maxElo: number; label: string }[] = [
  { maxElo: 1100, label: "Casual" },
  { maxElo: 1300, label: "Beginner" },
  { maxElo: 1700, label: "Intermediate" },
  { maxElo: 2100, label: "Strong" },
  { maxElo: 2500, label: "Expert" },
  { maxElo: Infinity, label: "Maximum" },
];

export function strengthToElo(strength: number): number {
  const index = Math.min(9, Math.max(0, Math.round(strength) - 1));
  return STRENGTH_ELO_TABLE[index];
}

export function getStrengthTier(elo: number): string {
  for (const tier of TIER_LABELS) {
    if (elo <= tier.maxElo) return tier.label;
  }
  return "Maximum";
}

export function getStrengthLabel(strength: number): string {
  const elo = strengthToElo(strength);
  const tier = getStrengthTier(elo);
  if (strength >= 10) return `${tier}`;
  return tier;
}

export function formatStrengthDisplay(strength: number): string {
  const elo = strengthToElo(strength);
  const tier = getStrengthTier(elo);
  if (strength >= 10) return `${tier} · Unrated cap`;
  return `${tier} · ${elo} Elo`;
}

export function getEngineSettingsForStrength(
  strength: number,
  base: EngineSettings,
): EngineSettings {
  const s = Math.min(10, Math.max(1, Math.round(strength)));
  const elo = strengthToElo(s);
  const skillLevel = Math.round((s / 10) * 20);
  const depthCap = Math.round(6 + s * 1.4);
  const timeMs = Math.round(500 + s * 200);
  const nodesCap = Math.round(50_000 + s * s * 30_000);
  const limitStrength = s < 10;

  return {
    ...base,
    maxAnalysisTimeMs: Math.min(base.maxAnalysisTimeMs, timeMs),
    maxDepth: Math.min(base.maxDepth ?? 22, depthCap),
    skillLevel,
    depthCap,
    nodesCap,
    uciElo: limitStrength ? elo : undefined,
    limitStrength,
  };
}

/** Pick move index for lower strengths (0 = best). */
export function pickMoveIndex(strength: number, candidateCount: number): number {
  if (candidateCount <= 1) return 0;
  const s = Math.min(10, Math.max(1, Math.round(strength)));
  if (s >= 9) return 0;
  if (s >= 7) return Math.random() < 0.85 ? 0 : 1;
  if (s >= 5) return Math.random() < 0.7 ? 0 : Math.min(1, candidateCount - 1);
  if (s >= 3) {
    const roll = Math.random();
    if (roll < 0.5) return 0;
    if (roll < 0.8) return Math.min(1, candidateCount - 1);
    return Math.min(2, candidateCount - 1);
  }
  const maxIdx = Math.min(3, candidateCount - 1);
  return Math.floor(Math.random() * (maxIdx + 1));
}

export function delaySecToLabel(seconds: number): string {
  if (seconds <= 1) return "Fast";
  if (seconds >= 6) return "Deliberate";
  return "Balanced";
}

export function formatDelay(seconds: number): string {
  const rounded = Math.round(seconds * 10) / 10;
  return `${rounded} second${rounded === 1 ? "" : "s"}`;
}

export function applyRandomizedDelay(
  baseSec: number,
  enabled: boolean,
  jitterSec: number,
): number {
  if (!enabled) return baseSec;
  const jitter = (Math.random() * 2 - 1) * jitterSec;
  return Math.max(0.5, Math.min(10, baseSec + jitter));
}
