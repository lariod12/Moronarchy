import { MAX_PLOT_LEVEL, PLOT_HEALTH } from "../content/balance";
import type { CommandResult, GameState, PlayerId, Plot, TileId } from "../model/types";
import { getPlot } from "./board";
import { getPlotHealCost, getPlotMaxHealth, getPlotPrice, getPlotUpgradeCost } from "./economy";
import { pushLog } from "./log";
import { removeResident } from "./residents";

export const claimPlot = (playerId: PlayerId, plot: Plot): void => {
  plot.ownerId = playerId;
  plot.level = 0;
  plot.health = PLOT_HEALTH[0];
  plot.residentIds = [];
};

export const releasePlot = (state: GameState, plot: Plot): void => {
  for (const residentId of [...plot.residentIds]) {
    removeResident(state, residentId);
  }
  plot.ownerId = null;
  plot.level = 0;
  plot.health = 0;
  plot.residentIds = [];
};

export const getOwnedPlotOf = (state: GameState, playerId: PlayerId, plotId: TileId): Plot | undefined => {
  const plot = getPlot(state, plotId);
  return plot && plot.ownerId === playerId ? plot : undefined;
};

export const buyPlotFor = (state: GameState, playerId: PlayerId, plotId: TileId): CommandResult => {
  const king = state.kings[playerId];
  const plot = getPlot(state, plotId);
  if (!king || !plot || plot.ownerId !== null) {
    return { ok: false, error: "INVALID_TARGET" };
  }
  const price = getPlotPrice(plotId);
  if (king.coin < price) {
    return { ok: false, error: "INSUFFICIENT_COIN" };
  }
  king.coin -= price;
  claimPlot(playerId, plot);
  pushLog(state, "plotBought", playerId, { plotId, price });
  return { ok: true };
};

export const upgradePlot = (state: GameState, playerId: PlayerId, plotId: TileId): CommandResult => {
  const king = state.kings[playerId];
  const plot = getOwnedPlotOf(state, playerId, plotId);
  if (!king || !plot) {
    return { ok: false, error: "INVALID_TARGET" };
  }
  if (plot.level >= MAX_PLOT_LEVEL || plot.level + 1 > king.level) {
    return { ok: false, error: "LIMIT_REACHED" };
  }
  const cost = getPlotUpgradeCost(plot);
  if (cost === null) {
    return { ok: false, error: "LIMIT_REACHED" };
  }
  if (king.coin < cost) {
    return { ok: false, error: "INSUFFICIENT_COIN" };
  }
  king.coin -= cost;
  const oldMax = getPlotMaxHealth(plot.level);
  plot.level += 1;
  plot.health += getPlotMaxHealth(plot.level) - oldMax;
  pushLog(state, "plotUpgraded", playerId, { plotId, level: plot.level, cost });
  return { ok: true };
};

export const healPlot = (state: GameState, playerId: PlayerId, plotId: TileId): CommandResult => {
  const king = state.kings[playerId];
  const plot = getOwnedPlotOf(state, playerId, plotId);
  if (!king || !plot) {
    return { ok: false, error: "INVALID_TARGET" };
  }
  if (plot.health >= getPlotMaxHealth(plot.level)) {
    return { ok: false, error: "NOT_ALLOWED" };
  }
  const cost = getPlotHealCost(plot);
  if (king.coin < cost) {
    return { ok: false, error: "INSUFFICIENT_COIN" };
  }
  king.coin -= cost;
  plot.health = getPlotMaxHealth(plot.level);
  pushLog(state, "plotHealed", playerId, { plotId, cost });
  return { ok: true };
};

export const damagePlot = (plot: Plot, damage: number): void => {
  plot.health = Math.max(0, plot.health - damage);
};
