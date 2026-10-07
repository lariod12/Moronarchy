import { describe, expect, it } from "vitest";
import { endTurn } from "../../src/engine";
import type { GameState, Rng } from "../../src/engine";
import { getGoodEventChance } from "../../src/rules/events";
import { getItemDropChance } from "../../src/rules/items";
import { pushEventHistory, pushLog } from "../../src/rules/log";
import { addResident, createTestGame, giveItem, givePlot } from "../../src/testing";
import { landOn, ok, quietRng } from "./helpers";

const passTurn = (state: GameState, rng: Rng): void => {
  state.turn.step = "postMove";
  state.pending = null;
  ok(endTurn(state, state.turn.playerId, rng));
};

describe("personal events and item drops", () => {
  it("treasureChest gives coin and is recorded in history", () => {
    const state = createTestGame(2);
    landOn(state, 2, { next: [0.05, 0.4, 0] });
    expect(state.kings["0"]?.coin).toBe(360);
    expect(state.eventHistory).toMatchObject([{ scope: "personal", eventId: "treasureChest", playerId: "0", round: 1 }]);
    expect(state.log.some((entry) => entry.type === "personalEvent")).toBe(true);
  });

  it("wanderingMerchant grants an item, or coin when the bag is full", () => {
    const state = createTestGame(2);
    landOn(state, 2, { next: [0.05, 0.4, 0.4, 0] });
    expect(state.kings["0"]?.items.horse).toBe(1);

    const full = createTestGame(2);
    giveItem(full, "0", "horse", 5);
    landOn(full, 2, { next: [0.05, 0.4, 0.4, 0] });
    expect(full.kings["0"]?.items.horse).toBe(5);
    expect(full.kings["0"]?.coin).toBe(330);
  });

  it("healingSpring restores full health and blessing adds lucky", () => {
    const spring = createTestGame(2);
    spring.kings["0"]!.health = 50;
    landOn(spring, 2, { next: [0.05, 0.4, 0.56] });
    expect(spring.kings["0"]?.health).toBe(100);

    const blessing = createTestGame(2);
    landOn(blessing, 2, { next: [0.05, 0.4, 0.95] });
    expect(blessing.kings["0"]?.lucky).toBe(1);
  });

  it("volunteer joins the lowest own plot with a free slot, else pays coin", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 3, 0);
    givePlot(state, "0", 4, 0);
    landOn(state, 2, { next: [0.05, 0.4, 0.8] });
    const resident = Object.values(state.residents)[0];
    expect(resident).toMatchObject({ kind: "farmer", level: 1, plotId: 3, ownerId: "0" });
    expect(state.plots[1]?.residentIds).toHaveLength(1);

    const none = createTestGame(2);
    landOn(none, 2, { next: [0.05, 0.4, 0.8] });
    expect(none.kings["0"]?.coin).toBe(340);
    expect(Object.keys(none.residents)).toHaveLength(0);
  });

  it("pickpocket never pushes coin below zero", () => {
    const state = createTestGame(2);
    landOn(state, 2, { next: [0.05, 0.9, 0] });
    expect(state.kings["0"]?.coin).toBe(260);

    const poor = createTestGame(2);
    poor.kings["0"]!.coin = 10;
    landOn(poor, 2, { next: [0.05, 0.9, 0] });
    expect(poor.kings["0"]?.coin).toBe(0);
    expect(poor.kings["0"]?.eliminated).toBe(false);
  });

  it("ambush hurts and knocks the king out at zero health", () => {
    const state = createTestGame(2);
    landOn(state, 2, { next: [0.05, 0.9, 0.36] });
    expect(state.kings["0"]?.health).toBe(75);
    expect(state.kings["0"]?.skipNextTurn).toBe(false);

    const weak = createTestGame(2);
    weak.kings["0"]!.health = 20;
    landOn(weak, 2, { next: [0.05, 0.9, 0.36] });
    expect(weak.kings["0"]?.health).toBe(50);
    expect(weak.kings["0"]?.skipNextTurn).toBe(true);
    expect(weak.kings["0"]?.eliminated).toBe(false);
  });

  it("storm damages a random own plot but never below 1, desertion removes a resident", () => {
    const storm = createTestGame(2);
    givePlot(storm, "0", 3, 2);
    landOn(storm, 2, { next: [0.05, 0.9, 0.7, 0] });
    expect(storm.plots[1]?.health).toBe(18);

    const fragile = createTestGame(2);
    givePlot(fragile, "0", 3, 0).health = 1;
    landOn(fragile, 2, { next: [0.05, 0.9, 0.7, 0] });
    expect(fragile.plots[1]?.health).toBe(1);

    const noPlots = createTestGame(2);
    landOn(noPlots, 2, { next: [0.05, 0.9, 0.7] });
    expect(noPlots.eventHistory[0]?.eventId).toBe("storm");

    const desertion = createTestGame(2);
    givePlot(desertion, "0", 3, 1);
    const resident = addResident(desertion, 3, "farmer");
    landOn(desertion, 2, { next: [0.05, 0.9, 0.95, 0] });
    expect(desertion.residents[resident.id]).toBeUndefined();
    expect(desertion.plots[1]?.residentIds).toEqual([]);

    const nobody = createTestGame(2);
    landOn(nobody, 2, { next: [0.05, 0.9, 0.95] });
    expect(nobody.eventHistory[0]?.eventId).toBe("desertion");
  });

  it("item drops use the lucky-adjusted chance", () => {
    const drop = createTestGame(2);
    landOn(drop, 2, { next: [0.5, 0.05, 0] });
    expect(drop.kings["0"]?.items.horse).toBe(1);
    expect(drop.log.some((entry) => entry.type === "itemFound")).toBe(true);

    const none = createTestGame(2);
    landOn(none, 2, { next: [0.5, 0.15] });
    expect(none.kings["0"]?.items).toEqual({});

    const lucky = createTestGame(2);
    giveItem(lucky, "0", "cloverCharm");
    landOn(lucky, 2, { next: [0.5, 0.15] }); // chance is 0.16 with lucky 2; next() 0.99 -> hammer
    expect(lucky.kings["0"]?.items.hammer).toBe(1);

    const full = createTestGame(2);
    giveItem(full, "0", "horse", 5);
    landOn(full, 2, { next: [0.5, 0.05, 0] });
    expect(full.kings["0"]?.items.horse).toBe(5);
    expect(full.log.some((entry) => entry.type === "bagFull")).toBe(true);
  });

  it("scales chances with lucky and caps them", () => {
    expect(getItemDropChance(0)).toBeCloseTo(0.1);
    expect(getItemDropChance(2)).toBeCloseTo(0.16);
    expect(getItemDropChance(100)).toBe(0.4);
    expect(getGoodEventChance(0)).toBe(0.5);
    expect(getGoodEventChance(2)).toBeCloseTo(0.6);
    expect(getGoodEventChance(100)).toBe(0.9);
  });

  it("caps the log and event history at 50 entries", () => {
    const state = createTestGame(2);
    for (let index = 0; index < 80; index += 1) {
      pushLog(state, "test", null, { index });
      pushEventHistory(state, "global", "plague", null);
    }
    expect(state.log).toHaveLength(50);
    expect(state.eventHistory).toHaveLength(50);
    expect(state.log[49]?.data.index).toBe(79);
  });
});

