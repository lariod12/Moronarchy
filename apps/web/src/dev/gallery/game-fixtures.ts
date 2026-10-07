import { claimTurn, payFee, pickCard, rollDice } from "@moronarchy/core/engine";
import type { GameState, PlayerId } from "@moronarchy/core/engine";
import { addResident, createScriptedRng, createTestGame, giveItem, givePlot, placeKing, setTurnStep } from "@moronarchy/core/testing";

// In-game states for the gallery and the unit tests. Every state is reached by playing real engine commands
// from `createTestGame`, so the fixtures cannot drift from the rules. Players "0".."n-1" are named King 0, King 1, ...

export interface GameScenario {
  game: GameState;
  viewerId: PlayerId;
}

// Scripted dice, and a quiet `next` (no events, no item drops) after the optional scripted prefix.
const rngFor = (d6: number[], nextPrefix: number[] = []) =>
  createScriptedRng({ d6, next: [...nextPrefix, ...Array.from({ length: 80 }, () => 0.99)] });

const nameKings = (game: GameState, names: string[]): void => {
  names.forEach((name, index) => {
    const king = game.kings[String(index)];
    if (king) {
      king.name = name;
    }
  });
};

const NAMES = ["Alice", "Bob", "Cara", "Dan"];

const named = (playerCount: number): GameState => {
  const game = createTestGame(playerCount);
  nameKings(game, NAMES);
  return game;
};

// Turn player "0" claimed the turn and has not rolled.
const claimed = (game: GameState): GameState => {
  claimTurn(game, "0", rngFor([]));
  return game;
};

// The match just started: the turn player's crown is shaking.
export const awaitingClaim = (): GameScenario => ({ game: named(3), viewerId: "0" });

// Four kings on Start, nothing owned, turn player waiting for the roll.
export const mapStart = (): GameScenario => ({ game: claimed(named(4)), viewerId: "0" });

// Several owners, kings spread around the ring, two kings sharing a tile.
export const mapMidgame = (): GameScenario => {
  const game = named(4);
  givePlot(game, "0", 5, 1);
  givePlot(game, "0", 12, 2);
  givePlot(game, "0", 27);
  givePlot(game, "1", 8);
  givePlot(game, "1", 15, 1);
  givePlot(game, "2", 33);
  givePlot(game, "2", 39, 2);
  givePlot(game, "3", 22);
  placeKing(game, "0", 4);
  placeKing(game, "1", 15);
  placeKing(game, "2", 15);
  placeKing(game, "3", 31);
  return { game: claimed(game), viewerId: "0" };
};

export const mapHorse = (): GameScenario => {
  const game = named(3);
  giveItem(game, "0", "horse");
  return { game: claimed(game), viewerId: "0" };
};

// Rolled a 4 from Start: the king stands on tile 5 with the move already played.
export const rolled = (d6 = 4): GameScenario => {
  const game = claimed(named(3));
  rollDice(game, "0", rngFor([d6]));
  return { game, viewerId: "0" };
};

// Landed on an empty plot: a buy decision for the viewer.
export const buyDecision = (options: { destroyed?: boolean; poor?: boolean } = {}): GameScenario => {
  const scenario = rolled(6);
  const { game } = scenario;
  if (options.destroyed && game.pending?.kind === "buyPlot") {
    game.pending.reason = "destroyed";
  }
  if (options.poor) {
    const king = game.kings["0"];
    if (king) {
      king.coin = 10;
    }
  }
  return scenario;
};

// Landed on Bob's plot while Bob is elsewhere: the visitor chooses.
export const visitorDecision = (options: { peace?: boolean } = {}): GameScenario => {
  const game = claimed(named(3));
  givePlot(game, "1", 5, 1);
  placeKing(game, "1", 20);
  if (options.peace) {
    game.activeGlobalEvents.push({ eventId: "peaceTreaty", startRound: game.round, endRound: game.round });
  }
  rollDice(game, "0", rngFor([4]));
  return { game, viewerId: "0" };
};

