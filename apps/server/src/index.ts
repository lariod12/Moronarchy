import { createRequire } from "node:module";
import { MoronarchyGame } from "./game.js";
import { applyLobbySecurity } from "./security.js";

const require = createRequire(import.meta.url);
const { Server } = require("boardgame.io/server") as {
  Server: (config: { games: unknown[]; origins?: string[] }) => {
    app: unknown;
    db: unknown;
    run: (port: number, callback?: () => void) => void;
  };
};

const port = Number.parseInt(process.env.PORT ?? "8000", 10);
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const server = Server({
  games: [MoronarchyGame],
  origins: allowedOrigins
});

applyLobbySecurity(server.app as Parameters<typeof applyLobbySecurity>[0], server.db as Parameters<typeof applyLobbySecurity>[1]);

server.run(port, () => {
  console.log(`Moronarchy multiplayer server listening on http://localhost:${port}`);
});
