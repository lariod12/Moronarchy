import { describe, expect, it } from "vitest";
import {
  buyPlot,
  claimTurn,
  endTurn,
  getLatestLogEntry,
  healPlot,
  previewCommand,
  recruitResident,
  rollDice,
  upgradePlot
} from "../../src/engine";
import type { CommandResult, GameState } from "../../src/engine";
import { createTestGame, givePlot, placeKing, setTurnStep } from "../../src/testing";
import { landOn, ok, quietRng, snapshot } from "./helpers";

const stationGame = (): GameState => {
  const state = createTestGame(2);
  givePlot(state, "0", 5, 0);
  setTurnStep(state, "startStation", "0");
  return state;
};

describe("previewCommand", () => {
  it("answers like the real management commands without touching the input", () => {
    const state = stationGame();
    const before = snapshot(state);
    const rng = quietRng();

    for (const [name, args, run] of [
      ["upgradePlot", [5], (s: GameState) => upgradePlot(s, "0", rng, 5)],
      ["healPlot", [5], (s: GameState) => healPlot(s, "0", rng, 5)],
      ["recruitResident", [5, "warrior"], (s: GameState) => recruitResident(s, "0", rng, 5, "warrior")],
      ["upgradePlot", [6], (s: GameState) => upgradePlot(s, "0", rng, 6)]
    ] as const) {
      const preview = previewCommand(state, "0", name, [...args]);
      const real: CommandResult = run(structuredClone(state));
      expect(preview, `${name} ${args.join(",")}`).toEqual(real);
    }
    expect(snapshot(state)).toBe(before);
    expect(previewCommand(state, "0", "healPlot", [5])).toEqual({ ok: false, error: "NOT_ALLOWED" });
    expect(previewCommand(state, "0", "upgradePlot", [6])).toEqual({ ok: false, error: "INVALID_TARGET" });
  });

  it("rejects what the engine rejects when coin is short", () => {
    const state = stationGame();
    const king = state.kings["0"]!;
    king.coin = 10;
    expect(previewCommand(state, "0", "upgradePlot", [5])).toEqual({ ok: false, error: "INSUFFICIENT_COIN" });
    expect(previewCommand(state, "0", "recruitResident", [5, "farmer"])).toEqual({ ok: false, error: "INSUFFICIENT_COIN" });
    expect(previewCommand(state, "0", "buyItem", ["horse"])).toEqual({ ok: false, error: "INSUFFICIENT_COIN" });
    king.coin = 40;
    expect(previewCommand(state, "0", "buyItem", ["horse"])).toEqual({ ok: true });
  });

  it("previews buyPlot on a pending decision and never applies it", () => {
    const state = createTestGame(2);
    landOn(state, 7);
    expect(state.pending?.kind).toBe("buyPlot");
    const before = snapshot(state);

    expect(previewCommand(state, "0", "buyPlot")).toEqual({ ok: true });
    expect(previewCommand(state, "1", "buyPlot")).toEqual({ ok: false, error: "NOT_ACTOR" });
    expect(snapshot(state)).toBe(before);

    const real = buyPlot(state, "0", quietRng());
    expect(real).toEqual({ ok: true });
    expect(state.plots[5]?.ownerId).toBe("0");
  });

  it("previews buyPlot as unaffordable when the king is short on coin", () => {
    const state = createTestGame(2);
    landOn(state, 7);
    state.kings["0"]!.coin = 10;
    expect(previewCommand(state, "0", "buyPlot")).toEqual({ ok: false, error: "INSUFFICIENT_COIN" });
  });

  it("previews endTurn only after moving", () => {
    const state = createTestGame(2);
    expect(previewCommand(state, "0", "endTurn")).toEqual({ ok: false, error: "WRONG_STEP" });
    setTurnStep(state, "postMove", "0");
    const before = snapshot(state);
    expect(previewCommand(state, "0", "endTurn")).toEqual({ ok: true });
    expect(previewCommand(state, "1", "endTurn")).toEqual({ ok: false, error: "NOT_YOUR_TURN" });
    expect(snapshot(state)).toBe(before);
    ok(endTurn(state, "0", quietRng()));
    expect(state.turn.playerId).toBe("1");
  });

  it("previews claim and roll without consuming the turn", () => {
    const state = createTestGame(2);
    expect(previewCommand(state, "0", "rollDice")).toEqual({ ok: false, error: "WRONG_STEP" });
    expect(previewCommand(state, "0", "claimTurn")).toEqual({ ok: true });
    expect(state.turn.step).toBe("awaitClaim");
    const rng = quietRng();
    ok(claimTurn(state, "0", rng));
    expect(previewCommand(state, "0", "rollDice")).toEqual({ ok: true });
    expect(state.turn.rolled).toBe(false);
    ok(rollDice(state, "0", rng));
  });

  it("reports malformed arguments as a refusal", () => {
    const state = stationGame();
    expect(previewCommand(state, "0", "upgradePlot", ["five"])).toEqual({ ok: false, error: "INVALID_ARGUMENT" });
    expect(previewCommand(state, "0", "buyItem", ["nope"])).toEqual({ ok: false, error: "INVALID_ARGUMENT" });
  });

  it("does not need the king to be anywhere in particular", () => {
    const state = createTestGame(2);
    placeKing(state, "0", 20);
    expect(previewCommand(state, "0", "claimTurn")).toEqual({ ok: true });
  });
});

describe("getLatestLogEntry", () => {
  it("returns the newest lapCompleted entry of a player", () => {
    const state = createTestGame(2);
    expect(getLatestLogEntry(state, "lapCompleted", "0")).toBeUndefined();
    placeKing(state, "0", 39);
    const rng = quietRng([4]);
    ok(claimTurn(state, "0", rng));
    ok(rollDice(state, "0", rng));
    const entry = getLatestLogEntry(state, "lapCompleted", "0");
    expect(entry?.data).toMatchObject({ bonus: 100, level: 2 });
    expect(getLatestLogEntry(state, "lapCompleted", "1")).toBeUndefined();
    expect(getLatestLogEntry(state, "lapCompleted")?.seq).toBe(entry?.seq);
  });

  it("previews forfeit as accepted for any live king and leaves the state alone", () => {
    const state = createTestGame(3);
    const before = snapshot(state);
    expect(previewCommand(state, "1", "forfeit")).toEqual({ ok: true });
    expect(previewCommand(state, "9", "forfeit")).toEqual({ ok: false, error: "NOT_ACTOR" });
    expect(snapshot(state)).toBe(before);
  });
});
