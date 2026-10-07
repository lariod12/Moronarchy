import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as scenarios from "../../dev/gallery/game-fixtures";
import { renderGame } from "../../game/test-utils";

describe("FightScreen", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends the roll", () => {
    const { game, viewerId } = scenarios.fightKingMid("1");
    const view = renderGame(game, viewerId, { page: "fight" });
    fireEvent.click(screen.getByRole("button", { name: "Roll" }));
    expect(view.send).toHaveBeenLastCalledWith("fightRoll");
  });

  it("opens the item sheet and uses an item", () => {
    const { game, viewerId } = scenarios.fightKingStart("1");
    const view = renderGame(game, viewerId, { page: "fight" });
    fireEvent.click(screen.getByRole("button", { name: "Use item" }));
    const sheet = screen.getByRole("dialog", { name: "Use item" });
    expect(within(sheet).getAllByTestId("item-sheet-row")).toHaveLength(3);
    fireEvent.click(within(sheet).getByRole("button", { name: "Use War Horn" }));
    expect(view.send).toHaveBeenLastCalledWith("useItem", "warHorn");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks before retreating and shows the fee", () => {
    const { game, viewerId } = scenarios.fightGarrison();
    const view = renderGame(game, viewerId, { page: "fight" });
    fireEvent.click(screen.getByRole("button", { name: "Retreat" }));
    expect(screen.getByRole("dialog", { name: "Retreat" })).toHaveTextContent(/Retreat counts as a loss\. You will pay \d+ coin\./);
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(view.send).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retreat" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(view.send).toHaveBeenLastCalledWith("retreat");
  });

  it("shows a spectator the fight without any action", () => {
    const { game, viewerId } = scenarios.fightSpectator();
    renderGame(game, viewerId, { page: "fight" });
    expect(screen.getByTestId("fight-view")).toHaveAttribute("data-role", "spectator");
    expect(screen.queryByRole("button", { name: "Roll" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use item" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retreat" })).not.toBeInTheDocument();
  });

  it("plays the dice animation when a round resolves, but not on first render", () => {
    const early = scenarios.fightKingMid("1");
    const view = renderGame(early.game, "1", { page: "fight" });
    expect(screen.getByTestId("fight-dice")).toHaveAttribute("data-rolling", "false");
    // Same duel, one more round resolved.
    const resolved = scenarios.fightKingMid("1");
    resolved.game.fight?.rounds.push({ attackerRoll: 4, defenderRoll: 3, attackerScore: 9, defenderScore: 8, winner: "attacker", damage: 6 });
    view.update(resolved.game);
    expect(screen.getByTestId("fight-dice")).toHaveAttribute("data-rolling", "true");
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByTestId("fight-dice")).toHaveAttribute("data-rolling", "false");
  });

  it("stays on the final view when the fight ends under it, then a page opened afterwards leaves", () => {
    const early = scenarios.fightKingMid("1");
    const view = renderGame(early.game, "1", { page: "fight" });
    view.update(scenarios.fightWon().game);
    expect(view.path()).toBe("/room/R001/fight");
    expect(screen.getByTestId("fight-view")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Roll" })).not.toBeInTheDocument();
    cleanup();
    const late = renderGame(scenarios.fightWon().game, "1", { page: "fight" });
    expect(late.path()).toBe("/room/R001/map");
  });
});
