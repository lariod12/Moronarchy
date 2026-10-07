import { createGame } from "../flow/setup";
import type { PlayerId } from "../model/types";
import { stepBot } from "./bot";
import type { BotStyle } from "./bot";
import { createSeededRng } from "./rng";

export interface GameSummary {
  finished: boolean;
  rounds: number;
  firstEliminationRound: number | null;
  winnerId: PlayerId | null;
}

export interface RunGameOptions {
  players: number;
  style: BotStyle;
  seed: number;
  maxRounds?: number;
}

const MAX_ACTIONS = 500000;

export const runGame = ({ players, style, seed, maxRounds = 300 }: RunGameOptions): GameSummary => {
  const rng = createSeededRng(seed);
  const state = createGame(
    Array.from({ length: players }, (_, index) => ({ id: String(index), name: `Bot ${index}` })),
    rng
  );
  let actions = 0;
  while (state.phase === "playing" && state.round <= maxRounds) {
    stepBot(state, rng, style);
    actions += 1;
    if (actions > MAX_ACTIONS) {
      throw new Error(`Simulation exceeded ${MAX_ACTIONS} actions (seed ${seed})`);
    }
  }
  const eliminationRounds = Object.values(state.kings)
    .map((king) => king.eliminatedRound)
    .filter((round): round is number => round !== null);
  return {
    finished: state.phase === "finished",
    rounds: state.round,
    firstEliminationRound: eliminationRounds.length > 0 ? Math.min(...eliminationRounds) : null,
    winnerId: state.winnerId
  };
};

export const runMany = (
  options: Omit<RunGameOptions, "seed"> & { seeds: number; firstSeed?: number }
): GameSummary[] => {
  const { seeds, firstSeed = 1, ...rest } = options;
  return Array.from({ length: seeds }, (_, index) => runGame({ ...rest, seed: firstSeed + index }));
};

// Nearest-rank percentile over a numeric list; returns null for an empty list.
export const percentile = (values: number[], fraction: number): number | null => {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1));
  return sorted[index] ?? null;
};
