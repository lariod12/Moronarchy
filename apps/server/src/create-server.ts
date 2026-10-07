import { createRequire } from "node:module";
import { startAbsentReferee } from "./absent-referee.js";
import type { AbsentReferee } from "./absent-referee.js";
import { installDbHooks } from "./db-hooks.js";
import { createForfeitSender } from "./forfeit-client.js";
import { MoronarchyGame } from "./game.js";
import { createPresenceTracker } from "./presence.js";
import { applyLobbySecurity } from "./security.js";

const require = createRequire(import.meta.url);
const { Server } = require("boardgame.io/server") as {
  Server: (config: {
    games: unknown[];
    origins?: string[];
    uuid?: () => string;
    generateCredentials?: () => string;
  }) => {
    app: unknown;
    db: unknown;
    // boardgame.io's SocketIO transport; `clientInfo` (protected in its typings) maps every live socket to its player.
    transport: unknown;
    run: (port: number, callback?: () => void) => Promise<{ appServer: { address: () => unknown; close: () => void } }>;
  };
};

export interface MoronarchyServerOptions {
  origins: string[];
  // Disconnected this long while the game waits on them: the player is removed from the game.
  absentTimeoutMs: number;
  // The port the server listens on (the absent referee connects back to it), read when a player has to be removed.
  getPort: () => number;
  uuid?: () => string;
  generateCredentials?: () => string;
  log?: (message: string) => void;
}

// The boardgame.io server plus everything Moronarchy adds around it: lobby security, presence tracking, slot release
// and the absent-player referee.
export const createMoronarchyServer = ({ origins, absentTimeoutMs, getPort, uuid, generateCredentials, log }: MoronarchyServerOptions) => {
  const server = Server({ games: [MoronarchyGame], origins, uuid, generateCredentials });

  applyLobbySecurity(server.app as Parameters<typeof applyLobbySecurity>[0], server.db as Parameters<typeof applyLobbySecurity>[1], {
    origins
  });

  const presence = createPresenceTracker();
  installDbHooks(server.db as Parameters<typeof installDbHooks>[0], { presence });

  const liveSockets = (server.transport as { clientInfo?: Map<string, { matchID: string; playerID: string }> }).clientInfo;
  const referee: AbsentReferee = startAbsentReferee({
    db: server.db as Parameters<typeof startAbsentReferee>[0]["db"],
    presence,
    timeoutMs: absentTimeoutMs,
    intervalMs: Math.min(2000, Math.max(100, Math.floor(absentTimeoutMs / 4))),
    forfeit: async (matchID, playerID, credentials) => {
      await createForfeitSender({ game: MoronarchyGame, port: getPort() })(matchID, playerID, credentials);
      log?.(`Forfeited ${playerID} in ${matchID} (absent)`);
    },
    isSocketConnected: (matchID, playerID) =>
      [...(liveSockets?.values() ?? [])].some((client) => client.matchID === matchID && client.playerID === playerID),
    onError: (error, matchID, playerID) => console.error(`Could not forfeit ${playerID} in ${matchID}:`, error)
  });

  return { server, presence, referee };
};
