import { describe, expect, it } from "vitest";
import {
  attack,
  buyItem,
  buyPlot,
  claimTurn,
  collectFee,
  confirmRoll,
  endTurn,
  fightRoll,
  healPlot,
  healResident,
  leaveStartStation,
  payFee,
  pickCard,
  recruitResident,
  retreat,
  rollDice,
  skipPlot,
  upgradePlot,
  upgradeResident,
  useItem
} from "../../src/engine";
import type { CommandResult, GameState, Rng } from "../../src/engine";
import { eliminate } from "../../src/rules/elimination";
import { createTestGame, giveItem, givePlot } from "../../src/testing";
import { fails, landOn, ok, quietRng, snapshot } from "./helpers";

type Command = (state: GameState, actorId: string, rng: Rng) => CommandResult;

const simpleCommands: [string, Command][] = [
  ["claimTurn", claimTurn],
  ["rollDice", rollDice],
  ["confirmRoll", confirmRoll],
  ["leaveStartStation", leaveStartStation],
  ["buyPlot", buyPlot],
  ["skipPlot", skipPlot],
  ["payFee", payFee],
  ["collectFee", collectFee],
  ["attack", attack],
  ["fightRoll", fightRoll],
  ["retreat", retreat],
  ["endTurn", endTurn],
  ["pickCard", (state, actorId, rng) => pickCard(state, actorId, rng, 0)],
  ["upgradePlot", (state, actorId, rng) => upgradePlot(state, actorId, rng, 2)],
  ["healPlot", (state, actorId, rng) => healPlot(state, actorId, rng, 2)],
  ["recruitResident", (state, actorId, rng) => recruitResident(state, actorId, rng, 2, "farmer")],
  ["upgradeResident", (state, actorId, rng) => upgradeResident(state, actorId, rng, "r1")],
  ["healResident", (state, actorId, rng) => healResident(state, actorId, rng, "r1")],
  ["buyItem", (state, actorId, rng) => buyItem(state, actorId, rng, "horse")],
  ["useItem", (state, actorId, rng) => useItem(state, actorId, rng, "horse")]
];

