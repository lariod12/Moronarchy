import { describe, expect, it } from "vitest";
import {
  attack,
  buyPlot,
  collectFee,
  endTurn,
  fightRoll,
  getGarrisonStats,
  payFee,
  retreat,
  skipPlot
} from "../../src/engine";
import type { GameState, Rng } from "../../src/engine";
import { damageGarrison } from "../../src/rules/residents";
import { addResident, createTestGame, givePlot, placeKing } from "../../src/testing";
import { fails, landOn, ok } from "./helpers";

// King "1" owns tile 5 and stands on it; king "0" lands there -> owner chooses -> duel.
const duel = (d6: number[], plotLevel = 0): { state: GameState; rng: Rng } => {
  const state = createTestGame(2);
  givePlot(state, "1", 5, plotLevel);
  placeKing(state, "1", 5);
  const rng = landOn(state, 5, { d6 });
  return { state, rng };
};

const startDuel = (d6: number[], plotLevel = 0): { state: GameState; rng: Rng } => {
  const setup = duel(d6, plotLevel);
  ok(attack(setup.state, "1", setup.rng));
  return setup;
};

const rollBoth = (state: GameState, rng: Rng): void => {
  ok(fightRoll(state, "1", rng));
  ok(fightRoll(state, "0", rng));
};

// King "1" owns tile 5 but is elsewhere; king "0" lands there and attacks.
const siege = (d6: number[], plotLevel: number, residents: ("warrior" | "farmer")[] = []): { state: GameState; rng: Rng } => {
  const state = createTestGame(2);
  givePlot(state, "1", 5, plotLevel);
  for (const kind of residents) {
    addResident(state, 5, kind);
  }
  const rng = landOn(state, 5, { d6 });
  ok(attack(state, "0", rng));
  return { state, rng };
};

