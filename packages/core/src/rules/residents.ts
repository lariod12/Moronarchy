import { MAX_RESIDENT_LEVEL, PLOT_MAX_RESIDENTS, RESIDENTS } from "../content/balance";
import type {
  CommandResult,
  FightState,
  GameState,
  PlayerId,
  Plot,
  Resident,
  ResidentId,
  ResidentKind,
  TileId
} from "../model/types";
import { getPlot } from "./board";
import { getResidentHealCost, getResidentUpgradeCost } from "./economy";
import { nextSeq, pushLog } from "./log";
import { getResidentStats, getResidentsOnPlot } from "./stats";

export const getMaxResidents = (plot: Plot): number => PLOT_MAX_RESIDENTS[plot.level] ?? 0;

// Creates a resident without charging anything. Caller validates slots and cost.
export const createResident = (state: GameState, plot: Plot, kind: ResidentKind, ownerId: PlayerId): Resident => {
  const king = state.kings[ownerId];
  if (!king) {
    throw new Error(`Unknown king ${ownerId}`);
  }
  king.recruited += 1;
  const resident: Resident = {
    id: `r${nextSeq(state)}`,
    name: String(king.recruited).padStart(2, "0"),
    kind,
    level: 1,
    health: RESIDENTS[kind].health,
    ownerId,
    plotId: plot.id
  };
  state.residents[resident.id] = resident;
  plot.residentIds.push(resident.id);
  return resident;
};

export const removeResident = (state: GameState, residentId: ResidentId): void => {
  const resident = state.residents[residentId];
  if (!resident) {
    return;
  }
  const plot = getPlot(state, resident.plotId);
  if (plot) {
    plot.residentIds = plot.residentIds.filter((id) => id !== residentId);
  }
  delete state.residents[residentId];
};

export const recruitResident = (
  state: GameState,
  playerId: PlayerId,
  plotId: TileId,
  kind: ResidentKind
): CommandResult => {
  const king = state.kings[playerId];
  const plot = getPlot(state, plotId);
  if (!king || !plot || plot.ownerId !== playerId || !(kind in RESIDENTS)) {
    return { ok: false, error: "INVALID_TARGET" };
  }
  if (plot.residentIds.length >= getMaxResidents(plot)) {
    return { ok: false, error: "LIMIT_REACHED" };
  }
  const cost = RESIDENTS[kind].cost;
  if (king.coin < cost) {
    return { ok: false, error: "INSUFFICIENT_COIN" };
  }
  king.coin -= cost;
  const resident = createResident(state, plot, kind, playerId);
  pushLog(state, "residentRecruited", playerId, { plotId, residentId: resident.id, kind, cost });
  return { ok: true };
};

export const getOwnedResident = (state: GameState, playerId: PlayerId, residentId: ResidentId): Resident | undefined => {
  const resident = state.residents[residentId];
  return resident && resident.ownerId === playerId ? resident : undefined;
};

export const upgradeResident = (state: GameState, playerId: PlayerId, residentId: ResidentId): CommandResult => {
  const king = state.kings[playerId];
  const resident = getOwnedResident(state, playerId, residentId);
  const plot = resident ? getPlot(state, resident.plotId) : undefined;
  if (!king || !resident || !plot) {
    return { ok: false, error: "INVALID_TARGET" };
  }
  if (resident.level >= MAX_RESIDENT_LEVEL || resident.level + 1 > Math.max(1, plot.level)) {
    return { ok: false, error: "LIMIT_REACHED" };
  }
  const cost = getResidentUpgradeCost(resident);
  if (cost === null) {
    return { ok: false, error: "LIMIT_REACHED" };
  }
  if (king.coin < cost) {
    return { ok: false, error: "INSUFFICIENT_COIN" };
  }
  king.coin -= cost;
  const oldMax = getResidentStats(resident).maxHealth;
  resident.level += 1;
  resident.health += getResidentStats(resident).maxHealth - oldMax;
  pushLog(state, "residentUpgraded", playerId, { residentId, level: resident.level, cost });
  return { ok: true };
};

export const healResident = (state: GameState, playerId: PlayerId, residentId: ResidentId): CommandResult => {
  const king = state.kings[playerId];
  const resident = getOwnedResident(state, playerId, residentId);
  if (!king || !resident) {
    return { ok: false, error: "INVALID_TARGET" };
  }
  const max = getResidentStats(resident).maxHealth;
  if (resident.health >= max) {
    return { ok: false, error: "NOT_ALLOWED" };
  }
  const cost = getResidentHealCost(resident);
  if (king.coin < cost) {
    return { ok: false, error: "INSUFFICIENT_COIN" };
  }
  king.coin -= cost;
  resident.health = max;
  pushLog(state, "residentHealed", playerId, { residentId, cost });
  return { ok: true };
};

// Weakest first: level asc, then attack + defense + maxHealth asc, then id asc.
const compareWeakest = (left: Resident, right: Resident): number => {
  if (left.level !== right.level) {
    return left.level - right.level;
  }
  const leftStats = getResidentStats(left);
  const rightStats = getResidentStats(right);
  const leftPower = leftStats.attack + leftStats.defense + leftStats.maxHealth;
  const rightPower = rightStats.attack + rightStats.defense + rightStats.maxHealth;
  if (leftPower !== rightPower) {
    return leftPower - rightPower;
  }
  // Ids are r<seq>: compare the numeric part so older residents come first.
  return Number(left.id.slice(1)) - Number(right.id.slice(1));
};

// Applies damage to the shared garrison pool and kills/updates residents. Returns residents killed.
export const damageGarrison = (state: GameState, fight: FightState, damage: number): number => {
  const garrison = fight.garrison;
  if (!garrison) {
    return 0;
  }
  garrison.pool = Math.max(0, garrison.pool - damage);
  const targetAlive = garrison.pool === 0 ? 0 : Math.ceil((garrison.pool * garrison.startCount) / garrison.maxPool);
  let killed = 0;
  let alive = getResidentsOnPlot(state, fight.plotId);
  while (alive.length > targetAlive) {
    const weakest = [...alive].sort(compareWeakest)[0];
    if (!weakest) {
      break;
    }
    pushLog(state, "residentKilled", weakest.ownerId, { residentId: weakest.id, plotId: fight.plotId });
    removeResident(state, weakest.id);
    killed += 1;
    alive = getResidentsOnPlot(state, fight.plotId);
  }
  const totalMax = alive.reduce((sum, resident) => sum + getResidentStats(resident).maxHealth, 0);
  for (const resident of alive) {
    const max = getResidentStats(resident).maxHealth;
    resident.health = Math.min(max, Math.max(1, Math.floor((garrison.pool * max) / totalMax)));
  }
  return killed;
};
