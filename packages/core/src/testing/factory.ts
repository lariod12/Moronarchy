import { PLOT_HEALTH } from "../content/balance";
import { getPlot } from "../rules/board";
import { createResident } from "../rules/residents";
import { getResidentStats } from "../rules/stats";
import { createGame } from "../flow/setup";
import { beginTurn } from "../flow/turn";
import type { GameState, ItemId, PlayerId, Plot, Resident, ResidentKind, TileId, TurnStep } from "../model/types";
import { createSeededRng } from "./rng";

// Deterministic turn order "0", "1", ... with player "0" at awaitClaim.
export const createTestGame = (playerCount = 2, overrides: Partial<GameState> = {}): GameState => {
  const ids = Array.from({ length: playerCount }, (_, index) => String(index));
  const rng = createSeededRng(1);
  const state = createGame(
    ids.map((id) => ({ id, name: `King ${id}` })),
    rng
  );
  state.turnOrder = ids;
  beginTurn(state, "0", rng);
  Object.assign(state, overrides);
  return state;
};

export const givePlot = (state: GameState, ownerId: PlayerId, tileId: TileId, level = 0): Plot => {
  const plot = getPlot(state, tileId);
  if (!plot) {
    throw new Error(`Tile ${tileId} is not a plot`);
  }
  plot.ownerId = ownerId;
  plot.level = level;
  plot.health = PLOT_HEALTH[level] ?? 0;
  return plot;
};

export const addResident = (state: GameState, plotId: TileId, kind: ResidentKind, level = 1): Resident => {
  const plot = getPlot(state, plotId);
  if (!plot || !plot.ownerId) {
    throw new Error(`Tile ${plotId} has no owner`);
  }
  const resident = createResident(state, plot, kind, plot.ownerId);
  resident.level = level;
  resident.health = getResidentStats(resident).maxHealth;
  return resident;
};

export const placeKing = (state: GameState, playerId: PlayerId, tileId: TileId): void => {
  const king = state.kings[playerId];
  if (!king) {
    throw new Error(`Unknown king ${playerId}`);
  }
  king.position = tileId;
};

export const setTurnStep = (state: GameState, step: TurnStep, playerId?: PlayerId): void => {
  state.turn.step = step;
  if (playerId !== undefined) {
    state.turn.playerId = playerId;
  }
};

export const giveItem = (state: GameState, playerId: PlayerId, itemId: ItemId, count = 1): void => {
  const king = state.kings[playerId];
  if (!king) {
    throw new Error(`Unknown king ${playerId}`);
  }
  king.items[itemId] = (king.items[itemId] ?? 0) + count;
};
