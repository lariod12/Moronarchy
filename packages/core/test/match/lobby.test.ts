import { describe, expect, it } from "vitest";
import {
  MAX_CHAT_MESSAGES,
  createMatchState,
  getLobbyView,
  kickSeat,
  leaveSeat,
  returnToLobby,
  sendChat,
  setReady,
  sit,
  startGame
} from "../../src/match";
import type { MatchResult, MatchState } from "../../src/match";
import { createSeededRng } from "../../src/testing";

const ok = (result: MatchResult): void => {
  expect(result).toEqual({ ok: true });
};
const fails = (result: MatchResult, error: string): void => {
  expect(result).toEqual({ ok: false, error });
};

const seated = (ids: string[]): MatchState => {
  const state = createMatchState();
  for (const id of ids) {
    ok(sit(state, id, `King ${id}`));
  }
  return state;
};

describe("lobby seats", () => {
  it("starts empty in the lobby stage", () => {
    expect(createMatchState()).toEqual({
      stage: "lobby",
      hostId: null,
      seats: [],
      chat: [],
      chatSeq: 0,
      game: null,
      gamesPlayed: 0
    });
  });

  it("makes the first seated player the host and keeps seats sorted", () => {
    const state = seated(["3", "1", "2"]);
    expect(state.hostId).toBe("3");
    expect(state.seats.map((seat) => seat.playerId)).toEqual(["1", "2", "3"]);
    expect(state.seats.every((seat) => !seat.ready)).toBe(true);
  });

  it("sanitizes names and rejects empty or duplicate sits", () => {
    const state = createMatchState();
    fails(sit(state, "0", "  \u0000 "), "INVALID_ARGUMENT");
    fails(sit(state, "0", 7), "INVALID_ARGUMENT");
    ok(sit(state, "0", "  Ann\u0000   Bee  "));
    expect(state.seats[0]?.name).toBe("Ann Bee");
    fails(sit(state, "0", "Again"), "ALREADY_SEATED");
    expect(state.seats).toHaveLength(1);
  });

  it("transfers host to the lowest remaining seat when the host leaves", () => {
    const state = seated(["2", "4", "1"]);
    expect(state.hostId).toBe("2");
    ok(leaveSeat(state, "2"));
    expect(state.hostId).toBe("1");
    ok(leaveSeat(state, "1"));
    ok(leaveSeat(state, "4"));
    expect(state.hostId).toBeNull();
    fails(leaveSeat(state, "4"), "NOT_SEATED");
  });

  it("toggles ready for seated players only", () => {
    const state = seated(["0", "1"]);
    fails(setReady(state, "5", true), "NOT_SEATED");
    fails(setReady(state, "1", "yes"), "INVALID_ARGUMENT");
    ok(setReady(state, "1", true));
    expect(state.seats[1]?.ready).toBe(true);
    ok(setReady(state, "1", false));
    expect(state.seats[1]?.ready).toBe(false);
    ok(setReady(state, "0", true));
  });
});

describe("lobby chat", () => {
  it("sanitizes, sequences and attributes messages", () => {
    const state = seated(["0", "1"]);
    ok(sendChat(state, "1", "  hi\u0000   there "));
    expect(state.chat).toEqual([{ seq: 1, playerId: "1", name: "King 1", text: "hi there" }]);
    expect(state.chatSeq).toBe(1);
  });

  it("rejects empty text and unseated senders", () => {
    const state = seated(["0"]);
    fails(sendChat(state, "0", "   "), "EMPTY_TEXT");
    fails(sendChat(state, "0", 12), "EMPTY_TEXT");
    fails(sendChat(state, "3", "hello"), "NOT_SEATED");
    expect(state.chat).toHaveLength(0);
    expect(state.chatSeq).toBe(0);
  });

  it("keeps only the last 50 messages", () => {
    const state = seated(["0"]);
    for (let index = 1; index <= MAX_CHAT_MESSAGES + 10; index += 1) {
      ok(sendChat(state, "0", `msg ${index}`));
    }
    expect(state.chat).toHaveLength(MAX_CHAT_MESSAGES);
    expect(state.chat[0]?.seq).toBe(11);
    expect(state.chat[MAX_CHAT_MESSAGES - 1]?.text).toBe(`msg ${MAX_CHAT_MESSAGES + 10}`);
    expect(state.chatSeq).toBe(MAX_CHAT_MESSAGES + 10);
  });
});

describe("kickSeat", () => {
  it("lets only the host kick another seated player", () => {
    const state = seated(["0", "1", "2"]);
    fails(kickSeat(state, "1", "2"), "NOT_HOST");
    fails(kickSeat(state, "0", "0"), "INVALID_ARGUMENT");
    fails(kickSeat(state, "0", "5"), "INVALID_ARGUMENT");
    fails(kickSeat(state, "0", 2), "INVALID_ARGUMENT");
    ok(kickSeat(state, "0", "2"));
    expect(state.seats.map((seat) => seat.playerId)).toEqual(["0", "1"]);
    expect(state.hostId).toBe("0");
  });
});

