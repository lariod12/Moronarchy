import { createMatchState, createMoronarchyMatchGame, setReady, sit, startGame, syncStage } from "@moronarchy/core/match";
import type { BoardgameRandom, MatchResult, MatchState } from "@moronarchy/core/match";
import type { Rng } from "@moronarchy/core/engine";
import { getRequiredActorIds, stepBotAs } from "@moronarchy/core/testing";
import type { BotStyle } from "@moronarchy/core/testing";
import type { SoloSettings, SoloStyle } from "./solo-settings";

export const HUMAN_ID = "0";
export const SOLO_ROOM_CODE = "SOLO";

// The same move functions the server runs; an invalid move returns this sentinel and is dropped.
const INVALID = Symbol("invalid move");
const MATCH_GAME = createMoronarchyMatchGame(INVALID);

export const botName = (botId: string): string => `Bot ${botId}`;

export const getBotIds = (match: MatchState): string[] => match.seats.map((seat) => seat.playerId).filter((id) => id !== HUMAN_ID);

// "Mixed" alternates: bots 1, 3, 5 play careful and bots 2, 4 aggressive.
export const getBotStyle = (style: SoloStyle, botId: string): BotStyle =>
  style === "mixed" ? (Number(botId) % 2 === 1 ? "careful" : "aggressive") : style;

// A lobby with the human in seat 0 (host) and every bot seated and ready. `gamesPlayed` starts from the clock so that
// the popups remembered for an earlier solo game (keyed by it) never suppress the ones of this game.
export const createSoloMatch = (settings: SoloSettings): MatchState => {
  const match = createMatchState();
  match.gamesPlayed = Date.now();
  sit(match, HUMAN_ID, settings.name);
  for (let index = 1; index <= settings.bots; index += 1) {
    const id = String(index);
    sit(match, id, botName(id));
    setReady(match, id, true);
  }
  return match;
};

// Readies every bot (they all are after "Play Again" resets the seats) and starts the game as the host.
export const startSoloGame = (match: MatchState, rng: Rng): MatchResult => {
  for (const botId of getBotIds(match)) {
    setReady(match, botId, true);
  }
  return startGame(match, HUMAN_ID, rng);
};

// Runs one of the human's moves on a copy of the match; null when the match would refuse it.
export const applyHumanMove = (match: MatchState, move: string, args: unknown[], random: BoardgameRandom): MatchState | null => {
  const handler = (MATCH_GAME.moves as Record<string, { move: (runtime: { G: MatchState; playerID: string; random: BoardgameRandom }, ...args: unknown[]) => unknown } | undefined>)[move];
  if (!handler) {
    return null;
  }
  const next = structuredClone(match);
  return handler.move({ G: next, playerID: HUMAN_ID, random }, ...args) === INVALID ? null : next;
};

// One action of one bot on a copy of the match; null when the game is not waiting on that bot.
export const applyBotStep = (match: MatchState, botId: string, style: BotStyle, rng: Rng): MatchState | null => {
  if (match.stage !== "playing" || !match.game) {
    return null;
  }
  const next = structuredClone(match);
  if (!next.game || !stepBotAs(next.game, rng, style, botId)) {
    return null;
  }
  syncStage(next);
  return next;
};

// The bot the game is waiting on (the human is never played for), if any.
export const getWaitingBotId = (match: MatchState): string | undefined =>
  match.stage === "playing" && match.game ? getRequiredActorIds(match.game).find((id) => id !== HUMAN_ID) : undefined;
