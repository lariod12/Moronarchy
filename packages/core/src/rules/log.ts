import { EVENT_HISTORY_LIMIT, LOG_LIMIT } from "../content/balance";
import type { GameState, GlobalEventId, LogEntry, PersonalEventId, PlayerId } from "../model/types";

// Log types in use: gameStarted, turnClaimed, turnSkipped, diceRolled, diceRerolled, lapCompleted, cardPicked,
// plotBought, plotSkipped, plotUpgraded, plotHealed, residentRecruited, residentUpgraded, residentHealed,
// itemBought, itemUsed, itemFound, bagFull, personalEvent, globalEvent, feePaid, fightStarted, fightRound,
// fightEnded, knockedOut, residentKilled, plotLevelDown, plotDestroyed, kingEliminated, kingLeft, gameFinished.

export const nextSeq = (state: GameState): number => {
  state.seq += 1;
  return state.seq;
};

export const pushLog = (
  state: GameState,
  type: string,
  playerId: PlayerId | null,
  data: LogEntry["data"] = {}
): void => {
  state.log.push({ seq: nextSeq(state), round: state.round, type, playerId, data });
  if (state.log.length > LOG_LIMIT) {
    state.log.splice(0, state.log.length - LOG_LIMIT);
  }
};

export const pushEventHistory = (
  state: GameState,
  scope: "global" | "personal",
  eventId: GlobalEventId | PersonalEventId,
  playerId: PlayerId | null
): void => {
  state.eventHistory.push({ seq: nextSeq(state), round: state.round, scope, eventId, playerId });
  if (state.eventHistory.length > EVENT_HISTORY_LIMIT) {
    state.eventHistory.splice(0, state.eventHistory.length - EVENT_HISTORY_LIMIT);
  }
};
