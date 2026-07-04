import { LobbyClient } from "boardgame.io/client";

export const GAME_NAME = "moronarchy";
export const GAME_SERVER_URL = import.meta.env.VITE_GAME_SERVER_URL ?? "http://localhost:8000";

const lobbyClient = new LobbyClient({ server: GAME_SERVER_URL });

export interface PlayerSession {
  matchID: string;
  playerID: string;
  playerName: string;
  credentials: string;
}

const sessionKey = (matchID: string): string => `moronarchy:session:${matchID}`;

export const sanitizePlayerName = (value: string): string => {
  const withoutControlCharacters = Array.from(value)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("");

  const name = withoutControlCharacters
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18)
    .trim();

  return name || "King";
};

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

export const createRoom = async (playerName: string, numPlayers: number): Promise<PlayerSession> => {
  const safePlayerName = sanitizePlayerName(playerName);
  const { matchID } = await lobbyClient.createMatch(GAME_NAME, {
    numPlayers,
    unlisted: true
  });

  const joinResult = await lobbyClient.joinMatch(GAME_NAME, matchID, {
    playerID: "0",
    playerName: safePlayerName
  });

  const session: PlayerSession = {
    matchID,
    playerID: "0",
    playerName: safePlayerName,
    credentials: joinResult.playerCredentials
  };
  savePlayerSession(session);
  return session;
};

export const joinRoom = async (matchID: string, playerName: string): Promise<PlayerSession> => {
  const safePlayerName = sanitizePlayerName(playerName);
  const joinResult = await lobbyClient.joinMatch(GAME_NAME, matchID, {
    playerName: safePlayerName
  });

  const session: PlayerSession = {
    matchID,
    playerID: joinResult.playerID,
    playerName: safePlayerName,
    credentials: joinResult.playerCredentials
  };
  savePlayerSession(session);
  return session;
};

export const getRoom = async (matchID: string) => {
  return lobbyClient.getMatch(GAME_NAME, matchID);
};
