import type { Rng } from "../rules/rng";
import { GAME_COMMAND_NAMES, runGameCommand } from "./commands";
import type { GameCommandName } from "./commands";
import { createMatchState, kickSeat, leaveSeat, returnToLobby, sendChat, setReady, sit, startGame } from "./lobby";
import { isMatchScenario, readScenario } from "./scenarios";
import { MATCH_SEATS } from "./types";
import type { MatchResult, MatchState } from "./types";

// Structural subset of boardgame.io's random plugin API (core never imports boardgame.io).
export interface BoardgameRandom {
  D6: () => number;
  Number: () => number;
}

export interface MoveRuntime {
  G: MatchState;
  playerID?: string;
  random: BoardgameRandom;
}

// What other clients see instead of a king's unrevealed fight roll: enough to know that they rolled.
export const HIDDEN_ROLL = 0;

// The match as one client may see it: in a running fight every other king's submitted roll is replaced by
// HIDDEN_ROLL, so nobody can peek at a roll before making their own (or retreating). Never mutates `G`.
export const maskMatchFor = (G: MatchState, playerID: string | null | undefined): MatchState => {
  const fight = G.game?.fight;
  if (!G.game || !fight || Object.keys(fight.pendingRolls).length === 0) {
    return G;
  }
  const pendingRolls: typeof fight.pendingRolls = {};
  for (const [id, value] of Object.entries(fight.pendingRolls)) {
    pendingRolls[id] = id === playerID ? value : HIDDEN_ROLL;
  }
  return { ...G, game: { ...G.game, fight: { ...fight, pendingRolls } } };
};

export const toRng = (random: BoardgameRandom): Rng => ({ d6: () => random.D6(), next: () => random.Number() });

export interface MatchGameOptions {
  // Lets rooms be created with a test scenario in their setupData. Only the e2e server turns this on.
  allowScenarios?: boolean;
}

// boardgame.io silently drops a move whose stateID is stale, i.e. when anyone else moved after this client last synced.
// These moves are routinely sent by several players at once (lobby, both duelists rolling, the plot owner answering,
// the server forfeiting an absent player), and each is re-validated against the current state by the lobby/engine, so
// they must not be dropped. Coin-spending moves of the turn player keep the check: it also stops double-tap repeats.
export const CONCURRENT_MOVES: ReadonlySet<string> = new Set([
  "sit",
  "leaveSeat",
  "setReady",
  "sendChat",
  "kickSeat",
  "startGame",
  "returnToLobby",
  "fightRoll",
  "retreat",
  "useItem",
  "collectFee",
  "payFee",
  "attack",
  "forfeit"
]);

export const createMoronarchyMatchGame = <TInvalid>(invalidMove: TInvalid, { allowScenarios = false }: MatchGameOptions = {}) => {
  const wrap =
    (run: (G: MatchState, playerID: string, rng: Rng, args: unknown[]) => MatchResult) =>
    ({ G, playerID, random }: MoveRuntime, ...args: unknown[]): TInvalid | void => {
      if (typeof playerID !== "string") {
        return invalidMove;
      }
      const result = run(G, playerID, toRng(random), args);
      if (!result.ok) {
        return invalidMove;
      }
    };

  const lobbyMoves = {
    sit: wrap((G, id, _rng, [name]) => sit(G, id, name)),
    leaveSeat: wrap((G, id) => leaveSeat(G, id)),
    setReady: wrap((G, id, _rng, [ready]) => setReady(G, id, ready)),
    sendChat: wrap((G, id, _rng, [text]) => sendChat(G, id, text)),
    kickSeat: wrap((G, id, _rng, [targetId]) => kickSeat(G, id, targetId)),
    startGame: wrap((G, id, rng) => startGame(G, id, rng)),
    returnToLobby: wrap((G, id) => returnToLobby(G, id))
  };

  const gameMoves = {} as Record<GameCommandName, ReturnType<typeof wrap>>;
  for (const name of GAME_COMMAND_NAMES) {
    gameMoves[name] = wrap((G, id, rng, args) => runGameCommand(G, id, rng, name, args));
  }

  const moves: Record<string, { move: ReturnType<typeof wrap>; client: false; ignoreStaleStateID?: true }> = {};
  for (const [name, move] of Object.entries({ ...lobbyMoves, ...gameMoves })) {
    moves[name] = CONCURRENT_MOVES.has(name)
      ? { move, client: false, ignoreStaleStateID: true }
      : { move, client: false };
  }

  return {
    name: "moronarchy",
    minPlayers: 2,
    maxPlayers: 6,
    validateSetupData: (setupData: unknown, numPlayers: number): string | undefined => {
      if (numPlayers !== MATCH_SEATS) {
        return "Moronarchy rooms always have 6 seats.";
      }
      if (typeof setupData === "object" && setupData !== null && "scenario" in setupData) {
        if (!allowScenarios) {
          return "Test scenarios are disabled.";
        }
        if (!isMatchScenario((setupData as { scenario?: unknown }).scenario)) {
          return "Unknown test scenario.";
        }
      }
      return undefined;
    },
    setup: (_ctx?: unknown, setupData?: unknown): MatchState => createMatchState(allowScenarios ? readScenario(setupData) : null),
    // One long boardgame.io turn: every connected player may submit moves; engine and lobby validate the actor.
    turn: { activePlayers: { all: null } },
    playerView: ({ G, playerID }: { G: MatchState; playerID?: string | null }): MatchState => maskMatchFor(G, playerID),
    moves
  };
};
