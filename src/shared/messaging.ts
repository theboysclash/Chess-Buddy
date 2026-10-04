import type { ExtensionMessage, MessageResponse } from "./types";

export async function sendToBackground<T = unknown>(
  message: ExtensionMessage,
): Promise<MessageResponse<T>> {
  try {
    const response = (await chrome.runtime.sendMessage(message)) as MessageResponse<T>;
    return response ?? { ok: false, error: "No response" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Messaging failed",
    };
  }
}

export async function sendToActiveTab<T = unknown>(
  message: ExtensionMessage,
): Promise<MessageResponse<T>> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { ok: false, error: "No active tab" };
  try {
    const response = (await chrome.tabs.sendMessage(tab.id, message)) as MessageResponse<T>;
    return response ?? { ok: false, error: "No response" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Tab messaging failed",
    };
  }
}

export function onMessage(
  handler: (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
  ) => Promise<MessageResponse> | MessageResponse,
): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    void Promise.resolve(handler(message as ExtensionMessage, sender)).then(sendResponse);
    return true;
  });
}
