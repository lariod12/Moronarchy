import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REVEAL_MS, useRoundReveal } from "./useRoundReveal";

const stubMotion = (reduced: boolean): void => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined
  }));
};

describe("useRoundReveal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("does not animate on mount, also when rounds were already played", () => {
    const { result } = renderHook(() => useRoundReveal(2));
    expect(result.current).toEqual({ rolling: false, fresh: false });
    act(() => {
      vi.advanceTimersByTime(REVEAL_MS * 2);
    });
    expect(result.current).toEqual({ rolling: false, fresh: false });
  });

  it("rolls for about 600 ms when a new round resolves, then rests", () => {
    const { result, rerender } = renderHook(({ rounds }) => useRoundReveal(rounds), { initialProps: { rounds: 0 } });
    rerender({ rounds: 1 });
    expect(result.current).toEqual({ rolling: true, fresh: true });
    act(() => {
      vi.advanceTimersByTime(REVEAL_MS - 1);
    });
    expect(result.current.rolling).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toEqual({ rolling: false, fresh: true });
  });

  it("does not animate with reduced motion", () => {
    stubMotion(true);
    const { result, rerender } = renderHook(({ rounds }) => useRoundReveal(rounds), { initialProps: { rounds: 0 } });
    rerender({ rounds: 1 });
    expect(result.current).toEqual({ rolling: false, fresh: false });
  });
});
