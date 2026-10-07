import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createTestGame } from "@moronarchy/core/testing";
import { GameHomeView } from "./GameHomeView";

describe("GameHomeView", () => {
  it("shows the round, room code, Home title and the six hub tiles, inert without a router", () => {
    render(<GameHomeView game={createTestGame(3)} viewerId="0" roomCode="RABCD" />);
    expect(screen.getByText("Round 1")).toBeInTheDocument();
    expect(screen.getByText("RABCD")).toBeInTheDocument();
    expect(screen.getAllByText("Home").length).toBeGreaterThan(0);
    for (const title of ["Stats", "Plots", "Dice Status", "Residents", "Items", "Events"]) {
      expect(screen.getByRole("button", { name: title })).toBeDisabled();
    }
  });

  it("opens the page behind every enabled tile", () => {
    const onOpen = vi.fn();
    render(<GameHomeView game={createTestGame(3)} viewerId="0" roomCode="RABCD" onOpen={onOpen} />);
    const pages = { Stats: "stats", Plots: "plots", "Dice Status": "map", Residents: "residents", Items: "items", Events: "events" };
    for (const [title, page] of Object.entries(pages)) {
      expect(screen.getByRole("button", { name: title })).toBeEnabled();
      fireEvent.click(screen.getByRole("button", { name: title }));
      expect(onOpen).toHaveBeenLastCalledWith(page);
    }
    expect(onOpen).toHaveBeenCalledTimes(6);
  });

  it("shows the viewer's own stats and the activity line", () => {
    const game = createTestGame(2);
    const king = game.kings["1"];
    if (!king) {
      throw new Error("king 1 missing");
    }
    render(<GameHomeView game={game} viewerId="1" roomCode="RABCD" />);
    expect(screen.getByText(`health: ${king.health}`)).toBeInTheDocument();
    expect(screen.getByText(`coin: ${king.coin}`)).toBeInTheDocument();
    expect(screen.getByText(`level: ${king.level}`)).toBeInTheDocument();
    expect(screen.getByTestId("activity-line")).toHaveTextContent("Game started");
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

  it("disables Back on the Home page", () => {
    render(<GameHomeView game={createTestGame(2)} viewerId="0" roomCode="RABCD" />);
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  });
});
