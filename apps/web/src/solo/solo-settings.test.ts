import { beforeEach, describe, expect, it } from "vitest";
import { createSeededRng } from "@moronarchy/core/testing";
import { createSoloMatch, startSoloGame } from "./solo-match";
import { clearSoloMatch, DEFAULT_SOLO_SETTINGS, isPlausibleMatch, loadSolo, sanitizeSettings, saveSolo, SOLO_STORAGE_KEY } from "./solo-settings";

const settings = { name: "Aria", bots: 2, style: "aggressive", speed: "fast" } as const;

beforeEach(() => {
  localStorage.clear();
});

describe("sanitizeSettings", () => {
  it("falls back to the defaults for anything that is not valid", () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SOLO_SETTINGS);
    expect(sanitizeSettings({ name: 5, bots: "3", style: "wild", speed: "warp" })).toEqual(DEFAULT_SOLO_SETTINGS);
  });

  it("clamps the bot count to 1-5 and cleans the name", () => {
    expect(sanitizeSettings({ ...settings, bots: 99 }).bots).toBe(5);
    expect(sanitizeSettings({ ...settings, bots: 0 }).bots).toBe(1);
    expect(sanitizeSettings({ ...settings, bots: 2.5 }).bots).toBe(DEFAULT_SOLO_SETTINGS.bots);
    expect(sanitizeSettings({ ...settings, name: "  Ann\u0000  Lee  " }).name).toBe("Ann Lee");
  });

  it("keeps valid values", () => {
    expect(sanitizeSettings(settings)).toEqual(settings);
  });
});

describe("loadSolo and saveSolo", () => {
  it("starts with the defaults and no match", () => {
    expect(loadSolo()).toEqual({ settings: DEFAULT_SOLO_SETTINGS, match: null });
  });

  it("round-trips the settings and a running match through one storage key", () => {
    const match = createSoloMatch(settings);
    startSoloGame(match, createSeededRng(4));
    saveSolo({ settings, match });
    expect(Object.keys(localStorage)).toEqual([SOLO_STORAGE_KEY]);
    expect(loadSolo()).toEqual({ settings, match });
  });

  it("falls back to the setup when the data is corrupt", () => {
    localStorage.setItem(SOLO_STORAGE_KEY, "{not json");
    expect(loadSolo()).toEqual({ settings: DEFAULT_SOLO_SETTINGS, match: null });
    localStorage.setItem(SOLO_STORAGE_KEY, JSON.stringify({ version: 99, settings, match: null }));
    expect(loadSolo().settings).toEqual(DEFAULT_SOLO_SETTINGS);
  });

  it("drops a match that is not plausible but keeps the settings", () => {
    localStorage.setItem(SOLO_STORAGE_KEY, JSON.stringify({ version: 1, settings, match: { stage: "playing", seats: [], game: {} } }));
    expect(loadSolo()).toEqual({ settings, match: null });
  });

  it("clearSoloMatch forgets the match and keeps the settings", () => {
    saveSolo({ settings, match: createSoloMatch(settings) });
    clearSoloMatch();
    expect(loadSolo()).toEqual({ settings, match: null });
  });

  it("survives storage that throws", () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    try {
      expect(loadSolo().match).toBeNull();
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});

describe("isPlausibleMatch", () => {
  it("accepts a lobby and a running match and rejects a game-less playing match", () => {
    const match = createSoloMatch(settings);
    expect(isPlausibleMatch(match)).toBe(true);
    startSoloGame(match, createSeededRng(2));
    expect(isPlausibleMatch(match)).toBe(true);
    expect(isPlausibleMatch({ ...match, game: null })).toBe(false);
    expect(isPlausibleMatch("nope")).toBe(false);
  });
});
