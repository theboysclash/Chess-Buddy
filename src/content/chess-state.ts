import type { BuddyState, ChessPosition, SiteInfo, TabGameState } from "../shared/types";

export function buildTabState(params: {
  site: SiteInfo;
  position: ChessPosition | null;
  isOurTurn: boolean;
  autoPlay: boolean;
}): TabGameState {
  const { site, position, isOurTurn, autoPlay } = params;

  let buddyState: BuddyState = "DETECTING_BOARD";
  let statusMessage = "Detecting board";

  if (!site.supported) {
    buddyState = "UNSUPPORTED";
    statusMessage = "Unsupported site";
  } else if (!site.boardDetected) {
    buddyState = "DETECTING_BOARD";
    statusMessage = "Board not detected";
  } else if (!position) {
    buddyState = "READY";
    statusMessage = "Ready";
  } else if (position.isGameOver) {
    buddyState = "GAME_OVER";
    statusMessage = "Game complete";
  } else if (autoPlay && isOurTurn) {
    buddyState = "AUTO_PLAYING";
    statusMessage = "Auto Play active";
  } else if (!isOurTurn) {
    buddyState = "WAITING";
    statusMessage = "Waiting for opponent";
  } else {
    buddyState = "READY";
    statusMessage = "Your turn";
  }

  return {
    buddyState,
    site,
    position,
    analysis: null,
    statusMessage,
    isOurTurn,
    autoPlayActive: autoPlay,
    updatedAt: Date.now(),
  };
}
