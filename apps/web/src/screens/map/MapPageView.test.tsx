import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as scenarios from "../../dev/gallery/game-fixtures";
import { MapPageView } from "./MapPageView";
import { PositionsView } from "./PositionsView";

describe("MapPageView", () => {
  it("shows the board on the Board tab and switches to Positions", () => {
    const { game, viewerId } = scenarios.mapMidgame();
    const onTab = vi.fn();
    const { rerender } = render(<MapPageView game={game} viewerId={viewerId} tab="board" onTab={onTab} board={<div data-testid="board-slot" />} />);
    expect(screen.getByRole("tab", { name: "Board" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("board-slot")).toBeInTheDocument();
    expect(screen.queryByTestId("positions")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Positions" }));
    expect(onTab).toHaveBeenCalledWith("positions");

    rerender(<MapPageView game={game} viewerId={viewerId} tab="positions" onTab={onTab} board={<div data-testid="board-slot" />} />);
    expect(screen.queryByTestId("board-slot")).not.toBeInTheDocument();
    expect(screen.getByTestId("positions")).toBeInTheDocument();
  });
});

describe("PositionsView", () => {
  it("lists every king in turn order as Turn | Player | Position | Laps", () => {
    const { game, viewerId } = scenarios.mapMidgame();
    render(<PositionsView game={game} viewerId={viewerId} />);
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Turn", "Player", "Position", "Laps"]);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent?.replace(/ \(current turn\)/, "")))).toEqual([
      ["1", "▸ Alice (you)", "04", "0"],
      ["2", "Bob", "15", "0"],
      ["3", "Cara", "15", "0"],
      ["4", "Dan", "31", "0"]
    ]);
  });

  it("marks the current turn player for screen readers and with a row class", () => {
    const { game, viewerId } = scenarios.mapMidgame();
    render(<PositionsView game={game} viewerId={viewerId} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveClass("positions-row--current");
    expect(within(rows[0] as HTMLElement).getByText("(current turn)")).toBeInTheDocument();
    expect(rows[1]).not.toHaveClass("positions-row--current");
  });

  it("greys out eliminated kings but still lists them", () => {
    const { game, viewerId } = scenarios.infoEliminated();
    render(<PositionsView game={game} viewerId={viewerId} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(4);
    expect(rows[2]).toHaveClass("positions-row--out");
    expect(within(rows[2] as HTMLElement).getByText("(out of the game)")).toBeInTheDocument();
    expect(rows[1]).not.toHaveClass("positions-row--out");
  });
});
