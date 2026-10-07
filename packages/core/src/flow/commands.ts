import { FIGHT_BUFF, HORSE_MOVE_BONUS, MEAT_HEAL } from "../content/balance";
import { ITEMS } from "../content/items";
import type {
  CommandError,
  CommandResult,
  GameState,
  ItemId,
  PendingDecision,
  PlayerId,
  ResidentId,
  ResidentKind,
  TileId,
  TurnStep
} from "../model/types";
import { getPlot } from "../rules/board";
import { applyCard } from "../rules/cards";
import { getFightHumanIds, retreatFromFight, startFight, submitFightRoll } from "../rules/combat";
import { getPlotFee, getPlotIncome, getPlotMaxHealth } from "../rules/economy";
import { chargeFee } from "../rules/elimination";
import { buyItem as buyItemRule, consumeItem, getItemCount } from "../rules/items";
import { pushLog } from "../rules/log";
import { buyPlotFor, getOwnedPlotOf, healPlot as healPlotRule, upgradePlot as upgradePlotRule } from "../rules/plots";
import {
  getOwnedResident,
  healResident as healResidentRule,
  recruitResident as recruitResidentRule,
  upgradeResident as upgradeResidentRule
} from "../rules/residents";
import type { Rng } from "../rules/rng";
import { getKingStats } from "../rules/stats";
import { forfeitKing } from "./forfeit";
import { afterResolution, finishTurn, leaveStartStation as leaveStartStationFlow, startMove } from "./turn";

const OK: CommandResult = { ok: true };
const fail = (error: CommandError): CommandResult => ({ ok: false, error });

// Phase and actor checks shared by every command.
const checkActor = (state: GameState, actorId: PlayerId): CommandResult | null => {
  if (state.phase === "finished") {
    return fail("GAME_OVER");
  }
  const king = state.kings[actorId];
  if (!king || king.eliminated) {
    return fail("NOT_ACTOR");
  }
  return null;
};

// Turn-player commands: actor is the turn player and no decision is waiting on anyone.
const turnGuard = (state: GameState, actorId: PlayerId): CommandResult | null => {
  const actor = checkActor(state, actorId);
  if (actor) {
    return actor;
  }
  if (state.turn.playerId !== actorId) {
    return fail("NOT_YOUR_TURN");
  }
  if (state.pending) {
    return fail("PENDING_DECISION");
  }
  return null;
};

const stepGuard = (state: GameState, actorId: PlayerId, step: TurnStep): CommandResult | null => {
  const guard = turnGuard(state, actorId);
  if (guard) {
    return guard;
  }
  return state.turn.step === step ? null : fail("WRONG_STEP");
};

// Pending decisions are answered by the player they are addressed to, even out of turn.
const pendingGuard = <K extends PendingDecision["kind"]>(
  state: GameState,
  actorId: PlayerId,
  kinds: readonly K[]
): { error: CommandResult } | { pending: Extract<PendingDecision, { kind: K }> } => {
  const actor = checkActor(state, actorId);
  if (actor) {
    return { error: actor };
  }
  const pending = state.pending;
  if (!pending) {
    return { error: fail("NO_PENDING") };
  }
  if (pending.playerId !== actorId) {
    return { error: fail("NOT_ACTOR") };
  }
  if (!(kinds as readonly string[]).includes(pending.kind)) {
    return { error: fail("WRONG_STEP") };
  }
  return { pending: pending as Extract<PendingDecision, { kind: K }> };
};

// Plot/resident management: Start station (any own target) or the plot landed on this turn.
const manageGuard = (state: GameState, actorId: PlayerId, plotId: TileId | null): CommandResult | null => {
  const guard = turnGuard(state, actorId);
  if (guard) {
    return guard;
  }
  if (state.turn.step !== "startStation" && state.turn.step !== "postMove") {
    return fail("WRONG_STEP");
  }
  if (plotId === null) {
    return fail("INVALID_TARGET");
  }
  if (state.turn.step === "postMove" && plotId !== state.turn.manageablePlotId) {
    return fail("NOT_ALLOWED");
  }
  return null;
};

