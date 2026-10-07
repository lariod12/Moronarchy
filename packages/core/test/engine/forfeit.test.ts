import { describe, expect, it } from "vitest";
import {
  attack,
  claimTurn,
  fightRoll,
  forfeit,
  getBlockingPlayerIds,
  getEliminationInfo,
  getFinalRanking,
  rollDice
} from "../../src/engine";
import type { GameState, Rng } from "../../src/engine";
import { addResident, createTestGame, givePlot, placeKing } from "../../src/testing";
import { fails, landOn, ok, quietRng } from "./helpers";

const lastLog = (state: GameState, type: string) => [...state.log].reverse().find((entry) => entry.type === type);

describe("forfeit", () => {
  it("eliminates the king with reason left, releases assets and logs it", () => {
    const state = createTestGame(3);
    givePlot(state, "1", 7, 2);
    addResident(state, 7, "warrior");
    state.kings["1"]!.coin = 123;
    ok(forfeit(state, "1", quietRng()));
    expect(state.kings["1"]).toMatchObject({ eliminated: true, eliminationReason: "left", eliminatedRound: 1, coin: 0 });
    expect(state.plots.find((plot) => plot.id === 7)).toMatchObject({ ownerId: null, residentIds: [] });
    expect(Object.values(state.residents)).toHaveLength(0);
    expect(lastLog(state, "kingLeft")).toMatchObject({ playerId: "1", data: { round: 1, reason: "disconnected" } });
    expect(state.log.some((entry) => entry.type === "kingEliminated")).toBe(false);
    expect(getEliminationInfo(state, "1")).toMatchObject({ eliminated: true, round: 1, reason: "left" });
    expect(state.phase).toBe("playing");
    expect(state.turn.playerId).toBe("0");
  });

  it("is a no-op error for unknown, eliminated and finished games", () => {
    const state = createTestGame(3);
    fails(forfeit(state, "9", quietRng()), "NOT_ACTOR");
    ok(forfeit(state, "2", quietRng()));
    fails(forfeit(state, "2", quietRng()), "NOT_ACTOR");
    ok(forfeit(state, "1", quietRng()));
    expect(state.phase).toBe("finished");
    fails(forfeit(state, "0", quietRng()), "GAME_OVER");
  });

  it("only marks the leaver, not the others", () => {
    const state = createTestGame(3);
    ok(forfeit(state, "1", quietRng()));
    expect(state.kings["1"]?.eliminationReason).toBe("left");
    expect(state.kings["0"]?.eliminationReason).toBeNull();
  });

  describe("the turn player leaves", () => {
    it.each(["awaitClaim", "preRoll", "startStation", "postMove"] as const)("at %s the turn goes to the next king", (step) => {
      const state = createTestGame(3);
      state.turn.step = step;
      if (step === "startStation") {
        state.pending = { kind: "pickCard", playerId: "0", offers: [{ type: "coin", value: 10 }] };
      }
      ok(forfeit(state, "0", quietRng()));
      expect(state.turn).toMatchObject({ playerId: "1", step: "awaitClaim" });
      expect(state.pending).toBeNull();
      expect(state.kings["0"]?.eliminated).toBe(true);
    });

    it("clears an unanswered buy decision and advances", () => {
      const state = createTestGame(3);
      landOn(state, 5);
      expect(state.pending).toMatchObject({ kind: "buyPlot", playerId: "0" });
      ok(forfeit(state, "0", quietRng()));
      expect(state.pending).toBeNull();
      expect(state.turn).toMatchObject({ playerId: "1", step: "awaitClaim" });
    });

    it("counts a new round when the order wraps", () => {
      const state = createTestGame(3);
      state.turn.playerId = "2";
      ok(forfeit(state, "2", quietRng()));
      expect(state.turn.playerId).toBe("0");
      expect(state.round).toBe(2);
      expect(state.kings["2"]?.eliminatedRound).toBe(1);
    });
  });

  describe("pending decisions", () => {
    it("clears an owner decision addressed to the leaver and lets the visitor carry on", () => {
      const state = createTestGame(3);
      givePlot(state, "1", 5);
      placeKing(state, "1", 5);
      landOn(state, 5);
      expect(state.pending).toMatchObject({ kind: "ownerChoice", playerId: "1", visitorId: "0" });
      ok(forfeit(state, "1", quietRng()));
      expect(state.pending).toBeNull();
      expect(state.turn).toMatchObject({ playerId: "0", step: "postMove" });
      expect(state.kings["0"]?.coin).toBe(300);
      expect(state.plots.find((plot) => plot.id === 5)?.ownerId).toBeNull();
    });

    it("clears a visitor decision about the leaver's plot", () => {
      const state = createTestGame(3);
      givePlot(state, "2", 5);
      landOn(state, 5);
      expect(state.pending).toMatchObject({ kind: "visitorChoice", playerId: "0", ownerId: "2" });
      ok(forfeit(state, "2", quietRng()));
      expect(state.pending).toBeNull();
      expect(state.turn).toMatchObject({ playerId: "0", step: "postMove" });
      expect(state.kings["0"]?.coin).toBe(300);
    });

    it("keeps an unrelated decision of the turn player", () => {
      const state = createTestGame(3);
      landOn(state, 5);
      ok(forfeit(state, "2", quietRng()));
      expect(state.pending).toMatchObject({ kind: "buyPlot", playerId: "0" });
      expect(state.turn.step).toBe("decision");
    });
  });

  describe("fights", () => {
    // King "1" owns tile 5 and stands on it, king "0" lands there; owner attacks -> duel (attacker 1, defender 0).
    const duel = (d6: number[] = []): { state: GameState; rng: Rng } => {
      const state = createTestGame(3);
      givePlot(state, "1", 5);
      placeKing(state, "1", 5);
      const rng = landOn(state, 5, { d6 });
      ok(attack(state, "1", rng));
      return { state, rng };
    };

    it("ends a duel with the owner who leaves as the loser, without a fee", () => {
      const { state } = duel();
      ok(forfeit(state, "1", quietRng()));
      expect(state.fight).toBeNull();
      expect(state.lastFight).toMatchObject({ kind: "kingVsKing", winner: "defender", retreated: false, forfeit: true, feePaid: 0, loot: 0 });
      expect(state.turn).toMatchObject({ playerId: "0", step: "postMove" });
      expect(state.kings["0"]?.coin).toBe(300);
      expect(state.kings["1"]?.eliminationReason).toBe("left");
    });

    it("ends a duel with the visiting turn player who leaves as the loser, without a fee, and passes the turn", () => {
      const { state } = duel();
      ok(forfeit(state, "0", quietRng()));
      expect(state.lastFight).toMatchObject({ winner: "attacker", forfeit: true, feePaid: 0 });
      expect(state.kings["1"]?.coin).toBe(300);
      expect(state.turn).toMatchObject({ playerId: "1", step: "awaitClaim" });
      expect(state.fight).toBeNull();
    });

    it("still counts as leaving after the leaver already rolled", () => {
      const { state, rng } = duel([4, 2]);
      ok(fightRoll(state, "1", rng));
      expect(getBlockingPlayerIds(state)).toEqual(["0"]);
      ok(forfeit(state, "1", quietRng()));
      expect(state.fight).toBeNull();
      expect(state.lastFight?.winner).toBe("defender");
      expect(state.turn.step).toBe("postMove");
    });

    it("ends a garrison fight with the attacking turn player as the loser, without a fee", () => {
      const state = createTestGame(3);
      givePlot(state, "1", 5);
      addResident(state, 5, "warrior");
      const rng = landOn(state, 5);
      ok(attack(state, "0", rng));
      expect(state.fight?.kind).toBe("garrison");
      ok(forfeit(state, "0", quietRng()));
      expect(state.lastFight).toMatchObject({ kind: "garrison", winner: "defender", forfeit: true, feePaid: 0, loot: 0 });
      expect(state.kings["1"]?.coin).toBe(300);
      expect(state.turn).toMatchObject({ playerId: "1", step: "awaitClaim" });
    });

    it("lets the attacker win without loot when the absent garrison owner leaves", () => {
      const state = createTestGame(3);
      givePlot(state, "1", 5);
      addResident(state, 5, "warrior");
      const rng = landOn(state, 5);
      ok(attack(state, "0", rng));
      ok(forfeit(state, "1", quietRng()));
      expect(state.lastFight).toMatchObject({ kind: "garrison", winner: "attacker", forfeit: true, feePaid: 0, loot: 0 });
      expect(state.kings["0"]?.coin).toBe(300);
      expect(state.fight).toBeNull();
      expect(state.turn).toMatchObject({ playerId: "0", step: "postMove" });
      expect(state.plots.find((plot) => plot.id === 5)?.ownerId).toBeNull();
      expect(state.pending).toBeNull();
    });

    it("lets the attacker win a plot fight without paying when the plot owner leaves", () => {
      const state = createTestGame(3);
      givePlot(state, "1", 5);
      const rng = landOn(state, 5);
      ok(attack(state, "0", rng));
      expect(state.fight?.kind).toBe("plot");
      ok(forfeit(state, "1", quietRng()));
      expect(state.lastFight).toMatchObject({ kind: "plot", winner: "attacker", forfeit: true, feePaid: 0, plotOutcome: "none" });
      expect(state.kings["0"]?.coin).toBe(300);
      expect(state.turn.step).toBe("postMove");
      expect(state.pending).toBeNull();
    });

    it("leaves an unrelated fight alone", () => {
      const { state } = duel();
      ok(forfeit(state, "2", quietRng()));
      expect(state.fight).not.toBeNull();
      expect(state.turn.step).toBe("fight");
    });
  });

  describe("game end", () => {
    it("finishes the game when only one king remains", () => {
      const state = createTestGame(2);
      ok(forfeit(state, "0", quietRng()));
      expect(state).toMatchObject({ phase: "finished", winnerId: "1" });
      expect(getFinalRanking(state)).toEqual(["1", "0"]);
      expect(getEliminationInfo(state, "0")).toMatchObject({ reason: "left", rank: 2 });
      expect(getEliminationInfo(state, "1")).toMatchObject({ reason: null, rank: 1 });
    });

    it("finishes mid-fight and clears the fight", () => {
      const state = createTestGame(2);
      givePlot(state, "1", 5);
      placeKing(state, "1", 5);
      const rng = landOn(state, 5);
      ok(attack(state, "1", rng));
      ok(forfeit(state, "1", quietRng()));
      expect(state).toMatchObject({ phase: "finished", winnerId: "0", fight: null, pending: null });
    });
  });
});

