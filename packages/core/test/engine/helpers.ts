import { expect } from "vitest";
import { claimTurn, rollDice } from "../../src/engine";
import type { CommandResult, GameState, PlayerId, TileId } from "../../src/engine";
import type { Rng } from "../../src/rules/rng";
import { placeKing } from "../../src/testing";

// Deterministic rng: scripted values first, then d6 = 3 and next = 0.99 (no events, no item drops).
export const quietRng = (d6: number[] = [], next: number[] = []): Rng => {
  const d6Queue = [...d6];
  const nextQueue = [...next];
  return {
    d6: () => d6Queue.shift() ?? 3,
    next: () => nextQueue.shift() ?? 0.99
  };
};

export const ok = (result: CommandResult): void => {
  expect(result).toEqual({ ok: true });
};

export const fails = (result: CommandResult, error: string): void => {
  expect(result).toEqual({ ok: false, error });
};

// Turn player claims the turn and rolls a 1 from the tile before `tileId`, landing on it.
export const landOn = (
  state: GameState,
  tileId: TileId,
  script: { d6?: number[]; next?: number[] } = {}
): Rng => {
  const playerId: PlayerId = state.turn.playerId;
  const rng = quietRng([1, ...(script.d6 ?? [])], script.next ?? []);
  placeKing(state, playerId, tileId - 1);
  ok(claimTurn(state, playerId, rng));
  ok(rollDice(state, playerId, rng));
  return rng;
};

export const snapshot = (state: GameState): string => JSON.stringify(state);
