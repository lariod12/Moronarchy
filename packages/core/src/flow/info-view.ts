import { PLOT_DEFENSE } from "../content/balance";
import { GLOBAL_EVENTS, PERSONAL_EVENTS } from "../content/events";
import type { GameState, GlobalEventId, PersonalEventId, PlayerId, Resident, ResidentId, ResidentKind, TileId } from "../model/types";
import { getPlot } from "../rules/board";
import {
  getPlotFee,
  getPlotHealCost,
  getPlotIncome,
  getPlotMaxHealth,
  getPlotPrice,
  getPlotUpgradeCost,
  getResidentHealCost,
  getResidentUpgradeCost
} from "../rules/economy";
import { getMaxResidents } from "../rules/residents";
import { getEquipmentBonus, getKingStats, getResidentStats, getResidentsOnPlot } from "../rules/stats";

// Read-only views for the in-game info screens (Stats, Plots, Residents, Events, Steps). Pure functions of the state.

export interface KingInfo {
  playerId: PlayerId;
  name: string;
  eliminated: boolean;
  level: number;
  coin: number;
  health: number;
  laps: number;
  plotsOwned: number;
  // Effective values (base + equipment). `bonus` is the equipment part, so the UI can show "Attack: 7 (+2)".
  maxHealth: number;
  attack: number;
  defense: number;
  lucky: number;
  bonus: { attack: number; defense: number; lucky: number };
}

export const getKingInfo = (state: GameState, playerId: PlayerId): KingInfo | null => {
  const king = state.kings[playerId];
  if (!king) {
    return null;
  }
  const stats = getKingStats(state, playerId);
  return {
    playerId,
    name: king.name,
    eliminated: king.eliminated,
    level: king.level,
    coin: king.coin,
    health: king.health,
    laps: king.laps,
    plotsOwned: state.plots.filter((plot) => plot.ownerId === playerId).length,
    maxHealth: stats.maxHealth,
    attack: stats.attack,
    defense: stats.defense,
    lucky: stats.lucky,
    bonus: getEquipmentBonus(king)
  };
};

export interface ResidentInfo {
  id: ResidentId;
  name: string;
  kind: ResidentKind;
  level: number;
  ownerId: PlayerId;
  plotId: TileId;
  plotLevel: number;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  upgradeCost: number | null; // null at the highest level
  healCost: number; // 0 at full health
}

const toResidentInfo = (state: GameState, resident: Resident): ResidentInfo => {
  const stats = getResidentStats(resident);
  return {
    id: resident.id,
    name: resident.name,
    kind: resident.kind,
    level: resident.level,
    ownerId: resident.ownerId,
    plotId: resident.plotId,
    plotLevel: getPlot(state, resident.plotId)?.level ?? 0,
    health: resident.health,
    maxHealth: stats.maxHealth,
    attack: stats.attack,
    defense: stats.defense,
    upgradeCost: getResidentUpgradeCost(resident),
    healCost: getResidentHealCost(resident)
  };
};

export const getResidentInfo = (state: GameState, residentId: ResidentId): ResidentInfo | null => {
  const resident = state.residents[residentId];
  return resident ? toResidentInfo(state, resident) : null;
};

// Names are "01", "02", ... in recruit order, so sorting by name keeps the oldest resident first.
const byName = (left: ResidentInfo, right: ResidentInfo): number =>
  left.name.localeCompare(right.name, "en", { numeric: true }) || left.id.localeCompare(right.id, "en", { numeric: true });

export const getResidentsByKind = (state: GameState, ownerId: PlayerId): Record<ResidentKind, ResidentInfo[]> => {
  const result: Record<ResidentKind, ResidentInfo[]> = { warrior: [], farmer: [] };
  for (const resident of Object.values(state.residents)) {
    if (resident.ownerId === ownerId) {
      result[resident.kind].push(toResidentInfo(state, resident));
    }
  }
  result.warrior.sort(byName);
  result.farmer.sort(byName);
  return result;
};

export interface PlotInfo {
  id: TileId;
  owned: boolean;
  ownerId: PlayerId | null;
  ownerName: string | null;
  level: number;
  price: number; // what it costs to buy it from the bank
  fee: number; // what a visitor pays (0 while nobody owns it)
  income: number;
  health: number;
  maxHealth: number;
  defense: number;
  maxResidents: number;
  upgradeCost: number | null; // null at the highest level or while unowned
  healCost: number;
  residents: ResidentInfo[];
}

