import { FIGHT_ROUNDS_TO_WIN, GARRISON_LOOT_MULTIPLIER, KO_HEAL_RATIO, PLOT_HEALTH } from "../content/balance";
import type {
  FightResult,
  FightRoundRecord,
  FightState,
  GameState,
  PendingDecision,
  PlayerId,
  Plot
} from "../model/types";
import { getPlot } from "./board";
import { getPlotBasePrice, getPlotFee } from "./economy";
import { chargeFee } from "./elimination";
import { pushLog } from "./log";
import { damagePlot, releasePlot } from "./plots";
import { damageGarrison } from "./residents";
import type { Rng } from "./rng";
import { getFighterStats, getKingStats, getResidentStats, getResidentsOnPlot } from "./stats";

// King health <= 0 (fight or event): back up to half of effective max health and lose the next turn.
export const knockOut = (state: GameState, playerId: PlayerId): void => {
  const king = state.kings[playerId];
  if (!king || king.eliminated) {
    return;
  }
  king.health = Math.ceil(getKingStats(state, playerId).maxHealth * KO_HEAL_RATIO);
  king.skipNextTurn = true;
  pushLog(state, "knockedOut", playerId, { health: king.health });
};

// Kings that roll their own dice in this fight (attacker is always a king).
export const getFightHumanIds = (fight: FightState): PlayerId[] => {
  const ids: PlayerId[] = [];
  if (fight.attacker.type === "king") {
    ids.push(fight.attacker.playerId);
  }
  if (fight.defender.type === "king") {
    ids.push(fight.defender.playerId);
  }
  return ids;
};

export const startFight = (
  state: GameState,
  pending: Extract<PendingDecision, { kind: "visitorChoice" | "ownerChoice" }>
): void => {
  const plot = getPlot(state, pending.plotId);
  if (!plot) {
    throw new Error(`Tile ${pending.plotId} is not a plot`);
  }
  let fight: FightState;
  if (pending.kind === "ownerChoice") {
    fight = {
      kind: "kingVsKing",
      plotId: plot.id,
      attacker: { type: "king", playerId: pending.playerId },
      defender: { type: "king", playerId: pending.visitorId },
      attackerWins: 0,
      defenderWins: 0,
      rounds: [],
      pendingRolls: {},
      buffs: {},
      garrison: null
    };
  } else {
    const residents = getResidentsOnPlot(state, plot.id);
    const hasGarrison = residents.length > 0;
    fight = {
      kind: hasGarrison ? "garrison" : "plot",
      plotId: plot.id,
      attacker: { type: "king", playerId: pending.playerId },
      defender: hasGarrison ? { type: "garrison", plotId: plot.id } : { type: "plot", plotId: plot.id },
      attackerWins: 0,
      defenderWins: 0,
      rounds: [],
      pendingRolls: {},
      buffs: {},
      garrison: hasGarrison
        ? {
            startCount: residents.length,
            maxPool: residents.reduce((sum, resident) => sum + getResidentStats(resident).maxHealth, 0),
            pool: residents.reduce((sum, resident) => sum + resident.health, 0)
          }
        : null
    };
  }
  state.pending = null;
  state.fight = fight;
  state.turn.step = "fight";
  pushLog(state, "fightStarted", pending.playerId, { kind: fight.kind, plotId: plot.id });
};

const decideWinner = (state: GameState, fight: FightState): "attacker" | "defender" | null => {
  const attackerKing = fight.attacker.type === "king" ? state.kings[fight.attacker.playerId] : undefined;
  if (attackerKing && attackerKing.health <= 0) {
    return "defender";
  }
  if (fight.defender.type === "king") {
    const defenderKing = state.kings[fight.defender.playerId];
    if (defenderKing && defenderKing.health <= 0) {
      return "attacker";
    }
  }
  if (fight.defender.type === "garrison" && fight.garrison && fight.garrison.pool <= 0) {
    return "attacker";
  }
  if (fight.defender.type === "plot") {
    const plot = getPlot(state, fight.plotId);
    if (plot && plot.health <= 0) {
      return "attacker";
    }
  }
  if (fight.attackerWins >= FIGHT_ROUNDS_TO_WIN) {
    return "attacker";
  }
  if (fight.defenderWins >= FIGHT_ROUNDS_TO_WIN) {
    return "defender";
  }
  return null;
};

const applyDamage = (state: GameState, fight: FightState, target: FightState["defender"], damage: number): void => {
  if (target.type === "king") {
    const king = state.kings[target.playerId];
    if (king) {
      king.health -= damage;
    }
  } else if (target.type === "garrison") {
    damageGarrison(state, fight, damage);
  } else {
    const plot = getPlot(state, target.plotId);
    if (plot) {
      damagePlot(plot, damage);
    }
  }
};

