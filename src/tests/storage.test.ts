import { describe, expect, it } from "vitest";
import { validateSettings } from "../shared/storage";
import { DEFAULT_SETTINGS } from "../shared/constants";

describe("settings validation", () => {
  it("returns defaults for invalid input", () => {
    expect(validateSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("clamps strength and delay", () => {
    const result = validateSettings({ strength: 99, moveDelay: 100 });
    expect(result.strength).toBe(10);
    expect(result.moveDelay).toBe(10);
  });

  it("recovers invalid theme", () => {
    const result = validateSettings({ theme: "neon" as never });
    expect(result.theme).toBe("system");
  });
});
