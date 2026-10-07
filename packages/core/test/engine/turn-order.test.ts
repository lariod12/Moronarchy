import { describe, expect, it } from "vitest";
import {
  attack,
  buyPlot,
  claimTurn,
  endTurn,
  fightRoll as fightRollFor,
  getCrownState,
  getEliminationInfo,
  getFinalRanking,
  payFee,
  rollDice
} from "../../src/engine";
import { eliminate } from "../../src/rules/elimination";
import { addResident, createTestGame, givePlot, placeKing } from "../../src/testing";
import { fails, landOn, ok, quietRng } from "./helpers";

const playTurn = (state: ReturnType<typeof createTestGame>, rng = quietRng()): void => {
  const id = state.turn.playerId;
  ok(claimTurn(state, id, rng));
  ok(rollDice(state, id, rng));
  // Resolve whatever came up the simplest way for these tests: skip purchases, pay nothing special.
  if (state.pending?.kind === "buyPlot") {
    state.pending = null;
  }
  state.turn.step = "postMove";
  ok(endTurn(state, id, rng));
};

describe("turn order", () => {
  it("increments the round when the order wraps", () => {
    const state = createTestGame(2);
    expect(state.round).toBe(1);
    playTurn(state);
    expect(state.turn.playerId).toBe("1");
    expect(state.round).toBe(1);
    playTurn(state);
    expect(state.turn.playerId).toBe("0");
    expect(state.round).toBe(2);
  });

  it("starts each turn with a fresh turn state", () => {
    const state = createTestGame(2);
    const rng = quietRng([4]);
    ok(claimTurn(state, "0", rng));
    ok(rollDice(state, "0", rng));
    state.pending = null;
    state.turn.step = "postMove";
    ok(endTurn(state, "0", rng));
    expect(state.turn).toEqual({
      playerId: "1",
      step: "awaitClaim",
      rolled: false,
      dice: null,
      moveBonus: 0,
      horseUsed: false,
      remainingSteps: 0,
      path: [],
      manageablePlotId: null
    });
    expect(state.pending).toBeNull();
    expect(state.fight).toBeNull();
  });

  it("skips eliminated kings", () => {
    const state = createTestGame(3);
    eliminate(state, "1");
    expect(state.phase).toBe("playing");
    playTurn(state);
    expect(state.turn.playerId).toBe("2");
    expect(state.round).toBe(1);
    playTurn(state);
    expect(state.turn.playerId).toBe("0");
    expect(state.round).toBe(2);
  });

  it("skips a knocked out king once and consumes the flag", () => {
    const state = createTestGame(3);
    state.kings["1"]!.skipNextTurn = true;
    playTurn(state);
    expect(state.turn.playerId).toBe("2");
    expect(state.kings["1"]?.skipNextTurn).toBe(false);
    expect(state.log.some((entry) => entry.type === "turnSkipped" && entry.playerId === "1")).toBe(true);
    playTurn(state);
    playTurn(state);
    expect(state.turn.playerId).toBe("1");
    expect(state.round).toBe(2);
  });

  it("increments the round when the skipped king is last in order", () => {
    const state = createTestGame(2);
    state.kings["1"]!.skipNextTurn = true;
    playTurn(state);
    expect(state.turn.playerId).toBe("0");
    expect(state.round).toBe(2);
    expect(state.turn.step).toBe("awaitClaim");
  });

  it("reports crown states", () => {
    const state = createTestGame(3);
    expect(getCrownState(state, "0")).toBe("shaking");
    expect(getCrownState(state, "1")).toBe("idle");
    const rng = quietRng([1]);
    ok(claimTurn(state, "0", rng));
    expect(getCrownState(state, "0")).toBe("active");
    ok(rollDice(state, "0", rng));
    expect(getCrownState(state, "0")).toBe("active"); // buyPlot pending
    state.pending = null;
    state.turn.step = "postMove";
    expect(getCrownState(state, "0")).toBe("canEndTurn");
    eliminate(state, "2");
    expect(getCrownState(state, "2")).toBe("eliminated");
    eliminate(state, "1");
    expect(getCrownState(state, "0")).toBe("finished");
  });
});

describe("rival plots", () => {
  it("offers the visitor a pay or attack choice when the owner is away", () => {
    const state = createTestGame(2);
    givePlot(state, "1", 5, 1);
    const rng = landOn(state, 5);
    expect(state.pending).toEqual({ kind: "visitorChoice", playerId: "0", plotId: 5, ownerId: "1", canAttack: true });
    expect(state.turn.step).toBe("decision");
    ok(payFee(state, "0", rng));
    expect(state.kings["0"]?.coin).toBe(270);
    expect(state.kings["1"]?.coin).toBe(330);
    expect(state.turn.step).toBe("postMove");
    expect(state.turn.manageablePlotId).toBeNull();
  });

  it("offers the owner a choice when standing on the plot", () => {
    const state = createTestGame(2);
    givePlot(state, "1", 5, 1);
    placeKing(state, "1", 5);
    landOn(state, 5);
    expect(state.pending).toEqual({ kind: "ownerChoice", playerId: "1", plotId: 5, visitorId: "0", canAttack: true });
  });

  it("marks the plot as manageable when the player lands on their own plot", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 5, 1);
    landOn(state, 5);
    expect(state.pending).toBeNull();
    expect(state.turn.step).toBe("postMove");
    expect(state.turn.manageablePlotId).toBe(5);
  });

  it("lets a plot of an eliminated king be bought again", () => {
    const state = createTestGame(3);
    givePlot(state, "1", 5, 1);
    eliminate(state, "1");
    landOn(state, 5);
    expect(state.pending).toMatchObject({ kind: "buyPlot", plotId: 5, reason: "empty" });
  });
});

