import { BOARD_SIZE, REGIONS, START_TILE } from "../content/balance";
import type { GameState, Plot, TileId } from "../model/types";

export const isPlotTile = (tileId: TileId): boolean => Number.isInteger(tileId) && tileId > START_TILE && tileId <= BOARD_SIZE;

export const getRegionBasePrice = (tileId: TileId): number => {
  const region = REGIONS.find((entry) => tileId >= entry.from && tileId <= entry.to);
  if (!region) {
    throw new Error(`Tile ${tileId} is not a plot`);
  }
  return region.base;
};

export const getPlot = (state: GameState, tileId: TileId): Plot | undefined =>
  isPlotTile(tileId) ? state.plots[tileId - 2] : undefined;

export const nextTile = (position: TileId): TileId => (position % BOARD_SIZE) + 1;

export const createEmptyPlots = (): Plot[] =>
  Array.from({ length: BOARD_SIZE - 1 }, (_, index) => ({
    id: index + 2,
    ownerId: null,
    level: 0,
    health: 0,
    residentIds: []
  }));
