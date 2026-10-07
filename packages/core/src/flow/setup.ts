import {
  KING_START_ATTACK,
  KING_START_COIN,
  KING_START_DEFENSE,
  KING_START_HEALTH,
  KING_START_LUCKY,
  MAX_PLAYERS,
  MIN_PLAYERS,
  START_TILE
} from "../content/balance";
import type { GameState, King, PlayerId } from "../model/types";
import { createEmptyPlots } from "../rules/board";
import { pushLog } from "../rules/log";
import { shuffle } from "../rules/rng";
import type { Rng } from "../rules/rng";
import { beginTurn, createTurnState } from "./turn";

export const createKing = (id: PlayerId, name: string): King => ({
  id,
  name,
  coin: KING_START_COIN,
  health: KING_START_HEALTH,
  maxHealth: KING_START_HEALTH,
  attack: KING_START_ATTACK,
  defense: KING_START_DEFENSE,
  lucky: KING_START_LUCKY,
  level: 1,
  position: START_TILE,
  laps: 0,
  eliminated: false,
  eliminatedRound: null,
  eliminationReason: null,
  skipNextTurn: false,
  items: {},
  recruited: 0
});

export const createGame = (players: { id: PlayerId; name: string }[], rng: Rng): GameState => {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(`Moronarchy needs ${MIN_PLAYERS}-${MAX_PLAYERS} players`);
  }
  const ids = players.map((player) => player.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Player ids must be unique");
  }
  const turnOrder = shuffle(rng, ids);
  const kings: Record<PlayerId, King> = {};
  for (const player of players) {
    kings[player.id] = createKing(player.id, player.name);
  }
  const state: GameState = {
    phase: "playing",
    round: 1,
    turnOrder,
    kings,
    plots: createEmptyPlots(),
    residents: {},
    turn: createTurnState(turnOrder[0] as PlayerId),
    pending: null,
    fight: null,
    lastFight: null,
    activeGlobalEvents: [],
    eventHistory: [],
    eliminationOrder: [],
    winnerId: null,
    seq: 0,
    log: []
  };
  pushLog(state, "gameStarted", null, { players: players.length });
  beginTurn(state, turnOrder[0] as PlayerId, rng);
  return state;
};
