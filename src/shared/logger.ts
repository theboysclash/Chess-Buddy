type LogLevel = "debug" | "info" | "warn" | "error";

let debugEnabled = false;

export function setDebugMode(enabled: boolean): void {
  debugEnabled = enabled;
}

function log(level: LogLevel, message: string, metadata?: unknown): void {
  if (level === "debug" && !debugEnabled) return;
  const prefix = `[Chess Buddy] ${message}`;
  if (metadata !== undefined) {
    console[level](prefix, metadata);
  } else {
    console[level](prefix);
  }
}

export const logger = {
  debug: (message: string, metadata?: unknown) => log("debug", message, metadata),
  info: (message: string, metadata?: unknown) => log("info", message, metadata),
  warn: (message: string, metadata?: unknown) => log("warn", message, metadata),
  error: (message: string, metadata?: unknown) => log("error", message, metadata),
};
