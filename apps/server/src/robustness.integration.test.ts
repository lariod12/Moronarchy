import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { MatchState } from "@moronarchy/core/match";
import { createMoronarchyServer } from "./create-server.js";
import { MoronarchyGame } from "./game.js";

const require = createRequire(import.meta.url);
const { Client } = require("boardgame.io/client") as {
  Client: (config: Record<string, unknown>) => TestClient;
};
const { SocketIO } = require("boardgame.io/multiplayer") as { SocketIO: (config: { server: string }) => unknown };

interface TestClient {
  start: () => void;
  stop: () => void;
  getState: () => { G: MatchState } | null;
  moves: Record<string, (...args: unknown[]) => void>;
}

let port = 0;
let closeServer: () => void = () => undefined;
const clients: TestClient[] = [];

beforeAll(async () => {
  const { server } = createMoronarchyServer({ origins: [], absentTimeoutMs: 400, getPort: () => port });
  const { appServer } = await server.run(0);
  port = (appServer.address() as { port: number }).port;
  closeServer = () => appServer.close();
});

afterAll(() => {
  for (const client of clients) {
    try {
      client.stop();
    } catch {
      // Already stopped by the test.
    }
  }
  closeServer();
});

const post = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`${path} -> ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
};

const createMatch = async (): Promise<string> =>
  (await post<{ matchID: string }>("/games/moronarchy/create", { numPlayers: 6 })).matchID;

const join = (matchID: string, playerName: string, playerID?: string) =>
  post<{ playerID: string; playerCredentials: string }>(`/games/moronarchy/${matchID}/join`, {
    playerName,
    ...(playerID === undefined ? {} : { playerID })
  });

const connect = (matchID: string, playerID: string, credentials: string): TestClient => {
  const client = Client({ game: MoronarchyGame, multiplayer: SocketIO({ server: `http://127.0.0.1:${port}` }), matchID, playerID, credentials });
  clients.push(client);
  client.start();
  return client;
};