describe("global events", () => {
  it("only roll from round 4", () => {
    const state = createTestGame(2);
    state.round = 2;
    const rng = quietRng([], [0, 0, 0, 0]);
    passTurn(state, rng);
    passTurn(state, rng);
    expect(state.round).toBe(3);
    expect(state.eventHistory).toHaveLength(0);
    passTurn(state, quietRng([], [0.1, 0]));
    passTurn(state, quietRng([], [0.1, 0]));
    expect(state.round).toBe(4);
    expect(state.eventHistory).toMatchObject([{ scope: "global", eventId: "harvestFestival", playerId: null, round: 4 }]);
  });

  it("harvestFestival is instant: coin for everyone, never active", () => {
    const state = createTestGame(2);
    state.round = 3;
    passTurn(state, quietRng());
    passTurn(state, quietRng([], [0.1, 0]));
    expect(state.round).toBe(4);
    expect(state.kings["0"]?.coin).toBe(350);
    expect(state.kings["1"]?.coin).toBe(350);
    expect(state.activeGlobalEvents).toEqual([]);
  });

  it("duration events stay active for their window then expire", () => {
    const state = createTestGame(2);
    state.round = 3;
    passTurn(state, quietRng());
    passTurn(state, quietRng([], [0.1, 0.43])); // peaceTreaty, 1 round
    expect(state.activeGlobalEvents).toEqual([{ eventId: "peaceTreaty", startRound: 4, endRound: 4 }]);
    passTurn(state, quietRng());
    passTurn(state, quietRng()); // round 5: expired, next() 0.99 -> no new event
    expect(state.round).toBe(5);
    expect(state.activeGlobalEvents).toEqual([]);

    const bountiful = createTestGame(2);
    bountiful.round = 3;
    passTurn(bountiful, quietRng());
    passTurn(bountiful, quietRng([], [0.1, 0.99]));
    expect(bountiful.activeGlobalEvents).toEqual([{ eventId: "bountifulYear", startRound: 4, endRound: 5 }]);
    passTurn(bountiful, quietRng());
    passTurn(bountiful, quietRng());
    expect(bountiful.round).toBe(5);
    expect(bountiful.activeGlobalEvents).toHaveLength(1); // still active, no new roll
    passTurn(bountiful, quietRng());
    passTurn(bountiful, quietRng());
    expect(bountiful.round).toBe(6);
    expect(bountiful.activeGlobalEvents).toEqual([]);
  });

  it("plague hurts residents but leaves them alive", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 3, 2);
    const healthy = addResident(state, 3, "warrior");
    const weak = addResident(state, 3, "farmer");
    weak.health = 1;
    state.round = 3;
    passTurn(state, quietRng());
    passTurn(state, quietRng([], [0.1, 0.15]));
    expect(healthy.health).toBe(21);
    expect(weak.health).toBe(1);
  });

  it("royalTax takes 10% of coin and never goes negative", () => {
    const state = createTestGame(3);
    state.kings["1"]!.coin = 5;
    state.kings["2"]!.coin = 0;
    state.round = 3;
    passTurn(state, quietRng());
    passTurn(state, quietRng());
    passTurn(state, quietRng([], [0.1, 0.3]));
    expect(state.kings["0"]?.coin).toBe(270);
    expect(state.kings["1"]?.coin).toBe(5);
    expect(state.kings["2"]?.coin).toBe(0);
    expect(Object.values(state.kings).every((king) => !king.eliminated)).toBe(true);
  });
});
