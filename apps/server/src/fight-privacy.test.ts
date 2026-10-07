import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { claimTurn, rollDice } from "@moronarchy/core/engine";
import { createMatchState } from "@moronarchy/core/match";
import type { MatchState } from "@moronarchy/core/match";
import { createScriptedRng, createTestGame, givePlot, placeKing } from "@moronarchy/core/testing";
import { MoronarchyGame } from "./game.js";

const require = createRequire(import.meta.url);
const { Client } = require("boardgame.io/client") as {
  Client: (options: Record<string, unknown>) => TestClient;
};
const { Local } = require("boardgame.io/multiplayer") as { Local: () => unknown };

interface TestClient {
  start: () => void;
  stop: () => void;
  getState: () => { G: MatchState } | null;
  moves: Record<string, (...args: unknown[]) => void>;
}

// A match already in progress: king "0" has just landed on the plot of king "1", who stands on it (the owner chooses).
const duelSetup = (): MatchState => {
  const match = createMatchState();
  const game = createTestGame(2);
  givePlot(game, "1", 5, 1);
  placeKing(game, "1", 5);
  placeKing(game, "0", 4);
  const rng = createScriptedRng({ d6: [1] }, 1);
  claimTurn(game, "0", { d6: rng.d6, next: () => 0.99 });
  rollDice(game, "0", { d6: rng.d6, next: () => 0.99 });
  match.stage = "playing";
  match.game = game;
  return match;
};

const act = async (client: TestClient, name: string, ...args: unknown[]): Promise<void> => {
  client.moves[name]?.(...args);
  await new Promise((resolve) => setTimeout(resolve, 10));
};

const gameOf = (client: TestClient): NonNullable<MatchState["game"]> => {
  const game = client.getState()?.G.game;
  if (!game) {
    throw new Error("Client has no game yet");
  }
  return game;
};

describe("fight rolls are private until the round resolves", () => {
  it("shows the second client only a placeholder for the first client's roll", async () => {
    const multiplayer = Local();
    const game = { ...MoronarchyGame, seed: "fight-privacy", setup: duelSetup };
    const [alice, bob] = ["0", "1"].map((playerID) => Client({ game, multiplayer, matchID: "duel", playerID, numPlayers: 6 })) as [TestClient, TestClient];
    alice.start();
    bob.start();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(gameOf(bob).pending).toMatchObject({ kind: "ownerChoice", playerId: "1" });
    await act(bob, "attack");
    expect(gameOf(alice).fight).not.toBeNull();

    await act(bob, "fightRoll");
    const bobSees = gameOf(bob).fight?.pendingRolls["1"];
    const aliceSees = gameOf(alice).fight?.pendingRolls["1"];
    // Bob sees his own die; Alice only learns that Bob has rolled.
    expect(bobSees).toBeGreaterThanOrEqual(1);
    expect(bobSees).toBeLessThanOrEqual(6);
    expect(aliceSees).toBe(0);
    expect(JSON.stringify(alice.getState())).not.toContain(`"pendingRolls":{"1":${String(bobSees)}}`);

    // Alice rolls; the round resolves from the real values and nothing stays pending.
    await act(alice, "fightRoll");
    expect(gameOf(alice).fight?.rounds).toHaveLength(1);
    expect(gameOf(alice).fight?.pendingRolls).toEqual({});
    expect(gameOf(bob).fight?.rounds).toHaveLength(1);
    const round = gameOf(bob).fight?.rounds[0];
    expect(round?.attackerRoll).toBe(bobSees);

    alice.stop();
    bob.stop();
  });
});
