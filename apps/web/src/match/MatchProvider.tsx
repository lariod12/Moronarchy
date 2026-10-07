import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Client } from "boardgame.io/client";
import { SocketIO } from "boardgame.io/multiplayer";
import type { MatchState } from "@moronarchy/core/match";
import { GAME_SERVER_URL } from "../api/lobby";
import type { PlayerSession } from "../api/lobby";
import { MatchGame } from "./match-game";

export interface MatchPlayer {
  id: string;
  name?: string;
  isConnected?: boolean;
}

export interface MatchContextValue {
  state: MatchState | null;
  playerID: string;
  matchID: string;
  roomCode: string;
  // Seat presence as the server reports it (`isConnected` is undefined until a player has connected once).
  players: MatchPlayer[];
  // Whether this client's own socket is up; false while the page is reconnecting.
  selfConnected: boolean;
  // True once this viewer had a seat and lost it (host kicked them).
  kicked: boolean;
  send: (move: string, ...args: unknown[]) => void;
  // Where Quit goes. Online it is Welcome ("/"); the solo mode sends the player back to its setup screen.
  leaveTo?: string;
}

interface Snapshot {
  state: MatchState | null;
  players: MatchPlayer[];
  selfConnected: boolean;
}

const EMPTY_SNAPSHOT: Snapshot = { state: null, players: [], selfConnected: false };

export const MatchContext = createContext<MatchContextValue | null>(null);

type MatchClient = ReturnType<typeof createMatchClient>;

const createMatchClient = (session: PlayerSession) =>
  Client({
    game: MatchGame as unknown as Parameters<typeof Client>[0]["game"],
    multiplayer: SocketIO({ server: GAME_SERVER_URL }),
    matchID: session.matchID,
    playerID: session.playerID,
    credentials: session.credentials,
    debug: false
  });

export interface MatchProviderProps {
  session: PlayerSession;
  children: ReactNode;
}

export const MatchProvider = ({ session, children }: MatchProviderProps) => {
  const { matchID, playerID, credentials, playerName } = session;
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT);
  const [kicked, setKicked] = useState(false);
  const clientRef = useRef<MatchClient | null>(null);
  const sitSentRef = useRef(false);
  const wasSeatedRef = useRef(false);

  useEffect(() => {
    const client = createMatchClient({ matchID, playerID, credentials, playerName });
    clientRef.current = client;
    sitSentRef.current = false;
    wasSeatedRef.current = false;
    const unsubscribe = client.subscribe((clientState) => {
      setSnapshot({
        state: clientState ? (clientState.G as MatchState) : null,
        players: (client.matchData ?? []).map((player) => ({
          id: String(player.id),
          name: player.name,
          isConnected: player.isConnected
        })),
        selfConnected: clientState?.isConnected ?? false
      });
    });
    client.start();
    return () => {
      unsubscribe();
      client.stop();
      clientRef.current = null;
    };
  }, [matchID, playerID, credentials, playerName]);

  const { state } = snapshot;
  useEffect(() => {
    if (!state) {
      return;
    }
    if (state.seats.some((seat) => seat.playerId === playerID)) {
      wasSeatedRef.current = true;
      return;
    }
    if (state.stage !== "lobby") {
      return;
    }
    if (wasSeatedRef.current) {
      setKicked(true);
      return;
    }
    // First sync of a freshly joined room: take the seat that the lobby API reserved for us.
    if (!sitSentRef.current) {
      sitSentRef.current = true;
      clientRef.current?.moves.sit?.(playerName);
    }
  }, [state, playerID, playerName]);

  const send = useCallback((move: string, ...args: unknown[]) => {
    clientRef.current?.moves[move]?.(...args);
  }, []);

  const value = useMemo<MatchContextValue>(
    () => ({
      state: snapshot.state,
      playerID,
      matchID,
      roomCode: matchID,
      players: snapshot.players,
      selfConnected: snapshot.selfConnected,
      kicked,
      send
    }),
    [snapshot, playerID, matchID, kicked, send]
  );

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
};

export const useMatch = (): MatchContextValue => {
  const value = useContext(MatchContext);
  if (!value) {
    throw new Error("useMatch must be used inside a MatchProvider");
  }
  return value;
};
