import { describe, expect, it } from "vitest";
import { createTestGame } from "@moronarchy/core/testing";
import { toHudModel, toTopBarModel } from "./hud-model";

describe("hud-model", () => {
  it("maps the turn player waiting to claim to a shaking crown", () => {
    const game = createTestGame(2);
    const hud = toHudModel(game, "0");
    expect(hud).toMatchObject({ name: "King 0", level: 1, eliminated: false, crownState: "shaking" });
    expect(hud.health).toBe(game.kings["0"]?.health);
    expect(hud.maxHealth).toBeGreaterThan(0);
  });

  it("maps another player to an idle crown", () => {
    const game = createTestGame(2);
    expect(toHudModel(game, "1").crownState).toBe("idle");
  });

  it("maps the turn player after moving to a crown that can end the turn", () => {
    const game = createTestGame(2);
    game.turn.step = "postMove";
    expect(toHudModel(game, "0").crownState).toBe("canEndTurn");
  });

  it("maps an eliminated king", () => {
    const game = createTestGame(2);
    const king = game.kings["1"];
    if (!king) {
      throw new Error("missing king");
    }
    king.eliminated = true;
    expect(toHudModel(game, "1")).toMatchObject({ eliminated: true, crownState: "eliminated" });
  });

  it("builds the top bar model with inflation", () => {
    const game = createTestGame(2);
    expect(toTopBarModel(game, "R001", "Home")).toEqual({ round: 1, roomCode: "R001", title: "Home", inflation: 1 });
    game.round = 22;
    expect(toTopBarModel(game, "R001").inflation).toBe(1.25);
  });
});
