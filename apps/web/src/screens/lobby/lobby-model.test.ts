import { describe, expect, it } from "vitest";
import { createLobbyState } from "../../dev/gallery/lobby-fixtures";
import { toChatLines, toLobbySlots } from "./lobby-model";

describe("lobby model", () => {
  const state = createLobbyState({
    seats: [
      { id: "0", name: "Alice" },
      { id: "2", name: "Cara", ready: true }
    ],
    chat: [
      { id: "0", text: "hi" },
      { id: "2", text: "yo" }
    ]
  });

  it("places seats by player id and leaves the rest empty", () => {
    const slots = toLobbySlots(state, "2", [], {});
    expect(slots).toHaveLength(6);
    expect(slots.map((slot) => slot?.playerId ?? null)).toEqual(["0", null, "2", null, null, null]);
    expect(slots[0]).toMatchObject({ name: "Alice", isHost: true, isSelf: false, ready: false });
    expect(slots[2]).toMatchObject({ name: "Cara", isHost: false, isSelf: true, ready: true });
  });

  it("marks players the server reports as disconnected and attaches bubbles", () => {
    const slots = toLobbySlots(state, "0", [{ id: "2", isConnected: false }], { "0": "hello" });
    expect(slots[0]).toMatchObject({ connected: true, bubbleText: "hello" });
    expect(slots[2]).toMatchObject({ connected: false });
    expect(slots[2]?.bubbleText).toBeUndefined();
  });

  it("flags the viewer's own chat lines", () => {
    expect(toChatLines(state, "0")).toEqual([
      { seq: 1, name: "Alice", text: "hi", isSelf: true },
      { seq: 2, name: "Cara", text: "yo", isSelf: false }
    ]);
  });
});
