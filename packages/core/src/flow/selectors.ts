import type { GameState, PlayerId, Plot, TileId } from "../model/types";
import { getPlot } from "../rules/board";
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
