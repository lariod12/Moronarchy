import { createRequire } from "node:module";
import { createMoronarchyGameConfig } from "@moronarchy/core";

const require = createRequire(import.meta.url);
const { INVALID_MOVE } = require("boardgame.io/core") as { INVALID_MOVE: "INVALID_MOVE" };

export const MoronarchyGame = createMoronarchyGameConfig(INVALID_MOVE);