describe("command validation", () => {
  it("rejects every command after the game is over", () => {
    const state = createTestGame(2);
    eliminate(state, "1");
    expect(state.phase).toBe("finished");
    for (const [name, command] of simpleCommands) {
      const result = command(state, "0", quietRng());
      expect(result, name).toEqual({ ok: false, error: "GAME_OVER" });
    }
  });

  it("rejects unknown and eliminated actors", () => {
    const state = createTestGame(3);
    eliminate(state, "2");
    for (const [name, command] of simpleCommands) {
      expect(command(state, "nobody", quietRng()), name).toEqual({ ok: false, error: "NOT_ACTOR" });
      expect(command(state, "2", quietRng()), name).toEqual({ ok: false, error: "NOT_ACTOR" });
    }
  });

  it("rejects turn commands from the wrong player", () => {
    const state = createTestGame(2);
    const rng = quietRng();
    fails(claimTurn(state, "1", rng), "NOT_YOUR_TURN");
    fails(rollDice(state, "1", rng), "NOT_YOUR_TURN");
    fails(endTurn(state, "1", rng), "NOT_YOUR_TURN");
    fails(upgradePlot(state, "1", rng, 2), "NOT_YOUR_TURN");
    fails(buyItem(state, "1", rng, "horse"), "NOT_YOUR_TURN");
    fails(leaveStartStation(state, "1", rng), "NOT_YOUR_TURN");
  });

  it("enforces the turn step order", () => {
    const state = createTestGame(2);
    const rng = quietRng([1]);
    fails(rollDice(state, "0", rng), "WRONG_STEP");
    fails(confirmRoll(state, "0", rng), "WRONG_STEP");
    fails(endTurn(state, "0", rng), "WRONG_STEP");
    fails(leaveStartStation(state, "0", rng), "WRONG_STEP");
    ok(claimTurn(state, "0", rng));
    fails(claimTurn(state, "0", rng), "WRONG_STEP");
    fails(endTurn(state, "0", rng), "WRONG_STEP");
    ok(rollDice(state, "0", rng));
    fails(rollDice(state, "0", rng), "PENDING_DECISION"); // landed on an unowned plot
  });

  it("reports NO_PENDING and NOT_ACTOR for decisions", () => {
    const state = createTestGame(2);
    const rng = quietRng();
    for (const command of [buyPlot, skipPlot, payFee, collectFee, attack]) {
      fails(command(state, "0", rng), "NO_PENDING");
    }
    fails(pickCard(state, "0", rng, 0), "NO_PENDING");

    givePlot(state, "1", 5);
    const landRng = landOn(state, 5);
    expect(state.pending?.kind).toBe("visitorChoice");
    for (const command of [buyPlot, skipPlot, payFee, collectFee, attack]) {
      fails(command(state, "1", landRng), "NOT_ACTOR");
    }
    fails(buyPlot(state, "0", landRng), "WRONG_STEP");
    fails(skipPlot(state, "0", landRng), "WRONG_STEP");
    fails(collectFee(state, "0", landRng), "WRONG_STEP");
    fails(pickCard(state, "0", landRng, 0), "WRONG_STEP");
  });

  it("blocks turn commands while a decision is pending", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 2);
    giveItem(state, "0", "sickle");
    const rng = landOn(state, 6);
    expect(state.pending?.kind).toBe("buyPlot");
    fails(endTurn(state, "0", rng), "PENDING_DECISION");
    fails(upgradePlot(state, "0", rng, 2), "PENDING_DECISION");
    fails(buyItem(state, "0", rng, "horse"), "PENDING_DECISION");
    fails(leaveStartStation(state, "0", rng), "PENDING_DECISION");
    fails(useItem(state, "0", rng, "sickle", { plotId: 2 }), "PENDING_DECISION");
  });

  it("allows meat while a decision is pending", () => {
    const state = createTestGame(2);
    giveItem(state, "0", "meat");
    state.kings["0"]!.health = 40;
    const rng = landOn(state, 6);
    expect(state.pending?.kind).toBe("buyPlot");
    ok(useItem(state, "0", rng, "meat"));
    expect(state.kings["0"]?.health).toBe(70);
    fails(useItem(state, "0", rng, "meat"), "INVALID_TARGET");
  });

  it("rejects unknown targets and items", () => {
    const state = createTestGame(2);
    giveItem(state, "0", "hammer");
    const rng = landOn(state, 6);
    ok(skipPlot(state, "0", rng));
    fails(upgradePlot(state, "0", rng, 99), "NOT_ALLOWED");
    fails(useItem(state, "0", rng, "hammer", { plotId: 99 }), "INVALID_TARGET");
    fails(useItem(state, "0", rng, "ghost" as never), "INVALID_TARGET");
    fails(useItem(state, "1", rng, "horse"), "INVALID_TARGET");
  });

  it("leaves the state untouched when a command fails", () => {
    const state = createTestGame(2);
    givePlot(state, "0", 2, 1);
    givePlot(state, "1", 3, 0);
    state.kings["0"]!.coin = 5;
    const rng = landOn(state, 2);
    const before = snapshot(state);
    const attempts: CommandResult[] = [
      upgradePlot(state, "0", rng, 2),
      upgradePlot(state, "0", rng, 3),
      healPlot(state, "0", rng, 2),
      recruitResident(state, "0", rng, 2, "warrior"),
      recruitResident(state, "0", rng, 2, "farmer"),
      upgradeResident(state, "0", rng, "r99"),
      buyItem(state, "0", rng, "horse"),
      buyPlot(state, "0", rng),
      payFee(state, "0", rng),
      claimTurn(state, "0", rng),
      useItem(state, "0", rng, "ironSword"),
      useItem(state, "0", rng, "horse"),
      fightRoll(state, "0", rng),
      retreat(state, "0", rng)
    ];
    for (const result of attempts) {
      expect(result.ok).toBe(false);
    }
    expect(snapshot(state)).toBe(before);
  });

  it("does not consume items or coin when an item use fails", () => {
    const state = createTestGame(2);
    giveItem(state, "0", "horse");
    giveItem(state, "0", "warHorn");
    const rng = quietRng();
    ok(claimTurn(state, "0", rng));
    const before = snapshot(state);
    fails(useItem(state, "0", rng, "warHorn"), "WRONG_STEP");
    fails(useItem(state, "1", rng, "horse"), "INVALID_TARGET");
    expect(snapshot(state)).toBe(before);
  });
});
