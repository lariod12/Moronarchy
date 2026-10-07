import { describe, expect, it } from "vitest";
import { createGame } from "../../src/engine";
import { createScriptedRng, createSeededRng, createTestGame } from "../../src/testing";

const players = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: String(index), name: `King ${index}` }));

describe("createGame", () => {
  it("rejects player counts outside 2..6", () => {
    expect(() => createGame(players(1), createSeededRng(1))).toThrow();
    expect(() => createGame(players(7), createSeededRng(1))).toThrow();
    expect(() => createGame(players(2), createSeededRng(1))).not.toThrow();
    expect(() => createGame(players(6), createSeededRng(1))).not.toThrow();
  });

  it("rejects duplicate ids", () => {
    expect(() =>
      createGame(
        [
          { id: "a", name: "A" },
          { id: "a", name: "B" }
        ],
        createSeededRng(1)
      )
    ).toThrow();
  });

  it("is deterministic per seed and a permutation of the players", () => {
    const first = createGame(players(6), createSeededRng(42));
    const second = createGame(players(6), createSeededRng(42));
    expect(first.turnOrder).toEqual(second.turnOrder);
    expect([...first.turnOrder].sort()).toEqual(["0", "1", "2", "3", "4", "5"]);

    const orders = new Set(
      Array.from({ length: 10 }, (_, seed) => createGame(players(6), createSeededRng(seed + 1)).turnOrder.join(""))
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it("creates kings with the starting stats", () => {
    const state = createGame(players(3), createSeededRng(7));
    expect(state.phase).toBe("playing");
    expect(state.round).toBe(1);
    expect(state.plots).toHaveLength(39);
    expect(state.plots[0]?.id).toBe(2);
    expect(state.plots[38]?.id).toBe(40);
    expect(state.plots.every((plot) => plot.ownerId === null && plot.level === 0 && plot.health === 0)).toBe(true);
    for (const king of Object.values(state.kings)) {
      expect(king).toMatchObject({
        coin: 300,
        health: 100,
        maxHealth: 100,
        attack: 5,
        defense: 3,
        lucky: 0,
        level: 1,
        position: 1,
        laps: 0,
        eliminated: false,
        skipNextTurn: false,
        items: {},
        recruited: 0
      });
    }
    expect(state.turn.playerId).toBe(state.turnOrder[0]);
    expect(state.turn.step).toBe("awaitClaim");
    expect(state.pending).toBeNull();
    expect(state.fight).toBeNull();
    expect(state.log[0]?.type).toBe("gameStarted");
  });

  it("createTestGame uses turn order 0, 1, 2 with player 0 first", () => {
    const state = createTestGame(3);
    expect(state.turnOrder).toEqual(["0", "1", "2"]);
    expect(state.turn.playerId).toBe("0");
    expect(state.turn.step).toBe("awaitClaim");
  });
});

describe("test rng helpers", () => {
  it("seeded rng is deterministic and d6 stays in range", () => {
    const left = createSeededRng(9);
    const right = createSeededRng(9);
    const values = Array.from({ length: 50 }, () => left.d6());
    expect(values).toEqual(Array.from({ length: 50 }, () => right.d6()));
    expect(values.every((value) => value >= 1 && value <= 6)).toBe(true);
  });

  it("scripted rng consumes scripted values then falls back to the seed", () => {
    const rng = createScriptedRng({ d6: [6, 2], next: [0.25] }, 3);
    const fallback = createSeededRng(3);
    expect([rng.d6(), rng.d6()]).toEqual([6, 2]);
    expect(rng.next()).toBe(0.25);
    expect(rng.d6()).toBe(fallback.d6());
    expect(rng.next()).toBe(fallback.next());
  });
});
