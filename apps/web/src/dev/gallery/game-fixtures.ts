import { attack, claimTurn, endTurn, fightRoll, payFee, pickCard, retreat, rollDice, skipPlot, useItem } from "@moronarchy/core/engine";
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

// ---- Fights. Alice ("0") rolled a 4 from Start and stands on tile 5, Bob ("1") owns it. Every fight roll is a scripted
// d6, consumed in the order the commands run (attacker first, then the other king or the system side). ----

const FIGHT_PLOT = 5;

// Alice lands on Bob's plot while Bob stands on it: Bob chooses and attacks, so the duel is Bob (attacker) vs Alice.
const duel = (d6: number[], options: { plotLevel?: number; players?: number } = {}): { game: GameState; rng: ReturnType<typeof rngFor> } => {
  const game = claimed(named(options.players ?? 3));
  givePlot(game, "1", FIGHT_PLOT, options.plotLevel ?? 1);
  placeKing(game, "1", FIGHT_PLOT);
  const rng = rngFor([4, ...d6]);
  rollDice(game, "0", rng);
  attack(game, "1", rng);
  return { game, rng };
};

// Alice lands on Bob's plot while Bob is elsewhere and attacks the garrison (or the plot when nobody lives there).
const siege = (
  d6: number[],
  options: { plotLevel?: number; residents?: Array<"warrior" | "farmer">; residentHealth?: number[]; weakAttack?: boolean } = {}
): { game: GameState; rng: ReturnType<typeof rngFor> } => {
  const game = claimed(named(3));
  givePlot(game, "1", FIGHT_PLOT, options.plotLevel ?? 2);
  placeKing(game, "1", 20);
  (options.residents ?? []).forEach((kind, index) => {
    const resident = addResident(game, FIGHT_PLOT, kind, 1);
    const health = options.residentHealth?.[index];
    if (health !== undefined) {
      resident.health = health;
    }
  });
  const alice = game.kings["0"];
  if (alice && options.weakAttack) {
    // A passive plot can only block a king whose attack is below 5.
    alice.attack = 2;
  }
  const rng = rngFor([4, ...d6]);
  rollDice(game, "0", rng);
  attack(game, "0", rng);
  return { game, rng };
};

const rollBoth = (game: GameState, rng: ReturnType<typeof rngFor>): void => {
  fightRoll(game, "1", rng);
  fightRoll(game, "0", rng);
};

// A duel that just started, nobody has rolled. Bob (the owner, attacker) carries the three fight items.
export const fightKingStart = (viewerId: PlayerId = "1"): GameScenario => {
  const { game } = duel([]);
  for (const itemId of ["meat", "warHorn", "woodShield"] as const) {
    giveItem(game, "1", itemId, itemId === "meat" ? 2 : 1);
  }
  return { game, viewerId };
};

// One round each: the attacker won the first, the defender the second (1-1, damage shown).
export const fightKingMid = (viewerId: PlayerId = "1"): GameScenario => {
  const { game, rng } = duel([6, 1, 2, 6]);
  rollBoth(game, rng);
  rollBoth(game, rng);
  return { game, viewerId };
};

// Same duel, third round: Bob rolled and waits for Alice.
export const fightWaiting = (): GameScenario => {
  const { game, rng } = duel([6, 1, 2, 6, 4]);
  rollBoth(game, rng);
  rollBoth(game, rng);
  fightRoll(game, "1", rng);
  return { game, viewerId: "1" };
};

// A third king watches the 1-1 duel.
export const fightSpectator = (): GameScenario => ({ game: fightKingMid().game, viewerId: "2" });

// Alice (attacker) against three weakened residents: round one kills two of them, round two goes to the garrison.
export const fightGarrison = (): GameScenario => {
  const { game, rng } = siege([6, 1, 1, 6], { residents: ["farmer", "warrior", "warrior"], residentHealth: [4, 12, 12] });
  fightRoll(game, "0", rng);
  fightRoll(game, "0", rng);
  return { game, viewerId: "0" };
};

// Alice against a passive plot with no residents: round one hurts it, round two is Blocked.
export const fightPlot = (): GameScenario => {
  const { game, rng } = siege([6, 1, 1, 6], { plotLevel: 2, weakAttack: true });
  fightRoll(game, "0", rng);
  fightRoll(game, "0", rng);
  return { game, viewerId: "0" };
};

// Both kings played War Horn / Wood Shield before the first roll.
export const fightBuffs = (): GameScenario => {
  const { game, rng } = duel([]);
  giveItem(game, "1", "warHorn");
  giveItem(game, "1", "woodShield");
  giveItem(game, "0", "warHorn");
  useItem(game, "1", rng, "warHorn");
  useItem(game, "1", rng, "woodShield");
  useItem(game, "0", rng, "warHorn");
  return { game, viewerId: "1" };
};

// Alice has just started a siege against the garrison of Bob's plot: bystanders (viewer "2") or Bob (viewer "1") are told.
export const fightStartedElsewhere = (viewerId: PlayerId = "2"): GameScenario => {
  const { game } = siege([], { residents: ["warrior", "farmer"] });
  return { game, viewerId };
};

