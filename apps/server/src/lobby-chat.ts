import { createServer, type IncomingMessage } from "node:http";
import { WebSocket, WebSocketServer } from "ws";

const MAX_CHAT_MESSAGES = 50;
const MAX_CHAT_TEXT_LENGTH = 120;
const MAX_PLAYER_NAME_LENGTH = 18;
const SPEECH_DURATION_MS = 3000;

export interface LobbyChatMessage {
  id: string;
  matchID: string;
  playerID: string;
  playerName: string;
  text: string;
  createdAt: number;
}

interface LobbyClient {
  socket: WebSocket;
  matchID?: string;
}

interface LobbyRoomState {
  clients: Set<LobbyClient>;
  messages: LobbyChatMessage[];
  speechByPlayer: Record<string, string>;
  readyByPlayer: Record<string, boolean>;
}

type ClientMessage =
  | {
      type: "join";
      matchID: string;
      playerID: string;
      playerName: string;
    }
  | {
      type: "message";
      matchID: string;
      playerID: string;
      playerName: string;
      text: string;
    }
  | {
      type: "ready";
      matchID: string;
      playerID: string;
      playerName: string;
      isReady: boolean;
    }
  | {
      type: "start";
      matchID: string;
      playerID: string;
      playerName: string;
    };

export interface LobbyChatServerOptions {
  port: number;
  allowedOrigins: string[];
}

const rooms = new Map<string, LobbyRoomState>();

export const pickStartingPlayerId = (
  readyByPlayer: Record<string, boolean>,
  random = Math.random
): string => {
  const eligiblePlayerIds = ["0", ...Object.keys(readyByPlayer).filter((playerID) => readyByPlayer[playerID])]
    .filter((playerID, index, playerIds) => playerIds.indexOf(playerID) === index)
    .sort((left, right) => Number(left) - Number(right));
  const selectedIndex = Math.floor(random() * eligiblePlayerIds.length);
  return eligiblePlayerIds[selectedIndex] ?? "0";
};

export const sanitizeChatText = (value: unknown, maxLength = MAX_CHAT_TEXT_LENGTH): string => {
  if (typeof value !== "string") return "";

  return Array.from(value)
    .map((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127 ? character : " ";
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
};

const getRoomState = (matchID: string): LobbyRoomState => {
  const existingRoom = rooms.get(matchID);
  if (existingRoom) return existingRoom;

  const room: LobbyRoomState = {
    clients: new Set(),
    messages: [],
    speechByPlayer: {},
    readyByPlayer: {}
  };
  rooms.set(matchID, room);
  return room;
};

const sendJson = (socket: WebSocket, payload: unknown): void => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
};

const broadcastRoom = (room: LobbyRoomState, payload: unknown): void => {
  for (const client of room.clients) {
    sendJson(client.socket, payload);
  }
};

const parseClientMessage = (raw: Buffer): ClientMessage | null => {
  try {
    const parsed = JSON.parse(raw.toString()) as Partial<ClientMessage>;
    if (
      parsed.type === "join"
      || parsed.type === "message"
      || parsed.type === "ready"
      || parsed.type === "start"
    ) {
      return parsed as ClientMessage;
    }
  } catch {
    return null;
  }

  return null;
};

const isAllowedRequest = (request: IncomingMessage, allowedOrigins: string[]): boolean => {
  const origin = request.headers.origin;
  if (!origin) return true;

  return allowedOrigins.includes(origin);
};

export const createLobbyChatServer = ({ port, allowedOrigins }: LobbyChatServerOptions): void => {
  const httpServer = createServer();
  const webSocketServer = new WebSocketServer({
    noServer: true,
    path: "/lobby-chat"
  });

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.url?.split("?")[0] !== "/lobby-chat" || !isAllowedRequest(request, allowedOrigins)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    webSocketServer.handleUpgrade(request, socket, head, (clientSocket) => {
      webSocketServer.emit("connection", clientSocket, request);
    });
  });

  webSocketServer.on("connection", (socket) => {
    const client: LobbyClient = { socket };

    socket.on("message", (raw) => {
      const payload = parseClientMessage(raw as Buffer);
      if (!payload) return;

      const matchID = sanitizeChatText(payload.matchID, 64);
      const playerID = sanitizeChatText(payload.playerID, 12);
      const playerName = sanitizeChatText(payload.playerName, MAX_PLAYER_NAME_LENGTH) || `Player ${Number(playerID) + 1}`;
      if (!matchID || !playerID) return;

      const room = getRoomState(matchID);
      if (payload.type === "join") {
        client.matchID = matchID;
        room.clients.add(client);
        sendJson(socket, {
          type: "snapshot",
          messages: room.messages,
          speechByPlayer: room.speechByPlayer,
          readyByPlayer: room.readyByPlayer
        });
        return;
      }

      if (payload.type === "ready") {
        const readyByPlayer = { ...room.readyByPlayer };
        if (payload.isReady) {
          readyByPlayer[playerID] = true;
        } else {
          delete readyByPlayer[playerID];
        }

        room.readyByPlayer = readyByPlayer;
        broadcastRoom(room, {
          type: "ready",
          readyByPlayer: room.readyByPlayer
        });
        return;
      }

      if (payload.type === "start") {
        if (playerID !== "0") return;
        const firstPlayerID = pickStartingPlayerId(room.readyByPlayer);

        broadcastRoom(room, {
          type: "start",
          firstPlayerID
        });
        return;
      }

      const text = sanitizeChatText(payload.text);
      if (!text) return;

      const message: LobbyChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        matchID,
        playerID,
        playerName,
        text,
        createdAt: Date.now()
      };

      room.messages = [...room.messages, message].slice(-MAX_CHAT_MESSAGES);
      room.speechByPlayer = {
        ...room.speechByPlayer,
        [playerID]: text
      };

      broadcastRoom(room, {
        type: "message",
        message,
        speechByPlayer: room.speechByPlayer
      });

      setTimeout(() => {
        const currentRoom = rooms.get(matchID);
        if (!currentRoom || currentRoom.speechByPlayer[playerID] !== text) return;

        const speechByPlayer = { ...currentRoom.speechByPlayer };
        delete speechByPlayer[playerID];
        currentRoom.speechByPlayer = speechByPlayer;
        broadcastRoom(currentRoom, {
          type: "speech",
          speechByPlayer: currentRoom.speechByPlayer
        });
      }, SPEECH_DURATION_MS);
    });

    socket.on("close", () => {
      if (!client.matchID) return;

      const room = rooms.get(client.matchID);
      room?.clients.delete(client);
      if (room && room.clients.size === 0 && room.messages.length === 0) {
        rooms.delete(client.matchID);
      }
    });
  });

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Moronarchy lobby chat websocket listening on ws://localhost:${port}/lobby-chat`);
  });
};
