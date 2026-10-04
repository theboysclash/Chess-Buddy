import type { BuddyState } from "../../shared/types";

interface StatusIndicatorProps {
  state: BuddyState;
  message: string;
}

function dotClass(state: BuddyState): string {
  if (state === "ANALYZING") return "analyzing";
  if (state === "ERROR") return "error";
  if (state === "GAME_OVER") return "complete";
  return "";
}

export function StatusIndicator({ state, message }: StatusIndicatorProps) {
  return (
    <div className="status-row" role="status">
      <span className={`status-dot ${dotClass(state)}`} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