// Finished fights, seen by Alice (the attacker). The fight popup shows what the engine recorded.
export const fightWon = (): GameScenario => {
  const { game, rng } = siege([6, 1, 6, 1], { residents: ["farmer", "warrior", "warrior"], residentHealth: [4, 12, 12] });
  fightRoll(game, "0", rng);
  fightRoll(game, "0", rng);
  return { game, viewerId: "0" };
};

export const fightLost = (): GameScenario => {
  const { game, rng } = siege([1, 6, 1, 6], { residents: ["warrior", "warrior"] });
  fightRoll(game, "0", rng);
  fightRoll(game, "0", rng);
  return { game, viewerId: "0" };
};

// A plain level 0 plot is beaten to pieces: it is destroyed and the attacker may buy it.
export const fightDestroyed = (): GameScenario => {
  const { game, rng } = siege([6, 1, 6, 1], { plotLevel: 0 });
  fightRoll(game, "0", rng);
  fightRoll(game, "0", rng);
  return { game, viewerId: "0" };
};

// Alice retreats from the siege before rolling.
export const fightRetreated = (): GameScenario => {
  const { game, rng } = siege([], { residents: ["warrior"] });
  retreat(game, "0", rng);
  return { game, viewerId: "0" };
};

// ---- Info pages (Stats, Plots, Residents, Items, Events, Positions). Viewer is Alice ("0"), mid-game, before her roll. ----

// Four kings, plots of several levels and owners, residents of both kinds, a bag with consumables and one equipment.
export const infoGame = (): GameScenario => {
  const game = named(4);
  givePlot(game, "0", 5, 1);
  givePlot(game, "0", 12, 2);
  givePlot(game, "0", 27);
  givePlot(game, "1", 8);
  givePlot(game, "1", 15, 1);
  givePlot(game, "2", 33);
  givePlot(game, "2", 39, 2);
  givePlot(game, "3", 22);
  addResident(game, 5, "warrior", 1);
  addResident(game, 5, "farmer", 1);
  addResident(game, 12, "warrior", 2);
  addResident(game, 12, "farmer", 1);
  addResident(game, 12, "warrior", 1);
  addResident(game, 15, "farmer", 1);
  addResident(game, 39, "warrior", 2);
  // Wear and tear: one damaged plot and one hurt warrior, so Heal and Hammer have something to do.
  const hurtPlot = game.plots[10];
  if (hurtPlot) {
    hurtPlot.health -= 10;
  }
  const hurtResident = Object.values(game.residents).find((resident) => resident.ownerId === "0" && resident.kind === "warrior");
  if (hurtResident) {
    hurtResident.health -= 6;
  }
  giveItem(game, "0", "horse");
  giveItem(game, "0", "meat", 2);
  giveItem(game, "0", "luckyDie", 4);
  giveItem(game, "0", "sickle");
  giveItem(game, "0", "hammer");
  giveItem(game, "0", "ironSword");
  const alice = game.kings["0"];
  if (alice) {
    alice.laps = 2;
    alice.level = 2;
    alice.maxHealth += 10;
    alice.health = alice.maxHealth - 12;
  }
  const bob = game.kings["1"];
  if (bob) {
    bob.laps = 1;
    bob.coin = 220;
  }
  giveItem(game, "1", "ironSword");
  giveItem(game, "1", "cloverCharm");
  giveItem(game, "1", "ironArmor");
  placeKing(game, "0", 4);
  placeKing(game, "1", 15);
  placeKing(game, "2", 15);
  placeKing(game, "3", 31);
  return { game: claimed(game), viewerId: "0" };
};

// Cara has been knocked out of the match.
export const infoEliminated = (): GameScenario => {
  const scenario = infoGame();
  const cara = scenario.game.kings["2"];
  if (cara) {
    cara.eliminated = true;
    cara.eliminatedRound = 1;
    cara.coin = 0;
    scenario.game.eliminationOrder.push("2");
  }
  return scenario;
};

// One king takes a turn on tiles that nobody owns: skip the plot, then end the turn.
const emptyTurn = (game: GameState, playerId: PlayerId, d6: number, landingNext: number[] = [], endNext: number[] = []): void => {
  claimTurn(game, playerId, rngFor([]));
  rollDice(game, playerId, rngFor([d6], landingNext));
  skipPlot(game, playerId, rngFor([]));
  endTurn(game, playerId, rngFor([], endNext));
};

// Round 3 ends: Alice finds a treasure chest, Bob is pickpocketed, and a global Bountiful Year starts round 4. Seen by Alice.
export const eventsGame = (): GameScenario => {
  const game = named(3);
  game.round = 3;
  emptyTurn(game, "0", 4, [0.05, 0.4, 0]);
  emptyTurn(game, "1", 3, [0.05, 0.9, 0]);
  emptyTurn(game, "2", 2, [], [0.1, 0.99]);
  return { game, viewerId: "0" };
};
