import { describe, expect, it } from "vitest";
import { PLOT_HEALTH, getFinalRanking } from "../../src/engine";
import { applyScenario, createMatchState, createMoronarchyMatchGame, isMatchScenario, readScenario, setReady, sit, startGame } from "../../src/match";
import type { BoardgameRandom, MatchScenario, MatchState } from "../../src/match";
import { eliminate } from "../../src/rules/elimination";
import { createSeededRng, createTestGame } from "../../src/testing";

const INVALID = "INVALID";

const seated = (scenario: MatchScenario | null): MatchState => {
  const state = createMatchState(scenario);
  sit(state, "0", "Alice");
  sit(state, "1", "Bob");
  sit(state, "2", "Cara");
  setReady(state, "1", true);
  setReady(state, "2", true);
  return state;
};

describe("test scenarios", () => {
  it("knows only the finale scenario and reads it from setupData", () => {
    expect(isMatchScenario("finale")).toBe(true);
    expect(isMatchScenario("nope")).toBe(false);
    expect(isMatchScenario(undefined)).toBe(false);
    expect(readScenario({ scenario: "finale" })).toBe("finale");
    expect(readScenario({ scenario: "other" })).toBeNull();
    expect(readScenario(undefined)).toBeNull();
    expect(readScenario("finale")).toBeNull();
    expect(readScenario({})).toBeNull();
  });

  it("finale: the host owns every plot at level 0 and everyone else holds 5 coin", () => {
    const game = createTestGame(3);
    applyScenario(game, "finale", "0");
    expect(game.plots).toHaveLength(39);
    for (const plot of game.plots) {
      expect(plot).toMatchObject({ ownerId: "0", level: 0, health: PLOT_HEALTH[0], residentIds: [] });
    }
    expect(game.kings["0"]?.coin).toBe(300);
    expect(game.kings["1"]?.coin).toBe(5);
    expect(game.kings["2"]?.coin).toBe(5);
  });

  it("applies the scenario when the host starts the game, and only then", () => {
    const rigged = seated("finale");
    expect(rigged.scenario).toBe("finale");
    expect(rigged.game).toBeNull();
    expect(startGame(rigged, "0", createSeededRng(5))).toEqual({ ok: true });
    expect(rigged.game?.plots.every((plot) => plot.ownerId === "0")).toBe(true);
    expect(rigged.game?.kings["1"]?.coin).toBe(5);

    const plain = seated(null);
    expect(startGame(plain, "0", createSeededRng(5))).toEqual({ ok: true });
    expect(plain.game?.plots.every((plot) => plot.ownerId === null)).toBe(true);
    expect(plain.game?.kings["1"]?.coin).toBe(300);
  });

  it("a rigged game ends as soon as the other kings go bankrupt", () => {
    const state = seated("finale");
    startGame(state, "0", createSeededRng(5));
    const game = state.game;
    if (!game) {
      throw new Error("no game");
    }
    eliminate(game, "1");
    eliminate(game, "2");
    expect(game.phase).toBe("finished");
    expect(getFinalRanking(game)).toEqual(["0", "2", "1"]);
  });
});

describe("validateSetupData and test scenarios", () => {
  const random: BoardgameRandom = { D6: () => 3, Number: () => 0.5 };

  it("rejects any scenario by default", () => {
    const game = createMoronarchyMatchGame(INVALID);
    expect(game.validateSetupData({ scenario: "finale" }, 6)).toBe("Test scenarios are disabled.");
    expect(game.validateSetupData({ scenario: "bogus" }, 6)).toBe("Test scenarios are disabled.");
    expect(game.validateSetupData({ scenario: undefined }, 6)).toBe("Test scenarios are disabled.");
    expect(game.validateSetupData({}, 6)).toBeUndefined();
    expect(game.validateSetupData(undefined, 6)).toBeUndefined();
    expect(game.validateSetupData(null, 6)).toBeUndefined();
  });

  it("is just as strict when scenarios are explicitly off", () => {
    const game = createMoronarchyMatchGame(INVALID, { allowScenarios: false });
    expect(game.validateSetupData({ scenario: "finale" }, 6)).toBe("Test scenarios are disabled.");
    // Even if setupData reached setup some other way, the scenario is ignored.
    expect(game.setup({}, { scenario: "finale" }).scenario).toBeNull();
  });

  it("accepts the finale scenario only when allowed, and still rejects unknown ones", () => {
    const game = createMoronarchyMatchGame(INVALID, { allowScenarios: true });
    expect(game.validateSetupData({ scenario: "finale" }, 6)).toBeUndefined();
    expect(game.validateSetupData({ scenario: "bogus" }, 6)).toBe("Unknown test scenario.");
    expect(game.validateSetupData({ scenario: "finale" }, 4)).toBe("Moronarchy rooms always have 6 seats.");
    expect(game.setup({}, { scenario: "finale" }).scenario).toBe("finale");
    expect(game.setup().scenario).toBeNull();
    expect(game.setup({}, { scenario: "bogus" }).scenario).toBeNull();
    // The moves still work on such a room.
    const G = game.setup({}, { scenario: "finale" });
    expect(game.moves.sit?.move({ G, playerID: "0", random }, "Ann")).toBeUndefined();
    expect(G.seats).toHaveLength(1);
  });
});
