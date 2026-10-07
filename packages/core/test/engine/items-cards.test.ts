import { describe, expect, it } from "vitest";
import {
  attack,
  buyItem,
  claimTurn,
  confirmRoll,
  fightRoll,
  getKingStats,
  leaveStartStation,
  pickCard,
  rollDice,
  useItem
} from "../../src/engine";
import type { CardOffer, King } from "../../src/engine";
import { buildCardOffer } from "../../src/rules/cards";
import { addResident, createSeededRng, createTestGame, giveItem, givePlot, placeKing } from "../../src/testing";
import { fails, landOn, ok, quietRng } from "./helpers";

describe("items", () => {
  it("horse adds +3 once per turn before rolling", () => {
    const state = createTestGame(2);
    giveItem(state, "0", "horse", 2);
    const rng = quietRng([2]);
    ok(claimTurn(state, "0", rng));
    ok(useItem(state, "0", rng, "horse"));
    expect(state.turn.moveBonus).toBe(3);
    expect(state.kings["0"]?.items.horse).toBe(1);
    fails(useItem(state, "0", rng, "horse"), "LIMIT_REACHED");
    ok(rollDice(state, "0", rng));
    expect(state.turn.dice).toEqual({ value: 2, bonus: 3, rerolled: false });
    expect(state.kings["0"]?.position).toBe(6);
  });

  it("horse cannot be used before claiming or after rolling", () => {
    const state = createTestGame(2);
    giveItem(state, "0", "horse");
    const rng = quietRng();
    fails(useItem(state, "0", rng, "horse"), "WRONG_STEP");
    landOn(state, 2);
    fails(useItem(state, "0", rng, "horse"), "WRONG_STEP");
  });

  it("luckyDie rerolls once and then moves", () => {
    const state = createTestGame(2);
    giveItem(state, "0", "luckyDie");
    const rng = quietRng([2, 5]);
    ok(claimTurn(state, "0", rng));
    ok(rollDice(state, "0", rng));
    expect(state.turn.step).toBe("rolled");
    ok(useItem(state, "0", rng, "luckyDie"));
    expect(state.turn.dice).toEqual({ value: 5, bonus: 0, rerolled: true });
    expect(state.kings["0"]?.position).toBe(6);
    expect(state.kings["0"]?.items.luckyDie).toBeUndefined();
    fails(useItem(state, "0", rng, "luckyDie"), "INVALID_TARGET");
  });

  it("luckyDie cannot be used before rolling", () => {
    const state = createTestGame(2);
    giveItem(state, "0", "luckyDie");
    const rng = quietRng();
    ok(claimTurn(state, "0", rng));
    fails(useItem(state, "0", rng, "luckyDie"), "WRONG_STEP");
  });

  it("meat heals 30 up to the effective max health", () => {
    const state = createTestGame(2);
    const king = state.kings["0"]!;
    giveItem(state, "0", "meat", 2);
    king.health = 50;
    const rng = quietRng();
    ok(claimTurn(state, "0", rng));
    ok(useItem(state, "0", rng, "meat"));
    expect(king.health).toBe(80);
    ok(useItem(state, "0", rng, "meat"));
    expect(king.health).toBe(100);
    expect(king.items.meat).toBeUndefined();
  });

  it("sickle collects plot income and hammer fully repairs a plot", () => {
    const state = createTestGame(2);
    const plot = givePlot(state, "0", 2, 1);
    plot.health = 5;
    addResident(state, 2, "farmer", 2);
    giveItem(state, "0", "sickle");
    giveItem(state, "0", "hammer");
    const rng = quietRng();
    ok(claimTurn(state, "0", rng));
    fails(useItem(state, "0", rng, "sickle"), "INVALID_TARGET");
    fails(useItem(state, "0", rng, "sickle", { plotId: 3 }), "INVALID_TARGET");
    ok(useItem(state, "0", rng, "sickle", { plotId: 2 }));
    expect(state.kings["0"]?.coin).toBe(300 + 6 + 20);
    ok(useItem(state, "0", rng, "hammer", { plotId: 2 }));
    expect(plot.health).toBe(25);
  });

  it("war items only work in a fight and only before the user's own roll", () => {
    const state = createTestGame(2);
    givePlot(state, "1", 2, 0);
    giveItem(state, "0", "warHorn", 2);
    giveItem(state, "0", "woodShield");
    const rng = landOn(state, 2, { d6: [3, 3] });
    fails(useItem(state, "0", rng, "warHorn"), "WRONG_STEP");
    ok(attack(state, "0", rng));
    expect(state.fight?.kind).toBe("plot");

    ok(useItem(state, "0", rng, "warHorn"));
    ok(useItem(state, "0", rng, "woodShield"));
    expect(state.fight?.buffs["0"]).toEqual({ attack: 3, defense: 3 });
    expect(state.kings["0"]?.items.warHorn).toBe(1);

    ok(fightRoll(state, "0", rng)); // plot fights resolve the round immediately
    expect(state.fight?.rounds).toHaveLength(1);
    expect(state.fight?.rounds[0]?.attackerScore).toBe(3 + 5 + 3); // roll + attack + warHorn
    // After the round resolved a new round starts, so another buff is allowed again.
    ok(useItem(state, "0", rng, "warHorn"));
    expect(state.fight?.buffs["0"]?.attack).toBe(6);
  });

  it("does not allow buffs after the user rolled in a king duel", () => {
    const state = createTestGame(2);
    givePlot(state, "1", 2, 0);
    placeKing(state, "1", 2);
    giveItem(state, "0", "warHorn");
    giveItem(state, "1", "woodShield");
    const rng = landOn(state, 2, { d6: [3, 3] });
    expect(state.pending?.kind).toBe("ownerChoice");
    ok(attack(state, "1", rng));
    ok(fightRoll(state, "1", rng));
    fails(useItem(state, "1", rng, "woodShield"), "NOT_ALLOWED");
    ok(useItem(state, "0", rng, "warHorn")); // visitor has not rolled yet
    expect(state.fight?.buffs["0"]?.attack).toBe(3);
    fails(fightRoll(state, "1", rng), "NOT_ALLOWED");
  });

  it("equipment adds stats and cannot be used", () => {
    const state = createTestGame(2);
    giveItem(state, "0", "ironSword");
    giveItem(state, "0", "ironArmor");
    giveItem(state, "0", "cloverCharm");
    expect(getKingStats(state, "0")).toEqual({ maxHealth: 100, attack: 7, defense: 5, lucky: 2 });
    expect(state.kings["0"]?.attack).toBe(5); // base value untouched
    const rng = quietRng();
    ok(claimTurn(state, "0", rng));
    fails(useItem(state, "0", rng, "ironSword"), "NOT_ALLOWED");
  });

  it("buys items only at the station with bag limits", () => {
    const state = createTestGame(2);
    const rng = quietRng([1]);
    fails(buyItem(state, "0", rng, "horse"), "WRONG_STEP");
    placeKing(state, "0", 40);
    ok(claimTurn(state, "0", rng));
    ok(rollDice(state, "0", rng));
    ok(pickCard(state, "0", rng, 0));
    state.kings["0"]!.coin = 10000;

    ok(buyItem(state, "0", rng, "ironSword"));
    expect(state.kings["0"]?.items.ironSword).toBe(1);
    expect(state.kings["0"]?.coin).toBe(10000 - 160);
    fails(buyItem(state, "0", rng, "ironSword"), "LIMIT_REACHED");

    for (let index = 0; index < 5; index += 1) {
      ok(buyItem(state, "0", rng, "meat"));
    }
    fails(buyItem(state, "0", rng, "meat"), "LIMIT_REACHED");

    state.kings["0"]!.coin = 39;
    fails(buyItem(state, "0", rng, "horse"), "INSUFFICIENT_COIN");
    ok(leaveStartStation(state, "0", rng));
    fails(buyItem(state, "0", rng, "horse"), "WRONG_STEP");
  });

  it("confirmRoll is rejected without a pending roll", () => {
    const state = createTestGame(2);
    const rng = quietRng();
    ok(claimTurn(state, "0", rng));
    fails(confirmRoll(state, "0", rng), "WRONG_STEP");
  });
});

