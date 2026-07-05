import { GAME_SERVER_URL } from "@/api/lobby";

export interface LobbyChatMessage {
  id: string;
  matchID: string;
  playerID: string;
  playerName: string;
  text: string;
  createdAt: number;
}

export type LobbyChatServerMessage =
  | {
      type: "snapshot";
      messages: LobbyChatMessage[];
      speechByPlayer: Record<string, string>;
      readyByPlayer: Record<string, boolean>;
    }
  | {
      type: "message";
      message: LobbyChatMessage;
      speechByPlayer: Record<string, string>;
    }
  | {
      type: "speech";
      speechByPlayer: Record<string, string>;
    }
  | {
      type: "ready";
      readyByPlayer: Record<string, boolean>;
    }
  | {
      type: "start";
      firstPlayerID: string;
    };

export const getLobbyChatUrl = (): string => {
  if (import.meta.env.VITE_LOBBY_CHAT_URL) {
    return import.meta.env.VITE_LOBBY_CHAT_URL;
  }

  const serverUrl = new URL(GAME_SERVER_URL);
  const pageHost = window.location.hostname;
  if (pageHost && pageHost !== "localhost" && serverUrl.hostname === "localhost") {
    serverUrl.hostname = pageHost;
  }

  if (pageHost && pageHost !== "127.0.0.1" && serverUrl.hostname === "127.0.0.1") {
    serverUrl.hostname = pageHost;
  }

  serverUrl.protocol = serverUrl.protocol === "https:" ? "wss:" : "ws:";
  serverUrl.port = import.meta.env.VITE_LOBBY_CHAT_PORT ?? "8001";
  serverUrl.pathname = "/lobby-chat";
  return serverUrl.toString();
};
