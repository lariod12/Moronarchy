import { LobbyClient } from "boardgame.io/client";
import { sanitizePlayerName as sanitizeCoreName } from "@moronarchy/core/match";

export const GAME_NAME = "moronarchy";
const ROOM_PLAYER_COUNT = 6;
const getDefaultGameServerUrl = (): string => {
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:8000`;
};

export const GAME_SERVER_URL = import.meta.env.VITE_GAME_SERVER_URL ?? getDefaultGameServerUrl();

const lobbyClient = new LobbyClient({ server: GAME_SERVER_URL });

export interface PlayerSession {
  matchID: string;
  playerID: string;
  playerName: string;
  credentials: string;
}

export type LobbyErrorCode = "NOT_FOUND" | "FULL" | "STARTED" | "NETWORK";

export const describeLobbyError = (code: LobbyErrorCode): string => {
  switch (code) {
    case "NOT_FOUND":
      return "Room not found";
    case "FULL":
      return "Room is full";
    case "STARTED":
      return "Game already started";
    case "NETWORK":
      return "Cannot reach the server";
  }
};

export class LobbyError extends Error {
  readonly code: LobbyErrorCode;

  constructor(code: LobbyErrorCode) {
    super(describeLobbyError(code));
    this.name = "LobbyError";
    this.code = code;
  }
}

// The boardgame.io LobbyClient throws Error("HTTP status <n>") with the response body in `details`;
// a failed fetch (server down, CORS) throws a plain TypeError without details.
const toLobbyError = (error: unknown): LobbyError => {
  if (error instanceof LobbyError) {
    return error;
  }
  const message = error instanceof Error ? error.message : "";
  const status = Number(/^HTTP status (\d{3})$/.exec(message)?.[1]);
  if (status === 404) {
    return new LobbyError("NOT_FOUND");
  }
  if (status === 409) {
    const details = (error as { details?: unknown }).details;
    const text = typeof details === "string" ? details : JSON.stringify(details ?? "");
    return new LobbyError(/already started/i.test(text) ? "STARTED" : "FULL");
  }
  return new LobbyError("NETWORK");
};

// A blocked port (e.g. a firewall dropping packets) makes fetch hang instead of failing, which would leave the
// Welcome screen on its busy overlay forever. Give every lobby request a deadline and report it as a network error.
export const LOBBY_REQUEST_TIMEOUT_MS = 10_000;

const withTimeout = <T>(request: Promise<T>, timeoutMs = LOBBY_REQUEST_TIMEOUT_MS): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new LobbyError("NETWORK")), timeoutMs);
    request.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

const sessionKey = (matchID: string): string => `moronarchy:session:${matchID}`;

export const normalizeRoomCode = (value: string): string => value.trim().toUpperCase();

// Room codes go into a URL path, so anything that is not plain letters and digits can never be a room.
const isPlausibleRoomCode = (value: string): boolean => /^[A-Z0-9]{1,12}$/.test(value);

export const sanitizePlayerName = (value: string): string => sanitizeCoreName(value) || "King";

export const savePlayerSession = (session: PlayerSession): void => {
  localStorage.setItem(sessionKey(session.matchID), JSON.stringify(session));
};

export const getPlayerSession = (matchID: string): PlayerSession | null => {
  const value = localStorage.getItem(sessionKey(matchID));
  if (!value) return null;

  try {
    return JSON.parse(value) as PlayerSession;
  } catch {
    localStorage.removeItem(sessionKey(matchID));
    return null;
  }
};

export const clearPlayerSession = (matchID: string): void => {
  localStorage.removeItem(sessionKey(matchID));
};

export const createRoom = async (playerName: string): Promise<PlayerSession> => {
  const safePlayerName = sanitizePlayerName(playerName);
  try {
    const { matchID } = await withTimeout(
      lobbyClient.createMatch(GAME_NAME, {
        numPlayers: ROOM_PLAYER_COUNT,
        unlisted: true
      })
    );

    const joinResult = await withTimeout(
      lobbyClient.joinMatch(GAME_NAME, matchID, {
        playerID: "0",
        playerName: safePlayerName
      })
    );

    const session: PlayerSession = {
      matchID,
      playerID: "0",
      playerName: safePlayerName,
      credentials: joinResult.playerCredentials
    };
    savePlayerSession(session);
    return session;
  } catch (error) {
    throw toLobbyError(error);
  }
};

export const joinRoom = async (roomCode: string, playerName: string): Promise<PlayerSession> => {
  const matchID = normalizeRoomCode(roomCode);
  if (!isPlausibleRoomCode(matchID)) {
    throw new LobbyError("NOT_FOUND");
  }
  const safePlayerName = sanitizePlayerName(playerName);
  try {
    const joinResult = await withTimeout(
      lobbyClient.joinMatch(GAME_NAME, matchID, {
        playerName: safePlayerName
      })
    );

    const session: PlayerSession = {
      matchID,
      playerID: joinResult.playerID,
      playerName: safePlayerName,
      credentials: joinResult.playerCredentials
    };
    savePlayerSession(session);
    return session;
  } catch (error) {
    throw toLobbyError(error);
  }
};

export const getRoom = async (matchID: string) => {
  return lobbyClient.getMatch(GAME_NAME, matchID);
};
