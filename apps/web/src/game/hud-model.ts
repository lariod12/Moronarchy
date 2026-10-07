import { getCrownState, getInflationMultiplier, getKingStats } from "@moronarchy/core/engine";
import type { CrownState, GameState, PlayerId } from "@moronarchy/core/engine";

export interface HudModel {
  name: string;
  health: number;
  maxHealth: number;
  coin: number;
  level: number;
  eliminated: boolean;
  crownState: CrownState;
}

export interface TopBarModel {
  round: number;
  roomCode: string;
  title?: string;
  inflation: number;
}

export const toHudModel = (game: GameState, viewerId: PlayerId): HudModel => {
  const king = game.kings[viewerId];
  if (!king) {
    throw new Error(`Unknown king ${viewerId}`);
  }
  return {
    name: king.name,
    health: king.health,
    maxHealth: getKingStats(game, viewerId).maxHealth,
    coin: king.coin,
    level: king.level,
    eliminated: king.eliminated,
    crownState: getCrownState(game, viewerId)
  };
};

export const toTopBarModel = (game: GameState, roomCode: string, title?: string): TopBarModel => ({
  round: game.round,
  roomCode,
  title,
  inflation: getInflationMultiplier(game.round)
});