describe("getBlockingPlayerIds", () => {
  it("is the turn player in a quiet turn", () => {
    const state = createTestGame(3);
    expect(getBlockingPlayerIds(state)).toEqual(["0"]);
    const rng = quietRng();
    ok(claimTurn(state, "0", rng));
    ok(rollDice(state, "0", rng));
    expect(getBlockingPlayerIds(state)).toEqual(["0"]);
  });

  it("adds whoever a pending decision is addressed to", () => {
    const state = createTestGame(3);
    givePlot(state, "1", 5);
    placeKing(state, "1", 5);
    landOn(state, 5);
    expect(getBlockingPlayerIds(state)).toEqual(["0", "1"]);
  });

  it("adds fighters who have not rolled this round", () => {
    const state = createTestGame(3);
    givePlot(state, "1", 5);
    placeKing(state, "1", 5);
    const rng = landOn(state, 5);
    ok(attack(state, "1", rng));
    expect(getBlockingPlayerIds(state).sort()).toEqual(["0", "1"]);
    ok(fightRoll(state, "1", rng));
    expect(getBlockingPlayerIds(state)).toEqual(["0"]);
  });

  it("ignores a plot or garrison defender and the plot owner", () => {
    const state = createTestGame(3);
    givePlot(state, "1", 5);
    const rng = landOn(state, 5);
    ok(attack(state, "0", rng));
    expect(getBlockingPlayerIds(state)).toEqual(["0"]);
  });

  it("is empty when the game is finished", () => {
    const state = createTestGame(2);
    ok(forfeit(state, "1", quietRng()));
    expect(getBlockingPlayerIds(state)).toEqual([]);
  });

  it("never lists eliminated kings", () => {
    const state = createTestGame(3);
    state.kings["0"]!.eliminated = true;
    expect(getBlockingPlayerIds(state)).toEqual([]);
  });
});
