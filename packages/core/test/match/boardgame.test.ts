import { describe, expect, it } from "vitest";
import { GAME_COMMAND_NAMES, MATCH_SEATS, createMoronarchyMatchGame, toRng } from "../../src/match";
import type { BoardgameRandom, MatchState } from "../../src/match";

const INVALID = "INVALID";
const game = createMoronarchyMatchGame(INVALID);

const scriptedRandom = (d6: number[] = [], numbers: number[] = []): BoardgameRandom => {
  const d6Queue = [...d6];
  const numberQueue = [...numbers];
  return { D6: () => d6Queue.shift() ?? 3, Number: () => numberQueue.shift() ?? 0.99 };
};

const run = (name: string, G: MatchState, playerID: string | undefined, random: BoardgameRandom, ...args: unknown[]) => {
  const entry = game.moves[name];
  if (!entry) {
    throw new Error(`Unknown move ${name}`);
  }
  return entry.move({ G, playerID, random }, ...args);
};

describe("createMoronarchyMatchGame", () => {
  it("describes a 6-seat, server-authoritative game", () => {
    expect(game.name).toBe("moronarchy");
    expect(game.minPlayers).toBe(2);
    expect(game.maxPlayers).toBe(6);
    expect(game.turn).toEqual({ activePlayers: { all: null } });
    expect(game).not.toHaveProperty("endIf");
    expect(Object.keys(game.moves).sort()).toEqual(
      [
        "sit",
        "leaveSeat",
        "setReady",
        "sendChat",
        "kickSeat",
        "startGame",
        "returnToLobby",
        ...GAME_COMMAND_NAMES
      ].sort()
    );
    for (const entry of Object.values(game.moves)) {
      expect(entry.client).toBe(false);
    }
  });

  it("validates the seat count and builds an empty lobby", () => {
    expect(game.validateSetupData(undefined, 4)).toEqual(expect.any(String));
    expect(game.validateSetupData(undefined, MATCH_SEATS)).toBeUndefined();
    const state = game.setup();
    expect(state.stage).toBe("lobby");
    expect(state.seats).toEqual([]);
  });

  it("adapts boardgame.io random to the engine Rng", () => {
    const rng = toRng(scriptedRandom([5], [0.25]));
    expect(rng.d6()).toBe(5);
    expect(rng.next()).toBe(0.25);
  });

  it("returns the invalid marker without a playerID or on failing commands", () => {
    const G = game.setup();
    const random = scriptedRandom();
    expect(run("sit", G, undefined, random, "Ann")).toBe(INVALID);
    expect(G.seats).toHaveLength(0);
    expect(run("sit", G, "0", random, "   ")).toBe(INVALID);
    expect(run("claimTurn", G, "0", random)).toBe(INVALID);
    expect(run("startGame", G, "0", random)).toBe(INVALID);
  });

  it("mutates G on success through lobby and game moves", () => {
    const G = game.setup();
    const random = scriptedRandom();
    expect(run("sit", G, "0", random, "Ann")).toBeUndefined();
    expect(run("sit", G, "1", random, "Bob")).toBeUndefined();
    expect(run("setReady", G, "1", random, true)).toBeUndefined();
    expect(run("sendChat", G, "1", random, "hello")).toBeUndefined();
    expect(G.chat.map((message) => message.text)).toEqual(["hello"]);
    expect(run("startGame", G, "0", random)).toBeUndefined();
    expect(G.stage).toBe("playing");

    const actor = G.game?.turn.playerId as string;
    expect(run("claimTurn", G, actor, random)).toBeUndefined();
    expect(G.game?.turn.step).toBe("preRoll");
    expect(run("rollDice", G, actor, scriptedRandom([4]))).toBeUndefined();
    expect(G.game?.turn.dice?.value).toBe(4);
  });
});
