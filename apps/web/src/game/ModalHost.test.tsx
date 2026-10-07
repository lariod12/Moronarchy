import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { payFee } from "@moronarchy/core/engine";
import { createScriptedRng } from "@moronarchy/core/testing";
import * as scenarios from "../dev/gallery/game-fixtures";
import { renderGame } from "./test-utils";
import type { GameState } from "@moronarchy/core/engine";

const dialog = (name: string | RegExp) => screen.getByRole("dialog", { name });

describe("ModalHost", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks to buy an empty plot and sends the answer", () => {
    const { game, viewerId } = scenarios.buyDecision();
    const view = renderGame(game, viewerId, { page: "map" });
    expect(within(dialog("Plot 7")).getByText("Buy this plot for 60 coin?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(view.send).toHaveBeenLastCalledWith("skipPlot");
    fireEvent.click(screen.getByRole("button", { name: "Buy" }));
    expect(view.send).toHaveBeenLastCalledWith("buyPlot");
  });

  it("disables Buy when the king cannot afford the plot", () => {
    const { game, viewerId } = scenarios.buyDecision({ poor: true });
    const view = renderGame(game, viewerId, { page: "map" });
    expect(screen.getByRole("button", { name: "Buy" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Buy" }));
    expect(view.send).not.toHaveBeenCalled();
  });

  it("uses the broken-plot wording for a destroyed plot", () => {
    const { game, viewerId } = scenarios.buyDecision({ destroyed: true });
    renderGame(game, viewerId, { page: "map" });
    expect(screen.getByText("You broke Plot 7. Buy it now for 60 coin?")).toBeInTheDocument();
  });

  it("offers the visitor Pay or Attack", () => {
    const { game, viewerId } = scenarios.visitorDecision();
    const view = renderGame(game, viewerId, { page: "map" });
    expect(within(dialog("Message")).getByText(/You get in Bob's plot \(Plot 5\)\. Pay 30 coin or attack\?/)).toBeInTheDocument();
    expect(screen.queryByText("Fights arrive in the next update")).not.toBeInTheDocument();
    expect(screen.queryByText("Peace Treaty: no attacks")).not.toBeInTheDocument();
    const attack = screen.getByRole("button", { name: "Attack" });
    expect(attack).toBeEnabled();
    fireEvent.click(attack);
    expect(view.send).toHaveBeenLastCalledWith("attack");
    fireEvent.click(screen.getByRole("button", { name: "Pay 30" }));
    expect(view.send).toHaveBeenLastCalledWith("payFee");
  });

  it("explains the Peace Treaty on the disabled Attack", () => {
    const { game, viewerId } = scenarios.visitorDecision({ peace: true });
    renderGame(game, viewerId, { page: "map" });
    expect(screen.getByText("Peace Treaty: no attacks")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Attack" })).toBeDisabled();
  });

  it("asks the owner out of turn to Collect, and keeps the visitor waiting", () => {
    const owner = scenarios.ownerDecision("1");
    const ownerView = renderGame(owner.game, owner.viewerId, { page: "home" });
    expect(screen.getByText("Alice stopped on your Plot 5. Collect 30 coin or attack?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Attack" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Attack" }));
    expect(ownerView.send).toHaveBeenLastCalledWith("attack");
    fireEvent.click(screen.getByRole("button", { name: "Collect" }));
    expect(ownerView.send).toHaveBeenCalledWith("collectFee");
    cleanup();

    const visitor = scenarios.ownerDecision("0");
    renderGame(visitor.game, visitor.viewerId, { page: "map" });
    const waiting = dialog("Message");
    expect(waiting).toHaveTextContent("You stand on Bob's plot, waiting for decision…");
    expect(within(waiting).queryByRole("button")).not.toBeInTheDocument();
    fireEvent.keyDown(waiting, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("offers the Lucky Die reroll or Move", () => {
    const { game, viewerId } = scenarios.luckyDieChoice();
    const view = renderGame(game, viewerId, { page: "map" });
    expect(dialog("You rolled 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reroll (Lucky Die)" }));
    expect(view.send).toHaveBeenLastCalledWith("useItem", "luckyDie");
    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(view.send).toHaveBeenLastCalledWith("confirmRoll");
  });

  it("offers the own plot shortcut once and opens the plot management screen", () => {
    const { game, viewerId } = scenarios.ownPlot();
    const view = renderGame(game, viewerId, { page: "map" });
    expect(dialog("Your plot (Plot 5)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Manage" }));
    expect(view.path()).toBe("/room/R001/manage/5");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getAllByText("Plot 5").length).toBeGreaterThan(0);
    // No shop on the manage screen.
    expect(screen.queryByRole("tab", { name: "Shop" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Residents" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(view.path()).toBe("/room/R001/map");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not show the own plot dialog again after Done, even after a reload", () => {
    const { game, viewerId } = scenarios.ownPlot();
    renderGame(game, viewerId, { page: "map" });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    cleanup();
    renderGame(game, viewerId, { page: "map" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("queues a notification for the owner once and remembers it across reloads", () => {
    const before = scenarios.visitorDecision();
    const view = renderGame(before.game, "1", { page: "home" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const after = scenarios.visitorDecision();
    payFee(after.game, "0", createScriptedRng({ d6: [] }));
    view.update(after.game);
    expect(dialog("Fee received")).toHaveTextContent("Alice paid 30 coin to you.");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    cleanup();
    renderGame(after.game, "1", { page: "home" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not replay old notifications to a tab that opens late", () => {
    const after = scenarios.visitorDecision();
    payFee(after.game, "0", createScriptedRng({ d6: [] }));
    renderGame(after.game, "1", { page: "home" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows popups of the moment on any page, not just the Map", () => {
    const { game, viewerId } = scenarios.visitorDecision();
    renderGame(game, viewerId, { page: "home" });
    expect(dialog("Message")).toBeInTheDocument();
  });

  describe("fights", () => {
    // Renders the page with the game as it was, then lets the match move on to `next` (the tab is "caught up" first).
    const renderThen = (before: GameState, next: GameState, viewerId: string, page = "map") => {
      const view = renderGame(before, viewerId, { page });
      view.update(next);
      return view;
    };

    it("sends fighters to the Fight page and keeps them there", () => {
      const { game, viewerId } = scenarios.fightKingMid("1");
      const view = renderGame(game, viewerId, { page: "home" });
      expect(view.path()).toBe("/room/R001/fight");
      expect(screen.getByText("Fight", { selector: ".ui-tag" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("lets a bystander choose between Watch and Later, once per fight", () => {
      const before = scenarios.visitorDecision().game;
      const { game } = scenarios.fightStartedElsewhere("2");
      const view = renderThen(before, game, "2");
      expect(dialog("Fight!")).toHaveTextContent("Alice is attacking Plot 5 (Bob)");
      fireEvent.click(screen.getByRole("button", { name: "Later" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(view.path()).toBe("/room/R001/map");
      expect(screen.getByRole("button", { name: "Watch the fight" })).toBeInTheDocument();
      cleanup();
      renderGame(game, "2", { page: "map" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("opens the fight as a spectator from the notice", () => {
      const before = scenarios.visitorDecision().game;
      const { game } = scenarios.fightStartedElsewhere("2");
      const view = renderThen(before, game, "2");
      fireEvent.click(screen.getByRole("button", { name: "Watch" }));
      expect(view.path()).toBe("/room/R001/fight");
      expect(screen.getByTestId("fight-view")).toHaveAttribute("data-role", "spectator");
      expect(screen.queryByRole("button", { name: "Roll" })).not.toBeInTheDocument();
    });

    it("tells the absent owner that their plot is attacked", () => {
      const before = scenarios.visitorDecision().game;
      const { game } = scenarios.fightStartedElsewhere("1");
      renderThen(before, game, "1", "home");
      expect(dialog("Fight!")).toHaveTextContent("Alice is attacking your Plot 5!");
    });

    const reveal = (): void => {
      act(() => {
        vi.advanceTimersByTime(700);
      });
    };

    it("keeps the Fight page on the last round, then shows the result once and returns to the Map", () => {
      const before = scenarios.fightStartedElsewhere("0").game;
      const { game } = scenarios.fightWon();
      const view = renderThen(before, game, "0", "fight");
      // The deciding round is revealed first: no popup while the dice roll, and the page stays on the fight.
      expect(view.path()).toBe("/room/R001/fight");
      expect(screen.getByTestId("fight-dice")).toHaveAttribute("data-rolling", "true");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      reveal();
      expect(screen.getByTestId("fight-dice")).toHaveAttribute("data-rolling", "false");
      expect(screen.getAllByTestId("fight-score").map((node) => node.textContent)).toEqual(["6 + 5 = 11", "1 + 4 = 5"]);
      expect(screen.getByTestId("fight-status")).toHaveTextContent("You win the fight");
      const result = dialog("Victory!");
      expect(result).toHaveTextContent("Winner: You");
      expect(result).toHaveTextContent("You looted");
      expect(result).toHaveTextContent("residents were killed");
      fireEvent.click(screen.getByRole("button", { name: "Done" }));
      expect(view.path()).toBe("/room/R001/map");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      cleanup();
      renderGame(game, "0", { page: "map" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("shows the result right away after a reload, without replaying the last round", () => {
      const before = scenarios.fightStartedElsewhere("0").game;
      const { game } = scenarios.fightWon();
      renderGame(before, "0", { page: "fight" });
      cleanup();
      const view = renderGame(game, "0", { page: "fight" });
      expect(view.path()).toBe("/room/R001/map");
      expect(screen.queryByTestId("fight-view")).not.toBeInTheDocument();
      expect(dialog("Victory!")).toBeInTheDocument();
    });

    it("lets a watcher see the last round and then a Fight over popup", () => {
      const before = scenarios.fightStartedElsewhere("2").game;
      const { game } = scenarios.fightWon();
      const view = renderThen(before, game, "2", "fight");
      expect(view.path()).toBe("/room/R001/fight");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      reveal();
      expect(screen.getByTestId("fight-status")).toHaveTextContent("Alice wins the fight");
      expect(dialog("Fight over")).toHaveTextContent("Winner: Alice");
      fireEvent.click(screen.getByRole("button", { name: "Done" }));
      expect(view.path()).toBe("/room/R001/map");
    });

    it("does not make a watcher wait for a fight they never watched", () => {
      const before = scenarios.fightStartedElsewhere("2").game;
      const { game } = scenarios.fightWon();
      renderThen(before, game, "2", "map");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("shows a retreat at once: no last round to roll", () => {
      const before = scenarios.fightStartedElsewhere("0").game;
      const { game } = scenarios.fightRetreated();
      const view = renderThen(before, game, "0", "fight");
      expect(view.path()).toBe("/room/R001/fight");
      expect(screen.getByTestId("fight-dice")).toHaveAttribute("data-rolling", "false");
      expect(screen.getByTestId("fight-status")).toHaveTextContent("You retreated");
      expect(dialog("Defeat")).toHaveTextContent("You retreated. It counts as a loss.");
    });

    it("shows the result before the offer to buy a destroyed plot", () => {
      const before = scenarios.fightStartedElsewhere("0").game;
      const { game } = scenarios.fightDestroyed();
      renderThen(before, game, "0", "fight");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      reveal();
      expect(dialog("Victory!")).toHaveTextContent("Plot 5 was destroyed");
      fireEvent.click(screen.getByRole("button", { name: "Done" }));
      expect(screen.getByRole("dialog")).toHaveTextContent("You broke Plot 5. Buy it now");
    });

    it("tells the plot owner how the fight ended", () => {
      const before = scenarios.fightStartedElsewhere("1").game;
      const { game } = scenarios.fightWon();
      renderThen(before, game, "1", "home");
      expect(dialog("Fight over")).toHaveTextContent("Winner: Alice");
    });
  });
});
