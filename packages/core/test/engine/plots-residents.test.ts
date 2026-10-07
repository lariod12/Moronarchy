import { describe, expect, it } from "vitest";
import {
  buyPlot,
  claimTurn,
  endTurn,
  healPlot,
  healResident,
  leaveStartStation,
  pickCard,
  recruitResident,
  rollDice,
  skipPlot,
  upgradePlot,
  upgradeResident
} from "../../src/engine";
import { addResident, createTestGame, givePlot, placeKing } from "../../src/testing";
import { fails, landOn, ok, quietRng, snapshot } from "./helpers";

describe("buying plots", () => {
  it("allows spending down to exactly zero coin", () => {
    const state = createTestGame(2);
    state.kings["0"]!.coin = 60;
    const rng = landOn(state, 2);
    expect(state.pending).toMatchObject({ kind: "buyPlot", plotId: 2, price: 60, reason: "empty" });
    ok(buyPlot(state, "0", rng));
    expect(state.kings["0"]?.coin).toBe(0);
    expect(state.plots[0]).toMatchObject({ ownerId: "0", level: 0, health: 15, residentIds: [] });
    expect(state.pending).toBeNull();
    expect(state.turn.step).toBe("postMove");
    expect(state.turn.manageablePlotId).toBe(2);
  });

  it("rejects an unaffordable purchase without changing state", () => {
    const state = createTestGame(2);
    state.kings["0"]!.coin = 59;
    const rng = landOn(state, 2);
    const before = snapshot(state);
    fails(buyPlot(state, "0", rng), "INSUFFICIENT_COIN");
    expect(snapshot(state)).toBe(before);
  });

  it("lets the player skip a plot", () => {
    const state = createTestGame(2);
    const rng = landOn(state, 2);
    ok(skipPlot(state, "0", rng));
    expect(state.plots[0]?.ownerId).toBeNull();
    expect(state.kings["0"]?.coin).toBe(300);
    expect(state.turn.step).toBe("postMove");
    expect(state.turn.manageablePlotId).toBeNull();
    ok(endTurn(state, "0", rng));
    expect(state.turn.playerId).toBe("1");
  });
});

