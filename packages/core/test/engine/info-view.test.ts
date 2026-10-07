import { describe, expect, it } from "vitest";
import {
  ITEMS,
  GLOBAL_EVENTS,
  PERSONAL_EVENTS,
  endTurn,
  getEventHistoryView,
  getKingInfo,
  getPlotInfo,
  getPositionsView,
  getResidentInfo,
  getResidentsByKind
} from "../../src/engine";
import type { GameState, Rng } from "../../src/engine";
import { applyPersonalEvent } from "../../src/rules/events";
import { addResident, createTestGame, giveItem, givePlot, placeKing } from "../../src/testing";
import { ok, quietRng } from "./helpers";

const passTurn = (state: GameState, rng: Rng): void => {
  state.turn.step = "postMove";
  state.pending = null;
  ok(endTurn(state, state.turn.playerId, rng));
};

describe("getKingInfo", () => {
  it("is null for an unknown king", () => {
    expect(getKingInfo(createTestGame(2), "9")).toBeNull();
  });

  it("separates the equipment bonus from the effective stats and counts owned plots", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 4, 1);
    givePlot(state, "0", 9, 0);
    giveItem(state, "0", "ironSword");
    giveItem(state, "0", "cloverCharm");
    const king = state.kings["0"]!;
    king.laps = 2;
    const info = getKingInfo(state, "0");
    expect(info).toMatchObject({
      playerId: "0",
      name: "King 0",
      eliminated: false,
      level: king.level,
      coin: king.coin,
      health: king.health,
      maxHealth: king.maxHealth,
      laps: 2,
      plotsOwned: 2,
      attack: king.attack + 2,
      defense: king.defense,
      lucky: king.lucky + 2,
      bonus: { attack: 2, defense: 0, lucky: 2 }
    });
    expect(getKingInfo(state, "1")?.bonus).toEqual({ attack: 0, defense: 0, lucky: 0 });
  });

  it("keeps eliminated kings readable", () => {
    const state = createTestGame(3);
    state.kings["1"]!.eliminated = true;
    expect(getKingInfo(state, "1")?.eliminated).toBe(true);
  });
});

describe("getPlotInfo", () => {
  it("is null for Start and out of range tiles", () => {
    const state = createTestGame(2);
    expect(getPlotInfo(state, 1)).toBeNull();
    expect(getPlotInfo(state, 41)).toBeNull();
  });

  it("gives a bank price and zeros for a plot nobody owns", () => {
    const info = getPlotInfo(createTestGame(2), 5);
    expect(info).toMatchObject({
      id: 5,
      owned: false,
      ownerId: null,
      ownerName: null,
      level: 0,
      price: 60,
      fee: 0,
      income: 0,
      health: 0,
      maxHealth: 0,
      defense: 0,
      maxResidents: 0,
      upgradeCost: null,
      residents: []
    });
  });

  it("describes an owned plot with its residents and upgrade cost", () => {
    const state = createTestGame(2);
    givePlot(state, "1", 12, 2);
    addResident(state, 12, "farmer", 1);
    addResident(state, 12, "warrior", 2);
    state.plots[10]!.health -= 5;
    const info = getPlotInfo(state, 12);
    expect(info).toMatchObject({
      owned: true,
      ownerId: "1",
      ownerName: "King 1",
      level: 2,
      price: 80,
      fee: 72,
      income: 14 + 10,
      health: 30,
      maxHealth: 35,
      defense: 2,
      maxResidents: 3,
      upgradeCost: 80
    });
    expect(info?.healCost).toBeGreaterThan(0);
    expect(info?.residents.map((resident) => resident.kind)).toEqual(["farmer", "warrior"]);
  });

  it("has no upgrade cost at the top level", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 5, 5);
    expect(getPlotInfo(state, 5)?.upgradeCost).toBeNull();
  });
});

describe("residents", () => {
  it("getResidentInfo returns stats, the plot level and costs", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 5, 2);
    const warrior = addResident(state, 5, "warrior", 2);
    warrior.health -= 4;
    const info = getResidentInfo(state, warrior.id);
    expect(info).toMatchObject({
      id: warrior.id,
      name: "01",
      kind: "warrior",
      level: 2,
      plotId: 5,
      plotLevel: 2,
      attack: 5,
      defense: 3,
      maxHealth: 38,
      health: 34,
      upgradeCost: 80
    });
    expect(info?.healCost).toBeGreaterThan(0);
    expect(getResidentInfo(state, "nope")).toBeNull();
  });

  it("getResidentsByKind lists only the owner's residents by kind in name order", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 5, 3);
    givePlot(state, "1", 6, 1);
    addResident(state, 5, "farmer");
    addResident(state, 5, "warrior");
    addResident(state, 5, "warrior");
    addResident(state, 6, "warrior");
    const mine = getResidentsByKind(state, "0");
    expect(mine.warrior.map((resident) => resident.name)).toEqual(["02", "03"]);
    expect(mine.farmer.map((resident) => resident.name)).toEqual(["01"]);
    expect(getResidentsByKind(state, "1").warrior).toHaveLength(1);
    expect(getResidentsByKind(createTestGame(2), "0")).toEqual({ warrior: [], farmer: [] });
  });
});

