import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as scenarios from "../../dev/gallery/game-fixtures";
import { StatsView } from "./StatsView";

describe("StatsView", () => {
  it("shows my king with every stat, laps and plots", () => {
    const { game, viewerId } = scenarios.infoGame();
    const king = game.kings["0"]!;
    render(<StatsView game={game} playerId="0" viewerId={viewerId} />);
    expect(screen.getByRole("heading", { name: "Alice" })).toBeInTheDocument();
    for (const text of [
      `Level: ${king.level}`,
      `Coin: ${king.coin}`,
      `Health: ${king.health}`,
      `Max Health: ${king.maxHealth}`,
      "Laps: 2",
      "Plots: 3"
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByText("This is your king")).toBeInTheDocument();
  });

  it("shows the equipment bonus next to the effective stat", () => {
    const { game, viewerId } = scenarios.infoGame();
    const bob = game.kings["1"]!;
    render(<StatsView game={game} playerId="1" viewerId={viewerId} />);
    expect(screen.getByText(`Attack: ${bob.attack + 2} (+2)`)).toBeInTheDocument();
    expect(screen.getByText(`Defense: ${bob.defense + 2} (+2)`)).toBeInTheDocument();
    expect(screen.getByText(`Lucky: ${bob.lucky + 2} (+2)`)).toBeInTheDocument();
    expect(screen.queryByText("This is your king")).not.toBeInTheDocument();
  });

  it("shows plain values for the stats that no equipment changes", () => {
    const { game, viewerId } = scenarios.infoGame();
    const alice = game.kings["0"]!;
    render(<StatsView game={game} playerId="0" viewerId={viewerId} />);
    // Alice carries an Iron Sword only.
    expect(screen.getByText(`Attack: ${alice.attack + 2} (+2)`)).toBeInTheDocument();
    expect(screen.getByText(`Defense: ${alice.defense}`)).toBeInTheDocument();
    expect(screen.getByText(`Lucky: ${alice.lucky}`)).toBeInTheDocument();
  });

  it("crosses out an eliminated king but still shows the numbers", () => {
    const { game, viewerId } = scenarios.infoEliminated();
    const { container } = render(<StatsView game={game} playerId="2" viewerId={viewerId} />);
    expect(container.querySelector(".ui-avatar--crossed")).not.toBeNull();
    expect(screen.getByText("Out of the game")).toBeInTheDocument();
    expect(screen.getByText("Coin: 0")).toBeInTheDocument();
  });

  it("offers the previous and next king only when it can cycle", () => {
    const { game, viewerId } = scenarios.infoGame();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const { rerender } = render(<StatsView game={game} playerId="0" viewerId={viewerId} onPrev={onPrev} onNext={onNext} />);
    fireEvent.click(screen.getByRole("button", { name: "Previous king" }));
    fireEvent.click(screen.getByRole("button", { name: "Next king" }));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    rerender(<StatsView game={game} playerId="0" viewerId={viewerId} />);
    expect(screen.queryByRole("button", { name: "Next king" })).not.toBeInTheDocument();
  });

  it("says so for an unknown player", () => {
    const { game, viewerId } = scenarios.infoGame();
    render(<StatsView game={game} playerId="9" viewerId={viewerId} />);
    expect(screen.getByText("Unknown player")).toBeInTheDocument();
  });
});