export const claimTurn = (state: GameState, actorId: PlayerId, _rng: Rng): CommandResult => {
  const guard = stepGuard(state, actorId, "awaitClaim");
  if (guard) {
    return guard;
  }
  state.turn.step = "preRoll";
  pushLog(state, "turnClaimed", actorId, {});
  return OK;
};

export const rollDice = (state: GameState, actorId: PlayerId, rng: Rng): CommandResult => {
  const guard = stepGuard(state, actorId, "preRoll");
  if (guard) {
    return guard;
  }
  const value = rng.d6();
  state.turn.dice = { value, bonus: state.turn.moveBonus, rerolled: false };
  state.turn.rolled = true;
  pushLog(state, "diceRolled", actorId, { value, bonus: state.turn.moveBonus });
  const king = state.kings[actorId];
  if (king && getItemCount(king, "luckyDie") > 0) {
    state.turn.step = "rolled";
    return OK;
  }
  startMove(state, rng);
  return OK;
};

export const confirmRoll = (state: GameState, actorId: PlayerId, rng: Rng): CommandResult => {
  const guard = stepGuard(state, actorId, "rolled");
  if (guard) {
    return guard;
  }
  startMove(state, rng);
  return OK;
};

export const useItem = (
  state: GameState,
  actorId: PlayerId,
  rng: Rng,
  itemId: ItemId,
  target?: { plotId?: TileId }
): CommandResult => {
  const actor = checkActor(state, actorId);
  if (actor) {
    return actor;
  }
  const king = state.kings[actorId];
  const def = ITEMS[itemId];
  if (!king || !def) {
    return fail("INVALID_TARGET");
  }
  if (def.kind === "equipment") {
    return fail("NOT_ALLOWED");
  }
  if (getItemCount(king, itemId) <= 0) {
    return fail("INVALID_TARGET");
  }
  const isTurnPlayer = state.turn.playerId === actorId;
  const fight = state.fight;
  const isFighter = fight !== null && getFightHumanIds(fight).includes(actorId);
  const hasRolled = fight !== null && fight.pendingRolls[actorId] !== undefined;

  switch (itemId) {
    case "horse": {
      if (!isTurnPlayer) {
        return fail("NOT_YOUR_TURN");
      }
      if (state.turn.step !== "preRoll") {
        return fail("WRONG_STEP");
      }
      if (state.turn.horseUsed) {
        return fail("LIMIT_REACHED");
      }
      consumeItem(king, itemId);
      state.turn.moveBonus += HORSE_MOVE_BONUS;
      state.turn.horseUsed = true;
      break;
    }
    case "luckyDie": {
      if (!isTurnPlayer) {
        return fail("NOT_YOUR_TURN");
      }
      const dice = state.turn.dice;
      if (state.turn.step !== "rolled" || !dice) {
        return fail("WRONG_STEP");
      }
      if (dice.rerolled) {
        return fail("LIMIT_REACHED");
      }
      consumeItem(king, itemId);
      dice.value = rng.d6();
      dice.rerolled = true;
      pushLog(state, "diceRerolled", actorId, { value: dice.value });
      pushLog(state, "itemUsed", actorId, { itemId });
      startMove(state, rng);
      return OK;
    }
    case "meat": {
      if (isFighter) {
        if (hasRolled) {
          return fail("NOT_ALLOWED");
        }
      } else if (!isTurnPlayer) {
        return fail("NOT_YOUR_TURN");
      } else if (!["preRoll", "rolled", "startStation", "decision", "postMove"].includes(state.turn.step)) {
        return fail("WRONG_STEP");
      }
      consumeItem(king, itemId);
      king.health = Math.min(getKingStats(state, actorId).maxHealth, king.health + MEAT_HEAL);
      break;
    }
    case "warHorn":
    case "woodShield": {
      if (!fight) {
        return fail("WRONG_STEP");
      }
      if (!isFighter) {
        return fail("NOT_ACTOR");
      }
      if (hasRolled) {
        return fail("NOT_ALLOWED");
      }
      consumeItem(king, itemId);
      const buff = fight.buffs[actorId] ?? { attack: 0, defense: 0 };
      if (itemId === "warHorn") {
        buff.attack += FIGHT_BUFF;
      } else {
        buff.defense += FIGHT_BUFF;
      }
      fight.buffs[actorId] = buff;
      break;
    }
    case "sickle":
    case "hammer": {
      const guard = turnGuard(state, actorId);
      if (guard) {
        return guard;
      }
      if (!["preRoll", "startStation", "postMove"].includes(state.turn.step)) {
        return fail("WRONG_STEP");
      }
      const plot = target?.plotId === undefined ? undefined : getOwnedPlotOf(state, actorId, target.plotId);
      if (!plot) {
        return fail("INVALID_TARGET");
      }
      if (itemId === "sickle") {
        consumeItem(king, itemId);
        king.coin += getPlotIncome(state, plot);
      } else {
        const max = getPlotMaxHealth(plot.level);
        if (plot.health >= max) {
          return fail("NOT_ALLOWED");
        }
        consumeItem(king, itemId);
        plot.health = max;
      }
      break;
    }
    default:
      return fail("NOT_ALLOWED");
  }
  pushLog(state, "itemUsed", actorId, { itemId });
  return OK;
};

