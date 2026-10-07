import {
  BOUNTIFUL_YEAR_INCOME_MULTIPLIER,
  FARMER_INCOME_PER_LEVEL,
  INFLATION_START_ROUND,
  INFLATION_STEP,
  INFLATION_STEP_ROUNDS,
  MARKET_BOOM_FEE_MULTIPLIER,
  MAX_PLOT_LEVEL,
  MAX_RESIDENT_LEVEL,
  PLOT_FEE_MULTIPLIER,
  PLOT_HEALTH,
  PLOT_HEAL_BASE,
  PLOT_HEAL_PER_LEVEL,
  PLOT_INCOME_MULTIPLIER,
  PLOT_UPGRADE_MULTIPLIER,
  RESIDENTS,
  RESIDENT_HEAL_BASE,
  RESIDENT_HEAL_PER_LEVEL
} from "../content/balance";
import type { GameState, Plot, Resident, TileId } from "../model/types";
import { getRegionBasePrice } from "./board";
import { getActiveGlobalEvent, getResidentStats } from "./stats";

export const getPlotBasePrice = (tileId: TileId): number => getRegionBasePrice(tileId);

export const getPlotPrice = (tileId: TileId): number => getPlotBasePrice(tileId);

export const getInflationMultiplier = (round: number): number =>
  round < INFLATION_START_ROUND
    ? 1
    : 1 + INFLATION_STEP * (Math.floor((round - INFLATION_START_ROUND) / INFLATION_STEP_ROUNDS) + 1);

export const getPlotFee = (state: GameState, plot: Plot): number =>
  Math.round(
    getPlotBasePrice(plot.id) *
      (PLOT_FEE_MULTIPLIER[plot.level] ?? 0) *
      getInflationMultiplier(state.round) *
      (getActiveGlobalEvent(state, "marketBoom") ? MARKET_BOOM_FEE_MULTIPLIER : 1)
  );

export const getPlotIncome = (state: GameState, plot: Plot): number => {
  const base = Math.round(getPlotBasePrice(plot.id) * (PLOT_INCOME_MULTIPLIER[plot.level] ?? 0));
  const farmers = plot.residentIds.reduce((sum, id) => {
    const resident = state.residents[id];
    return resident && resident.kind === "farmer" ? sum + FARMER_INCOME_PER_LEVEL * resident.level : sum;
  }, 0);
  return base + farmers;
};

export const getBountifulIncomeMultiplier = (state: GameState): number =>
  getActiveGlobalEvent(state, "bountifulYear") ? BOUNTIFUL_YEAR_INCOME_MULTIPLIER : 1;

export const getPlotMaxHealth = (level: number): number => PLOT_HEALTH[level] ?? 0;

export const getPlotUpgradeCost = (plot: Plot): number | null => {
  if (plot.level >= MAX_PLOT_LEVEL) {
    return null;
  }
  return Math.round(getPlotBasePrice(plot.id) * (PLOT_UPGRADE_MULTIPLIER[plot.level] ?? 0));
};

export const getPlotHealCost = (plot: Plot): number => {
  const max = getPlotMaxHealth(plot.level);
  const missing = max - plot.health;
  if (missing <= 0 || max <= 0) {
    return 0;
  }
  return Math.ceil((missing / max) * (PLOT_HEAL_BASE + PLOT_HEAL_PER_LEVEL * plot.level));
};

export const getResidentHealCost = (resident: Resident): number => {
  const max = getResidentStats(resident).maxHealth;
  const missing = max - resident.health;
  if (missing <= 0) {
    return 0;
  }
  return Math.ceil((missing / max) * (RESIDENT_HEAL_BASE + RESIDENT_HEAL_PER_LEVEL * resident.level));
};

export const getResidentUpgradeCost = (resident: Resident): number | null => {
  if (resident.level >= MAX_RESIDENT_LEVEL) {
    return null;
  }
  return RESIDENTS[resident.kind].upgradeCostPerLevel * resident.level;
};

export const getResidentRecruitCost = (kind: Resident["kind"]): number => RESIDENTS[kind].cost;
