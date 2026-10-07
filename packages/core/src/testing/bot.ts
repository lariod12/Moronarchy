import { MAX_PLOT_LEVEL } from "../content/balance";
import * as commands from "../flow/commands";
import { getOwnedPlots, getPlotFee, getPlotHealCost, getPlotMaxHealth, getPlotUpgradeCost } from "../flow/selectors";
import type { CommandResult, GameState, PlayerId, Plot, ResidentKind } from "../model/types";
import { getFightHumanIds } from "../rules/combat";
import { getResidentHealCost, getResidentRecruitCost } from "../rules/economy";
import { getMaxResidents } from "../rules/residents";
import type { Rng } from "../rules/rng";
import { getResidentStats } from "../rules/stats";

export type BotStyle = "careful" | "aggressive";

const BUY_RESERVE = 60;
const UPGRADE_RESERVE = 80;
const RECRUIT_RESERVE = 120;
const AGGRESSIVE_MIN_FEE = 15;

const expectOk = (name: string, result: CommandResult): void => {
  if (!result.ok) {
    throw new Error(`Bot command ${name} was rejected: ${result.error}`);
  }
};

const manageStation = (state: GameState, playerId: PlayerId, rng: Rng): void => {
  const king = state.kings[playerId];
  if (!king) {
    return;
  }
  for (const plot of getOwnedPlots(state, playerId)) {
    if (plot.health < getPlotMaxHealth(plot.level) && king.coin >= getPlotHealCost(plot)) {
      expectOk("healPlot", commands.healPlot(state, playerId, rng, plot.id));
    }
    for (const residentId of plot.residentIds) {
      const resident = state.residents[residentId];
      if (
        resident &&
        resident.health < getResidentStats(resident).maxHealth &&
        king.coin >= getResidentHealCost(resident)
      ) {
        expectOk("healResident", commands.healResident(state, playerId, rng, residentId));
      }
    }
  }

  for (;;) {
    let best: { plot: Plot; cost: number } | null = null;
    for (const plot of getOwnedPlots(state, playerId)) {
      const cost = getPlotUpgradeCost(plot);
      if (cost === null || plot.level >= MAX_PLOT_LEVEL || plot.level + 1 > king.level) {
        continue;
      }
      if (king.coin - cost >= UPGRADE_RESERVE && (!best || cost < best.cost)) {
        best = { plot, cost };
      }
    }
    if (!best) {
      break;
    }
    expectOk("upgradePlot", commands.upgradePlot(state, playerId, rng, best.plot.id));
  }

  for (;;) {
    const owned = getOwnedPlots(state, playerId);
    const residents = Object.values(state.residents).filter((resident) => resident.ownerId === playerId);
    const farmers = residents.filter((resident) => resident.kind === "farmer").length;
    const kind: ResidentKind = farmers <= residents.length - farmers ? "farmer" : "warrior";
    const open = owned
      .filter((plot) => plot.residentIds.length < getMaxResidents(plot))
      .sort((left, right) => left.residentIds.length - right.residentIds.length || left.id - right.id)[0];
    if (!open || king.coin - getResidentRecruitCost(kind) < RECRUIT_RESERVE) {
      break;
    }
    expectOk("recruitResident", commands.recruitResident(state, playerId, rng, open.id, kind));
  }
};

// Performs one bot action for whoever must act next. Throws if the engine rejects a bot command.
export const stepBot = (state: GameState, rng: Rng, style: BotStyle): void => {
  if (state.phase === "finished") {
    return;
  }
  const fight = state.fight;
  if (fight) {
    const rollerId = getFightHumanIds(fight).find((id) => fight.pendingRolls[id] === undefined);
    if (rollerId === undefined) {
      throw new Error("Bot found a fight with no one left to roll");
    }
    expectOk("fightRoll", commands.fightRoll(state, rollerId, rng));
    return;
  }

  const pending = state.pending;
  if (pending) {
    const id = pending.playerId;
    switch (pending.kind) {
      case "buyPlot": {
        const king = state.kings[id];
        if (king && king.coin >= pending.price + BUY_RESERVE) {
          expectOk("buyPlot", commands.buyPlot(state, id, rng));
        } else {
          expectOk("skipPlot", commands.skipPlot(state, id, rng));
        }
        return;
      }
      case "visitorChoice": {
        const plot = state.plots[pending.plotId - 2];
        const fee = plot ? getPlotFee(state, plot) : 0;
        if (style === "aggressive" && pending.canAttack && fee >= AGGRESSIVE_MIN_FEE) {
          expectOk("attack", commands.attack(state, id, rng));
        } else {
          expectOk("payFee", commands.payFee(state, id, rng));
        }
        return;
      }
      case "ownerChoice":
        expectOk("collectFee", commands.collectFee(state, id, rng));
        return;
      case "pickCard":
        expectOk("pickCard", commands.pickCard(state, id, rng, 0));
        return;
    }
  }

  const id = state.turn.playerId;
  switch (state.turn.step) {
    case "awaitClaim":
      expectOk("claimTurn", commands.claimTurn(state, id, rng));
      return;
    case "preRoll":
      expectOk("rollDice", commands.rollDice(state, id, rng));
      return;
    case "rolled":
      expectOk("confirmRoll", commands.confirmRoll(state, id, rng));
      return;
    case "startStation":
      manageStation(state, id, rng);
      expectOk("leaveStartStation", commands.leaveStartStation(state, id, rng));
      return;
    case "postMove":
      expectOk("endTurn", commands.endTurn(state, id, rng));
      return;
    default:
      throw new Error(`Bot is stuck at step ${state.turn.step}`);
  }
};
