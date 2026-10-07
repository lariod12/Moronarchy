import { describe, expect, it } from "vitest";
import { claimTurn, endTurn, payFee, rollDice, buyPlot } from "@moronarchy/core/engine";
import type { GameState, LogEntry } from "@moronarchy/core/engine";
import { createScriptedRng, createTestGame, givePlot, placeKing } from "@moronarchy/core/testing";
import { formatLogEntry, getActivityText, getNotification, isNotificationFor } from "./log-format";

const entry = (type: string, playerId: string | null, data: LogEntry["data"] = {}, seq = 99): LogEntry => ({
  seq,
  round: 1,
  type,
  playerId,
  data
});

// Every type listed in packages/core/src/rules/log.ts.
const ALL_TYPES: Array<[string, string | null, LogEntry["data"], string]> = [
  ["gameStarted", null, { players: 2 }, "Game started"],
  ["turnClaimed", "1", {}, "Bob took the turn"],
  ["turnSkipped", "1", {}, "Bob skipped the turn"],
  ["diceRolled", "1", { value: 4, bonus: 0 }, "Bob rolled 4"],
  ["diceRerolled", "1", { value: 6 }, "Bob rerolled and got 6"],
  ["lapCompleted", "1", { bonus: 100, income: 12, level: 2 }, "Bob completed a lap"],
  ["cardPicked", "1", { type: "maxHealth", value: 10 }, "Bob picked Max Health +10"],
  ["plotBought", "1", { plotId: 7, price: 60 }, "Bob bought Plot 7"],
  ["plotSkipped", "1", { plotId: 7 }, "Bob skipped Plot 7"],
  ["plotUpgraded", "1", { plotId: 7, level: 2, cost: 45 }, "Bob upgraded Plot 7 to level 2"],
  ["plotHealed", "1", { plotId: 7, cost: 12 }, "Bob healed Plot 7"],
  ["residentRecruited", "1", { plotId: 7, residentId: "r5", kind: "warrior", cost: 70 }, "Bob recruited a Warrior on Plot 7"],
  ["residentUpgraded", "1", { residentId: "r5", level: 2, cost: 40 }, "Bob upgraded a resident to level 2"],
  ["residentHealed", "1", { residentId: "r5", cost: 8 }, "Bob healed a resident"],
  ["itemBought", "1", { itemId: "horse", price: 40 }, "Bob bought Horse"],
  ["itemUsed", "1", { itemId: "meat" }, "Bob used Meat"],
  ["itemFound", "1", { itemId: "luckyDie" }, "Bob found Lucky Die"],
  ["bagFull", "1", { itemId: "horse" }, "Bob's bag is full (Horse)"],
  ["personalEvent", "1", { eventId: "treasureChest" }, "Bob: Treasure Chest"],
  ["globalEvent", null, { eventId: "plague" }, "Event: Plague"],
  ["feePaid", "1", { ownerId: "0", amount: 40 }, "Bob paid 40 coin to Alice"],
  ["fightStarted", "1", { kind: "garrison", plotId: 7 }, "Bob started a fight at Plot 7"],
  ["fightRound", "1", { plotId: 7, winner: "attacker", damage: 7 }, "Fight round at Plot 7 went to the attacker (7 damage)"],
  ["fightEnded", "1", { kind: "garrison", plotId: 7, winner: "attacker", retreated: false, feePaid: 0, loot: 20 }, "Fight at Plot 7 won by Bob"],
  ["knockedOut", "1", { health: 55 }, "Bob was knocked out"],
  ["residentKilled", "0", { residentId: "r5", plotId: 7 }, "One of Alice's residents died at Plot 7"],
  ["plotLevelDown", "0", { plotId: 7, level: 1 }, "Plot 7 dropped to level 1"],
  ["plotDestroyed", "1", { plotId: 7, ownerId: "0" }, "Bob destroyed Plot 7"],
  ["kingEliminated", "1", { round: 3 }, "Bob is out of the game"],
  ["kingLeft", "1", { round: 3, reason: "disconnected" }, "Bob left the game (disconnected)"],
  ["gameFinished", "0", { round: 3 }, "Game over: Alice wins"]
];

const game = (): GameState => createTestGame(3);

