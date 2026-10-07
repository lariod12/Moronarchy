import { describe, expect, it } from "vitest";
import { createPresenceTracker } from "./presence.js";

const clock = () => {
  let time = 1000;
  return { now: () => time, advance: (ms: number) => (time += ms) };
};

describe("presence tracker", () => {
  it("does not treat a player who never connected as absent", () => {
    const tracker = createPresenceTracker(clock().now);
    tracker.update("m1", { "0": { name: "Ann" }, "1": { name: "Bob", isConnected: false } });
    expect(tracker.absentSince("m1", "0")).toBeNull();
    expect(tracker.absentSince("m1", "1")).toBeNull();
    expect(tracker.listAbsent()).toEqual([]);
  });

  it("marks a seated player absent from the first disconnect and keeps that time", () => {
    const time = clock();
    const tracker = createPresenceTracker(time.now);
    tracker.update("m1", { "0": { name: "Ann", isConnected: true } });
    time.advance(500);
    tracker.update("m1", { "0": { name: "Ann", isConnected: false } });
    expect(tracker.absentSince("m1", "0")).toBe(1500);
    time.advance(5000);
    tracker.update("m1", { "0": { name: "Ann", isConnected: false } });
    expect(tracker.absentSince("m1", "0")).toBe(1500);
    expect(tracker.listAbsent()).toEqual([{ matchID: "m1", playerID: "0", since: 1500 }]);
  });

  it("clears the absence on reconnect and starts a fresh one afterwards", () => {
    const time = clock();
    const tracker = createPresenceTracker(time.now);
    tracker.update("m1", { "0": { name: "Ann", isConnected: true } });
    tracker.update("m1", { "0": { name: "Ann", isConnected: false } });
    time.advance(1000);
    tracker.update("m1", { "0": { name: "Ann", isConnected: true } });
    expect(tracker.absentSince("m1", "0")).toBeNull();
    time.advance(1000);
    tracker.update("m1", { "0": { name: "Ann", isConnected: false } });
    expect(tracker.absentSince("m1", "0")).toBe(3000);
  });

  it("forgets players who lost their name (left the slot) and whole matches", () => {
    const tracker = createPresenceTracker(clock().now);
    tracker.update("m1", { "0": { name: "Ann", isConnected: true }, "1": { name: "Bob", isConnected: true } });
    tracker.update("m1", { "0": { name: "Ann", isConnected: false }, "1": { isConnected: false } });
    expect(tracker.absentSince("m1", "1")).toBeNull();
    expect(tracker.listAbsent().map((entry) => entry.playerID)).toEqual(["0"]);
    tracker.forget("m1");
    expect(tracker.listAbsent()).toEqual([]);
    tracker.update("m1", { "0": { name: "Ann", isConnected: false } });
    expect(tracker.absentSince("m1", "0")).toBeNull();
  });

  it("keeps matches apart and ignores missing player maps", () => {
    const tracker = createPresenceTracker(clock().now);
    tracker.update("m1", { "0": { name: "Ann", isConnected: true } });
    tracker.update("m2", { "0": { name: "Cy", isConnected: true } });
    tracker.update("m1", { "0": { name: "Ann", isConnected: false } });
    tracker.update("m3", undefined);
    expect(tracker.absentSince("m1", "0")).not.toBeNull();
    expect(tracker.absentSince("m2", "0")).toBeNull();
  });
});