describe("startGame", () => {
  it("rejects non-hosts, too few seats and unready seats", () => {
    const rng = createSeededRng(1);
    const solo = seated(["0"]);
    fails(startGame(solo, "0", rng), "TOO_FEW_PLAYERS");

    const state = seated(["0", "1", "2"]);
    ok(setReady(state, "1", true));
    fails(startGame(state, "1", rng), "NOT_HOST");
    fails(startGame(state, "0", rng), "NOT_READY");
    expect(state.stage).toBe("lobby");
    expect(state.game).toBeNull();
  });

  it("creates an engine game with the seated players only", () => {
    const state = seated(["1", "3", "4"]);
    ok(setReady(state, "3", true));
    ok(setReady(state, "4", true));
    ok(startGame(state, "1", createSeededRng(7)));
    expect(state.stage).toBe("playing");
    expect(state.game).not.toBeNull();
    expect([...(state.game?.turnOrder ?? [])].sort()).toEqual(["1", "3", "4"]);
    expect(Object.keys(state.game?.kings ?? {}).sort()).toEqual(["1", "3", "4"]);
    expect(state.game?.kings["3"]?.name).toBe("King 3");
  });

  it("is rejected once the match left the lobby, as are seat changes", () => {
    const state = seated(["0", "1"]);
    ok(setReady(state, "1", true));
    ok(startGame(state, "0", createSeededRng(2)));
    fails(startGame(state, "0", createSeededRng(2)), "WRONG_STAGE");
    fails(sit(state, "2", "Late"), "WRONG_STAGE");
    fails(leaveSeat(state, "1"), "WRONG_STAGE");
    fails(setReady(state, "1", false), "WRONG_STAGE");
    fails(sendChat(state, "1", "hi"), "WRONG_STAGE");
    fails(kickSeat(state, "0", "1"), "WRONG_STAGE");
  });
});

describe("returnToLobby", () => {
  it("only works from finished, by the host, and resets the lobby", () => {
    const state = seated(["0", "1"]);
    ok(setReady(state, "1", true));
    fails(returnToLobby(state, "0"), "WRONG_STAGE");
    ok(startGame(state, "0", createSeededRng(3)));
    fails(returnToLobby(state, "0"), "WRONG_STAGE");

    state.stage = "finished";
    fails(returnToLobby(state, "1"), "NOT_HOST");
    ok(returnToLobby(state, "0"));
    expect(state.stage).toBe("lobby");
    expect(state.game).toBeNull();
    expect(state.gamesPlayed).toBe(1);
    expect(state.seats.every((seat) => !seat.ready)).toBe(true);
    expect(state.seats).toHaveLength(2);
  });
});

describe("getLobbyView", () => {
  it("describes an unseated viewer", () => {
    const state = seated(["0", "1"]);
    expect(getLobbyView(state, "5")).toEqual({
      isSeated: false,
      isHost: false,
      isReady: false,
      canStart: false,
      startBlockedReason: "NOT_HOST"
    });
  });

  it("reports host, ready and start gating for each situation", () => {
    const solo = seated(["0"]);
    expect(getLobbyView(solo, "0")).toMatchObject({ isSeated: true, isHost: true, canStart: false, startBlockedReason: "TOO_FEW_PLAYERS" });

    const state = seated(["0", "1", "2"]);
    expect(getLobbyView(state, "0")).toMatchObject({ isHost: true, isReady: false, canStart: false, startBlockedReason: "NOT_READY" });
    expect(getLobbyView(state, "1")).toMatchObject({ isHost: false, canStart: false, startBlockedReason: "NOT_HOST" });

    ok(setReady(state, "1", true));
    expect(getLobbyView(state, "1")).toMatchObject({ isSeated: true, isReady: true });
    expect(getLobbyView(state, "0").canStart).toBe(false);
    ok(setReady(state, "2", true));
    expect(getLobbyView(state, "0")).toMatchObject({ canStart: true, startBlockedReason: null });
  });

  it("is never startable outside the lobby stage", () => {
    const state = seated(["0", "1"]);
    ok(setReady(state, "1", true));
    ok(startGame(state, "0", createSeededRng(4)));
    expect(getLobbyView(state, "0").canStart).toBe(false);
  });

  it("agrees with startGame validation on every fixture", () => {
    const fixtures: Array<{ state: MatchState; viewers: string[] }> = [];
    const solo = seated(["0"]);
    fixtures.push({ state: solo, viewers: ["0", "3"] });

    const unready = seated(["0", "1", "2"]);
    ok(setReady(unready, "1", true));
    fixtures.push({ state: unready, viewers: ["0", "1", "2", "4"] });

    const ready = seated(["2", "3", "5"]);
    ok(setReady(ready, "3", true));
    ok(setReady(ready, "5", true));
    fixtures.push({ state: ready, viewers: ["2", "3", "5", "0"] });

    for (const { state, viewers } of fixtures) {
      for (const viewer of viewers) {
        const view = getLobbyView(state, viewer);
        const attempt = structuredClone(state);
        const result = startGame(attempt, viewer, createSeededRng(9));
        expect(view.canStart, `viewer ${viewer}`).toBe(result.ok);
        if (!result.ok) {
          expect(view.startBlockedReason, `viewer ${viewer}`).toBe(result.error);
        }
      }
    }
  });
});
