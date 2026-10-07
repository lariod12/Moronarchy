import { describe, expect, it } from "vitest";
import { createGame } from "../../src/engine";
import type { GameState } from "../../src/engine";
import { createSeededRng, percentile, runGame, runMany, stepBot } from "../../src/testing";
import type { BotStyle } from "../../src/testing";

const checkInvariants = (state: GameState): void => {
  for (const king of Object.values(state.kings)) {
    expect(king.coin).toBeGreaterThanOrEqual(0);
    expect(king.health).toBeLessThanOrEqual(king.maxHealth + 40);
    expect(king.level).toBeLessThanOrEqual(5);
    if (king.eliminated) {
      expect(king.coin).toBe(0);
    }
  }
  for (const plot of state.plots) {
    if (plot.ownerId === null) {
      expect(plot.residentIds).toEqual([]);
      expect(plot.level).toBe(0);
    } else {
      expect(state.kings[plot.ownerId]?.eliminated).toBe(false);
    }
    for (const residentId of plot.residentIds) {
      expect(state.residents[residentId]).toMatchObject({ plotId: plot.id, ownerId: plot.ownerId });
    }
  }
  for (const resident of Object.values(state.residents)) {
    expect(state.plots[resident.plotId - 2]?.residentIds).toContain(resident.id);
  }
};

// Full-game simulations are CPU-heavy; a cold first run can exceed the default 5 s timeout.
const SIMULATION_TIMEOUT_MS = 60_000;

describe("bot simulation", () => {
  it("finishes 4-player games within 200 rounds for both styles", () => {
    for (const style of ["careful", "aggressive"] as BotStyle[]) {
      const results = runMany({ players: 4, style, seeds: 20, maxRounds: 200 });
      expect(results).toHaveLength(20);
      for (const result of results) {
        expect(result.finished).toBe(true);
        expect(result.rounds).toBeLessThanOrEqual(200);
        expect(result.winnerId).not.toBeNull();
        expect(result.firstEliminationRound).not.toBeNull();
      }
    }
  }, SIMULATION_TIMEOUT_MS);

  it("is deterministic for a seed", () => {
    expect(runGame({ players: 4, style: "aggressive", seed: 11 })).toEqual(
      runGame({ players: 4, style: "aggressive", seed: 11 })
    );
  });

  it("keeps the state consistent after every bot action", () => {
    for (const style of ["careful", "aggressive"] as BotStyle[]) {
      for (const seed of [1, 2, 3]) {
        const rng = createSeededRng(seed);
        const state = createGame(
          Array.from({ length: 4 }, (_, index) => ({ id: String(index), name: `Bot ${index}` })),
          rng
        );
        let actions = 0;
        while (state.phase === "playing" && actions < 20000) {
          stepBot(state, rng, style);
          checkInvariants(state);
          actions += 1;
        }
        expect(state.phase).toBe("finished");
        const alive = Object.values(state.kings).filter((king) => !king.eliminated);
        expect(alive).toHaveLength(1);
        expect(state.winnerId).toBe(alive[0]?.id);
        expect(state.eliminationOrder).toHaveLength(3);
      }
    }
  }, SIMULATION_TIMEOUT_MS);

  it("computes nearest-rank percentiles", () => {
    expect(percentile([], 0.5)).toBeNull();
    expect(percentile([5, 1, 3, 2, 4], 0.5)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.1)).toBe(1);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBe(9);
  });
});