export const getPlotInfo = (state: GameState, plotId: TileId): PlotInfo | null => {
  const plot = getPlot(state, plotId);
  if (!plot) {
    return null;
  }
  const owner = plot.ownerId === null ? undefined : state.kings[plot.ownerId];
  const owned = plot.ownerId !== null;
  return {
    id: plot.id,
    owned,
    ownerId: plot.ownerId,
    ownerName: owner?.name ?? null,
    level: plot.level,
    price: getPlotPrice(plot.id),
    fee: owned ? getPlotFee(state, plot) : 0,
    income: owned ? getPlotIncome(state, plot) : 0,
    health: plot.health,
    maxHealth: owned ? getPlotMaxHealth(plot.level) : 0,
    defense: owned ? (PLOT_DEFENSE[plot.level] ?? 0) : 0,
    maxResidents: owned ? getMaxResidents(plot) : 0,
    upgradeCost: owned ? getPlotUpgradeCost(plot) : null,
    healCost: owned ? getPlotHealCost(plot) : 0,
    residents: getResidentsOnPlot(state, plot.id).map((resident) => toResidentInfo(state, resident))
  };
};

export interface EventHistoryItem {
  seq: number;
  round: number;
  scope: "global" | "personal";
  eventId: GlobalEventId | PersonalEventId;
  playerId: PlayerId | null;
  playerName: string | null;
  // Who it concerns, from the viewer's point of view.
  target: "all" | "you" | "other";
  description: string;
  durationRounds: number; // 0 = instant
  active: boolean;
  roundsLeft: number | null; // only while active
}

// Newest first. Global events that are still running are pinned at the top.
export const getEventHistoryView = (state: GameState, viewerId: PlayerId): EventHistoryItem[] => {
  const roundsLeftOf = (eventId: GlobalEventId, startRound: number): number | null => {
    const active = state.activeGlobalEvents.find(
      (event) => event.eventId === eventId && event.startRound === startRound && event.startRound <= state.round && state.round <= event.endRound
    );
    return active ? active.endRound - state.round + 1 : null;
  };

  const items: EventHistoryItem[] = [...state.eventHistory]
    .sort((left, right) => right.seq - left.seq)
    .map((entry): EventHistoryItem => {
      if (entry.scope === "global") {
        const eventId = entry.eventId as GlobalEventId;
        const def = GLOBAL_EVENTS[eventId];
        const roundsLeft = roundsLeftOf(eventId, entry.round);
        return {
          seq: entry.seq,
          round: entry.round,
          scope: "global",
          eventId,
          playerId: null,
          playerName: null,
          target: "all",
          description: def.description,
          durationRounds: def.durationRounds,
          active: roundsLeft !== null,
          roundsLeft
        };
      }
      const eventId = entry.eventId as PersonalEventId;
      return {
        seq: entry.seq,
        round: entry.round,
        scope: "personal",
        eventId,
        playerId: entry.playerId,
        playerName: entry.playerId === null ? null : (state.kings[entry.playerId]?.name ?? null),
        target: entry.playerId === viewerId ? "you" : "other",
        description: PERSONAL_EVENTS[eventId].description,
        durationRounds: 0,
        active: false,
        roundsLeft: null
      };
    });
  // Stable partition: active events first, otherwise keep newest-first order.
  return [...items.filter((item) => item.active), ...items.filter((item) => !item.active)];
};

export interface PositionRow {
  turn: number; // 1-based seat in the turn order
  playerId: PlayerId;
  name: string;
  position: TileId;
  laps: number;
  eliminated: boolean;
  isCurrent: boolean;
}

// Where every king stands, in turn order.
export const getPositionsView = (state: GameState): PositionRow[] =>
  state.turnOrder.flatMap((playerId, index) => {
    const king = state.kings[playerId];
    if (!king) {
      return [];
    }
    return [
      {
        turn: index + 1,
        playerId,
        name: king.name,
        position: king.position,
        laps: king.laps,
        eliminated: king.eliminated,
        isCurrent: state.phase === "playing" && !king.eliminated && state.turn.playerId === playerId
      }
    ];
  });
