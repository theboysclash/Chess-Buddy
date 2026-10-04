import { describe, expect, it } from "vitest";
import {
  applyRandomizedDelay,
  getEngineSettingsForStrength,
  getStrengthLabel,
} from "../engine/difficulty";
import { DEFAULT_ENGINE_SETTINGS } from "../shared/constants";

describe("difficulty", () => {
  it("maps strength labels", () => {
    expect(getStrengthLabel(1)).toBe("Casual");
    expect(getStrengthLabel(5)).toBe("Balanced");
    expect(getStrengthLabel(10)).toBe("Maximum");
  });

  it("returns tighter engine limits at low strength", () => {
    const low = getEngineSettingsForStrength(2, DEFAULT_ENGINE_SETTINGS);
    const high = getEngineSettingsForStrength(10, DEFAULT_ENGINE_SETTINGS);
    expect(low.maxAnalysisTimeMs).toBeLessThan(high.maxAnalysisTimeMs);
    expect(low.depthCap ?? 0).toBeLessThan(high.depthCap ?? 0);
  });

  it("clamps randomized delay", () => {
    const value = applyRandomizedDelay(2, true, 5);
    expect(value).toBeGreaterThanOrEqual(0.5);
    expect(value).toBeLessThanOrEqual(10);
  });
});
