import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { networkInterfaces } from "node:os";
import { MoronarchyGame } from "./game.js";
import { createRoomCodeGenerator } from "./room-code.js";
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
    run: (port: number, callback?: () => void) => void;
  };
};

const port = Number.parseInt(process.env.PORT ?? "8000", 10);
const webPort = process.env.WEB_PORT ?? "5173";
const getLanOrigins = (): string[] => {
  return Object.values(networkInterfaces())
    .flatMap((items) => items ?? [])
    .filter((item) => item.family === "IPv4" && !item.internal)
    .map((item) => `http://${item.address}:${webPort}`);
};
const defaultOrigins = [
  `http://localhost:${webPort}`,
  `http://127.0.0.1:${webPort}`,
  ...getLanOrigins()
];
const allowedOrigins = [...new Set((process.env.ALLOWED_ORIGINS?.split(",") ?? defaultOrigins)
  .map((origin) => origin.trim())
  .filter(Boolean))];

// Rooms live in memory only, so a process-local set is enough to keep issued room codes unique.
const issuedRoomCodes = new Set<string>();
const nextRoomCode = createRoomCodeGenerator(Math.random, (code) => issuedRoomCodes.has(code));

const server = Server({
  games: [MoronarchyGame],
  origins: allowedOrigins,
  // boardgame.io uses `uuid` for match ids (our short room codes) and, unless overridden, for player credentials too.
  uuid: () => {
    const code = nextRoomCode();
    issuedRoomCodes.add(code);
    return code;
  },
  generateCredentials: () => randomUUID()
});

applyLobbySecurity(server.app as Parameters<typeof applyLobbySecurity>[0], server.db as Parameters<typeof applyLobbySecurity>[1], {
  origins: allowedOrigins
});

server.run(port, () => {
  console.log(`Moronarchy multiplayer server listening on http://localhost:${port}`);
  console.log(`Allowed web origins: ${allowedOrigins.join(", ")}`);
});
