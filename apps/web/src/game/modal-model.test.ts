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

describe("selectModal during and after fights", () => {
  const unseen = { seenSeq: 0 };

  it("shows fighters nothing but their fight while it runs", () => {
    const { game } = scenarios.fightKingMid();
    expect(select(game, "1", unseen)).toBeNull();
    expect(select(game, "0", unseen)).toBeNull();
  });

  it("offers a bystander and the absent owner a fight notice, once per fight", () => {
    const { game } = scenarios.fightStartedElsewhere();
    const started = [...game.log].reverse().find((entry) => entry.type === "fightStarted");
    if (!started) {
      throw new Error("fightStarted missing");
    }
    const bystander = select(game, "2", { seenSeq: started.seq - 1 });
    expect(bystander).toMatchObject({ kind: "fightNotice", plotId: 5, attackerId: "0", ownerId: "1", key: `fightNotice:${started.seq}` });
    expect(select(game, "1", { seenSeq: started.seq - 1 })?.kind).toBe("fightNotice");
    // Answered (dismissed) or already seen (a tab that opened mid-fight): nothing more.
    expect(select(game, "2", { seenSeq: started.seq - 1, dismissed: new Set([`fightNotice:${started.seq}`]) })).toBeNull();
    expect(select(game, "2", { seenSeq: started.seq })).toBeNull();
  });

  it("shows the result to the fighters and the plot owner, then never again", () => {
    const { game } = scenarios.fightWon();
    const ended = [...game.log].reverse().find((entry) => entry.type === "fightEnded");
    if (!ended) {
      throw new Error("fightEnded missing");
    }
    const key = `fightResult:${ended.seq}`;
    for (const viewerId of ["0", "1"]) {
      const modal = select(game, viewerId, { seenSeq: ended.seq - 1 });
      expect(modal).toMatchObject({ kind: "fightResult", model: { key } });
      expect(select(game, viewerId, { seenSeq: ended.seq - 1, dismissed: new Set([key]) })?.kind).not.toBe("fightResult");
    }
    expect(select(game, "2", { seenSeq: ended.seq - 1 })).toBeNull();
  });

  it("puts the result before notifications and the destroyed-plot offer", () => {
    const { game } = scenarios.fightDestroyed();
    expect(game.pending?.kind).toBe("buyPlot");
    const first = select(game, "0", unseen);
    expect(first?.kind).toBe("fightResult");
    const ended = [...game.log].reverse().find((entry) => entry.type === "fightEnded");
    expect(select(game, "0", { seenSeq: 0, dismissed: new Set([`fightResult:${ended?.seq}`]) })?.kind).toBe("buyPlot");
  });

  it("keeps a decision of the viewer ahead of an old result", () => {
    const { game } = scenarios.fightWon();
    game.pending = { kind: "visitorChoice", playerId: "0", plotId: 5, ownerId: "1", canAttack: true };
    expect(select(game, "0", unseen)?.kind).toBe("visitorChoice");
  });

  it("holds the result back on the Fight page until its last round was shown", () => {
    const { game } = scenarios.fightWon();
    const ended = [...game.log].reverse().find((entry) => entry.type === "fightEnded");
    const key = `fightResult:${ended?.seq}`;
    expect(select(game, "0", { seenSeq: 0, onFightPage: true })).toBeNull();
    expect(select(game, "0", { seenSeq: 0, onFightPage: true, revealedKey: "fightResult:0" })).toBeNull();
    expect(select(game, "0", { seenSeq: 0, onFightPage: true, revealedKey: key })).toMatchObject({ kind: "fightResult", model: { key } });
    // Elsewhere there is nothing to wait for.
    expect(select(game, "0", { seenSeq: 0 })?.kind).toBe("fightResult");
  });

  it("gives a watcher of the Fight page a Fight over result, nobody else", () => {
    const { game } = scenarios.fightWon();
    const ended = [...game.log].reverse().find((entry) => entry.type === "fightEnded");
    const key = `fightResult:${ended?.seq}`;
    const watcher = select(game, "2", { seenSeq: 0, onFightPage: true, revealedKey: key });
    expect(watcher).toMatchObject({ kind: "fightResult", model: { role: "spectator", title: "Fight over" } });
    expect(select(game, "2", { seenSeq: 0 })).toBeNull();
  });

  describe("being knocked out", () => {
    it("shows the Lose face to the king who went bankrupt, not to the others", () => {
      const { game, viewerId } = scenarios.justEliminated();
      expect(select(game, viewerId, { seenSeq: 0 })).toMatchObject({ kind: "lose", round: 3 });
      expect(select(game, "0", { seenSeq: 0 })?.kind).not.toBe("lose");
      expect(select(game, "2", { seenSeq: 0 })?.kind).not.toBe("lose");
    });

    it("waits for the walk, comes before any other popup, and is shown once", () => {
      const { game, viewerId } = scenarios.justEliminated();
      expect(select(game, viewerId, { seenSeq: 0, isAnimating: true })).toBeNull();
      const lose = select(game, viewerId, { seenSeq: 0, endTurnOpen: true });
      expect(lose?.kind).toBe("lose");
      if (lose?.kind !== "lose") {
        throw new Error("expected the lose face");
      }
      expect(select(game, viewerId, { seenSeq: 0, dismissed: new Set([lose.key]) })?.kind).not.toBe("lose");
      // A tab that joined after it happened is already caught up.
      expect(select(game, viewerId)?.kind).not.toBe("lose");
    });

    it("beats a decision that is open in the same state", () => {
      const { game, viewerId } = scenarios.aboutToGoBankrupt();
      expect(select(game, viewerId, { seenSeq: 0 })?.kind).toBe("visitorChoice");
      const lost = scenarios.justEliminated().game;
      lost.pending = { kind: "buyPlot", playerId: viewerId, plotId: 7, price: 60, reason: "empty" };
      expect(select(lost, viewerId, { seenSeq: 0 })?.kind).toBe("lose");
    });
  });
});
