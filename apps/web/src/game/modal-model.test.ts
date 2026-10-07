import { describe, expect, it } from "vitest";
import { payFee } from "@moronarchy/core/engine";
import type { GameState } from "@moronarchy/core/engine";
import { createScriptedRng } from "@moronarchy/core/testing";
import * as scenarios from "../dev/gallery/game-fixtures";
import type { ModalInput } from "./modal-model";
import { ownPlotKey, selectModal } from "./modal-model";

const select = (game: GameState, viewerId: string, overrides: Partial<ModalInput> = {}) =>
  selectModal({ game, viewerId, isAnimating: false, endTurnOpen: false, seenSeq: Number.MAX_SAFE_INTEGER, dismissed: new Set(), ...overrides });

describe("selectModal", () => {
  it("shows nothing at the start and nothing to bystanders", () => {
    const { game } = scenarios.mapStart();
    expect(select(game, "0")).toBeNull();
    expect(select(game, "1")).toBeNull();
  });

  it("shows the buy decision to the king it is addressed to", () => {
    const { game } = scenarios.buyDecision();
    expect(select(game, "0")?.kind).toBe("buyPlot");
    expect(select(game, "1")).toBeNull();
  });

  it("holds every popup while the king is still walking", () => {
    const { game } = scenarios.buyDecision();
    expect(select(game, "0", { isAnimating: true })).toBeNull();
  });

  it("asks the visitor to pay or attack when the owner is away", () => {
    const { game } = scenarios.visitorDecision();
    const modal = select(game, "0");
    expect(modal?.kind).toBe("visitorChoice");
    expect(select(game, "1")).toBeNull();
  });

  it("asks the owner out of turn, and makes the visitor wait", () => {
    const { game } = scenarios.ownerDecision();
    expect(select(game, "1")?.kind).toBe("ownerChoice");
    expect(select(game, "0")?.kind).toBe("waiting");
    expect(select(game, "2")).toBeNull();
  });

  it("offers the Lucky Die choice to the turn player", () => {
    const { game } = scenarios.luckyDieChoice();
    expect(game.turn.step).toBe("rolled");
    expect(select(game, "0")).toEqual({ kind: "luckyDie", value: 3, bonus: 0 });
    expect(select(game, "1")).toBeNull();
  });

  it("opens End of turn only after the crown asked for it", () => {
    const { game } = scenarios.canEndTurn();
    expect(select(game, "0")).toBeNull();
    expect(select(game, "0", { endTurnOpen: true })?.kind).toBe("endTurn");
    expect(select(game, "1", { endTurnOpen: true })).toBeNull();
  });

  it("prefers a pending decision over End of turn and Lucky Die over waiting", () => {
    const { game } = scenarios.buyDecision();
    expect(select(game, "0", { endTurnOpen: true })?.kind).toBe("buyPlot");
  });

  it("does not turn the card pick into a popup", () => {
    const { game } = scenarios.cardPick();
    expect(game.pending?.kind).toBe("pickCard");
    expect(select(game, "0")).toBeNull();
  });

  it("offers the own-plot shortcut once, until dismissed", () => {
    const { game } = scenarios.ownPlot();
    const modal = select(game, "0");
    expect(modal).toEqual({ kind: "ownPlot", plotId: 5, key: ownPlotKey(game, 5) });
    expect(select(game, "0", { dismissed: new Set([ownPlotKey(game, 5)]) })).toBeNull();
    expect(select(game, "1")).toBeNull();
  });

  describe("notifications", () => {
    const feeGame = (): GameState => {
      const { game } = scenarios.visitorDecision();
      payFee(game, "0", createScriptedRng({ d6: [] }));
      return game;
    };

    it("queues what concerns the viewer after the last seen entry", () => {
      const game = feeGame();
      const fee = game.log.find((entry) => entry.type === "feePaid");
      if (!fee) {
        throw new Error("fee missing");
      }
      const modal = select(game, "1", { seenSeq: fee.seq - 1 });
      expect(modal?.kind).toBe("notice");
      if (modal?.kind === "notice") {
        expect(modal.notification.title).toBe("Fee received");
        expect(modal.entry.seq).toBe(fee.seq);
      }
      // Already seen: nothing to show again (a reload keeps the seen seq).
      expect(select(game, "1", { seenSeq: fee.seq })).toBeNull();
      // The payer is not told about their own payment.
      expect(select(game, "0", { seenSeq: fee.seq - 1 })).toBeNull();
    });

    it("shows a decision before a notification", () => {
      const { game } = scenarios.buyDecision();
      game.log.push({ seq: 999, round: 1, type: "itemFound", playerId: "0", data: { itemId: "horse" } });
      expect(select(game, "0", { seenSeq: 0 })?.kind).toBe("buyPlot");
    });

    it("shows notifications before the own-plot shortcut", () => {
      const { game } = scenarios.ownPlot();
      game.log.push({ seq: 999, round: 1, type: "itemFound", playerId: "0", data: { itemId: "horse" } });
      expect(select(game, "0", { seenSeq: 998 })?.kind).toBe("notice");
      expect(select(game, "0", { seenSeq: 999 })?.kind).toBe("ownPlot");
    });
  });
});
