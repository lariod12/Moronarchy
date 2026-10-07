import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerId } from "@moronarchy/core/engine";
import { attack, fightRoll } from "@moronarchy/core/engine";
import { createScriptedRng, createTestGame, givePlot, placeKing } from "@moronarchy/core/testing";
import { ABSENT_TIMEOUT_MS, RECONNECTED_NOTICE_MS, getAbsentBlockers, useAbsentCountdown } from "./useAbsentCountdown";

const none: ReadonlySet<PlayerId> = new Set();

const withOffline = (...ids: PlayerId[]): ReadonlySet<PlayerId> => new Set(ids);

describe("getAbsentBlockers", () => {
  it("lists only offline kings the game is waiting on", () => {
    const game = createTestGame(3);
    expect(getAbsentBlockers(game, withOffline("1", "2"))).toEqual([]);
    expect(getAbsentBlockers(game, withOffline("0"))).toEqual(["0"]);
  });

  it("includes an offline king who owes a decision or a fight roll", () => {
    const game = createTestGame(3);
    givePlot(game, "1", 5);
    placeKing(game, "1", 5);
    // The turn player lands on King 1's plot while King 1 stands there: King 1 must choose.
    game.pending = { kind: "ownerChoice", playerId: "1", plotId: 5, visitorId: "0", canAttack: true };
    game.turn.step = "decision";
    expect(getAbsentBlockers(game, withOffline("1"))).toEqual(["1"]);
    const rng = createScriptedRng({ d6: [3, 3], next: [0.99, 0.99, 0.99] });
    attack(game, "1", rng);
    expect(getAbsentBlockers(game, withOffline("1"))).toEqual(["1"]);
    fightRoll(game, "1", rng);
    expect(getAbsentBlockers(game, withOffline("1"))).toEqual([]);
  });
});

describe("useAbsentCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is quiet while the game does not wait on an offline king", () => {
    const game = createTestGame(3);
    const { result } = renderHook(() => useAbsentCountdown(game, withOffline("2")));
    expect(result.current).toBeNull();
  });

  it("counts down from the moment this client saw the game wait on an offline king", () => {
    const game = createTestGame(3);
    const { result } = renderHook(() => useAbsentCountdown(game, withOffline("0")));
    expect(result.current).toEqual({ kind: "absent", playerId: "0", secondsLeft: 30 });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toEqual({ kind: "absent", playerId: "0", secondsLeft: 25 });
    act(() => {
      vi.advanceTimersByTime(ABSENT_TIMEOUT_MS);
    });
    expect(result.current).toEqual({ kind: "absent", playerId: "0", secondsLeft: 0 });
  });

  it("only starts counting when the offline king becomes the one waited on", () => {
    const game = createTestGame(3);
    const { result, rerender } = renderHook(({ state }) => useAbsentCountdown(state, withOffline("1")), { initialProps: { state: game } });
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(result.current).toBeNull();
    const next = structuredClone(game);
    next.turn.playerId = "1";
    rerender({ state: next });
    expect(result.current).toEqual({ kind: "absent", playerId: "1", secondsLeft: 30 });
  });

  it("clears with a short Reconnected notice when the king comes back", () => {
    const game = createTestGame(3);
    const { result, rerender } = renderHook(({ offline }) => useAbsentCountdown(game, offline), { initialProps: { offline: withOffline("0") } });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current?.kind).toBe("absent");
    rerender({ offline: none });
    expect(result.current).toEqual({ kind: "reconnected", playerId: "0" });
    act(() => {
      vi.advanceTimersByTime(RECONNECTED_NOTICE_MS + 100);
    });
    expect(result.current).toBeNull();
  });

  it("clears without a notice when the king was removed", () => {
    const game = createTestGame(3);
    const { result, rerender } = renderHook(({ state }) => useAbsentCountdown(state, withOffline("0")), { initialProps: { state: game } });
    expect(result.current?.kind).toBe("absent");
    const removed = structuredClone(game);
    const king = removed.kings["0"];
    if (king) {
      king.eliminated = true;
    }
    removed.turn.playerId = "1";
    rerender({ state: removed });
    expect(result.current).toBeNull();
    act(() => {
      vi.advanceTimersByTime(RECONNECTED_NOTICE_MS + 100);
    });
    expect(result.current).toBeNull();
  });

  it("starts every offline king the game waits on at the full timeout", () => {
    const game = createTestGame(3);
    givePlot(game, "1", 5);
    placeKing(game, "1", 5);
    game.pending = { kind: "ownerChoice", playerId: "1", plotId: 5, visitorId: "0", canAttack: true };
    game.turn.step = "decision";
    const { result } = renderHook(() => useAbsentCountdown(game, withOffline("0", "1")));
    expect(result.current).toMatchObject({ kind: "absent", secondsLeft: 30 });
  });
});
