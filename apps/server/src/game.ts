import { createRequire } from "node:module";
import { createMoronarchyMatchGame } from "@moronarchy/core/match";

const require = createRequire(import.meta.url);
const { INVALID_MOVE } = require("boardgame.io/core") as { INVALID_MOVE: "INVALID_MOVE" };

export const MoronarchyGame = createMoronarchyMatchGame(INVALID_MOVE);
