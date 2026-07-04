import { describe, expect, it } from "vitest";
import { MoronarchyGame } from "./game.js";

describe("Moronarchy boardgame.io config", () => {
  it("exposes the expected server-authoritative moves", () => {
    expect(MoronarchyGame.name).toBe("moronarchy");
    expect(Object.keys(MoronarchyGame.moves)).toEqual(
      expect.arrayContaining(["rollDice", "buyLand", "upgradeLand", "skipTileAction", "endTurn"])
    );
  });

  it("creates 2-player initial state by default context", () => {
    const state = MoronarchyGame.setup({
      ctx: {
        numPlayers: 2,
        currentPlayer: "0"
      }
    });

    expect(state.players).toHaveLength(2);
    expect(state.tiles).toHaveLength(40);
    expect(state.phase).toBe("rolling");
  });
});
