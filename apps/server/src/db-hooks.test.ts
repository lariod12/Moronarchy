import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { installDbHooks } from "./db-hooks.js";
import type { HookedDatabase } from "./db-hooks.js";
import { MoronarchyGame } from "./game.js";
import { createPresenceTracker } from "./presence.js";

const require = createRequire(import.meta.url);
const { Server } = require("boardgame.io/server") as { Server: (config: { games: unknown[]; origins: string[] }) => { db: unknown } };

type Players = Record<string, Record<string, unknown>>;
type TestDb = HookedDatabase & {
  createMatch: (matchID: string, match: unknown) => void;
};
type FetchMetadata = (matchID: string, opts: { metadata: true }) => { metadata?: { players: Players } };

const state = (seatIds: string[]) => ({ G: { stage: "lobby", seats: seatIds.map((playerId) => ({ playerId })) }, _stateID: 0 });
const player = (id: number, name?: string, credentials?: string) => ({
  id,
  ...(name ? { name } : {}),
  ...(credentials ? { credentials } : {})
});

const setup = () => {
  const db = Server({ games: [MoronarchyGame], origins: [] }).db as TestDb;
  const presence = createPresenceTracker();
  installDbHooks(db, { presence });
  db.createMatch("m1", {
    initialState: state([]),
    metadata: {
      gameName: "moronarchy",
      players: { "0": player(0, "Ann", "c0"), "1": player(1, "Bob", "c1"), "2": player(2, "Cy", "c2"), "3": player(3) },
      createdAt: 1,
      updatedAt: 1
    }
  });
  db.setState?.("m1", state(["0", "1", "2"]));
  const fetchMetadata = (db.fetch as unknown as FetchMetadata).bind(db);
  const players = (): Players => fetchMetadata("m1", { metadata: true }).metadata?.players ?? {};
  return { db, presence, players, fetchMetadata };
};

describe("db hooks", () => {
  it("frees the player slot of a seat that left the match state", () => {
    const { db, players } = setup();
    db.setState?.("m1", state(["0", "2"]));
    expect(players()["1"]).toEqual({ id: 1 });
    expect(players()["0"]).toMatchObject({ name: "Ann", credentials: "c0" });
    expect(players()["2"]).toMatchObject({ name: "Cy", credentials: "c2" });
  });

  it("frees several slots at once and also clears the connection flag", () => {
    const { db, players } = setup();
    (players()["1"] as Record<string, unknown>).isConnected = true;
    db.setState?.("m1", state(["0"]));
    expect(players()["1"]).toEqual({ id: 1 });
    expect(players()["2"]).toEqual({ id: 2 });
    expect(players()["0"]).toMatchObject({ name: "Ann" });
  });

  it("never touches players that stay seated or state writes without seat changes", () => {
    const { db, players } = setup();
    db.setState?.("m1", state(["0", "1", "2"]));
    db.setState?.("m1", state(["0", "1", "2", "3"]));
    expect(players()["0"]).toMatchObject({ name: "Ann", credentials: "c0" });
    expect(players()["1"]).toMatchObject({ name: "Bob", credentials: "c1" });
    expect(players()["2"]).toMatchObject({ name: "Cy", credentials: "c2" });
  });

  it("keeps a slot that gets taken again right after it was freed", () => {
    const { db, players } = setup();
    db.setState?.("m1", state(["0", "2"]));
    Object.assign(players()["1"] as object, { name: "Dan", credentials: "c9" });
    db.setState?.("m1", state(["0", "1", "2"]));
    expect(players()["1"]).toMatchObject({ name: "Dan", credentials: "c9" });
  });

  it("feeds the presence tracker from metadata writes and forgets released and wiped players", () => {
    const { db, presence, players, fetchMetadata } = setup();
    const connect = (id: string, isConnected: boolean): void => {
      const metadata = fetchMetadata("m1", { metadata: true }).metadata as { players: Players };
      metadata.players[id] = { ...metadata.players[id], isConnected };
      db.setMetadata?.("m1", metadata as never);
    };
    connect("1", true);
    connect("1", false);
    expect(presence.absentSince("m1", "1")).not.toBeNull();
    db.setState?.("m1", state(["0", "2"]));
    expect(presence.absentSince("m1", "1")).toBeNull();
    expect(players()["1"]).toEqual({ id: 1 });
    connect("0", true);
    connect("0", false);
    expect(presence.listAbsent()).toHaveLength(1);
    db.wipe?.("m1");
    expect(presence.listAbsent()).toEqual([]);
  });
});
