import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { payFee } from "@moronarchy/core/engine";
import { createScriptedRng } from "@moronarchy/core/testing";
import * as scenarios from "../dev/gallery/game-fixtures";
import { renderGame } from "./test-utils";

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

  it("offers the visitor Pay, with Attack disabled for now", () => {
    const { game, viewerId } = scenarios.visitorDecision();
    const view = renderGame(game, viewerId, { page: "map" });
    expect(within(dialog("Message")).getByText(/You get in Bob's plot \(Plot 5\)\. Pay 30 coin or attack\?/)).toBeInTheDocument();
    expect(screen.getByText("Fights arrive in the next update")).toBeInTheDocument();
    const attack = screen.getByRole("button", { name: "Attack" });
    expect(attack).toBeDisabled();
    fireEvent.click(attack);
    expect(view.send).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Pay 30" }));
    expect(view.send).toHaveBeenCalledWith("payFee");
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
    expect(screen.getByRole("button", { name: "Attack" })).toBeDisabled();
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
});
