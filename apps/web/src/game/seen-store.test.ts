import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSeen, saveSeen } from "./seen-store";

describe("seen-store", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts empty and keeps what was saved per match and player", () => {
    expect(loadSeen("R001-0", "0")).toEqual({ seq: null, dismissed: [] });
    saveSeen("R001-0", "0", { seq: 12, dismissed: ["ownPlot:1:0:5"] });
    expect(loadSeen("R001-0", "0")).toEqual({ seq: 12, dismissed: ["ownPlot:1:0:5"] });
    expect(loadSeen("R001-0", "1")).toEqual({ seq: null, dismissed: [] });
    expect(loadSeen("R001-1", "0")).toEqual({ seq: null, dismissed: [] });
  });

  it("ignores corrupt data", () => {
    sessionStorage.setItem("moronarchy:seen:R001-0:0", "{not json");
    expect(loadSeen("R001-0", "0")).toEqual({ seq: null, dismissed: [] });
    sessionStorage.setItem("moronarchy:seen:R001-0:0", JSON.stringify({ seq: "x", dismissed: [1, "a"] }));
    expect(loadSeen("R001-0", "0")).toEqual({ seq: null, dismissed: ["a"] });
  });

  it("survives storage that throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveSeen("R001-0", "0", { seq: 1, dismissed: [] })).not.toThrow();
  });
});