describe("king vs king", () => {
  it("is offered to the owner standing on the plot, who answers out of turn", () => {
    const { state, rng } = duel([]);
    expect(state.pending).toMatchObject({ kind: "ownerChoice", playerId: "1", visitorId: "0", canAttack: true });
    expect(state.turn.step).toBe("decision");
    fails(payFee(state, "0", rng), "NOT_ACTOR");
    fails(attack(state, "0", rng), "NOT_ACTOR");
    fails(collectFee(state, "0", rng), "NOT_ACTOR");
    fails(endTurn(state, "0", rng), "PENDING_DECISION");
    ok(collectFee(state, "1", rng));
    expect(state.kings["0"]?.coin).toBe(285);
    expect(state.kings["1"]?.coin).toBe(315);
    expect(state.turn.playerId).toBe("0");
    expect(state.turn.step).toBe("postMove");
    expect(state.pending).toBeNull();
  });

  it("applies the damage formula to the round loser", () => {
    const { state, rng } = startDuel([6, 2]);
    expect(state.fight).toMatchObject({ kind: "kingVsKing", attacker: { playerId: "1" }, defender: { playerId: "0" } });
    expect(state.turn.step).toBe("fight");
    rollBoth(state, rng);
    expect(state.fight?.rounds[0]).toEqual({
      attackerRoll: 6,
      defenderRoll: 2,
      attackerScore: 11,
      defenderScore: 7,
      winner: "attacker",
      damage: 8
    });
    expect(state.kings["0"]?.health).toBe(92);
    expect(state.kings["1"]?.health).toBe(100);
    expect(state.fight?.attackerWins).toBe(1);
  });

  it("deals at least 1 damage", () => {
    const { state, rng } = startDuel([2, 1]);
    state.kings["0"]!.defense = 20;
    rollBoth(state, rng);
    expect(state.fight?.rounds[0]?.damage).toBe(1);
    expect(state.kings["0"]?.health).toBe(99);
  });

  it("lets the defender win a round and hurt the attacker", () => {
    const { state, rng } = startDuel([1, 6]);
    rollBoth(state, rng);
    expect(state.fight?.rounds[0]).toMatchObject({ winner: "defender", attackerScore: 6, defenderScore: 11, damage: 8 });
    expect(state.kings["1"]?.health).toBe(92);
    expect(state.fight?.defenderWins).toBe(1);
  });

  it("treats equal scores as a tie that rerolls the round", () => {
    const { state, rng } = startDuel([3, 3, 6, 2]);
    rollBoth(state, rng);
    expect(state.fight?.rounds[0]).toMatchObject({ winner: "tie", damage: 0 });
    expect(state.fight?.attackerWins).toBe(0);
    expect(state.fight?.defenderWins).toBe(0);
    expect(state.fight?.pendingRolls).toEqual({});
    expect(state.kings["0"]?.health).toBe(100);
    rollBoth(state, rng);
    expect(state.fight?.rounds).toHaveLength(2);
    expect(state.fight?.attackerWins).toBe(1);
  });

  it("waits for both kings before resolving a round", () => {
    const { state, rng } = startDuel([6, 2]);
    ok(fightRoll(state, "1", rng));
    expect(state.fight?.rounds).toHaveLength(0);
    expect(state.fight?.pendingRolls).toEqual({ "1": 6 });
    fails(fightRoll(state, "1", rng), "NOT_ALLOWED");
    fails(retreat(state, "1", rng), "NOT_ALLOWED");
    ok(fightRoll(state, "0", rng));
    expect(state.fight?.rounds).toHaveLength(1);
  });

  it("is best of three: the owner wins and collects the fee", () => {
    const { state, rng } = startDuel([6, 1, 6, 1]);
    rollBoth(state, rng);
    rollBoth(state, rng);
    expect(state.fight).toBeNull();
    expect(state.lastFight).toMatchObject({
      kind: "kingVsKing",
      winner: "attacker",
      retreated: false,
      feePaid: 15,
      loot: 0,
      plotOutcome: "none"
    });
    expect(state.kings["0"]?.coin).toBe(285);
    expect(state.kings["1"]?.coin).toBe(315);
    expect(state.kings["0"]?.health).toBe(84);
    expect(state.turn.step).toBe("postMove");
  });

  it("is best of three: the visiting king wins without paying", () => {
    const { state, rng } = startDuel([6, 1, 1, 6, 1, 6]);
    rollBoth(state, rng);
    rollBoth(state, rng);
    expect(state.fight?.attackerWins).toBe(1);
    expect(state.fight?.defenderWins).toBe(1);
    rollBoth(state, rng);
    expect(state.fight).toBeNull();
    expect(state.lastFight).toMatchObject({ winner: "defender", feePaid: 0 });
    expect(state.kings["0"]?.coin).toBe(300);
    expect(state.kings["1"]?.coin).toBe(300);
  });

  it("gives the owner a warrior bonus of +2 attack and +1 defense each", () => {
    const { state, rng } = startDuel([3, 3], 2);
    addResident(state, 5, "warrior");
    addResident(state, 5, "warrior");
    rollBoth(state, rng);
    expect(state.fight?.rounds[0]).toMatchObject({ attackerScore: 12, defenderScore: 8, winner: "attacker", damage: 9 });

    const other = startDuel([1, 6], 2);
    addResident(other.state, 5, "warrior");
    addResident(other.state, 5, "warrior");
    rollBoth(other.state, other.rng);
    // visitor wins: 6 + 5 = 11 against owner score 1 + 9 = 10, damage 11 - (3 + 2)
    expect(other.state.fight?.rounds[0]).toMatchObject({ attackerScore: 10, defenderScore: 11, winner: "defender", damage: 6 });
    expect(other.state.kings["1"]?.health).toBe(94);
  });

  it("knocks out a king at zero health: half health, next turn skipped", () => {
    const { state, rng } = startDuel([6, 1]);
    state.kings["0"]!.health = 5;
    rollBoth(state, rng);
    expect(state.lastFight).toMatchObject({ winner: "attacker", feePaid: 15 });
    expect(state.kings["0"]).toMatchObject({ health: 50, skipNextTurn: true, eliminated: false });
    expect(state.log.some((entry) => entry.type === "knockedOut" && entry.playerId === "0")).toBe(true);
  });

  it("knocks out a losing owner without a fee", () => {
    const { state, rng } = startDuel([1, 6]);
    state.kings["1"]!.health = 5;
    rollBoth(state, rng);
    expect(state.lastFight).toMatchObject({ winner: "defender", feePaid: 0 });
    expect(state.kings["1"]).toMatchObject({ health: 50, skipNextTurn: true });
    expect(state.kings["0"]?.coin).toBe(300);
  });

  it("retreating owner loses without a fee", () => {
    const { state, rng } = startDuel([]);
    fails(retreat(state, "0", rng), "NOT_ACTOR");
    ok(retreat(state, "1", rng));
    expect(state.lastFight).toMatchObject({ winner: "defender", retreated: true, feePaid: 0 });
    expect(state.kings["0"]?.coin).toBe(300);
    expect(state.turn.step).toBe("postMove");
  });

  it("bankrupt visitor loses the duel and the game", () => {
    const { state, rng } = startDuel([6, 1, 6, 1]);
    state.kings["0"]!.coin = 5;
    rollBoth(state, rng);
    rollBoth(state, rng);
    expect(state.kings["0"]?.eliminated).toBe(true);
    expect(state.kings["1"]?.coin).toBe(305);
    expect(state.phase).toBe("finished");
    expect(state.winnerId).toBe("1");
  });
});

