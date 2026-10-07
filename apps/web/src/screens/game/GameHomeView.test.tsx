import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createTestGame } from "@moronarchy/core/testing";
import { GameHomeView } from "./GameHomeView";

describe("GameHomeView", () => {
  it("shows the round, room code, Home title and the six hub tiles", () => {
    render(<GameHomeView game={createTestGame(3)} viewerId="0" roomCode="RABCD" />);
    expect(screen.getByText("Round 1")).toBeInTheDocument();
    expect(screen.getByText("RABCD")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    for (const title of ["Stats", "Plots", "Dice Status", "Residents", "Items", "Events"]) {
      expect(screen.getByRole("button", { name: title })).toBeDisabled();
    }
  });

  it("shows the viewer's own stats", () => {
    const game = createTestGame(2);
    const king = game.kings["1"];
    if (!king) {
      throw new Error("king 1 missing");
    }
    render(<GameHomeView game={game} viewerId="1" roomCode="RABCD" />);
    expect(screen.getByText(`health: ${king.health}`)).toBeInTheDocument();
    expect(screen.getByText(`coin: ${king.coin}`)).toBeInTheDocument();
    expect(screen.getByText(`level: ${king.level}`)).toBeInTheDocument();
  });

  it("shakes the crown for the turn player only", () => {
    const game = createTestGame(3);
    const { rerender } = render(<GameHomeView game={game} viewerId={game.turn.playerId} roomCode="RABCD" />);
    expect(screen.getByRole("button", { name: /hold to take your turn/ })).toBeInTheDocument();

    const other = game.turnOrder.find((id) => id !== game.turn.playerId) ?? "1";
    rerender(<GameHomeView game={game} viewerId={other} roomCode="RABCD" />);
    expect(screen.queryByRole("button", { name: /hold to take your turn/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Crown/ })).toBeInTheDocument();
  });
});
