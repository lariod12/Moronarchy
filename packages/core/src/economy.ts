import { LAND_ECONOMY_BY_SEGMENT, START_TILE_ID } from "./constants";
import type { LandEconomy, LandLevel, TileId } from "./types";

export const getLandSegment = (tileId: TileId): number => {
  if (tileId <= START_TILE_ID || tileId > 40) {
    throw new Error(`Tile ${tileId} is not a land tile.`);
  }

  if (tileId <= 10) return 0;
  if (tileId <= 20) return 1;
  if (tileId <= 30) return 2;
  return 3;
};

export const getLandEconomy = (tileId: TileId): LandEconomy => {
  const economy = LAND_ECONOMY_BY_SEGMENT[getLandSegment(tileId)];
  if (!economy) {
    throw new Error(`No economy configured for tile ${tileId}.`);
  }
  return economy;
};

export const getRentForLevel = (tileId: TileId, landLevel: LandLevel): number => {
  if (landLevel < 1) return 0;
  return getLandEconomy(tileId).rents[landLevel - 1] ?? 0;
};

export const getUpgradeCost = (tileId: TileId, currentLevel: LandLevel): number => {
  if (currentLevel < 1 || currentLevel >= 3) {
    return 0;
  }

  return getLandEconomy(tileId).upgradeCosts[currentLevel - 1] ?? 0;
};