describe("bankruptcy and ranking", () => {
  it("pays everything, releases plots and residents and passes the turn", () => {
    const state = createTestGame(3);
    state.kings["0"]!.coin = 10;
    givePlot(state, "0", 7, 1);
    addResident(state, 7, "warrior");
    givePlot(state, "1", 5, 0);
    const rng = landOn(state, 5);
    ok(payFee(state, "0", rng));

    expect(state.kings["0"]).toMatchObject({ coin: 0, eliminated: true, eliminatedRound: 1 });
    expect(state.kings["1"]?.coin).toBe(310);
    expect(state.plots[5]).toMatchObject({ ownerId: null, level: 0, health: 0, residentIds: [] });
    expect(Object.keys(state.residents)).toHaveLength(0);
    expect(state.eliminationOrder).toEqual(["0"]);
    expect(state.phase).toBe("playing");
    expect(state.turn).toMatchObject({ playerId: "1", step: "awaitClaim" });
    expect(state.round).toBe(1);
    expect(state.pending).toBeNull();
  });

  it("finishes the game when one king remains", () => {
    const state = createTestGame(2);
    state.kings["0"]!.coin = 10;
    givePlot(state, "1", 5, 0);
    const rng = landOn(state, 5);
    ok(payFee(state, "0", rng));
    expect(state.phase).toBe("finished");
    expect(state.winnerId).toBe("1");
    expect(getFinalRanking(state)).toEqual(["1", "0"]);
    fails(endTurn(state, "1", rng), "GAME_OVER");
    fails(claimTurn(state, "1", rng), "GAME_OVER");
  });

  it("ranks by reverse elimination order", () => {
    const state = createTestGame(4);
    eliminate(state, "2");
    eliminate(state, "0");
    expect(state.phase).toBe("playing");
    eliminate(state, "3");
    expect(state.winnerId).toBe("1");
    expect(getFinalRanking(state)).toEqual(["1", "3", "0", "2"]);
  });

  it("reports who is out, in which round, and the final place once the game is over", () => {
    const state = createTestGame(3);
    expect(getEliminationInfo(state, "2")).toEqual({ eliminated: false, round: null, rank: null });
    eliminate(state, "2");
    expect(getEliminationInfo(state, "2")).toEqual({ eliminated: true, round: 1, rank: null });
    state.round = 4;
    eliminate(state, "0");
    expect(state.phase).toBe("finished");
    expect(getEliminationInfo(state, "1")).toEqual({ eliminated: false, round: null, rank: 1 });
    expect(getEliminationInfo(state, "0")).toEqual({ eliminated: true, round: 4, rank: 2 });
    expect(getEliminationInfo(state, "2")).toEqual({ eliminated: true, round: 1, rank: 3 });
    expect(getEliminationInfo(state, "9")).toEqual({ eliminated: false, round: null, rank: null });
  });

  it("paying a fee with exactly enough coin keeps the king in the game", () => {
    const state = createTestGame(3);
    state.kings["0"]!.coin = 15;
    givePlot(state, "1", 5, 0);
    const rng = landOn(state, 5);
    ok(payFee(state, "0", rng)); // exactly enough: stays in the game
    expect(state.kings["0"]).toMatchObject({ coin: 0, eliminated: false });
    expect(state.turn.step).toBe("postMove");
  });

  it("does not leave a stale pending decision after elimination in a duel", () => {
    const state = createTestGame(3);
    state.kings["0"]!.coin = 3;
    givePlot(state, "1", 5, 0);
    placeKing(state, "1", 5);
    const rng = landOn(state, 5, { d6: [6, 1, 6, 1] });
    ok(attack(state, "1", rng));
    for (let round = 0; round < 2; round += 1) {
      ok(fightRollFor(state, "1", rng));
      ok(fightRollFor(state, "0", rng));
    }
    expect(state.kings["0"]?.eliminated).toBe(true);
    expect(state.pending).toBeNull();
    expect(state.fight).toBeNull();
    expect(state.turn).toMatchObject({ playerId: "1", step: "awaitClaim" });
  });

  it("buyPlot is rejected for an eliminated actor", () => {
    const state = createTestGame(3);
    eliminate(state, "2");
    fails(buyPlot(state, "2", quietRng()), "NOT_ACTOR");
  });
});
