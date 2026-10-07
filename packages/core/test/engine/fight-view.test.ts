import { describe, expect, it } from "vitest";
import { attack, fightRoll, getFightView, getFightViewerRole, getFinalFightView, getPlotFee, retreat, useItem } from "../../src/engine";
import type { GameState, Rng } from "../../src/engine";
import { addResident, createTestGame, giveItem, givePlot, placeKing } from "../../src/testing";
import { landOn, ok, snapshot } from "./helpers";

// King "1" owns tile 5 and stands on it; king "0" lands there -> owner chooses -> duel (attacker "1", defender "0").
const startDuel = (d6: number[], plotLevel = 0, players = 2): { state: GameState; rng: Rng } => {
  const state = createTestGame(players);
  givePlot(state, "1", 5, plotLevel);
  placeKing(state, "1", 5);
  const rng = landOn(state, 5, { d6 });
  ok(attack(state, "1", rng));
  return { state, rng };
};

// King "1" owns tile 5 but is elsewhere; king "0" lands there and attacks (attacker "0").
const startSiege = (
  d6: number[],
  plotLevel: number,
  residents: ("warrior" | "farmer")[] = [],
  residentHealth?: number
): { state: GameState; rng: Rng } => {
  const state = createTestGame(2);
  givePlot(state, "1", 5, plotLevel);
  for (const kind of residents) {
    const resident = addResident(state, 5, kind);
    if (residentHealth !== undefined) {
      resident.health = residentHealth;
    }
  }
  const rng = landOn(state, 5, { d6 });
  ok(attack(state, "0", rng));
  return { state, rng };
};

const rollBoth = (state: GameState, rng: Rng): void => {
  ok(fightRoll(state, "1", rng));
  ok(fightRoll(state, "0", rng));
};

