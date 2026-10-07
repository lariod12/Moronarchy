import { act, render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeededRng, getRequiredActorIds } from "@moronarchy/core/testing";
import type { MatchState } from "@moronarchy/core/match";
import { MovementProvider, useMovement } from "../game/MovementContext";
import { BotDriver } from "./BotDriver";
import { LocalMatchProvider, useSolo } from "./LocalMatchProvider";
import type { SoloValue } from "./LocalMatchProvider";
import { createSoloMatch, startSoloGame } from "./solo-match";
import type { SoloSettings } from "./solo-settings";

const baseSettings: SoloSettings = { name: "Aria", bots: 2, style: "careful", speed: "fast" };

// A started game where a bot, not the human, has the first turn.
const botFirstMatch = (settings: SoloSettings): MatchState => {
  for (let seed = 1; seed < 300; seed += 1) {
    const match = createSoloMatch(settings);
    startSoloGame(match, createSeededRng(seed));
    if (match.game?.turn.playerId !== "0") {
      return match;
    }
  }
  throw new Error("No seed found");
};

interface Probe {
  solo: SoloValue;
  animating: boolean;
}

const Inner = ({ probe }: { probe: Probe }) => {
  probe.animating = useMovement().isAnimating;
  return <BotDriver />;
};

const Harness = ({ probe, stepMs }: { probe: Probe; stepMs: number }) => {
  const solo = useSolo();
  probe.solo = solo;
  return (
    <MovementProvider game={solo.match.game as NonNullable<MatchState["game"]>} stepMs={stepMs}>
      <Inner probe={probe} />
    </MovementProvider>
  );
};

const mount = (settings: SoloSettings = baseSettings, stepMs = 10): Probe => {
  const probe = {} as Probe;
  render(
    <MemoryRouter>
      <LocalMatchProvider settings={settings} match={botFirstMatch(settings)}>
        <Harness probe={probe} stepMs={stepMs} />
      </LocalMatchProvider>
    </MemoryRouter>
  );
  return probe;
};

const advance = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

const humanIsRequired = (probe: Probe): boolean => {
  const game = probe.solo.match.game;
  return game !== null && getRequiredActorIds(game).includes("0");
};

describe("BotDriver", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("plays the bots until the game waits on the human, then stays put", () => {
    const probe = mount();
    for (let tick = 0; tick < 600 && !humanIsRequired(probe); tick += 1) {
      advance(100);
    }
    expect(humanIsRequired(probe)).toBe(true);
    const waiting = probe.solo.match;
    advance(5000);
    expect(probe.solo.match).toBe(waiting);
  });

  it("waits the speed delay before each action", () => {
    const probe = mount({ ...baseSettings, speed: "slow" });
    const start = probe.solo.match;
    advance(1100);
    expect(probe.solo.match).toBe(start);
    advance(200);
    expect(probe.solo.match).not.toBe(start);
  });

  it("uses a new delay after the speed changes", () => {
    const probe = mount({ ...baseSettings, speed: "slow" });
    const start = probe.solo.match;
    act(() => probe.solo.setSpeed("fast"));
    advance(200);
    expect(probe.solo.match).not.toBe(start);
  });

  it("does nothing while paused and carries on after Resume", () => {
    const probe = mount();
    act(() => probe.solo.setPaused(true));
    const start = probe.solo.match;
    advance(5000);
    expect(probe.solo.match).toBe(start);
    act(() => probe.solo.setPaused(false));
    advance(200);
    expect(probe.solo.match).not.toBe(start);
  });

  it("waits while a movement animation is playing", () => {
    // Each token step takes 1 s, far more than the 150 ms bot delay.
    const probe = mount(baseSettings, 1000);
    for (let tick = 0; tick < 100 && !probe.animating; tick += 1) {
      advance(50);
    }
    expect(probe.animating).toBe(true);
    const walking = probe.solo.match;
    advance(600);
    expect(probe.animating).toBe(true);
    expect(probe.solo.match).toBe(walking);
    // State updates only flush when act returns, so let the walk and the next bot action happen in small steps.
    for (let tick = 0; tick < 300 && probe.solo.match === walking; tick += 1) {
      advance(100);
    }
    expect(probe.solo.match).not.toBe(walking);
  });
});