// Alice paid Bob the fee: seen by Bob, the owner who just received it.
export const feeCollected = (): GameScenario => {
  const { game } = visitorDecision();
  payFee(game, "0", rngFor([]));
  return { game, viewerId: "1" };
};

// Same landing, but the owner (Bob) stands on his plot and decides. View it as Bob ("1") or as the waiting visitor ("0").
export const ownerDecision = (viewerId: PlayerId = "1"): GameScenario => {
  const game = claimed(named(3));
  givePlot(game, "1", 5, 1);
  placeKing(game, "1", 5);
  rollDice(game, "0", rngFor([4]));
  return { game, viewerId };
};

// Holding a Lucky Die, rolled, and asked to keep or reroll.
export const luckyDieChoice = (): GameScenario => {
  const game = named(3);
  giveItem(game, "0", "luckyDie");
  claimed(game);
  rollDice(game, "0", rngFor([3]));
  return { game, viewerId: "0" };
};

// Skipped the empty plot: the turn can be ended.
export const canEndTurn = (): GameScenario => {
  const game = claimed(named(3));
  rollDice(game, "0", rngFor([4]));
  setTurnStep(game, "postMove", "0");
  game.pending = null;
  return { game, viewerId: "0" };
};

// Landed on one of my own plots: "Your plot (Plot 5)".
export const ownPlot = (): GameScenario => {
  const game = claimed(named(3));
  givePlot(game, "0", 5, 1);
  addResident(game, 5, "warrior", 1);
  rollDice(game, "0", rngFor([4]));
  return { game, viewerId: "0" };
};

// Crossed Start on a roll of 4 from tile 39: pick one of three cards. Level 2 plots and residents are waiting.
export const cardPick = (): GameScenario => {
  const game = claimed(named(3));
  givePlot(game, "0", 5, 1);
  givePlot(game, "0", 12, 0);
  addResident(game, 5, "warrior", 1);
  placeKing(game, "0", 39);
  // Offers: Max Health, Attack, Defense, each at the middle tier.
  rollDice(game, "0", rngFor([4], [0.1, 0, 0, 0.5, 0.5, 0.5]));
  return { game, viewerId: "0" };
};

// Card taken: standing in the Start Station with plots, residents and coin to spend (two steps left to walk).
export const station = (): GameScenario => {
  const scenario = cardPick();
  const { game } = scenario;
  const king = game.kings["0"];
  if (king) {
    king.coin += 100;
    const plot = game.plots[10];
    if (plot?.ownerId === "0") {
      plot.health -= 5;
    }
  }
  const resident = Object.values(game.residents)[0];
  if (resident) {
    resident.health -= 10;
  }
  pickCard(game, "0", rngFor([]), 0);
  return scenario;
};

// Cara, then Bob, cannot pay Alice's fee and go bankrupt: finished match, ranking Alice, Bob, Cara.
export const finished = (): GameScenario => {
  const game = named(3);
  givePlot(game, "0", 5, 3);
  for (const loserId of ["2", "1"]) {
    const loser = game.kings[loserId];
    if (loser) {
      loser.coin = 0;
    }
    setTurnStep(game, "preRoll", loserId);
    placeKing(game, loserId, 1);
    const rng = rngFor([4]);
    rollDice(game, loserId, rng);
    payFee(game, loserId, rng);
  }
  return { game, viewerId: "0" };
};

// Bob has been knocked out of a running 3-player match; the viewer watches as a spectator.
export const spectator = (): GameScenario => {
  const game = claimed(named(3));
  const bob = game.kings["1"];
  if (bob) {
    bob.eliminated = true;
    bob.eliminatedRound = 1;
    bob.coin = 0;
    game.eliminationOrder.push("1");
  }
  return { game, viewerId: "1" };
};
