import type { LandEconomy } from "./types";

export const BOARD_SIZE = 40;
export const START_TILE_ID = 1;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const STARTING_HEALTH = 100;
export const STARTING_COIN = 200;
export const START_BONUS = 50;
export const MAX_KING_LEVEL = 3;
export const MAX_LAND_LEVEL = 3;
export const MAX_ROUNDS = 30 as const;

export const LAND_ECONOMY_BY_SEGMENT: readonly LandEconomy[] = [
  { price: 50, rents: [10, 20, 35], upgradeCosts: [40, 60] },
  { price: 70, rents: [14, 28, 49], upgradeCosts: [56, 84] },
  { price: 90, rents: [18, 36, 63], upgradeCosts: [72, 108] },
  { price: 110, rents: [22, 44, 77], upgradeCosts: [88, 132] }
];
