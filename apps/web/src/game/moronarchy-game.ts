import { INVALID_MOVE } from "boardgame.io/core";
import type { Game } from "boardgame.io";
import { createMoronarchyGameConfig, type MoronarchyState } from "@moronarchy/core";

export const MoronarchyGame = createMoronarchyGameConfig(INVALID_MOVE as "INVALID_MOVE") as Game<MoronarchyState>;
