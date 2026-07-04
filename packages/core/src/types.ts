export type PlayerId = string;
export type TileId = number;
export type TileType = "start" | "land";
export type GamePhase = "waiting" | "rolling" | "tile-action" | "game-over";
export type KingLevel = 1 | 2 | 3;
export type LandLevel = 0 | 1 | 2 | 3;

export interface PlayerState {
  id: PlayerId;
  name: string;
  health: number;
  coin: number;
  level: KingLevel;
  position: TileId;
  lapCount: number;
  defeated: boolean;
}

export interface TileState {
  id: TileId;
  type: TileType;
  ownerId: PlayerId | null;
  landLevel: LandLevel;
}

export interface DiceRollState {
  playerId: PlayerId;
  value: number;
  from: TileId;
  to: TileId;
  passedStart: boolean;
}

export interface GameLogEntry {
  id: string;
  message: string;
}

export interface MoronarchyState {
  players: PlayerState[];
  tiles: TileState[];
  currentRound: number;
  maxRounds: number;
  phase: GamePhase;
  winnerId: PlayerId | null;
  lastDiceRoll: DiceRollState | null;
  logs: GameLogEntry[];
}

export interface LandEconomy {
  price: number;
  rents: readonly [number, number, number];
  upgradeCosts: readonly [number, number];
}

export type MoveResult =
  | { ok: true; message: string }
  | { ok: false; reason: string };