export const pickCard = (state: GameState, actorId: PlayerId, _rng: Rng, index: number): CommandResult => {
  const found = pendingGuard(state, actorId, ["pickCard"]);
  if ("error" in found) {
    return found.error;
  }
  const offer = Number.isInteger(index) ? found.pending.offers[index] : undefined;
  if (!offer) {
    return fail("INVALID_TARGET");
  }
  applyCard(state, actorId, offer);
  state.pending = null;
  return OK;
};

export const leaveStartStation = (state: GameState, actorId: PlayerId, rng: Rng): CommandResult => {
  const guard = stepGuard(state, actorId, "startStation");
  if (guard) {
    return guard;
  }
  leaveStartStationFlow(state, rng);
  return OK;
};

export const buyPlot = (state: GameState, actorId: PlayerId, rng: Rng): CommandResult => {
  const found = pendingGuard(state, actorId, ["buyPlot"]);
  if ("error" in found) {
    return found.error;
  }
  const result = buyPlotFor(state, actorId, found.pending.plotId);
  if (!result.ok) {
    return result;
  }
  state.pending = null;
  state.turn.manageablePlotId = found.pending.plotId;
  afterResolution(state, rng);
  return OK;
};

export const skipPlot = (state: GameState, actorId: PlayerId, rng: Rng): CommandResult => {
  const found = pendingGuard(state, actorId, ["buyPlot"]);
  if ("error" in found) {
    return found.error;
  }
  pushLog(state, "plotSkipped", actorId, { plotId: found.pending.plotId });
  state.pending = null;
  afterResolution(state, rng);
  return OK;
};

const settleFee = (state: GameState, rng: Rng, payerId: PlayerId, plotId: TileId): void => {
  const plot = getPlot(state, plotId);
  state.pending = null;
  if (plot?.ownerId) {
    chargeFee(state, payerId, plot.ownerId, getPlotFee(state, plot));
  }
  afterResolution(state, rng);
};

export const payFee = (state: GameState, actorId: PlayerId, rng: Rng): CommandResult => {
  const found = pendingGuard(state, actorId, ["visitorChoice"]);
  if ("error" in found) {
    return found.error;
  }
  settleFee(state, rng, actorId, found.pending.plotId);
  return OK;
};

export const collectFee = (state: GameState, actorId: PlayerId, rng: Rng): CommandResult => {
  const found = pendingGuard(state, actorId, ["ownerChoice"]);
  if ("error" in found) {
    return found.error;
  }
  settleFee(state, rng, found.pending.visitorId, found.pending.plotId);
  return OK;
};

