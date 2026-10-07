import type { RunCheck } from "./game-actions";

export const MANAGE_HINT = "Upgrade at the Start station or while standing on this plot";

type CheckResult = ReturnType<RunCheck>;

// Why a manage button (upgrade / heal of an own plot or resident) is disabled. The engine says which rule refused;
// `limitHint` tells what "limit reached" means for this particular button. Null when the engine would accept it.
export const getManageHint = (result: CheckResult, limitHint: string): string | null => {
  if (result.ok) {
    return null;
  }
  switch (result.error) {
    case "WRONG_STEP":
    case "NOT_ALLOWED":
    case "NOT_YOUR_TURN":
    case "PENDING_DECISION":
      return MANAGE_HINT;
    case "LIMIT_REACHED":
      return limitHint;
    case "INSUFFICIENT_COIN":
      return "Not enough coin";
    case "NOT_ACTOR":
      return "You are out of the game";
    case "GAME_OVER":
      return "The game is over";
    default:
      return "This is not available right now";
  }
};