describe("getFightView", () => {
  it("is null while nobody fights", () => {
    expect(getFightView(createTestGame(2), "0")).toBeNull();
    expect(getFightViewerRole(createTestGame(2), "0")).toBe("spectator");
  });

  it("describes a duel for the fighters and for a spectator", () => {
    const { state } = startDuel([], 1, 3);
    const owner = getFightView(state, "1");
    expect(owner).toMatchObject({
      kind: "kingVsKing",
      plotId: 5,
      plotLevel: 1,
      viewerRole: "attacker",
      canRoll: true,
      canRetreat: true,
      waitingFor: ["1", "0"],
      retreatFee: 0
    });
    expect(owner?.attacker).toMatchObject({ kind: "king", playerId: "1", name: "King 1", health: 100, maxHealth: 100, attack: 5, defense: 3, isViewer: true });
    expect(owner?.defender).toMatchObject({ kind: "king", playerId: "0", health: 100, isViewer: false, hasRolled: false });

    const visitor = getFightView(state, "0");
    expect(visitor).toMatchObject({ viewerRole: "defender", canRoll: true, canRetreat: false });
    expect(visitor?.defender.isViewer).toBe(true);

    expect(["1", "0", "2"].map((id) => getFightViewerRole(state, id))).toEqual(["attacker", "defender", "spectator"]);
    const spectator = getFightView(state, "2");
    expect(spectator).toMatchObject({ viewerRole: "spectator", canRoll: false, canRetreat: false });
    expect(spectator?.attacker.isViewer).toBe(false);
  });

  it("does not touch the game and follows rolls, damage and round marks", () => {
    const { state, rng } = startDuel([6, 1, 1, 6], 0);
    const before = snapshot(state);
    getFightView(state, "1");
    expect(snapshot(state)).toBe(before);

    ok(fightRoll(state, "1", rng));
    const waiting = getFightView(state, "1");
    expect(waiting).toMatchObject({ canRoll: false, canRetreat: false, waitingFor: ["0"] });
    expect(waiting?.attacker.hasRolled).toBe(true);
    expect(waiting?.defender.hasRolled).toBe(false);

    ok(fightRoll(state, "0", rng));
    const afterOne = getFightView(state, "1");
    expect(afterOne?.rounds).toHaveLength(1);
    expect(afterOne?.attacker).toMatchObject({ roundsWon: 1, results: ["won"], hasRolled: false });
    expect(afterOne?.defender).toMatchObject({ roundsWon: 0, results: ["lost"], health: 100 - 8 });
    expect(afterOne?.waitingFor).toEqual(["1", "0"]);
    expect(afterOne?.canRetreat).toBe(true);

    rollBoth(state, rng);
    const afterTwo = getFightView(state, "0");
    expect(afterTwo?.attacker.results).toEqual(["won", "lost"]);
    expect(afterTwo?.defender.results).toEqual(["lost", "won"]);
  });

  it("leaves ties unmarked", () => {
    const { state, rng } = startDuel([3, 3], 0);
    rollBoth(state, rng);
    const view = getFightView(state, "1");
    expect(view?.rounds[0]?.winner).toBe("tie");
    expect(view?.attacker.results).toEqual([]);
    expect(view?.defender.results).toEqual([]);
  });

  it("adds the owner's Warriors to the duel stats and shows used buffs", () => {
    const { state, rng } = startDuel([], 2);
    addResident(state, 5, "warrior");
    addResident(state, 5, "warrior");
    giveItem(state, "1", "warHorn");
    giveItem(state, "0", "woodShield");
    expect(getFightView(state, "1")?.attacker).toMatchObject({ attack: 5 + 4, defense: 3 + 2, buffs: { attack: 0, defense: 0 } });
    ok(useItem(state, "1", rng, "warHorn"));
    ok(useItem(state, "0", rng, "woodShield"));
    const view = getFightView(state, "0");
    expect(view?.attacker).toMatchObject({ attack: 5 + 4 + 3, buffs: { attack: 3, defense: 0 } });
    expect(view?.defender).toMatchObject({ defense: 3 + 3, buffs: { attack: 0, defense: 3 } });
  });

  it("shows the garrison as one pool that loses residents", () => {
    const { state, rng } = startSiege([6, 1], 2, ["warrior", "warrior", "farmer"]);
    const start = getFightView(state, "0");
    expect(start?.kind).toBe("garrison");
    expect(start?.viewerRole).toBe("attacker");
    expect(start?.defender).toMatchObject({
      kind: "garrison",
      playerId: null,
      health: 80,
      maxHealth: 80,
      aliveResidents: 3,
      attack: 4 + 2,
      defense: 2 + 2,
      hasRolled: false
    });
    expect(start?.canRoll).toBe(true);
    expect(start?.waitingFor).toEqual(["0"]);
    expect(start?.retreatFee).toBe(getPlotFee(state, state.plots[3]!));

    ok(fightRoll(state, "0", rng));
    const hurt = getFightView(state, "0");
    expect(hurt?.rounds[0]).toMatchObject({ winner: "attacker", attackerScore: 11, defenderScore: 7, damage: 7 });
    expect(hurt?.defender.health).toBe(80 - 7);
    expect(hurt?.defender.aliveResidents).toBe(3);
    expect(hurt?.attacker.results).toEqual(["won"]);
    // The owner is away: only the attacker ever rolls.
    expect(getFightView(state, "1")).toMatchObject({ viewerRole: "spectator", canRoll: false });
  });

  it("drops residents from the alive count as the pool drains", () => {
    const { state, rng } = startSiege([6, 1], 2, ["farmer", "farmer", "farmer", "farmer"], 5);
    expect(getFightView(state, "0")?.defender).toMatchObject({ health: 20, maxHealth: 80, aliveResidents: 4 });
    ok(fightRoll(state, "0", rng));
    // 8 damage: pool 12 of 80 keeps one of four residents alive.
    expect(getFightView(state, "0")?.defender).toMatchObject({ health: 12, maxHealth: 80, aliveResidents: 1 });
  });

  it("describes a passive plot: no counter attack, a Blocked round counts for the plot", () => {
    const { state, rng } = startSiege([1, 6], 2);
    // A plot can only beat a king whose attack is below 5: the die alone never outscores a 6.
    state.kings["0"]!.attack = 2;
    const start = getFightView(state, "0");
    expect(start?.kind).toBe("plot");
    expect(start?.plotLevel).toBe(2);
    expect(start?.defender).toMatchObject({ kind: "plot", health: 35, maxHealth: 35, attack: 0, defense: 2, plotLevel: 2, aliveResidents: null });
    ok(fightRoll(state, "0", rng));
    const blocked = getFightView(state, "0");
    expect(blocked?.rounds[0]).toMatchObject({ winner: "defender", damage: 0 });
    expect(blocked?.attacker.results).toEqual(["lost"]);
    expect(blocked?.defender.results).toEqual(["won"]);
    expect(blocked?.attacker.health).toBe(100);
  });

  describe("getFinalFightView", () => {
    it("is null before any fight ended", () => {
      expect(getFinalFightView(createTestGame(2), "0")).toBeNull();
    });

    it("keeps the deciding round and both sides as they looked at the end of a duel", () => {
      const { state, rng } = startDuel([6, 1, 6, 1], 0);
      rollBoth(state, rng);
      const liveRounds = getFightView(state, "1")?.rounds.length;
      rollBoth(state, rng);
      expect(state.fight).toBeNull();
      expect(getFightView(state, "1")).toBeNull();

      const final = getFinalFightView(state, "1");
      expect(final).toMatchObject({
        kind: "kingVsKing",
        plotId: 5,
        viewerRole: "attacker",
        canRoll: false,
        canRetreat: false,
        waitingFor: [],
        winner: "attacker",
        retreated: false
      });
      expect(final?.rounds).toHaveLength(2);
      expect(final?.rounds[1]).toMatchObject({ attackerRoll: 6, defenderRoll: 1, attackerScore: 11, defenderScore: 6, winner: "attacker", damage: 8 });
      expect(final?.attacker).toMatchObject({ playerId: "1", isViewer: true, roundsWon: 2, results: ["won", "won"], health: 100, hasRolled: false });
      // Health is frozen as the last round left it (92 - 8 = 84), before any knock-out healing.
      expect(final?.defender).toMatchObject({ playerId: "0", isViewer: false, roundsWon: 0, results: ["lost", "lost"], health: 84, maxHealth: 100 });
      expect(liveRounds).toBe(1);
      expect(getFinalFightView(state, "0")?.viewerRole).toBe("defender");
      expect(getFinalFightView(state, "2")?.viewerRole).toBe("spectator");
      expect(JSON.parse(JSON.stringify(state.lastFight))).toEqual(state.lastFight);
    });

    it("freezes a knocked-out king at zero health, not at the healed value", () => {
      const { state, rng } = startDuel([6, 1]);
      state.kings["0"]!.health = 5;
      rollBoth(state, rng);
      expect(state.kings["0"]?.health).toBe(50);
      expect(getFinalFightView(state, "1")?.defender).toMatchObject({ health: 0, results: ["lost"] });
    });

    it("keeps the garrison pool and the survivors of a siege", () => {
      const { state, rng } = startSiege([6, 1, 1, 6, 1, 6], 2, ["farmer", "farmer", "farmer"], 5);
      ok(fightRoll(state, "0", rng));
      ok(fightRoll(state, "0", rng));
      ok(fightRoll(state, "0", rng));
      expect(state.fight).toBeNull();
      const final = getFinalFightView(state, "0");
      expect(final?.winner).toBe("defender");
      expect(final?.rounds).toHaveLength(3);
      expect(final?.defender).toMatchObject({ kind: "garrison", aliveResidents: expect.any(Number), maxHealth: 60 });
      expect(final?.attacker.results).toEqual(["won", "lost", "lost"]);
    });

    it("shows a destroyed plot with its last health and level", () => {
      const { state, rng } = startSiege([6, 1, 6, 1], 0);
      ok(fightRoll(state, "0", rng));
      ok(fightRoll(state, "0", rng));
      expect(state.lastFight?.plotOutcome).toBe("destroyed");
      expect(getFinalFightView(state, "0")?.defender).toMatchObject({ kind: "plot", health: 0, maxHealth: 15, plotLevel: 0 });
    });

    it("keeps the earlier rounds of a retreat", () => {
      const { state, rng } = startSiege([6, 1], 2);
      ok(fightRoll(state, "0", rng));
      ok(retreat(state, "0", rng));
      const final = getFinalFightView(state, "0");
      expect(final).toMatchObject({ winner: "defender", retreated: true });
      expect(final?.rounds).toHaveLength(1);
    });
  });
});
