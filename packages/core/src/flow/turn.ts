import { KING_LEVEL_ATTACK_GAIN, KING_LEVEL_MAX_HEALTH_GAIN, MAX_KING_LEVEL, START_BONUS, START_TILE } from "../content/balance";
import type { GameState, PlayerId, TileId, TurnState } from "../model/types";
import { getPlot, nextTile } from "../rules/board";
import { buildCardOffer } from "../rules/cards";
import { getBountifulIncomeMultiplier, getPlotIncome, getPlotPrice } from "../rules/economy";
import { onRoundStart, rollLandingEffect } from "../rules/events";
import { pushLog } from "../rules/log";
import type { Rng } from "../rules/rng";
import { getActiveGlobalEvent, getKingStats } from "../rules/stats";

export const createTurnState = (playerId: PlayerId): TurnState => ({
  playerId,
  step: "awaitClaim",
  rolled: false,
  dice: null,
  moveBonus: 0,
  horseUsed: false,
  remainingSteps: 0,
  path: [],
  manageablePlotId: null
});

export const beginTurn = (state: GameState, playerId: PlayerId, rng: Rng): void => {
  state.turn = createTurnState(playerId);
  state.pending = null;
  state.fight = null;
  const king = state.kings[playerId];
  if (king?.skipNextTurn) {
    king.skipNextTurn = false;
    pushLog(state, "turnSkipped", playerId, {});
    finishTurn(state, rng);
  }
};

export const finishTurn = (state: GameState, rng: Rng): void => {
  if (state.phase === "finished") {
    return;
  }
  const order = state.turnOrder;
  const currentIndex = order.indexOf(state.turn.playerId);
  for (let offset = 1; offset <= order.length; offset += 1) {
    const index = (currentIndex + offset) % order.length;
    const nextId = order[index];
    if (nextId === undefined || state.kings[nextId]?.eliminated) {
      continue;
    }
    if (index <= currentIndex) {
      state.round += 1;
      onRoundStart(state, rng);
    }
    beginTurn(state, nextId, rng);
    return;
  }
};

// Called when a decision or fight is resolved and no new pending was created.
export const afterResolution = (state: GameState, rng: Rng): void => {
  if (state.phase === "finished") {
    return;
  }
  if (state.pending) {
    state.turn.step = "decision";
    return;
  }
  if (state.kings[state.turn.playerId]?.eliminated) {
    finishTurn(state, rng);
    return;
  }
  state.turn.step = "postMove";
};

export const startMove = (state: GameState, rng: Rng): void => {
  const dice = state.turn.dice;
  state.turn.remainingSteps = dice ? dice.value + dice.bonus : 0;
  advance(state, rng);
};

export const advance = (state: GameState, rng: Rng): void => {
  const turn = state.turn;
  const king = state.kings[turn.playerId];
  if (!king) {
    return;
  }
  while (turn.remainingSteps > 0) {
    king.position = nextTile(king.position);
    turn.remainingSteps -= 1;
    turn.path.push(king.position);
    if (king.position === START_TILE) {
      enterStartStation(state, rng);
      return;
    }
  }
  arrive(state, rng, king.position);
};

export const enterStartStation = (state: GameState, rng: Rng): void => {
  const playerId = state.turn.playerId;
  const king = state.kings[playerId];
  if (!king) {
    return;
  }
  king.laps += 1;
  king.coin += START_BONUS;
  if (king.level < MAX_KING_LEVEL) {
    king.level += 1;
    king.maxHealth += KING_LEVEL_MAX_HEALTH_GAIN;
    king.attack += KING_LEVEL_ATTACK_GAIN;
  }
  const stats = getKingStats(state, playerId);
  king.health = stats.maxHealth;
  const multiplier = getBountifulIncomeMultiplier(state);
  const income = state.plots
    .filter((plot) => plot.ownerId === playerId)
    .reduce((sum, plot) => sum + getPlotIncome(state, plot) * multiplier, 0);
  king.coin += income;
  state.turn.step = "startStation";
  state.pending = { kind: "pickCard", playerId, offers: buildCardOffer(rng, stats.lucky) };
  pushLog(state, "lapCompleted", playerId, { bonus: START_BONUS, income, level: king.level });
};

export const leaveStartStation = (state: GameState, rng: Rng): void => {
  if (state.turn.remainingSteps > 0) {
    advance(state, rng);
    return;
  }
  state.turn.step = "postMove";
};

export const arrive = (state: GameState, rng: Rng, tileId: TileId): void => {
  const playerId = state.turn.playerId;
  const plot = getPlot(state, tileId);
  if (!plot) {
    state.turn.step = "postMove";
    return;
  }
  rollLandingEffect(state, rng, playerId);

  if (plot.ownerId === null) {
    state.pending = { kind: "buyPlot", playerId, plotId: plot.id, price: getPlotPrice(plot.id), reason: "empty" };
    state.turn.step = "decision";
    return;
  }
  if (plot.ownerId === playerId) {
    state.turn.manageablePlotId = plot.id;
    state.turn.step = "postMove";
    return;
  }
  const canAttack = !getActiveGlobalEvent(state, "peaceTreaty");
  const owner = state.kings[plot.ownerId];
  if (owner && !owner.eliminated && owner.position === plot.id) {
    state.pending = { kind: "ownerChoice", playerId: owner.id, plotId: plot.id, visitorId: playerId, canAttack };
  } else {
    state.pending = { kind: "visitorChoice", playerId, plotId: plot.id, ownerId: plot.ownerId, canAttack };
  }
  state.turn.step = "decision";
};
