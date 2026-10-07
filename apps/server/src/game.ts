import { createRequire } from "node:module";
import { createMoronarchyMatchGame } from "@moronarchy/core/match";

const require = createRequire(import.meta.url);
const { INVALID_MOVE } = require("boardgame.io/core") as { INVALID_MOVE: "INVALID_MOVE" };

// Test scenarios (rigged rooms for the e2e suite) exist only when the server is started with this switch, which only
// playwright.config.ts sets. Never set it in production: without it any room created with a scenario is refused.
export const TEST_SCENARIOS_ENV = "MORONARCHY_ENABLE_TEST_SCENARIOS";

export const MoronarchyGame = createMoronarchyMatchGame(INVALID_MOVE, { allowScenarios: process.env[TEST_SCENARIOS_ENV] === "1" });
