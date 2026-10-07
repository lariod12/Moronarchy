import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "@moronarchy/core/match";
import { useChatBubbles } from "./useChatBubbles";

const message = (seq: number, playerId: string, text: string): ChatMessage => ({ seq, playerId, name: `King ${playerId}`, text });

describe("useChatBubbles", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not bubble messages that existed at mount", () => {
    const { result } = renderHook(({ chat }) => useChatBubbles(chat), {
      initialProps: { chat: [message(1, "0", "old")] }
    });
    expect(result.current).toEqual({});
  });

  it("shows a new message for 3 seconds, then removes it", () => {
    const { result, rerender } = renderHook(({ chat }) => useChatBubbles(chat), {
      initialProps: { chat: [message(1, "0", "old")] }
    });
    rerender({ chat: [message(1, "0", "old"), message(2, "1", "hello")] });
    expect(result.current).toEqual({ "1": "hello" });

    act(() => {
      vi.advanceTimersByTime(2900);
    });
    expect(result.current).toEqual({ "1": "hello" });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toEqual({});
  });

  it("keeps only the latest message per player and restarts its timer", () => {
    const first = [message(1, "1", "one")];
    const { result, rerender } = renderHook(({ chat }) => useChatBubbles(chat), { initialProps: { chat: [] as ChatMessage[] } });
    rerender({ chat: first });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    rerender({ chat: [...first, message(2, "1", "two"), message(3, "2", "other")] });
    expect(result.current).toEqual({ "1": "two", "2": "other" });

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toEqual({ "1": "two", "2": "other" });
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(result.current).toEqual({});
  });

  it("clears timers on unmount", () => {
    const { rerender, unmount } = renderHook(({ chat }) => useChatBubbles(chat), { initialProps: { chat: [] as ChatMessage[] } });
    rerender({ chat: [message(1, "0", "hi")] });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
