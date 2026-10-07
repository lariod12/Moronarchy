import { describe, expect, it } from "vitest";
import { buyItem, claimTurn, confirmRoll, leaveStartStation, pickCard, rollDice, upgradePlot, useItem } from "../../src/engine";
import { addResident, createTestGame, givePlot, giveItem, placeKing } from "../../src/testing";
import { fails, ok, quietRng } from "./helpers";

describe("movement and Start station", () => {
  it("passing Start mid-move grants the bonus, level up, full heal and a card pick", () => {
    const state = createTestGame(2);
    const king = state.kings["0"]!;
    placeKing(state, "0", 39);
    king.health = 40;
    const rng = quietRng([4]);
    ok(claimTurn(state, "0", rng));
    ok(rollDice(state, "0", rng));

    expect(king.position).toBe(1);
    expect(state.turn.step).toBe("startStation");
    expect(state.turn.remainingSteps).toBe(2);
    expect(state.turn.path).toEqual([40, 1]);
    expect(king.laps).toBe(1);
    expect(king.coin).toBe(400);
    expect(king.level).toBe(2);
    expect(king.maxHealth).toBe(110);
    expect(king.attack).toBe(6);
    expect(king.health).toBe(110);
    expect(state.pending?.kind).toBe("pickCard");
    if (state.pending?.kind === "pickCard") {
      expect(state.pending.offers).toHaveLength(3);
    }

    // Management and shopping are blocked until the card is picked.
    givePlot(state, "0", 5);
    fails(upgradePlot(state, "0", rng, 5), "PENDING_DECISION");
    fails(buyItem(state, "0", rng, "horse"), "PENDING_DECISION");
    fails(leaveStartStation(state, "0", rng), "PENDING_DECISION");

    ok(pickCard(state, "0", rng, 0));
    expect(state.pending).toBeNull();
    expect(state.turn.step).toBe("startStation");
    ok(buyItem(state, "0", rng, "horse"));

    // Remaining steps continue after leaving the station.
    ok(leaveStartStation(state, "0", rng));
    expect(king.position).toBe(3);
    expect(state.turn.path).toEqual([40, 1, 2, 3]);
    expect(state.pending?.kind).toBe("buyPlot");
    expect(state.turn.step).toBe("decision");
  });

  it("adds plot income including farmers, doubled by bountifulYear", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 2, 1); // 60 * 0.10 = 6
    addResident(state, 2, "farmer", 2); // +20
    placeKing(state, "0", 39);
    state.activeGlobalEvents.push({ eventId: "bountifulYear", startRound: 1, endRound: 2 });
    const rng = quietRng([4]);
    ok(claimTurn(state, "0", rng));
    ok(rollDice(state, "0", rng));
    expect(state.kings["0"]?.coin).toBe(300 + 100 + (6 + 20) * 2);
  });

  it("adds plain plot income without events", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 2, 1);
    addResident(state, 2, "farmer", 2);
    placeKing(state, "0", 39);
    const rng = quietRng([4]);
    ok(claimTurn(state, "0", rng));
    ok(rollDice(state, "0", rng));
    expect(state.kings["0"]?.coin).toBe(300 + 100 + 26);
  });

  it("landing exactly on Start ends the move in postMove after the card", () => {
    const state = createTestGame(2);
    placeKing(state, "0", 38);
    const rng = quietRng([3]);
    ok(claimTurn(state, "0", rng));
    ok(rollDice(state, "0", rng));
    expect(state.kings["0"]?.position).toBe(1);
    expect(state.turn.remainingSteps).toBe(0);
    ok(pickCard(state, "0", rng, 1));
    ok(leaveStartStation(state, "0", rng));
    expect(state.turn.step).toBe("postMove");
    expect(state.pending).toBeNull();
  });

  it("king level stops at 5", () => {
    const state = createTestGame(2);
    const king = state.kings["0"]!;
    king.level = 5;
    placeKing(state, "0", 39);
    const rng = quietRng([4]);
    ok(claimTurn(state, "0", rng));
    ok(rollDice(state, "0", rng));
    expect(king.level).toBe(5);
    expect(king.maxHealth).toBe(100);
    expect(king.attack).toBe(5);
  });

  it("waits for confirmRoll when a luckyDie is in the bag", () => {
    const state = createTestGame(2);
    giveItem(state, "0", "luckyDie");
    const rng = quietRng([4]);
    ok(claimTurn(state, "0", rng));
    ok(rollDice(state, "0", rng));
    expect(state.turn.step).toBe("rolled");
    expect(state.kings["0"]?.position).toBe(1);
    ok(confirmRoll(state, "0", rng));
    expect(state.kings["0"]?.position).toBe(5);
    expect(state.kings["0"]?.items.luckyDie).toBe(1);
  });

  it("wraps from tile 40 to tile 2 when passing Start", () => {
    const state = createTestGame(2);
    placeKing(state, "0", 40);
    const rng = quietRng([2]);
    ok(claimTurn(state, "0", rng));
    ok(rollDice(state, "0", rng));
    expect(state.kings["0"]?.position).toBe(1);
    ok(pickCard(state, "0", rng, 0));
    ok(leaveStartStation(state, "0", rng));
    expect(state.kings["0"]?.position).toBe(2);
  });

  it("does not let non-owners use items out of context", () => {
    const state = createTestGame(2);
    giveItem(state, "1", "horse");
    fails(useItem(state, "1", quietRng(), "horse"), "NOT_YOUR_TURN");
  });
});