const resolveRound = (state: GameState, fight: FightState, rng: Rng): void => {
  const attackerStats = getFighterStats(state, fight, fight.attacker);
  const defenderStats = getFighterStats(state, fight, fight.defender);
  const attackerRoll = fight.attacker.type === "king" ? (fight.pendingRolls[fight.attacker.playerId] ?? rng.d6()) : rng.d6();
  const defenderRoll =
    fight.defender.type === "king" ? (fight.pendingRolls[fight.defender.playerId] ?? rng.d6()) : rng.d6();
  const attackerScore = attackerRoll + attackerStats.attack;
  const defenderScore = defenderRoll + defenderStats.attack;

  let winner: FightRoundRecord["winner"] = "tie";
  let damage = 0;
  if (attackerScore > defenderScore) {
    winner = "attacker";
    damage = Math.max(1, attackerScore - defenderStats.defense);
    fight.attackerWins += 1;
    applyDamage(state, fight, fight.defender, damage);
  } else if (defenderScore > attackerScore) {
    winner = "defender";
    fight.defenderWins += 1;
    if (fight.defender.type !== "plot") {
      damage = Math.max(1, defenderScore - attackerStats.defense);
      applyDamage(state, fight, fight.attacker, damage);
    }
  }
  fight.rounds.push({ attackerRoll, defenderRoll, attackerScore, defenderScore, winner, damage });
  fight.pendingRolls = {};
  pushLog(state, "fightRound", fight.attacker.type === "king" ? fight.attacker.playerId : null, {
    plotId: fight.plotId,
    winner,
    damage
  });
};

// Stores a human roll; resolves the round once every human fighter has rolled. Returns true when the fight ended.
export const submitFightRoll = (state: GameState, rng: Rng, playerId: PlayerId): boolean => {
  const fight = state.fight;
  if (!fight) {
    return false;
  }
  fight.pendingRolls[playerId] = rng.d6();
  const allRolled = getFightHumanIds(fight).every((id) => fight.pendingRolls[id] !== undefined);
  if (!allRolled) {
    return false;
  }
  resolveRound(state, fight, rng);
  const winner = decideWinner(state, fight);
  if (!winner) {
    return false;
  }
  endFight(state, winner, false);
  return true;
};

export const retreatFromFight = (state: GameState): void => {
  endFight(state, "defender", true);
};

const payFeeAfterFight = (state: GameState, plot: Plot, payerId: PlayerId): { paid: number; eliminated: boolean } => {
  if (!plot.ownerId) {
    return { paid: 0, eliminated: false };
  }
  return chargeFee(state, payerId, plot.ownerId, getPlotFee(state, plot));
};

export const endFight = (state: GameState, winner: "attacker" | "defender", retreated: boolean): void => {
  const fight = state.fight;
  if (!fight || fight.attacker.type !== "king") {
    return;
  }
  const plot = getPlot(state, fight.plotId);
  if (!plot) {
    return;
  }
  const attackerId = fight.attacker.playerId;
  const residentsKilled = fight.garrison ? fight.garrison.startCount - getResidentsOnPlot(state, plot.id).length : 0;

  for (const id of [attackerId, fight.defender.type === "king" ? fight.defender.playerId : null]) {
    const king = id ? state.kings[id] : undefined;
    if (king && !king.eliminated && king.health <= 0) {
      knockOut(state, king.id);
    }
  }

  const result: FightResult = {
    kind: fight.kind,
    plotId: plot.id,
    attackerId,
    defender: fight.defender,
    winner,
    retreated,
    feePaid: 0,
    loot: 0,
    residentsKilled,
    plotOutcome: "none"
  };
  state.fight = null;

  if (fight.kind === "kingVsKing") {
    // Attacker is the plot owner; a winning owner collects the fee from the visitor.
    if (winner === "attacker" && fight.defender.type === "king") {
      result.feePaid = payFeeAfterFight(state, plot, fight.defender.playerId).paid;
    }
  } else if (fight.kind === "garrison") {
    const owner = plot.ownerId ? state.kings[plot.ownerId] : undefined;
    if (winner === "attacker" && owner) {
      const attacker = state.kings[attackerId];
      result.loot = Math.min(owner.coin, GARRISON_LOOT_MULTIPLIER * getPlotFee(state, plot));
      owner.coin -= result.loot;
      if (attacker) {
        attacker.coin += result.loot;
      }
    } else {
      result.feePaid = payFeeAfterFight(state, plot, attackerId).paid;
    }
  } else if (plot.health <= 0) {
    if (plot.level > 0) {
      plot.level -= 1;
      plot.health = PLOT_HEALTH[plot.level] ?? 0;
      result.plotOutcome = "levelDown";
      pushLog(state, "plotLevelDown", plot.ownerId, { plotId: plot.id, level: plot.level });
    } else {
      const formerOwnerId = plot.ownerId;
      releasePlot(state, plot);
      result.plotOutcome = "destroyed";
      pushLog(state, "plotDestroyed", attackerId, formerOwnerId ? { plotId: plot.id, ownerId: formerOwnerId } : { plotId: plot.id });
      const attacker = state.kings[attackerId];
      if (attacker && !attacker.eliminated) {
        state.pending = {
          kind: "buyPlot",
          playerId: attackerId,
          plotId: plot.id,
          price: getPlotBasePrice(plot.id),
          reason: "destroyed"
        };
      }
    }
  } else {
    result.feePaid = payFeeAfterFight(state, plot, attackerId).paid;
  }

  state.lastFight = result;
  pushLog(state, "fightEnded", attackerId, {
    kind: result.kind,
    plotId: result.plotId,
    winner: result.winner,
    retreated: result.retreated,
    feePaid: result.feePaid,
    loot: result.loot
  });
};
