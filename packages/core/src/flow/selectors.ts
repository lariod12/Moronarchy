import type { EliminationReason, GameState, LogEntry, PlayerId, Plot, TileId } from "../model/types";
import { getPlot } from "../rules/board";
import { getFightHumanIds } from "../rules/combat";
import { getAliveKingIds, getFinalRanking } from "../rules/elimination";
import { getActiveGlobalEvent, getGarrisonStats, getResidentsOnPlot } from "../rules/stats";

export type CrownState = "finished" | "eliminated" | "idle" | "shaking" | "canEndTurn" | "active";

export const getCrownState = (state: GameState, viewerId: PlayerId): CrownState => {
  if (state.phase === "finished") {
    return "finished";
  }
  if (state.kings[viewerId]?.eliminated) {
    return "eliminated";
  }
  if (state.turn.playerId !== viewerId) {
    return "idle";
  }
  if (state.turn.step === "awaitClaim") {
    return "shaking";
  }
  if (state.turn.step === "postMove" && !state.pending && !state.fight) {
    return "canEndTurn";
  }
  return "active";
};

export interface EliminationInfo {
  eliminated: boolean;
  // The round the king went out in (null while alive).
  round: number | null;
  // Bankrupt, or left after disconnecting (null while alive).
  reason: EliminationReason | null;
  // Final place, 1 = winner. Only known once the game is finished (null while it still runs).
  rank: number | null;
}

export const getEliminationInfo = (state: GameState, playerId: PlayerId): EliminationInfo => {
  const king = state.kings[playerId];
  const place = getFinalRanking(state).indexOf(playerId);
  return {
    eliminated: king?.eliminated ?? false,
    round: king?.eliminatedRound ?? null,
    reason: king?.eliminationReason ?? null,
    rank: state.phase === "finished" && place >= 0 ? place + 1 : null
  };
};

// Who the running game is waiting on: the turn player, whoever a pending decision is addressed to, and every human
// fighter who has not rolled this round. Empty unless the game is running.
export const getBlockingPlayerIds = (state: GameState): PlayerId[] => {
  if (state.phase !== "playing") {
    return [];
  }
  const ids: PlayerId[] = [state.turn.playerId];
  if (state.pending) {
    ids.push(state.pending.playerId);
  }
  const fight = state.fight;
  if (fight) {
    ids.push(...getFightHumanIds(fight).filter((id) => fight.pendingRolls[id] === undefined));
  }
  return [...new Set(ids)].filter((id) => state.kings[id] !== undefined && !state.kings[id].eliminated);
};

export const getAliveKings = (state: GameState): PlayerId[] => getAliveKingIds(state);

export const getPlotById = (state: GameState, tileId: TileId): Plot | undefined => getPlot(state, tileId);

export const getOwnedPlots = (state: GameState, playerId: PlayerId): Plot[] =>
  state.plots.filter((plot) => plot.ownerId === playerId);

export { getActiveGlobalEvent, getFinalRanking, getGarrisonStats, getResidentsOnPlot };
export {
  getBountifulIncomeMultiplier,
  getInflationMultiplier,
  getPlotBasePrice,
  getPlotFee,
  getPlotHealCost,
  getPlotIncome,
  getPlotMaxHealth,
  getPlotPrice,
  getPlotUpgradeCost,
  getResidentHealCost,
  getResidentRecruitCost,
  getResidentUpgradeCost
} from "../rules/economy";
export { getKingStats, getResidentStats } from "../rules/stats";

export { getItemCount } from "../rules/items";
export { getMaxResidents } from "../rules/residents";

// Newest log entry of a type (optionally by one player), e.g. the `lapCompleted` entry behind the Start Station summary.
export const getLatestLogEntry = (state: GameState, type: string, playerId?: PlayerId): LogEntry | undefined =>
  [...state.log].reverse().find((entry) => entry.type === type && (playerId === undefined || entry.playerId === playerId));
