import type { TileId } from "@moronarchy/core";

export interface TileGridPosition {
  gridColumn: number;
  gridRow: number;
}

export const getTileGridPosition = (tileId: TileId): TileGridPosition => {
  if (tileId === 1) return { gridColumn: 11, gridRow: 1 };
  if (tileId >= 2 && tileId <= 10) return { gridColumn: 11, gridRow: tileId };
  if (tileId === 11) return { gridColumn: 11, gridRow: 11 };
  if (tileId >= 12 && tileId <= 21) return { gridColumn: 22 - tileId, gridRow: 11 };
  if (tileId >= 22 && tileId <= 30) return { gridColumn: 1, gridRow: 32 - tileId };
  if (tileId >= 31 && tileId <= 40) return { gridColumn: tileId - 30, gridRow: 1 };
  return { gridColumn: 1, gridRow: 1 };
};
