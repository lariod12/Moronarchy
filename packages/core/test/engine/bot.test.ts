import { describe, expect, it } from "vitest";
import { attack, getBlockingPlayerIds } from "../../src/engine";
import type { GameState } from "../../src/engine";
import { createSeededRng, createTestGame, getRequiredActorIds, givePlot, placeKing, stepBot, stepBotAs } from "../../src/testing";
import { landOn, ok, snapshot } from "./helpers";

// King "1" owns tile 5 and stands on it; king "0" lands there and the owner attacks: both must roll.
const duel = (): { state: GameState; rng: ReturnType<typeof landOn> } => {
  const state = createTestGame(2);
  givePlot(state, "1", 5, 0);
  placeKing(state, "1", 5);
  const rng = landOn(state, 5);
  ok(attack(state, "1", rng));
  return { state, rng };
};

describe("getRequiredActorIds", () => {
  it("is the turn player on a plain step", () => {
    const state = createTestGame(3);
    expect(getRequiredActorIds(state)).toEqual([state.turn.playerId]);
  });

  it("is the player a pending decision is addressed to", () => {
    const state = createTestGame(2);
    givePlot(state, "1", 5, 0);
    placeKing(state, "1", 5);
    landOn(state, 5);
    expect(state.pending).toMatchObject({ kind: "ownerChoice", playerId: "1" });
    expect(getRequiredActorIds(state)).toEqual(["1"]);
  });

  it("is every fighter who has not rolled, and drops the turn player when they are not fighting", () => {
    const { state, rng } = duel();
    expect(getRequiredActorIds(state).sort()).toEqual(["0", "1"]);
    expect(getBlockingPlayerIds(state)).toEqual(expect.arrayContaining(getRequiredActorIds(state)));
    stepBotAs(state, rng, "careful", "1");
    expect(getRequiredActorIds(state)).toEqual(["0"]);
  });

  it("is empty once the game is finished", () => {
    const state = createTestGame(2);
    state.phase = "finished";
    expect(getRequiredActorIds(state)).toEqual([]);
  });
});

describe("stepBotAs", () => {
  it("acts only for its own id", () => {
    const state = createTestGame(3);
    const rng = createSeededRng(3);
    const turnId = state.turn.playerId;
    const other = state.turn.playerId === "0" ? "1" : "0";
    const before = snapshot(state);
    expect(stepBotAs(state, rng, "careful", other)).toBe(false);
    expect(snapshot(state)).toBe(before);
    expect(stepBotAs(state, rng, "careful", turnId)).toBe(true);
    expect(snapshot(state)).not.toBe(before);
  });

  it("answers an owner decision only for the addressed bot", () => {
    const state = createTestGame(2);
    givePlot(state, "1", 5, 0);
    placeKing(state, "1", 5);
    const rng = landOn(state, 5);
    expect(stepBotAs(state, rng, "careful", "0")).toBe(false);
    expect(stepBotAs(state, rng, "careful", "1")).toBe(true);
    expect(state.pending).toBeNull();
  });

  it("rolls for a bot in a duel while the human is still pending", () => {
    const { state, rng } = duel();
    expect(stepBotAs(state, rng, "careful", "1")).toBe(true);
    expect(state.fight?.pendingRolls["1"]).toBeDefined();
    expect(state.fight?.pendingRolls["0"]).toBeUndefined();
    expect(stepBotAs(state, rng, "careful", "1")).toBe(false);
    expect(getRequiredActorIds(state)).toEqual(["0"]);
  });

  it("does nothing when the game is finished", () => {
    const state = createTestGame(2);
    state.phase = "finished";
    expect(stepBotAs(state, createSeededRng(1), "careful", "0")).toBe(false);
  });

  it("matches stepBot when the only required actor is the bot", () => {
    const left = createTestGame(2);
    const right = createTestGame(2);
    stepBot(left, createSeededRng(9), "aggressive");
    expect(stepBotAs(right, createSeededRng(9), "aggressive", right.turn.playerId)).toBe(true);
    expect(snapshot(right)).toBe(snapshot(left));
  });
});

