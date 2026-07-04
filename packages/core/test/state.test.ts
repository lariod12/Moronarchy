import { describe, expect, it } from "vitest";
import {
  START_BONUS,
  buyLand,
  canUpgradeLand,
  checkVictory,
  createInitialState,
  getPlayer,
  getTile,
  rollDiceAndMove,
  upgradeLand
} from "../src";

describe("Moronarchy core rules", () => {
  it("wraps movement from tile 40 to tile 01", () => {
    const state = createInitialState(["0", "1"]);
    const player = getPlayer(state, "0");
    expect(player).toBeDefined();
    player!.position = 40;

    const result = rollDiceAndMove(state, "0", 1);

    expect(result.ok).toBe(true);
    expect(getPlayer(state, "0")?.position).toBe(1);
    expect(state.lastDiceRoll?.passedStart).toBe(true);
  });

  it("grants start bonus and level after completing a lap", () => {
    const state = createInitialState(["0", "1"]);
    const player = getPlayer(state, "0");
    expect(player).toBeDefined();
    player!.position = 39;

    rollDiceAndMove(state, "0", 4);

    expect(getPlayer(state, "0")?.coin).toBe(200 + START_BONUS);
    expect(getPlayer(state, "0")?.lapCount).toBe(1);
    expect(getPlayer(state, "0")?.level).toBe(2);
  });

  it("buys land and deducts the segment price", () => {
    const state = createInitialState(["0", "1"]);
    rollDiceAndMove(state, "0", 1);

    const result = buyLand(state, "0");

    expect(result.ok).toBe(true);
    expect(getPlayer(state, "0")?.coin).toBe(150);
    expect(getTile(state, 2)?.ownerId).toBe("0");
    expect(getTile(state, 2)?.landLevel).toBe(1);
  });

  it("transfers rent when landing on rival land", () => {
    const state = createInitialState(["0", "1"]);
    rollDiceAndMove(state, "0", 1);
    buyLand(state, "0");

    const result = rollDiceAndMove(state, "1", 1);

    expect(result.ok).toBe(true);
    expect(getPlayer(state, "1")?.coin).toBe(190);
    expect(getPlayer(state, "0")?.coin).toBe(160);
  });

  it("defeats a player when forced rent bankrupts them", () => {
    const state = createInitialState(["0", "1"]);
    rollDiceAndMove(state, "0", 1);
    buyLand(state, "0");
    const player = getPlayer(state, "1");
    expect(player).toBeDefined();
    player!.coin = 5;

    rollDiceAndMove(state, "1", 1);

    expect(getPlayer(state, "1")?.defeated).toBe(true);
    expect(getPlayer(state, "1")?.coin).toBe(0);
    expect(state.winnerId).toBe("0");
  });

  it("requires ownership, coin, and king level for upgrades", () => {
    const state = createInitialState(["0", "1"]);
    rollDiceAndMove(state, "0", 1);
    buyLand(state, "0");
    state.phase = "tile-action";
    getPlayer(state, "0")!.level = 2;
    getPlayer(state, "0")!.coin = 100;

    expect(canUpgradeLand(state, "0")).toBe(true);
    const result = upgradeLand(state, "0");

    expect(result.ok).toBe(true);
    expect(getTile(state, 2)?.landLevel).toBe(2);
    expect(getPlayer(state, "0")?.coin).toBe(60);
  });

  it("caps level at 3", () => {
    const state = createInitialState(["0", "1"]);
    const player = getPlayer(state, "0");
    expect(player).toBeDefined();
    player!.position = 39;
    player!.level = 3;

    rollDiceAndMove(state, "0", 4);

    expect(getPlayer(state, "0")?.level).toBe(3);
  });

  it("selects highest total value at the round limit", () => {
    const state = createInitialState(["0", "1"]);
    getPlayer(state, "0")!.coin = 300;
    getPlayer(state, "1")!.coin = 200;
    state.currentRound = 31;

    checkVictory(state);

    expect(state.winnerId).toBe("0");
    expect(state.phase).toBe("game-over");
  });
});
