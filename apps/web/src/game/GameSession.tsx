import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { GameState, PlayerId } from "@moronarchy/core/engine";
import { createCanRun, createGameActions } from "./game-actions";
import type { CanRun, GameActions, SendMove } from "./game-actions";
import { MovementProvider } from "./MovementContext";

export interface GameSessionValue {
  game: GameState;
  viewerId: PlayerId;
  roomCode: string;
  // Unique per match run: popups already shown are remembered under this id.
  gameId: string;
  actions: GameActions;
  canRun: CanRun;
}

const GameSessionContext = createContext<GameSessionValue | null>(null);

export interface GameSessionProviderProps {
  game: GameState;
  viewerId: PlayerId;
  roomCode: string;
  gameId?: string;
  send: SendMove;
  moveStepMs?: number;
  children: ReactNode;
}

export const GameSessionProvider = ({ game, viewerId, roomCode, gameId, send, moveStepMs, children }: GameSessionProviderProps) => {
  const actions = useMemo(() => createGameActions(send), [send]);
  const canRun = useMemo(() => createCanRun(game, viewerId), [game, viewerId]);
  const value = useMemo<GameSessionValue>(
    () => ({ game, viewerId, roomCode, gameId: gameId ?? roomCode, actions, canRun }),
    [game, viewerId, roomCode, gameId, actions, canRun]
  );
  return (
    <GameSessionContext.Provider value={value}>
      <MovementProvider game={game} stepMs={moveStepMs}>
        {children}
      </MovementProvider>
    </GameSessionContext.Provider>
  );
};

export const useGameSession = (): GameSessionValue => {
  const value = useContext(GameSessionContext);
  if (!value) {
    throw new Error("useGameSession must be used inside a GameSessionProvider");
  }
  return value;
};

export const useGameActions = (): GameActions & { canRun: CanRun } => {
  const { actions, canRun } = useGameSession();
  return useMemo(() => ({ ...actions, canRun }), [actions, canRun]);
};
