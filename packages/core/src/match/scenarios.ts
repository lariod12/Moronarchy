import { claimPlot } from "../rules/plots";
import type { GameState, PlayerId } from "../model/types";

// Test-only match scenarios: a room created with `setupData: { scenario }` starts its games from a rigged position,
// so an end-to-end test can reach the end of the game in a couple of moves. The server refuses to create such a room
// unless it runs with MORONARCHY_ENABLE_TEST_SCENARIOS=1 (see createMoronarchyMatchGame), so they never exist in production.
export const MATCH_SCENARIOS = ["finale"] as const;

export type MatchScenario = (typeof MATCH_SCENARIOS)[number];

export const isMatchScenario = (value: unknown): value is MatchScenario =>
  typeof value === "string" && (MATCH_SCENARIOS as readonly string[]).includes(value);

// Reads the scenario out of boardgame.io setupData; anything unknown means "no scenario".
export const readScenario = (setupData: unknown): MatchScenario | null => {
  if (typeof setupData !== "object" || setupData === null) {
    return null;
  }
  const { scenario } = setupData as { scenario?: unknown };
  return isMatchScenario(scenario) ? scenario : null;
};

// Rigs a freshly created game (call right after `createGame`).
// finale: the host's king owns every plot (level 0, full health, no residents) and every other king holds 5 coin,
// so the first fee any other king has to pay bankrupts them.
export const applyScenario = (game: GameState, scenario: MatchScenario, hostId: PlayerId): void => {
  switch (scenario) {
    case "finale": {
      for (const plot of game.plots) {
        claimPlot(hostId, plot);
      }
      for (const king of Object.values(game.kings)) {
        if (king.id !== hostId) {
          king.coin = 5;
        }
      }
      break;
    }
  }
};
