import { BOARD_SIZE } from "@moronarchy/core/engine";
import type { TileId } from "@moronarchy/core/engine";

// The ring is drawn on an 11 x 11 grid (1-based cells). Tiles run clockwise: 01 top-right corner, down the
// right column to 11 (bottom-right), left along the bottom to 21, up the left column to 30, 31 top-left,
// then along the top back to 40 and 01.
export const BOARD_GRID_SIZE = 11;

export interface GridCell {
  row: number;
  col: number;
}

export const getTileCell = (tileId: TileId): GridCell => {
  if (!Number.isInteger(tileId) || tileId < 1 || tileId > BOARD_SIZE) {
    throw new Error(`Tile ${tileId} is not on the board`);
  }
  const last = BOARD_GRID_SIZE;
  if (tileId === 1) {
    return { row: 1, col: last };
  }
  if (tileId <= 10) {
    return { row: tileId, col: last };
  }
  if (tileId <= 21) {
    return { row: last, col: last - (tileId - 11) };
  }
  if (tileId <= 30) {
    return { row: last - (tileId - 21), col: 1 };
  }
  return { row: 1, col: tileId - 30 };
};

export const BOARD_TILE_IDS: TileId[] = Array.from({ length: BOARD_SIZE }, (_, index) => index + 1);