describe("formatLogEntry", () => {
  it("describes every log type the engine emits", () => {
    const state = game();
    const king = state.kings["1"];
    const alice = state.kings["0"];
    if (!king || !alice) {
      throw new Error("kings missing");
    }
    king.name = "Bob";
    alice.name = "Alice";
    for (const [type, playerId, data, expected] of ALL_TYPES) {
      expect(formatLogEntry(entry(type, playerId, data), state, "2"), type).toBe(expected);
    }
  });

  it("returns null for unknown types", () => {
    expect(formatLogEntry(entry("somethingNew", "1"), game(), "0")).toBeNull();
  });

  it("speaks to the viewer in the second person", () => {
    const state = game();
    expect(formatLogEntry(entry("plotBought", "0", { plotId: 7, price: 60 }), state, "0")).toBe("You bought Plot 7");
    expect(formatLogEntry(entry("knockedOut", "0", { health: 55 }), state, "0")).toBe("You were knocked out");
    expect(formatLogEntry(entry("feePaid", "0", { ownerId: "1", amount: 40 }), state, "0")).toBe("You paid 40 coin to King 1");
    expect(formatLogEntry(entry("feePaid", "1", { ownerId: "0", amount: 40, bankrupt: true }), state, "0")).toBe(
      "King 1 paid 40 coin to You and went bankrupt"
    );
  });

  it("adds the destination to the roll of the move in progress", () => {
    const state = game();
    const rng = createScriptedRng({ d6: [4], next: [0.99, 0.99] });
    claimTurn(state, "0", rng);
    rollDice(state, "0", rng);
    expect(state.turn.path).toEqual([2, 3, 4, 5]);
    expect(getActivityText(state, "1")).toBe("King 0 rolled 4 → Plot 5");
  });

  it("names Start as the destination and shows the horse bonus", () => {
    const state = game();
    placeKing(state, "0", 38);
    state.turn.moveBonus = 3;
    const rng = createScriptedRng({ d6: [3] });
    claimTurn(state, "0", rng);
    rollDice(state, "0", rng);
    expect(state.turn.path.at(-1)).toBe(1);
    const roll = state.log.find((candidate) => candidate.type === "diceRolled");
    if (!roll) {
      throw new Error("roll missing");
    }
    expect(formatLogEntry(roll, state, "1")).toBe("King 0 rolled 3 (+3) → Start");
    // Right after the roll the newest line is the lap that the Start Station just granted.
    expect(getActivityText(state, "1")).toBe("King 0 completed a lap");
  });

  it("follows the real flow in the activity line: buy, then end turn", () => {
    const state = game();
    const rng = createScriptedRng({ d6: [4], next: [0.99, 0.99] });
    claimTurn(state, "0", rng);
    rollDice(state, "0", rng);
    buyPlot(state, "0", rng);
    expect(getActivityText(state, "1")).toBe("King 0 bought Plot 5");
    endTurn(state, "0", rng);
    expect(getActivityText(state, "1")).toBe("King 0 bought Plot 5");
  });

  it("does not claim a destination for an old roll", () => {
    const state = game();
    const rng = createScriptedRng({ d6: [4], next: [0.99, 0.99] });
    claimTurn(state, "0", rng);
    rollDice(state, "0", rng);
    const roll = state.log.find((candidate) => candidate.type === "diceRolled");
    if (!roll) {
      throw new Error("roll missing");
    }
    state.log.push(entry("diceRolled", "1", { value: 2, bonus: 0 }, 500));
    expect(formatLogEntry(roll, state, "1")).toBe("King 0 rolled 4");
  });
});

describe("getNotification", () => {
  it("pops up only what concerns the viewer", () => {
    const state = game();
    const found = entry("itemFound", "0", { itemId: "horse" });
    expect(getNotification(found, state, "0")).toEqual({ title: "Item found", text: "You found Horse!" });
    expect(isNotificationFor(found, state, "1")).toBe(false);

    const event = entry("personalEvent", "0", { eventId: "blessing" });
    expect(getNotification(event, state, "0")?.title).toBe("Blessing");
    expect(isNotificationFor(event, state, "1")).toBe(false);
  });

  it("notifies the owner who receives a fee, not the payer", () => {
    const state = game();
    const fee = entry("feePaid", "1", { ownerId: "0", amount: 40 });
    expect(getNotification(fee, state, "0")).toEqual({ title: "Fee received", text: "King 1 paid 40 coin to you." });
    expect(isNotificationFor(fee, state, "1")).toBe(false);
    expect(isNotificationFor(fee, state, "2")).toBe(false);
  });

  it("notifies knocked out, plot lost and plot damaged", () => {
    const state = game();
    expect(isNotificationFor(entry("knockedOut", "0", { health: 50 }), state, "0")).toBe(true);
    expect(isNotificationFor(entry("knockedOut", "0", { health: 50 }), state, "1")).toBe(false);
    expect(getNotification(entry("plotDestroyed", "1", { plotId: 7, ownerId: "0" }), state, "0")).toEqual({
      title: "Plot lost",
      text: "King 1 destroyed your Plot 7."
    });
    expect(isNotificationFor(entry("plotDestroyed", "1", { plotId: 7, ownerId: "0" }), state, "1")).toBe(false);
    expect(isNotificationFor(entry("plotLevelDown", "0", { plotId: 7, level: 1 }), state, "0")).toBe(true);
    // Going bankrupt is announced by the full-frame Lose face (end-model.ts), not by a popup.
    expect(isNotificationFor(entry("kingEliminated", "2", { round: 2 }), state, "2")).toBe(false);
    expect(isNotificationFor(entry("kingEliminated", "2", { round: 2 }), state, "0")).toBe(false);
  });

  it("tells the others when a king was removed for being disconnected, but not the king themselves", () => {
    const state = game();
    const left = entry("kingLeft", "2", { round: 2, reason: "disconnected" });
    expect(getNotification(left, state, "0")).toEqual({ title: "Player removed", text: "King 2 was removed (disconnected)." });
    expect(isNotificationFor(left, state, "2")).toBe(false);
  });

  it("stays quiet for plain activity", () => {
    const state = game();
    for (const type of ["diceRolled", "plotBought", "turnClaimed", "cardPicked", "lapCompleted"]) {
      expect(isNotificationFor(entry(type, "0", {}), state, "0"), type).toBe(false);
    }
  });

  it("notifies the owner when a real fee is collected", () => {
    const state = game();
    givePlot(state, "1", 5);
    const rng = createScriptedRng({ d6: [4], next: [0.99, 0.99] });
    claimTurn(state, "0", rng);
    rollDice(state, "0", rng);
    payFee(state, "0", rng);
    const fee = state.log.find((candidate) => candidate.type === "feePaid");
    if (!fee) {
      throw new Error("fee missing");
    }
    expect(isNotificationFor(fee, state, "1")).toBe(true);
    expect(isNotificationFor(fee, state, "0")).toBe(false);
  });
});
