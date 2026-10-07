import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import type { MatchState } from "@moronarchy/core/match";
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

const createClients = (playerIDs: string[]): TestClient[] => {
  const multiplayer = Local();
  // Local() keys its in-memory master by game object, so every client must share one.
  const game = { ...MoronarchyGame, seed: "test-seed" };
  const clients = playerIDs.map((playerID) =>
    Client({
      game,
      multiplayer,
      matchID: "test-match",
      playerID,
      numPlayers: 6
    })
  );
  for (const client of clients) {
    client.start();
  }
  return clients;
};

// The Local transport resolves moves asynchronously; wait for the master round trip before the next move.
const act = async (client: TestClient, name: string, ...args: unknown[]): Promise<void> => {
  client.moves[name]?.(...args);
  await new Promise((resolve) => setTimeout(resolve, 10));
};

const stateOf = (client: TestClient): MatchState => {
  const state = client.getState();
  if (!state) {
    throw new Error("Client has no state yet");
  }
  return state.G;
};

describe("Moronarchy boardgame.io match game", () => {
  it("only accepts 6-seat rooms", () => {
    expect(MoronarchyGame.validateSetupData(undefined, 4)).toEqual(expect.any(String));
    expect(MoronarchyGame.validateSetupData(undefined, 6)).toBeUndefined();
  });

  it("runs lobby, start and the first turn between real clients", async () => {
    const clients = createClients(["0", "1", "2"]);
    const [host, second, third] = clients as [TestClient, TestClient, TestClient];

    await act(host, "sit", "Ann");
    await act(second, "sit", "Bob");
    await act(third, "sit", "Cyd");
    expect(stateOf(third).seats.map((seat) => seat.name)).toEqual(["Ann", "Bob", "Cyd"]);
    expect(stateOf(second).hostId).toBe("0");

    await act(second, "setReady", true);
    await act(third, "setReady", true);
    await act(host, "sendChat", "  hello \u0000 all ");
    expect(stateOf(second).chat.map((message) => message.text)).toEqual(["hello all"]);

    await act(second, "startGame");
    expect(stateOf(host).stage).toBe("lobby");
    await act(host, "startGame");

    const started = stateOf(third);
    expect(started.stage).toBe("playing");
    expect([...(started.game?.turnOrder ?? [])].sort()).toEqual(["0", "1", "2"]);

    const turnPlayerId = started.game?.turn.playerId as string;
    const turnClient = clients.find((_, index) => String(index) === turnPlayerId) as TestClient;
    const otherClient = clients.find((_, index) => String(index) !== turnPlayerId) as TestClient;

    const before = JSON.stringify(stateOf(otherClient));
    await act(otherClient, "rollDice");
    expect(JSON.stringify(stateOf(otherClient))).toBe(before);

    await act(turnClient, "claimTurn");
    for (const client of clients) {
      expect(stateOf(client).game?.turn.step).toBe("preRoll");
    }
    await act(turnClient, "rollDice");
    for (const client of clients) {
      expect(stateOf(client).game?.turn.rolled).toBe(true);
    }

    for (const client of clients) {
      client.stop();
    }
  });
});
