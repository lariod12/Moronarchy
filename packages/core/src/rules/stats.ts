import {
  PLOT_DEFENSE,
  RESIDENTS,
  WARRIOR_KING_ATTACK_BONUS,
  WARRIOR_KING_DEFENSE_BONUS,
  WAR_FEVER_ATTACK_BONUS
} from "../content/balance";
import { EQUIPMENT_STATS } from "../content/items";
import type {
  ActiveGlobalEvent,
  FighterRef,
  FightState,
  GameState,
  GlobalEventId,
  King,
  PlayerId,
  Resident,
  TileId
} from "../model/types";
import { getPlot } from "./board";

export interface KingStats {
  maxHealth: number;
  attack: number;
  defense: number;
  lucky: number;
}

export interface ResidentStats {
  maxHealth: number;
  attack: number;
  defense: number;
}

export interface CombatStats {
  attack: number;
  defense: number;
}

export interface GarrisonStats extends CombatStats {
  count: number;
}

export const getActiveGlobalEvent = (state: GameState, eventId: GlobalEventId): ActiveGlobalEvent | undefined =>
  state.activeGlobalEvents.find(
    (event) => event.eventId === eventId && event.startRound <= state.round && state.round <= event.endRound
  );

export const getEquipmentBonus = (king: King): { attack: number; defense: number; lucky: number } => {
  const bonus = { attack: 0, defense: 0, lucky: 0 };
  for (const [itemId, stats] of Object.entries(EQUIPMENT_STATS)) {
    if ((king.items[itemId as keyof King["items"]] ?? 0) > 0 && stats) {
      bonus.attack += stats.attack ?? 0;
      bonus.defense += stats.defense ?? 0;
      bonus.lucky += stats.lucky ?? 0;
    }
  }
  return bonus;
};

export const getKingStats = (state: GameState, playerId: PlayerId): KingStats => {
  const king = state.kings[playerId];
  if (!king) {
    throw new Error(`Unknown king ${playerId}`);
  }
  const bonus = getEquipmentBonus(king);
  return {
    maxHealth: king.maxHealth,
    attack: king.attack + bonus.attack,
    defense: king.defense + bonus.defense,
    lucky: king.lucky + bonus.lucky
  };
};

export const getResidentStats = (resident: Pick<Resident, "kind" | "level">): ResidentStats => {
  const template = RESIDENTS[resident.kind];
  const extra = resident.level - 1;
  return {
    maxHealth: template.health + template.healthPerLevel * extra,
    attack: template.attack + template.attackPerLevel * extra,
    defense: template.defense + template.defensePerLevel * extra
  };
};

export const getResidentsOnPlot = (state: GameState, plotId: TileId): Resident[] => {
  const plot = getPlot(state, plotId);
  if (!plot) {
    return [];
  }
  return plot.residentIds.flatMap((id) => {
    const resident = state.residents[id];
    return resident ? [resident] : [];
  });
};

// Garrison (n alive residents): best attack/defense + (n - 1)
export const getGarrisonStats = (state: GameState, plotId: TileId): GarrisonStats => {
  const residents = getResidentsOnPlot(state, plotId);
  if (residents.length === 0) {
    return { count: 0, attack: 0, defense: 0 };
  }
  const stats = residents.map(getResidentStats);
  return {
    count: residents.length,
    attack: Math.max(...stats.map((entry) => entry.attack)) + (residents.length - 1),
    defense: Math.max(...stats.map((entry) => entry.defense)) + (residents.length - 1)
  };
};

export const getKingFightStats = (state: GameState, fight: FightState, playerId: PlayerId): CombatStats => {
  const base = getKingStats(state, playerId);
  const buff = fight.buffs[playerId] ?? { attack: 0, defense: 0 };
  let attack = base.attack + buff.attack;
  let defense = base.defense + buff.defense;
  if (getActiveGlobalEvent(state, "warFever")) {
    attack += WAR_FEVER_ATTACK_BONUS;
  }
  if (fight.kind === "kingVsKing") {
    const plot = getPlot(state, fight.plotId);
    if (plot && plot.ownerId === playerId) {
      const warriors = getResidentsOnPlot(state, plot.id).filter((resident) => resident.kind === "warrior").length;
      attack += warriors * WARRIOR_KING_ATTACK_BONUS;
      defense += warriors * WARRIOR_KING_DEFENSE_BONUS;
    }
  }
  return { attack, defense };
};

export const getFighterStats = (state: GameState, fight: FightState, ref: FighterRef): CombatStats => {
  if (ref.type === "king") {
    return getKingFightStats(state, fight, ref.playerId);
  }
  if (ref.type === "garrison") {
    const garrison = getGarrisonStats(state, ref.plotId);
    return {
      attack: garrison.attack + (getActiveGlobalEvent(state, "warFever") ? WAR_FEVER_ATTACK_BONUS : 0),
      defense: garrison.defense
    };
  }
  const plot = getPlot(state, ref.plotId);
  return { attack: 0, defense: PLOT_DEFENSE[plot?.level ?? 0] ?? 0 };
};