describe("getEventHistoryView", () => {
  it("is empty without events", () => {
    expect(getEventHistoryView(createTestGame(2), "0")).toEqual([]);
  });

  it("lists personal events newest first with their target from the viewer's side", () => {
    const state = createTestGame(2);
    applyPersonalEvent(state, quietRng(), "0", "treasureChest");
    applyPersonalEvent(state, quietRng(), "1", "blessing");
    const forAlice = getEventHistoryView(state, "0");
    expect(forAlice.map((item) => item.eventId)).toEqual(["blessing", "treasureChest"]);
    expect(forAlice.map((item) => item.target)).toEqual(["other", "you"]);
    expect(forAlice[0]).toMatchObject({
      scope: "personal",
      playerId: "1",
      playerName: "King 1",
      description: PERSONAL_EVENTS.blessing.description,
      durationRounds: 0,
      active: false,
      roundsLeft: null
    });
    expect(getEventHistoryView(state, "1").map((item) => item.target)).toEqual(["you", "other"]);
  });

  it("pins a running global event on top with the rounds left, then shows it as over", () => {
    const state = createTestGame(2);
    state.round = 3;
    applyPersonalEvent(state, quietRng(), "0", "treasureChest");
    passTurn(state, quietRng());
    passTurn(state, quietRng([], [0.1, 0.5]));
    expect(state.round).toBe(4);
    expect(state.activeGlobalEvents).toMatchObject([{ eventId: "peaceTreaty", startRound: 4, endRound: 4 }]);

    const live = getEventHistoryView(state, "0");
    expect(live.map((item) => item.eventId)).toEqual(["peaceTreaty", "treasureChest"]);
    expect(live[0]).toMatchObject({
      scope: "global",
      target: "all",
      playerId: null,
      description: GLOBAL_EVENTS.peaceTreaty.description,
      durationRounds: 1,
      active: true,
      roundsLeft: 1
    });

    // A newer personal event does not push the running global event down.
    applyPersonalEvent(state, quietRng(), "1", "blessing");
    expect(getEventHistoryView(state, "0").map((item) => item.eventId)).toEqual(["peaceTreaty", "blessing", "treasureChest"]);

    state.round = 5;
    state.activeGlobalEvents = [];
    const over = getEventHistoryView(state, "0");
    expect(over.every((item) => !item.active && item.roundsLeft === null)).toBe(true);
    expect(over.map((item) => item.eventId)).toEqual(["blessing", "peaceTreaty", "treasureChest"]);
  });

  it("counts down a two round event", () => {
    const state = createTestGame(2);
    state.round = 3;
    passTurn(state, quietRng());
    // bountifulYear is the last of the seven global events.
    passTurn(state, quietRng([], [0.1, 0.99]));
    expect(getEventHistoryView(state, "0")[0]).toMatchObject({ eventId: "bountifulYear", active: true, roundsLeft: 2, durationRounds: 2 });
    state.round = 5;
    expect(getEventHistoryView(state, "0")[0]).toMatchObject({ active: true, roundsLeft: 1 });
  });
});

describe("getPositionsView", () => {
  it("lists every king in turn order and marks the current and the eliminated ones", () => {
    const state = createTestGame(3);
    placeKing(state, "0", 4);
    placeKing(state, "1", 15);
    placeKing(state, "2", 15);
    state.kings["1"]!.laps = 3;
    state.kings["2"]!.eliminated = true;
    const rows = getPositionsView(state);
    expect(rows.map((row) => [row.turn, row.playerId, row.position])).toEqual([
      [1, "0", 4],
      [2, "1", 15],
      [3, "2", 15]
    ]);
    expect(rows.map((row) => row.isCurrent)).toEqual([true, false, false]);
    expect(rows.map((row) => row.eliminated)).toEqual([false, false, true]);
    expect(rows[1]?.laps).toBe(3);
    expect(rows[0]?.name).toBe("King 0");
  });

  it("follows a custom turn order and has no current king once the match is finished", () => {
    const state = createTestGame(3);
    state.turnOrder = ["2", "0", "1"];
    state.turn.playerId = "0";
    expect(getPositionsView(state).map((row) => row.playerId)).toEqual(["2", "0", "1"]);
    expect(getPositionsView(state).find((row) => row.isCurrent)?.playerId).toBe("0");
    state.phase = "finished";
    expect(getPositionsView(state).some((row) => row.isCurrent)).toBe(false);
  });
});

describe("item content", () => {
  it("describes every item and says where it is used", () => {
    for (const [itemId, def] of Object.entries(ITEMS)) {
      expect(def.summary.length, itemId).toBeGreaterThan(5);
      expect(def.description.length, itemId).toBeGreaterThan(def.summary.length - 1);
    }
    expect(ITEMS.horse.use).toBe("map");
    expect(ITEMS.luckyDie.use).toBe("map");
    expect(ITEMS.warHorn.use).toBe("fight");
    expect(ITEMS.woodShield.use).toBe("fight");
    expect(ITEMS.sickle.use).toBe("plot");
    expect(ITEMS.hammer.use).toBe("plot");
    expect(ITEMS.meat.use).toBe("now");
    expect(ITEMS.ironSword.use).toBe("passive");
  });

  it("takes the numbers in the texts from the balance content", () => {
    expect(ITEMS.horse.summary).toContain("+3");
    expect(ITEMS.meat.summary).toContain("30");
    expect(ITEMS.ironSword.summary).toContain("+2");
    expect(GLOBAL_EVENTS.harvestFestival.description).toContain("50");
  });
});
