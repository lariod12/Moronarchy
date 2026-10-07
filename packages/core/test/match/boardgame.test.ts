import { describe, expect, it } from "vitest";
import { attack, fightRoll, getFightView } from "../../src/engine";
import { GAME_COMMAND_NAMES, HIDDEN_ROLL, MATCH_SEATS, createMoronarchyMatchGame, maskMatchFor, toRng } from "../../src/match";
import type { BoardgameRandom, MatchState } from "../../src/match";
import { createTestGame, givePlot, placeKing } from "../../src/testing";
import { landOn } from "../engine/helpers";

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

  describe("playerView", () => {
    // Bob ("1") stands on his plot, Alice ("0") landed there: duel. Both kings rolled nothing yet.
    const duelMatch = (): MatchState => {
      const state = game.setup();
      const g = createTestGame(3);
      givePlot(g, "1", 5, 1);
      placeKing(g, "1", 5);
      const rng = landOn(g, 5, { d6: [4, 2] });
      attack(g, "1", rng);
      fightRoll(g, "1", rng);
      state.stage = "playing";
      state.game = g;
      return state;
    };

    it("is part of the game definition", () => {
      expect(typeof game.playerView).toBe("function");
    });

    it("hides other kings' pending rolls behind a placeholder and keeps your own", () => {
      const G = duelMatch();
      const realRoll = G.game?.fight?.pendingRolls["1"];
      expect(realRoll).toBeGreaterThanOrEqual(1);
      expect(HIDDEN_ROLL).toBe(0);

      const mine = game.playerView({ G, playerID: "1" });
      expect(mine.game?.fight?.pendingRolls).toEqual({ "1": realRoll });

      const theirs = game.playerView({ G, playerID: "0" });
      expect(theirs.game?.fight?.pendingRolls).toEqual({ "1": HIDDEN_ROLL });
      const spectator = game.playerView({ G, playerID: "2" });
      expect(spectator.game?.fight?.pendingRolls).toEqual({ "1": HIDDEN_ROLL });
      const anonymous = game.playerView({ G, playerID: null });
      expect(anonymous.game?.fight?.pendingRolls).toEqual({ "1": HIDDEN_ROLL });
    });

    it("never touches the authoritative state", () => {
      const G = duelMatch();
      const before = JSON.stringify(G);
      game.playerView({ G, playerID: "0" });
      expect(JSON.stringify(G)).toBe(before);
    });

    it("leaves a match without a fight (or without any roll) untouched", () => {
      const lobby = game.setup();
      expect(maskMatchFor(lobby, "0")).toBe(lobby);
      const G = duelMatch();
      if (G.game?.fight) {
        G.game.fight.pendingRolls = {};
      }
      expect(maskMatchFor(G, "0")).toBe(G);
    });

    it("still lets the fight view know who rolled and who is awaited", () => {
      const G = duelMatch();
      for (const viewer of ["0", "1", "2"]) {
        const view = getFightView(game.playerView({ G, playerID: viewer }).game as NonNullable<MatchState["game"]>, viewer);
        expect(view?.attacker.hasRolled).toBe(true);
        expect(view?.defender.hasRolled).toBe(false);
        expect(view?.waitingFor).toEqual(["0"]);
      }
      const alice = getFightView(game.playerView({ G, playerID: "0" }).game as NonNullable<MatchState["game"]>, "0");
      expect(alice?.canRoll).toBe(true);
      const bob = getFightView(game.playerView({ G, playerID: "1" }).game as NonNullable<MatchState["game"]>, "1");
      expect(bob?.canRoll).toBe(false);
    });
  });
});