describe("upgrade cards", () => {
  it("offers three distinct types", () => {
    const rng = quietRng([], [0, 0, 0.99, 0, 0.5, 0.99]);
    const offers = buildCardOffer(rng, 0);
    expect(offers).toEqual([
      { type: "maxHealth", value: 10 },
      { type: "attack", value: 2 },
      { type: "coin", value: 150 }
    ]);

    for (let seed = 1; seed <= 50; seed += 1) {
      const seeded = buildCardOffer(createSeededRng(seed), seed % 7);
      expect(new Set(seeded.map((offer) => offer.type)).size).toBe(3);
    }
  });

  it("takes the best tier roll when lucky grants extra rolls", () => {
    // lucky 2 -> 2 rolls per value; each pair is (low, high) so the high tier wins.
    const rng = quietRng([], [0, 0, 0.99, 0, 0.99, 0, 0.99, 0, 0.99]);
    const offers = buildCardOffer(rng, 2);
    expect(offers).toEqual([
      { type: "maxHealth", value: 20 },
      { type: "attack", value: 3 },
      { type: "coin", value: 150 }
    ]);
    const plain = buildCardOffer(quietRng([], [0, 0, 0.99, 0, 0.99, 0, 0.99, 0, 0.99]), 0);
    expect(plain[0]?.value).toBe(10);
  });

  it("applies each card type when picked", () => {
    const cases: { offer: CardOffer; check: (king: King) => void }[] = [
      { offer: { type: "maxHealth", value: 15 }, check: (king) => expect([king.maxHealth, king.health]).toEqual([115, 115]) },
      { offer: { type: "attack", value: 2 }, check: (king) => expect(king.attack).toBe(7) },
      { offer: { type: "defense", value: 3 }, check: (king) => expect(king.defense).toBe(6) },
      { offer: { type: "lucky", value: 1 }, check: (king) => expect(king.lucky).toBe(1) },
      { offer: { type: "coin", value: 100 }, check: (king) => expect(king.coin).toBe(400) }
    ];
    for (const { offer, check } of cases) {
      const state = createTestGame(2);
      state.turn.step = "startStation";
      state.pending = { kind: "pickCard", playerId: "0", offers: [offer, offer, offer] };
      ok(pickCard(state, "0", quietRng(), 1));
      check(state.kings["0"]!);
      expect(state.pending).toBeNull();
      expect(state.turn.step).toBe("startStation");
    }
  });

  it("rejects invalid card indexes and the wrong actor", () => {
    const state = createTestGame(2);
    state.turn.step = "startStation";
    state.pending = {
      kind: "pickCard",
      playerId: "0",
      offers: [
        { type: "coin", value: 50 },
        { type: "coin", value: 100 },
        { type: "coin", value: 150 }
      ]
    };
    const rng = quietRng();
    fails(pickCard(state, "0", rng, 3), "INVALID_TARGET");
    fails(pickCard(state, "0", rng, -1), "INVALID_TARGET");
    fails(pickCard(state, "0", rng, 0.5), "INVALID_TARGET");
    fails(pickCard(state, "1", rng, 0), "NOT_ACTOR");
    expect(state.pending).not.toBeNull();
  });
});
