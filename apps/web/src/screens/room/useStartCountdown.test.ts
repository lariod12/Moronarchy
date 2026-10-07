import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchStage } from "@moronarchy/core/match";
import { useStartCountdown } from "./useStartCountdown";

describe("useStartCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts 3, 2, 1 then finishes when the stage flips from lobby to playing", () => {
    const { result, rerender } = renderHook(({ stage }) => useStartCountdown(stage), {
      initialProps: { stage: "lobby" as MatchStage | null }
    });
    expect(result.current).toBeNull();

    rerender({ stage: "playing" });
    expect(result.current).toBe(3);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(2);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(1);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBeNull();
  });

  it("never counts down when the first observed stage is already playing", () => {
    const { result, rerender } = renderHook(({ stage }) => useStartCountdown(stage), {
      initialProps: { stage: "playing" as MatchStage | null }
    });
    expect(result.current).toBeNull();
    rerender({ stage: "playing" });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBeNull();
  });

  it("does not count down when the stage is first known as playing after the initial sync", () => {
    const { result, rerender } = renderHook(({ stage }) => useStartCountdown(stage), {
      initialProps: { stage: null as MatchStage | null }
    });
    rerender({ stage: "playing" });
    expect(result.current).toBeNull();
  });

  it("counts down again after returning to the lobby and starting another game", () => {
    const { result, rerender } = renderHook(({ stage }) => useStartCountdown(stage), {
      initialProps: { stage: "lobby" as MatchStage | null }
    });
    rerender({ stage: "playing" });
    for (let tick = 0; tick < 3; tick += 1) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(result.current).toBeNull();
    rerender({ stage: "finished" });
    rerender({ stage: "lobby" });
    rerender({ stage: "playing" });
    expect(result.current).toBe(3);
  });
});
