import type { Rng } from "../rules/rng";
import { GAME_COMMAND_NAMES, runGameCommand } from "./commands";
import type { GameCommandName } from "./commands";
import { createMatchState, kickSeat, leaveSeat, returnToLobby, sendChat, setReady, sit, startGame } from "./lobby";
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

export const toRng = (random: BoardgameRandom): Rng => ({ d6: () => random.D6(), next: () => random.Number() });

export const createMoronarchyMatchGame = <TInvalid>(invalidMove: TInvalid) => {
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

  const moves: Record<string, { move: ReturnType<typeof wrap>; client: false }> = {};
  for (const [name, move] of Object.entries({ ...lobbyMoves, ...gameMoves })) {
    moves[name] = { move, client: false };
  }

  return {
    name: "moronarchy",
    minPlayers: 2,
    maxPlayers: 6,
    validateSetupData: (_setupData: unknown, numPlayers: number): string | undefined =>
      numPlayers === MATCH_SEATS ? undefined : "Moronarchy rooms always have 6 seats.",
    setup: (): MatchState => createMatchState(),
    // One long boardgame.io turn: every connected player may submit moves; engine and lobby validate the actor.
    turn: { activePlayers: { all: null } },
    moves
  };
};
