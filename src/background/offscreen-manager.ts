import { logger } from "../shared/logger";

const OFFSCREEN_PATH = "src/offscreen/offscreen.html";

let creating: Promise<void> | null = null;

export async function ensureOffscreenDocument(): Promise<void> {
  if (creating) return creating;

  creating = (async () => {
    if (typeof chrome.offscreen?.hasDocument === "function") {
      const hasDoc = await chrome.offscreen.hasDocument();
      if (hasDoc) return;
    }

    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL(OFFSCREEN_PATH),
      reasons: [chrome.offscreen.Reason.WORKERS],
      justification: "Run Stockfish in an extension context away from page CSP",
    });
    logger.info("Offscreen document created");
  })();

  try {
    await creating;
  } finally {
    creating = null;
  }
}

export async function closeOffscreenDocument(): Promise<void> {
  if (typeof chrome.offscreen?.hasDocument !== "function") return;
  const hasDoc = await chrome.offscreen.hasDocument();
  if (hasDoc) await chrome.offscreen.closeDocument();
}
