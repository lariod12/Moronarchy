import { createGame } from "../flow/setup";
import type { PlayerId } from "../model/types";
import type { Rng } from "../rules/rng";
import { sanitizeChatText, sanitizePlayerName } from "./sanitize";
import { MAX_CHAT_MESSAGES } from "./types";
import type { LobbySeat, MatchError, MatchResult, MatchState } from "./types";

const OK: MatchResult = { ok: true };
const fail = (error: MatchError): MatchResult => ({ ok: false, error });

const findSeat = (state: MatchState, playerId: PlayerId): LobbySeat | undefined =>
  state.seats.find((seat) => seat.playerId === playerId);

const sortSeats = (state: MatchState): void => {
  state.seats.sort((a, b) => Number(a.playerId) - Number(b.playerId));
};

const removeSeat = (state: MatchState, playerId: PlayerId): void => {
  state.seats = state.seats.filter((seat) => seat.playerId !== playerId);
  if (state.hostId === playerId) {
    state.hostId = state.seats[0]?.playerId ?? null;
  }
};

export const createMatchState = (): MatchState => ({
  stage: "lobby",
  hostId: null,
  seats: [],
  chat: [],
  chatSeq: 0,
  game: null,
  gamesPlayed: 0
});

export const sit = (state: MatchState, actorId: PlayerId, name: unknown): MatchResult => {
  if (state.stage !== "lobby") {
    return fail("WRONG_STAGE");
  }
  if (findSeat(state, actorId)) {
    return fail("ALREADY_SEATED");
  }
  const cleanName = sanitizePlayerName(name);
  if (!cleanName) {
    return fail("INVALID_ARGUMENT");
  }
  state.seats.push({ playerId: actorId, name: cleanName, ready: false });
  sortSeats(state);
  if (state.hostId === null) {
    state.hostId = actorId;
  }
  return OK;
};

export const leaveSeat = (state: MatchState, actorId: PlayerId): MatchResult => {
  if (state.stage !== "lobby") {
    return fail("WRONG_STAGE");
  }
  if (!findSeat(state, actorId)) {
    return fail("NOT_SEATED");
  }
  removeSeat(state, actorId);
  return OK;
};

export const setReady = (state: MatchState, actorId: PlayerId, ready: unknown): MatchResult => {
  if (state.stage !== "lobby") {
    return fail("WRONG_STAGE");
  }
  const seat = findSeat(state, actorId);
  if (!seat) {
    return fail("NOT_SEATED");
  }
  if (typeof ready !== "boolean") {
    return fail("INVALID_ARGUMENT");
  }
  seat.ready = ready;
  return OK;
};

export const sendChat = (state: MatchState, actorId: PlayerId, text: unknown): MatchResult => {
  if (state.stage !== "lobby") {
    return fail("WRONG_STAGE");
  }
  const seat = findSeat(state, actorId);
  if (!seat) {
    return fail("NOT_SEATED");
  }
  const cleanText = sanitizeChatText(text);
  if (!cleanText) {
    return fail("EMPTY_TEXT");
  }
  state.chatSeq += 1;
  state.chat.push({ seq: state.chatSeq, playerId: actorId, name: seat.name, text: cleanText });
  if (state.chat.length > MAX_CHAT_MESSAGES) {
    state.chat = state.chat.slice(-MAX_CHAT_MESSAGES);
  }
  return OK;
};

export const kickSeat = (state: MatchState, actorId: PlayerId, targetId: unknown): MatchResult => {
  if (state.stage !== "lobby") {
    return fail("WRONG_STAGE");
  }
  if (state.hostId !== actorId || !findSeat(state, actorId)) {
    return fail("NOT_HOST");
  }
  if (typeof targetId !== "string" || targetId === actorId || !findSeat(state, targetId)) {
    return fail("INVALID_ARGUMENT");
  }
  removeSeat(state, targetId);
  return OK;
};

export const startGame = (state: MatchState, actorId: PlayerId, rng: Rng): MatchResult => {
  if (state.stage !== "lobby") {
    return fail("WRONG_STAGE");
  }
  if (state.hostId !== actorId || !findSeat(state, actorId)) {
    return fail("NOT_HOST");
  }
  if (state.seats.length < 2) {
    return fail("TOO_FEW_PLAYERS");
  }
  if (state.seats.some((seat) => seat.playerId !== state.hostId && !seat.ready)) {
    return fail("NOT_READY");
  }
  state.game = createGame(
    state.seats.map(({ playerId, name }) => ({ id: playerId, name })),
    rng
  );
  state.stage = "playing";
  return OK;
};

export const returnToLobby = (state: MatchState, actorId: PlayerId): MatchResult => {
  if (state.stage !== "finished") {
    return fail("WRONG_STAGE");
  }
  if (state.hostId !== actorId) {
    return fail("NOT_HOST");
  }
  state.stage = "lobby";
  state.game = null;
  for (const seat of state.seats) {
    seat.ready = false;
  }
  state.gamesPlayed += 1;
  return OK;
};

export const syncStage = (state: MatchState): void => {
  if (state.stage === "playing" && state.game?.phase === "finished") {
    state.stage = "finished";
  }
};