describe("peace treaty", () => {
  it("removes the attack option", () => {
    const state = createTestGame(2);
    givePlot(state, "1", 5);
    state.activeGlobalEvents.push({ eventId: "peaceTreaty", startRound: 1, endRound: 1 });
    const rng = landOn(state, 5);
    expect(state.pending).toMatchObject({ kind: "visitorChoice", canAttack: false });
    fails(attack(state, "0", rng), "NOT_ALLOWED");
    expect(state.pending).not.toBeNull();
    ok(payFee(state, "0", rng));
    expect(state.kings["0"]?.coin).toBe(285);
  });

  it("also blocks attacks when the owner is present", () => {
    const state = createTestGame(2);
    givePlot(state, "1", 5);
    placeKing(state, "1", 5);
    state.activeGlobalEvents.push({ eventId: "peaceTreaty", startRound: 1, endRound: 1 });
    const rng = landOn(state, 5);
    expect(state.pending).toMatchObject({ kind: "ownerChoice", canAttack: false });
    fails(attack(state, "1", rng), "NOT_ALLOWED");
  });
});

describe("garrison fights", () => {
  it("uses the best resident stats plus one per extra resident", () => {
    const state = createTestGame(2);
    givePlot(state, "1", 5, 2);
    expect(getGarrisonStats(state, 5)).toEqual({ count: 0, attack: 0, defense: 0 });
    addResident(state, 5, "warrior");
    expect(getGarrisonStats(state, 5)).toEqual({ count: 1, attack: 4, defense: 2 });
    addResident(state, 5, "farmer");
    expect(getGarrisonStats(state, 5)).toEqual({ count: 2, attack: 5, defense: 3 });
    addResident(state, 5, "farmer", 3);
    expect(getGarrisonStats(state, 5)).toEqual({ count: 3, attack: 6, defense: 4 });
  });

  it("rolls the garrison side automatically and damages the shared pool", () => {
    const { state, rng } = siege([6, 1], 2, ["warrior", "warrior"]);
    expect(state.fight).toMatchObject({ kind: "garrison", garrison: { startCount: 2, maxPool: 60, pool: 60 } });
    ok(fightRoll(state, "0", rng));
    expect(state.fight?.rounds[0]).toEqual({
      attackerRoll: 6,
      defenderRoll: 1,
      attackerScore: 11,
      defenderScore: 6,
      winner: "attacker",
      damage: 8
    });
    expect(state.fight?.garrison?.pool).toBe(52);
    expect(Object.values(state.residents).map((resident) => resident.health)).toEqual([26, 26]);
  });

  it("loots twice the fee when the attacker wins", () => {
    const { state, rng } = siege([6, 1, 6, 1], 2, ["warrior", "warrior"]);
    ok(fightRoll(state, "0", rng));
    ok(fightRoll(state, "0", rng));
    expect(state.lastFight).toMatchObject({
      kind: "garrison",
      winner: "attacker",
      loot: 108,
      feePaid: 0,
      residentsKilled: 0
    });
    expect(state.kings["0"]?.coin).toBe(408);
    expect(state.kings["1"]?.coin).toBe(192);
    expect(state.turn.step).toBe("postMove");
  });

  it("caps the loot at the owner's coin", () => {
    const { state, rng } = siege([6, 1, 6, 1], 2, ["warrior", "warrior"]);
    state.kings["1"]!.coin = 50;
    ok(fightRoll(state, "0", rng));
    ok(fightRoll(state, "0", rng));
    expect(state.lastFight?.loot).toBe(50);
    expect(state.kings["0"]?.coin).toBe(350);
    expect(state.kings["1"]?.coin).toBe(0);
    expect(state.kings["1"]?.eliminated).toBe(false);
  });

  it("makes the attacker pay the fee after losing", () => {
    const { state, rng } = siege([1, 6, 1, 6], 2, ["warrior", "warrior"]);
    ok(fightRoll(state, "0", rng));
    ok(fightRoll(state, "0", rng));
    expect(state.lastFight).toMatchObject({ winner: "defender", feePaid: 54, loot: 0 });
    expect(state.kings["0"]?.coin).toBe(246);
    expect(state.kings["1"]?.coin).toBe(354);
    expect(state.kings["0"]?.health).toBe(84); // 2 rounds of (11 - 3)
  });

  it("makes the attacker pay the fee after retreating", () => {
    const { state, rng } = siege([], 2, ["warrior"]);
    ok(retreat(state, "0", rng));
    expect(state.lastFight).toMatchObject({ winner: "defender", retreated: true, feePaid: 54 });
    expect(state.kings["0"]?.coin).toBe(246);
  });

  it("kills the weakest residents first when the pool shrinks", () => {
    const state = createTestGame(2);
    givePlot(state, "1", 5, 5);
    for (const level of [3, 1, 5, 2, 4]) {
      addResident(state, 5, "warrior", level);
    }
    const rng = landOn(state, 5);
    ok(attack(state, "0", rng));
    const fight = state.fight!;
    expect(fight.garrison).toEqual({ startCount: 5, maxPool: 230, pool: 230 });

    // 40% of the pool left -> ceil(0.4 * 5) = 2 residents alive.
    expect(damageGarrison(state, fight, 138)).toBe(3);
    const survivors = Object.values(state.residents);
    expect(survivors.map((resident) => resident.level).sort()).toEqual([4, 5]);
    expect(state.plots[3]?.residentIds).toHaveLength(2);
    expect(fight.garrison?.pool).toBe(92);
    const health = Object.fromEntries(survivors.map((resident) => [resident.level, resident.health]));
    expect(health).toEqual({ 4: 42, 5: 49 });
  });

  it("kills farmers before warriors of the same level and spreads remaining health", () => {
    const state = createTestGame(2);
    givePlot(state, "1", 5, 1);
    const warrior = addResident(state, 5, "warrior");
    const farmer = addResident(state, 5, "farmer");
    const rng = landOn(state, 5);
    ok(attack(state, "0", rng));
    expect(damageGarrison(state, state.fight!, 30)).toBe(1);
    expect(state.residents[farmer.id]).toBeUndefined();
    expect(state.residents[warrior.id]?.health).toBe(20);
  });

  it("breaks ties between equal residents by oldest first", () => {
    const state = createTestGame(2);
    givePlot(state, "1", 5, 2);
    const first = addResident(state, 5, "warrior");
    const second = addResident(state, 5, "warrior");
    const rng = landOn(state, 5);
    ok(attack(state, "0", rng));
    expect(damageGarrison(state, state.fight!, 40)).toBe(1);
    expect(state.residents[first.id]).toBeUndefined();
    expect(state.residents[second.id]).toBeDefined();
  });

  it("can wipe out the garrison and ends the fight at once", () => {
    const { state, rng } = siege([6, 1], 1, ["farmer"]);
    state.kings["0"]!.attack = 30;
    ok(fightRoll(state, "0", rng));
    expect(state.lastFight).toMatchObject({ winner: "attacker", loot: 60, residentsKilled: 1 });
    expect(Object.keys(state.residents)).toHaveLength(0);
    expect(state.plots[3]).toMatchObject({ ownerId: "1", residentIds: [] });
    expect(state.kings["0"]?.coin).toBe(360);
  });
});

