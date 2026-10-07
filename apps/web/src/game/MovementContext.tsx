import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { GameState, PlayerId, TileId } from "@moronarchy/core/engine";
import { BOARD_SIZE } from "@moronarchy/core/engine";

export const MOVE_STEP_MS = 220;

export interface MovementValue {
  // True while the turn player's token is still walking along `turn.path`.
  isAnimating: boolean;
  // Where to draw a king right now: mid-walk for the turn player, the real position for everyone else.
  animatedPosition: (playerId: PlayerId) => TileId;
}

const MovementContext = createContext<MovementValue | null>(null);

const previousTile = (tileId: TileId): TileId => (tileId <= 1 ? BOARD_SIZE : tileId - 1);

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export interface MovementProviderProps {
  game: GameState;
  stepMs?: number;
  children: ReactNode;
}

// Walks the turn player's token tile by tile after a roll. Every client runs the same walk from the shared
// `turn.path`. A client that mounts (or reloads) mid-turn starts at the end of the path, so nothing replays.
export const MovementProvider = ({ game, stepMs = MOVE_STEP_MS, children }: MovementProviderProps) => {
  const { path, playerId: turnPlayerId } = game.turn;
  const turnKey = `${turnPlayerId}:${game.round}`;
  const length = path.length;
  const [progress, setProgress] = useState({ key: turnKey, shown: length });

  const reduced = prefersReducedMotion();
  const shown = reduced ? length : progress.key === turnKey ? Math.min(progress.shown, length) : 0;

  useEffect(() => {
    if (shown >= length) {
      return;
    }
    const timer = setTimeout(() => setProgress({ key: turnKey, shown: shown + 1 }), stepMs);
    return () => clearTimeout(timer);
  }, [turnKey, shown, length, stepMs]);

  const isAnimating = shown < length;

  const animatedPosition = useCallback(
    (playerId: PlayerId): TileId => {
      const king = game.kings[playerId];
      if (!king) {
        return 1;
      }
      if (playerId !== turnPlayerId || shown >= length) {
        return king.position;
      }
      const walked = shown === 0 ? undefined : path[shown - 1];
      const first = path[0];
      return walked ?? (first === undefined ? king.position : previousTile(first));
    },
    [game.kings, turnPlayerId, shown, length, path]
  );

  const value = useMemo<MovementValue>(() => ({ isAnimating, animatedPosition }), [isAnimating, animatedPosition]);

  return <MovementContext.Provider value={value}>{children}</MovementContext.Provider>;
};

export const useMovement = (): MovementValue => {
  const value = useContext(MovementContext);
  if (!value) {
    throw new Error("useMovement must be used inside a MovementProvider");
  }
  return value;
};