describe("managing an own plot after landing", () => {
  it("manages only the plot landed on in postMove", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 2);
    givePlot(state, "0", 3);
    const rng = landOn(state, 2);
    expect(state.turn.step).toBe("postMove");
    expect(state.turn.manageablePlotId).toBe(2);

    ok(upgradePlot(state, "0", rng, 2));
    expect(state.plots[0]).toMatchObject({ level: 1, health: 25 });
    expect(state.kings["0"]?.coin).toBe(270);
    fails(upgradePlot(state, "0", rng, 3), "NOT_ALLOWED");
    fails(recruitResident(state, "0", rng, 3, "farmer"), "NOT_ALLOWED");
  });

  it("caps plot upgrades by king level and by level 5", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 2, 1);
    const rng = landOn(state, 2);
    fails(upgradePlot(state, "0", rng, 2), "LIMIT_REACHED"); // king level 1, plot would be 2

    const high = createTestGame(2);
    high.kings["0"]!.level = 5;
    givePlot(high, "0", 2, 4);
    const highRng = landOn(high, 2);
    ok(upgradePlot(high, "0", highRng, 2));
    expect(high.plots[0]?.level).toBe(5);
    fails(upgradePlot(high, "0", highRng, 2), "LIMIT_REACHED");
  });

  it("checks coin and keeps damaged plots proportional when upgrading", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 2, 0).health = 10;
    const rng = landOn(state, 2);
    state.kings["0"]!.coin = 29;
    fails(upgradePlot(state, "0", rng, 2), "INSUFFICIENT_COIN");
    state.kings["0"]!.coin = 30;
    ok(upgradePlot(state, "0", rng, 2));
    expect(state.plots[0]?.health).toBe(20); // +10 max health
    expect(state.kings["0"]?.coin).toBe(0);
  });

  it("heals a plot for a partial cost", () => {
    const state = createTestGame(2);
    const plot = givePlot(state, "0", 2, 2);
    plot.health = 20;
    const rng = landOn(state, 2);
    ok(healPlot(state, "0", rng, 2));
    expect(plot.health).toBe(35);
    expect(state.kings["0"]?.coin).toBe(300 - 18);
    fails(healPlot(state, "0", rng, 2), "NOT_ALLOWED");
  });

  it("recruits residents up to the plot limit with sequential names", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 2, 0);
    const rng = landOn(state, 2);
    ok(recruitResident(state, "0", rng, 2, "farmer"));
    const resident = Object.values(state.residents)[0];
    expect(resident).toMatchObject({ kind: "farmer", level: 1, health: 20, ownerId: "0", plotId: 2, name: "01" });
    expect(state.plots[0]?.residentIds).toEqual([resident?.id]);
    expect(state.kings["0"]?.coin).toBe(260);
    fails(recruitResident(state, "0", rng, 2, "warrior"), "LIMIT_REACHED");
    expect(state.kings["0"]?.recruited).toBe(1);
  });

  it("names residents by the owner's recruit counter", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 2, 2);
    const rng = landOn(state, 2);
    ok(recruitResident(state, "0", rng, 2, "farmer"));
    ok(recruitResident(state, "0", rng, 2, "warrior"));
    const names = Object.values(state.residents).map((resident) => resident.name);
    expect(names).toEqual(["01", "02"]);
    expect(new Set(Object.keys(state.residents)).size).toBe(2);
    expect(state.kings["0"]?.coin).toBe(300 - 40 - 70);
  });

  it("upgrades residents up to the plot level and heals them", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 2, 2);
    const warrior = addResident(state, 2, "warrior", 1);
    const rng = landOn(state, 2);
    ok(upgradeResident(state, "0", rng, warrior.id));
    expect(warrior).toMatchObject({ level: 2, health: 38 });
    expect(state.kings["0"]?.coin).toBe(260);
    fails(upgradeResident(state, "0", rng, warrior.id), "LIMIT_REACHED"); // plot level 2 -> resident max 2

    warrior.health = 19; // max 38
    ok(healResident(state, "0", rng, warrior.id));
    expect(warrior.health).toBe(38);
    fails(healResident(state, "0", rng, warrior.id), "NOT_ALLOWED");
  });

  it("limits resident level by max(1, plot level) on a level 0 plot", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 2, 0);
    const farmer = addResident(state, 2, "farmer", 1);
    const rng = landOn(state, 2);
    fails(upgradeResident(state, "0", rng, farmer.id), "LIMIT_REACHED");
  });

  it("rejects targets the actor does not own", () => {
    const state = createTestGame(2);
    givePlot(state, "1", 3);
    givePlot(state, "0", 2);
    const rng = landOn(state, 2);
    fails(upgradePlot(state, "0", rng, 3), "NOT_ALLOWED");
    const foreign = addResident(state, 3, "farmer");
    fails(upgradeResident(state, "0", rng, foreign.id), "INVALID_TARGET");
    fails(healResident(state, "0", rng, "nope"), "INVALID_TARGET");
  });
});

describe("managing from the Start station", () => {
  it("can manage any own plot or resident once the card is picked", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 5, 0);
    givePlot(state, "0", 6, 0);
    const resident = addResident(state, 6, "farmer");
    placeKing(state, "0", 40);
    const rng = quietRng([1]);
    ok(claimTurn(state, "0", rng));
    ok(rollDice(state, "0", rng));
    expect(state.turn.step).toBe("startStation");

    fails(upgradePlot(state, "0", rng, 5), "PENDING_DECISION");
    ok(pickCard(state, "0", rng, 0));

    ok(upgradePlot(state, "0", rng, 5));
    ok(recruitResident(state, "0", rng, 5, "farmer")); // plot 5 is level 1 now
    resident.health = 10;
    ok(healResident(state, "0", rng, resident.id));
    expect(state.kings["0"]?.level).toBe(2);
    ok(upgradePlot(state, "0", rng, 6));
    ok(leaveStartStation(state, "0", rng));
  });

  it("rejects management outside the station and postMove", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 5);
    const rng = quietRng();
    fails(upgradePlot(state, "0", rng, 5), "WRONG_STEP");
    ok(claimTurn(state, "0", rng));
    fails(upgradePlot(state, "0", rng, 5), "WRONG_STEP");
  });
});
