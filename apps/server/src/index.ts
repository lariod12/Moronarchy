import { randomUUID } from "node:crypto";
import { networkInterfaces } from "node:os";
import { createMoronarchyServer } from "./create-server.js";
import { TEST_SCENARIOS_ENV } from "./game.js";
import { createRoomCodeGenerator } from "./room-code.js";

const port = Number.parseInt(process.env.PORT ?? "8000", 10);
const ABSENT_TIMEOUT_ENV = "MORONARCHY_ABSENT_TIMEOUT_MS";
const DEFAULT_ABSENT_TIMEOUT_MS = 30_000;
const parsedAbsentTimeout = Number.parseInt(process.env[ABSENT_TIMEOUT_ENV] ?? "", 10);
const absentTimeoutMs = parsedAbsentTimeout > 0 ? parsedAbsentTimeout : DEFAULT_ABSENT_TIMEOUT_MS;
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

const { server } = createMoronarchyServer({
  origins: allowedOrigins,
  absentTimeoutMs,
  getPort: () => port,
  // boardgame.io uses `uuid` for match ids (our short room codes) and, unless overridden, for player credentials too.
  uuid: () => {
    const code = nextRoomCode();
    issuedRoomCodes.add(code);
    return code;
  },
  generateCredentials: () => randomUUID(),
  log: (message) => console.log(message)
});

void server.run(port, () => {
  console.log(`Moronarchy multiplayer server listening on http://localhost:${port}`);
  console.log(`Allowed web origins: ${allowedOrigins.join(", ")}`);
  console.log(`Players disconnected for ${absentTimeoutMs} ms while the game waits on them are removed (${ABSENT_TIMEOUT_ENV}).`);
  if (process.env[TEST_SCENARIOS_ENV] === "1") {
    console.warn(`WARNING: ${TEST_SCENARIOS_ENV}=1, rooms with rigged test scenarios can be created. Never run this in production.`);
  }
});