const waitFor = async (describeWait: string, predicate: () => boolean, timeoutMs = 4000): Promise<void> => {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Timed out waiting for ${describeWait}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

const match = (client: TestClient): MatchState | undefined => client.getState()?.G;

// Seats players one at a time so seat ids/host are deterministic (concurrent lobby moves are no longer dropped; see
// CONCURRENT_MOVES and the "same moment" test).
const sitInOrder = async (hostClient: TestClient, guestClient: TestClient, hostName = "Ann", guestName = "Bob"): Promise<void> => {
  await waitFor("sync", () => match(hostClient) !== undefined && match(guestClient) !== undefined);
  hostClient.moves.sit?.(hostName);
  await waitFor("host seat", () => match(guestClient)?.seats.length === 1);
  guestClient.moves.sit?.(guestName);
  await waitFor("both seats", () => match(hostClient)?.seats.length === 2 && match(guestClient)?.seats.length === 2);
};

const startTwoPlayerGame = async () => {
  const matchID = await createMatch();
  const ann = await join(matchID, "Ann", "0");
  const bob = await join(matchID, "Bob", "1");
  const annClient = connect(matchID, "0", ann.playerCredentials);
  const bobClient = connect(matchID, "1", bob.playerCredentials);
  await sitInOrder(annClient, bobClient);
  bobClient.moves.setReady?.(true);
  await waitFor("ready", () => match(annClient)?.seats.every((seat) => seat.playerId === "0" || seat.ready) === true);
  annClient.moves.startGame?.();
  await waitFor("game start", () => match(annClient)?.stage === "playing" && match(bobClient)?.stage === "playing");
  return { matchID, clients: { "0": annClient, "1": bobClient } as Record<string, TestClient>, credentials: { "0": ann, "1": bob } };
};

describe("server robustness (real boardgame.io server)", () => {
  it("keeps moves that several players send at the same moment", async () => {
    const matchID = await createMatch();
    const ann = await join(matchID, "Ann", "0");
    const bob = await join(matchID, "Bob", "1");
    const cara = await join(matchID, "Cara", "2");
    const annClient = connect(matchID, "0", ann.playerCredentials);
    const bobClient = connect(matchID, "1", bob.playerCredentials);
    const caraClient = connect(matchID, "2", cara.playerCredentials);
    await waitFor("sync", () => [annClient, bobClient, caraClient].every((client) => match(client) !== undefined));

    // All three sit from the same synced state: without ignoreStaleStateID two of these would be dropped silently.
    annClient.moves.sit?.("Ann");
    bobClient.moves.sit?.("Bob");
    caraClient.moves.sit?.("Cara");
    await waitFor("three seats", () => match(annClient)?.seats.length === 3);

    bobClient.moves.setReady?.(true);
    caraClient.moves.sendChat?.("hi");
    await waitFor("ready and chat", () => {
      const G = match(annClient);
      return G?.seats.find((seat) => seat.playerId === "1")?.ready === true && G.chat.some((message) => message.text === "hi");
    });
  });

  it("removes the disconnected turn player after the timeout and lets the other player win", async () => {
    const game = await startTwoPlayerGame();
    const absent = match(game.clients["0"] as TestClient)?.game?.turn.playerId as string;
    const other = absent === "0" ? "1" : "0";
    const survivor = game.clients[other] as TestClient;

    (game.clients[absent] as TestClient).stop();

    await waitFor("the absent player to be removed", () => match(survivor)?.stage === "finished", 6000);
    const finished = match(survivor)?.game;
    expect(finished?.kings[absent]).toMatchObject({ eliminated: true, eliminationReason: "left" });
    expect(finished).toMatchObject({ phase: "finished", winnerId: other });
    expect(finished?.log.some((entry) => entry.type === "kingLeft" && entry.playerId === absent)).toBe(true);
  });

  it("does not remove a connected player, however long the game waits", async () => {
    const game = await startTwoPlayerGame();
    const slow = match(game.clients["0"] as TestClient)?.game?.turn.playerId as string;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const state = match(game.clients[slow] as TestClient);
    expect(state?.stage).toBe("playing");
    expect(state?.game?.kings[slow]?.eliminated).toBe(false);
  });

  it("does not remove a player who reconnects before the timeout", async () => {
    const game = await startTwoPlayerGame();
    const absent = match(game.clients["0"] as TestClient)?.game?.turn.playerId as string;
    (game.clients[absent] as TestClient).stop();
    await new Promise((resolve) => setTimeout(resolve, 150));
    const back = connect(game.matchID, absent, (game.credentials[absent as "0" | "1"]).playerCredentials);
    await waitFor("the returning player to sync", () => match(back) !== undefined);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(match(back)?.stage).toBe("playing");
    expect(match(back)?.game?.kings[absent]?.eliminated).toBe(false);
  });

  it("never removes an absent player in the lobby", async () => {
    const matchID = await createMatch();
    const ann = await join(matchID, "Ann", "0");
    const bob = await join(matchID, "Bob", "1");
    const annClient = connect(matchID, "0", ann.playerCredentials);
    const bobClient = connect(matchID, "1", bob.playerCredentials);
    await sitInOrder(annClient, bobClient);
    bobClient.stop();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(match(annClient)?.seats.map((seat) => seat.playerId)).toEqual(["0", "1"]);
    expect(match(annClient)?.stage).toBe("lobby");
  });

  it("frees the room slot when a seat is kicked, and the old credentials stop working", async () => {
    const matchID = await createMatch();
    const host = await join(matchID, "Ann", "0");
    const guest = await join(matchID, "Bob");
    expect(guest.playerID).toBe("1");
    const hostClient = connect(matchID, "0", host.playerCredentials);
    const guestClient = connect(matchID, "1", guest.playerCredentials);
    await sitInOrder(hostClient, guestClient);

    hostClient.moves.kickSeat?.("1");
    await waitFor("the kick", () => match(hostClient)?.seats.length === 1);

    const replacement = await join(matchID, "Cy");
    expect(replacement.playerID).toBe("1");
    expect(replacement.playerCredentials).not.toBe(guest.playerCredentials);

    // The kicked player's old credentials no longer authenticate as slot 1.
    guestClient.moves.sit?.("Bob again");
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(match(hostClient)?.seats.map((seat) => seat.playerId)).toEqual(["0"]);
    const newcomer = connect(matchID, "1", replacement.playerCredentials);
    await waitFor("newcomer sync", () => match(newcomer) !== undefined);
    newcomer.moves.sit?.("Cy");
    await waitFor("newcomer seat", () => match(hostClient)?.seats.length === 2);
    expect(match(hostClient)?.seats.map((seat) => seat.name)).toEqual(["Ann", "Cy"]);
  });

  it("frees the slot of a player who leaves their seat", async () => {
    const matchID = await createMatch();
    const host = await join(matchID, "Ann", "0");
    const guest = await join(matchID, "Bob");
    const hostClient = connect(matchID, "0", host.playerCredentials);
    const guestClient = connect(matchID, "1", guest.playerCredentials);
    await sitInOrder(hostClient, guestClient);
    guestClient.moves.leaveSeat?.();
    await waitFor("leave", () => match(hostClient)?.seats.length === 1);
    const next = await join(matchID, "Cy");
    expect(next.playerID).toBe("1");
  });
});