describe("plot fights", () => {
  it("destroying a level 0 plot is free and offers it for sale", () => {
    const { state, rng } = siege([6, 1, 6, 1], 0);
    expect(state.fight).toMatchObject({ kind: "plot", defender: { type: "plot", plotId: 5 } });
    ok(fightRoll(state, "0", rng));
    expect(state.plots[3]?.health).toBe(4);
    ok(fightRoll(state, "0", rng));
    expect(state.lastFight).toMatchObject({ winner: "attacker", plotOutcome: "destroyed", feePaid: 0 });
    expect(state.plots[3]).toMatchObject({ ownerId: null, level: 0, health: 0 });
    expect(state.pending).toEqual({ kind: "buyPlot", playerId: "0", plotId: 5, price: 60, reason: "destroyed" });
    expect(state.turn.step).toBe("decision");
    expect(state.kings["0"]?.coin).toBe(300);
    ok(buyPlot(state, "0", rng));
    expect(state.plots[3]).toMatchObject({ ownerId: "0", level: 0, health: 15 });
    expect(state.kings["0"]?.coin).toBe(240);
    expect(state.turn.step).toBe("postMove");
  });

  it("a destroyed plot can be skipped", () => {
    const { state, rng } = siege([6, 1, 6, 1], 0);
    ok(fightRoll(state, "0", rng));
    ok(fightRoll(state, "0", rng));
    ok(skipPlot(state, "0", rng));
    expect(state.plots[3]?.ownerId).toBeNull();
    expect(state.turn.step).toBe("postMove");
  });

  it("drops one level for free when a higher level plot reaches zero health", () => {
    const { state, rng } = siege([6, 1], 2);
    state.plots[3]!.health = 5;
    ok(fightRoll(state, "0", rng));
    expect(state.lastFight).toMatchObject({ winner: "attacker", plotOutcome: "levelDown", feePaid: 0 });
    expect(state.plots[3]).toMatchObject({ ownerId: "1", level: 1, health: 25 });
    expect(state.pending).toBeNull();
    expect(state.turn.step).toBe("postMove");
    expect(state.kings["0"]?.coin).toBe(300);
  });

  it("pays the fee when winning two rounds without destroying the plot", () => {
    const { state, rng } = siege([6, 1, 6, 1], 2);
    ok(fightRoll(state, "0", rng));
    ok(fightRoll(state, "0", rng));
    expect(state.plots[3]?.health).toBe(17); // two hits of 11 - 2
    expect(state.lastFight).toMatchObject({ winner: "attacker", feePaid: 54, plotOutcome: "none" });
    expect(state.kings["0"]?.coin).toBe(246);
    expect(state.kings["1"]?.coin).toBe(354);
  });

  it("is passive: the attacker is never damaged and pays when the plot wins", () => {
    const { state, rng } = siege([1, 6, 1, 6], 0);
    state.kings["0"]!.attack = 1;
    ok(fightRoll(state, "0", rng));
    expect(state.fight?.rounds[0]).toMatchObject({ winner: "defender", damage: 0 });
    expect(state.kings["0"]?.health).toBe(100);
    ok(fightRoll(state, "0", rng));
    expect(state.lastFight).toMatchObject({ winner: "defender", feePaid: 15 });
    expect(state.kings["0"]?.health).toBe(100);
    expect(state.kings["0"]?.coin).toBe(285);
  });

  it("pays the fee when retreating, even between rounds", () => {
    const { state, rng } = siege([1, 6], 0);
    ok(fightRoll(state, "0", rng)); // tie: 1 + 5 against 6
    ok(retreat(state, "0", rng));
    expect(state.lastFight).toMatchObject({ winner: "defender", retreated: true, feePaid: 15 });
    expect(state.kings["0"]?.coin).toBe(285);
    expect(state.turn.step).toBe("postMove");
  });

  it("eliminates a bankrupt attacker and hands the game to the owner", () => {
    const { state, rng } = siege([], 2);
    state.kings["0"]!.coin = 10;
    ok(retreat(state, "0", rng));
    expect(state.kings["0"]?.eliminated).toBe(true);
    expect(state.kings["1"]?.coin).toBe(310);
    expect(state.phase).toBe("finished");
  });
});

describe("fight command validation", () => {
  it("rejects fight commands without a fight or from non-fighters", () => {
    const state = createTestGame(3);
    givePlot(state, "1", 5);
    const rng = landOn(state, 5);
    fails(fightRoll(state, "0", rng), "WRONG_STEP");
    fails(retreat(state, "0", rng), "WRONG_STEP");
    ok(attack(state, "0", rng));
    fails(fightRoll(state, "1", rng), "NOT_ACTOR");
    fails(fightRoll(state, "2", rng), "NOT_ACTOR");
    fails(retreat(state, "1", rng), "NOT_ACTOR");
    fails(endTurn(state, "0", rng), "WRONG_STEP");
  });
});
