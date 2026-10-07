import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { claimTurn, endTurn, leaveStartStation, pickCard, rollDice } from "@moronarchy/core/engine";
import type { GameState } from "@moronarchy/core/engine";
import { createScriptedRng, createTestGame, placeKing } from "@moronarchy/core/testing";
import { MOVE_STEP_MS, MovementProvider, useMovement } from "./MovementContext";

const Probe = () => {
  const { isAnimating, animatedPosition } = useMovement();
  return (
    <div>
      <output data-testid="animating">{String(isAnimating)}</output>
      <output data-testid="pos0">{animatedPosition("0")}</output>
      <output data-testid="pos1">{animatedPosition("1")}</output>
    </div>
  );
};

const quiet = (d6: number[]) => createScriptedRng({ d6, next: [0.99, 0.99, 0.99, 0.99] });

const rolled = (steps: number, from = 1): GameState => {
  const game = createTestGame(2);
  placeKing(game, "0", from);
  const rng = quiet([steps]);
  claimTurn(game, "0", rng);
  rollDice(game, "0", rng);
  return game;
};

const text = (id: string): string => screen.getByTestId(id).textContent ?? "";

describe("MovementProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not animate on mount, even in the middle of a turn", () => {
    const game = rolled(4);
    render(
      <MovementProvider game={game}>
        <Probe />
      </MovementProvider>
    );
    expect(text("animating")).toBe("false");
    expect(text("pos0")).toBe("5");
  });

  it("walks the turn player's token along the path, one tile per step", () => {
    const before = createTestGame(2);
    const { rerender } = render(
      <MovementProvider game={before}>
        <Probe />
      </MovementProvider>
    );
    expect(text("animating")).toBe("false");

    const after = rolled(4);
    rerender(
      <MovementProvider game={after}>
        <Probe />
      </MovementProvider>
    );
    // The new path is visible immediately as "still walking", starting from the tile the king left.
    expect(text("animating")).toBe("true");
    expect(text("pos0")).toBe("1");

    for (const expected of ["2", "3", "4"]) {
      act(() => {
        vi.advanceTimersByTime(MOVE_STEP_MS);
      });
      expect(text("pos0")).toBe(expected);
      expect(text("animating")).toBe("true");
    }
    act(() => {
      vi.advanceTimersByTime(MOVE_STEP_MS);
    });
    expect(text("pos0")).toBe("5");
    expect(text("animating")).toBe("false");
  });

  it("leaves other kings where they are while the turn player walks", () => {
    const before = createTestGame(2);
    placeKing(before, "1", 20);
    const { rerender } = render(
      <MovementProvider game={before}>
        <Probe />
      </MovementProvider>
    );
    const after = rolled(3);
    placeKing(after, "1", 20);
    rerender(
      <MovementProvider game={after}>
        <Probe />
      </MovementProvider>
    );
    expect(text("pos1")).toBe("20");
  });

  it("jumps straight to the end when the user prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const before = createTestGame(2);
    const { rerender } = render(
      <MovementProvider game={before}>
        <Probe />
      </MovementProvider>
    );
    rerender(
      <MovementProvider game={rolled(4)}>
        <Probe />
      </MovementProvider>
    );
    expect(text("animating")).toBe("false");
    expect(text("pos0")).toBe("5");
  });

  it("keeps walking after the Start Station with the rest of the path", () => {
    const game = rolled(4, 39);
    // 39 -> 40 -> 1 (Start Station), two steps left.
    expect(game.turn.path).toEqual([40, 1]);
    const { rerender } = render(
      <MovementProvider game={game}>
        <Probe />
      </MovementProvider>
    );
    expect(text("animating")).toBe("false");
    expect(text("pos0")).toBe("1");

    const rng = quiet([]);
    const pending = game.pending;
    if (pending?.kind !== "pickCard") {
      throw new Error("expected a card pick");
    }
    pickCard(game, "0", rng, 0);
    leaveStartStation(game, "0", rng);
    expect(game.turn.path).toEqual([40, 1, 2, 3]);
    rerender(
      <MovementProvider game={structuredClone(game)}>
        <Probe />
      </MovementProvider>
    );
    expect(text("animating")).toBe("true");
    expect(text("pos0")).toBe("1");
    for (let step = 0; step < 2; step += 1) {
      act(() => {
        vi.advanceTimersByTime(MOVE_STEP_MS);
      });
    }
    expect(text("pos0")).toBe("3");
    expect(text("animating")).toBe("false");
  });

  it("starts fresh on the next turn", () => {
    const game = rolled(2);
    const { rerender } = render(
      <MovementProvider game={game}>
        <Probe />
      </MovementProvider>
    );
    expect(text("animating")).toBe("false");
    // Force the pending decision away and end the turn.
    const next = structuredClone(game);
    next.pending = null;
    next.turn.step = "postMove";
    endTurn(next, "0", quiet([]));
    rerender(
      <MovementProvider game={next}>
        <Probe />
      </MovementProvider>
    );
    expect(next.turn.playerId).toBe("1");
    expect(text("animating")).toBe("false");
    expect(text("pos0")).toBe("3");
  });
});