export const attack = (state: GameState, actorId: PlayerId, _rng: Rng): CommandResult => {
  const found = pendingGuard(state, actorId, ["visitorChoice", "ownerChoice"]);
  if ("error" in found) {
    return found.error;
  }
  if (!found.pending.canAttack) {
    return fail("NOT_ALLOWED");
  }
  startFight(state, found.pending);
  return OK;
};

export const fightRoll = (state: GameState, actorId: PlayerId, rng: Rng): CommandResult => {
  const actor = checkActor(state, actorId);
  if (actor) {
    return actor;
  }
  const fight = state.fight;
  if (!fight) {
    return fail("WRONG_STEP");
  }
  if (!getFightHumanIds(fight).includes(actorId)) {
    return fail("NOT_ACTOR");
  }
  if (fight.pendingRolls[actorId] !== undefined) {
    return fail("NOT_ALLOWED");
  }
  if (submitFightRoll(state, rng, actorId)) {
    afterResolution(state, rng);
  }
  return OK;
};

export const retreat = (state: GameState, actorId: PlayerId, rng: Rng): CommandResult => {
  const actor = checkActor(state, actorId);
  if (actor) {
    return actor;
  }
  const fight = state.fight;
  if (!fight) {
    return fail("WRONG_STEP");
  }
  if (fight.attacker.type !== "king" || fight.attacker.playerId !== actorId) {
    return fail("NOT_ACTOR");
  }
  if (Object.keys(fight.pendingRolls).length > 0) {
    return fail("NOT_ALLOWED");
  }
  retreatFromFight(state);
  afterResolution(state, rng);
  return OK;
};

export const upgradePlot = (state: GameState, actorId: PlayerId, _rng: Rng, plotId: TileId): CommandResult => {
  const guard = manageGuard(state, actorId, plotId);
  return guard ?? upgradePlotRule(state, actorId, plotId);
};

export const healPlot = (state: GameState, actorId: PlayerId, _rng: Rng, plotId: TileId): CommandResult => {
  const guard = manageGuard(state, actorId, plotId);
  return guard ?? healPlotRule(state, actorId, plotId);
};

export const recruitResident = (
  state: GameState,
  actorId: PlayerId,
  _rng: Rng,
  plotId: TileId,
  kind: ResidentKind
): CommandResult => {
  const guard = manageGuard(state, actorId, plotId);
  return guard ?? recruitResidentRule(state, actorId, plotId, kind);
};

export const upgradeResident = (state: GameState, actorId: PlayerId, _rng: Rng, residentId: ResidentId): CommandResult => {
  const resident = getOwnedResident(state, actorId, residentId);
  const guard = manageGuard(state, actorId, resident ? resident.plotId : null);
  return guard ?? upgradeResidentRule(state, actorId, residentId);
};

export const healResident = (state: GameState, actorId: PlayerId, _rng: Rng, residentId: ResidentId): CommandResult => {
  const resident = getOwnedResident(state, actorId, residentId);
  const guard = manageGuard(state, actorId, resident ? resident.plotId : null);
  return guard ?? healResidentRule(state, actorId, residentId);
};

export const buyItem = (state: GameState, actorId: PlayerId, _rng: Rng, itemId: ItemId): CommandResult => {
  const guard = stepGuard(state, actorId, "startStation");
  return guard ?? buyItemRule(state, actorId, itemId);
};

export const endTurn = (state: GameState, actorId: PlayerId, rng: Rng): CommandResult => {
  const guard = stepGuard(state, actorId, "postMove");
  if (guard) {
    return guard;
  }
  if (state.fight) {
    return fail("WRONG_STEP");
  }
  finishTurn(state, rng);
  return OK;
};

// Leaving the game (only ever sent for oneself; the server sends it for a player who stayed disconnected too long).
export const forfeit = (state: GameState, actorId: PlayerId, rng: Rng): CommandResult => forfeitKing(state, actorId, rng);
