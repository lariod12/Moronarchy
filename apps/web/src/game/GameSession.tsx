import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { GameState, PlayerId } from "@moronarchy/core/engine";
import { createCanRun, createGameActions, createRunCheck } from "./game-actions";
import type { CanRun, GameActions, RunCheck, SendMove } from "./game-actions";
import { MovementProvider } from "./MovementContext";

export interface GameSessionValue {
  game: GameState;
  viewerId: PlayerId;
  roomCode: string;
  // Unique per match run: popups already shown are remembered under this id.
  gameId: string;
  actions: GameActions;
  canRun: CanRun;
  // Like canRun, but says why the engine would refuse (for hints on disabled buttons).
  check: RunCheck;
  // Gives the seat back and goes to Welcome (the Lose face offers it). Absent where there is no room to leave.
  leaveRoom?: () => void;
  // False while this client's own connection is down.
  selfConnected: boolean;
  // Kings the server reports as disconnected.
  offlineIds: ReadonlySet<PlayerId>;
}

const GameSessionContext = createContext<GameSessionValue | null>(null);

export interface GameSessionProviderProps {
  game: GameState;
  viewerId: PlayerId;
  roomCode: string;
  gameId?: string;
  send: SendMove;
  onLeave?: () => void;
  selfConnected?: boolean;
  offlinePlayerIds?: readonly PlayerId[];
  moveStepMs?: number;
  children: ReactNode;
}

export const GameSessionProvider = ({ game, viewerId, roomCode, gameId, send, onLeave, selfConnected = true, offlinePlayerIds = [], moveStepMs, children }: GameSessionProviderProps) => {
  const actions = useMemo(() => createGameActions(send), [send]);
  const canRun = useMemo(() => createCanRun(game, viewerId), [game, viewerId]);
  const check = useMemo(() => createRunCheck(game, viewerId), [game, viewerId]);
  const offlineKey = [...offlinePlayerIds].sort().join(",");
  // The key stands for the list: a new array with the same ids keeps the same set.
  const offlineIds = useMemo<ReadonlySet<PlayerId>>(() => new Set(offlineKey === "" ? [] : offlineKey.split(",")), [offlineKey]);
  const value = useMemo<GameSessionValue>(
    () => ({ game, viewerId, roomCode, gameId: gameId ?? roomCode, actions, canRun, check, leaveRoom: onLeave, selfConnected, offlineIds }),
    [game, viewerId, roomCode, gameId, actions, canRun, check, onLeave, selfConnected, offlineIds]
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
