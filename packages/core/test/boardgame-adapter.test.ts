import { describe, expect, it } from "vitest";
import { createInitialState, createMoronarchyGameConfig, getNextAlivePlayerId } from "../src";

describe("boardgame.io adapter", () => {
  it("selects the next alive player and skips defeated players", () => {
    const state = createInitialState(["0", "1", "2"]);
    state.players[1]!.defeated = true;

    expect(
      getNextAlivePlayerId(state, {
        currentPlayer: "0",
        numPlayers: 3,
        playOrder: ["0", "1", "2"]
      })
    ).toBe("2");
  });

  it("ends a turn by targeting the next alive player", () => {
    const state = createInitialState(["0", "1", "2"]);
    state.players[1]!.defeated = true;
    const game = createMoronarchyGameConfig("INVALID_MOVE" as const);
    let nextPlayer: string | undefined;

    game.moves.endTurn({
      G: state,
      ctx: {
        currentPlayer: "0",
        numPlayers: 3,
        playOrder: ["0", "1", "2"]
      },
      playerID: "0",
      events: {
        endTurn: (arg?: { next: string }) => {
          nextPlayer = arg?.next;
        }
      }
    });

    expect(nextPlayer).toBe("2");
  });

  it("lets the host select the first active player once", () => {
    const state = createInitialState(["0", "1", "2"]);
    const game = createMoronarchyGameConfig("INVALID_MOVE" as const);
    let nextPlayer: string | undefined;

    game.moves.chooseStartingPlayer({
      G: state,
      ctx: {
        currentPlayer: "0",
        numPlayers: 3,
        playOrder: ["0", "1", "2"]
      },
      playerID: "0",
      events: {
        endTurn: (arg?: { next: string }) => {
          nextPlayer = arg?.next;
        }
      }
    }, "2");

    expect(state.startingPlayerId).toBe("2");
    expect(nextPlayer).toBe("2");
    expect(game.moves.chooseStartingPlayer({
      G: state,
      ctx: {
        currentPlayer: "2",
        numPlayers: 3,
        playOrder: ["0", "1", "2"]
      },
      playerID: "2"
    }, "1")).toBe("INVALID_MOVE");
  });
});
