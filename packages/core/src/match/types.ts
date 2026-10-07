import type { CommandError, GameState, PlayerId } from "../model/types";
import type { MatchScenario } from "./scenarios";

export const MATCH_SEATS = 6;
export const MAX_CHAT_MESSAGES = 50;

export interface LobbySeat {
  playerId: PlayerId;
  name: string;
  ready: boolean;
}

export interface ChatMessage {
  seq: number;
  playerId: PlayerId;
  name: string;
  text: string;
}

export type MatchStage = "lobby" | "playing" | "finished";

export interface MatchState {
  stage: MatchStage;
  hostId: PlayerId | null; // lowest seated playerId when null/left
  seats: LobbySeat[]; // kept sorted by Number(playerId)
  chat: ChatMessage[]; // last 50, newest last
  chatSeq: number;
  game: GameState | null;
  gamesPlayed: number;
  // Test-only: rigs every game of this room (see match/scenarios.ts). Null in real rooms.
  scenario: MatchScenario | null;
}

export type MatchError =
  | "WRONG_STAGE"
  | "NOT_SEATED"
  | "ALREADY_SEATED"
  | "NOT_HOST"
  | "NOT_READY"
  | "TOO_FEW_PLAYERS"
  | "INVALID_ARGUMENT"
  | "EMPTY_TEXT";

export type MatchResult = { ok: true } | { ok: false; error: MatchError | CommandError };

export type StartBlockedReason = "NOT_HOST" | "TOO_FEW_PLAYERS" | "NOT_READY";

export interface LobbyView {
  isSeated: boolean;
  isHost: boolean;
  isReady: boolean;
  canStart: boolean; // host, >= 2 seats, every non-host seat ready
  startBlockedReason: StartBlockedReason | null;
}
