import { createRequire } from "node:module";
import type { MatchState } from "@moronarchy/core/match";

const require = createRequire(import.meta.url);

interface ClientState {
  G: MatchState;
}

interface NodeClient {
  start: () => void;
  stop: () => void;
  subscribe: (fn: (state: ClientState | null) => void) => () => void;
  moves: Record<string, (...args: unknown[]) => void>;
}

const { Client } = require("boardgame.io/client") as {
  Client: (config: {
    game: unknown;
    multiplayer: unknown;
    matchID: string;
    playerID: string;
    credentials: string;
  }) => NodeClient;
};
const { SocketIO } = require("boardgame.io/multiplayer") as {
  SocketIO: (config: { server: string }) => unknown;
};

export interface ForfeitSenderOptions {
  game: unknown;
  port: number;
  // Gives up (and disconnects) when the server has not confirmed the removal in this time.
  timeoutMs?: number;
}

// Removes an absent player through the normal move path: a short-lived socket client that plays as that player, with
// the credentials the server stored when they joined, and sends the `forfeit` move. The game validates it exactly like
// a move from the player's own browser; the server never edits the game state directly.
export const createForfeitSender =
  ({ game, port, timeoutMs = 5000 }: ForfeitSenderOptions) =>
  (matchID: string, playerID: string, credentials: string): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      const client = Client({
        game,
        multiplayer: SocketIO({ server: `http://127.0.0.1:${port}` }),
        matchID,
        playerID,
        credentials
      });
      let sent = false;
      let finished = false;
      let unsubscribe: () => void = () => undefined;
      const finish = (error?: Error): void => {
        if (finished) {
          return;
        }
        finished = true;
        clearTimeout(timer);
        unsubscribe();
        client.stop();
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };
      const timer = setTimeout(() => finish(new Error(`forfeit of ${playerID} in ${matchID} timed out`)), timeoutMs);

      unsubscribe = client.subscribe((state) => {
        // `state` stays null until the first sync with the server.
        if (!state || finished) {
          return;
        }
        const king = state.G.game?.kings[playerID];
        if (sent) {
          if (!king || king.eliminated) {
            finish();
          }
          return;
        }
        if (state.G.stage !== "playing" || !king || king.eliminated) {
          finish();
          return;
        }
        sent = true;
        client.moves.forfeit?.();
      });
      client.start();
    });
