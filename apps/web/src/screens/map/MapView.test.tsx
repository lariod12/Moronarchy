import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GameState, PlayerId, TileId } from "@moronarchy/core/engine";
import * as scenarios from "../../dev/gallery/game-fixtures";
import { MapView } from "./MapView";

const positionsOf = (game: GameState): Record<PlayerId, TileId> =>
  Object.fromEntries(game.turnOrder.map((id) => [id, game.kings[id]?.position ?? 1]));

const tile = (label: string): HTMLElement => {
  const found = screen.getAllByTestId("board-tile").find((element) => element.getAttribute("data-tile") === label);
  if (!found) {
    throw new Error(`tile ${label} missing`);
  }
  return found;
};

describe("MapView", () => {
  it("draws 40 tiles with 01 in the top-right and 11, 21, 31 in the other corners", () => {
    const { game, viewerId } = scenarios.mapMidgame();
    render(<MapView game={game} viewerId={viewerId} positions={positionsOf(game)} canRoll />);
    expect(screen.getAllByTestId("board-tile")).toHaveLength(40);
    expect(tile("01").style.gridRow).toBe("1");
    expect(tile("01").style.gridColumn).toBe("11");
    expect(tile("11").style.gridRow).toBe("11");
    expect(tile("11").style.gridColumn).toBe("11");
    expect(tile("21").style.gridRow).toBe("11");
    expect(tile("21").style.gridColumn).toBe("1");
    expect(tile("31").style.gridRow).toBe("1");
    expect(tile("31").style.gridColumn).toBe("1");
    expect(tile("01")).toHaveAttribute("aria-label", "Tile 01, Start");
  });

  it("fills my plots and shows the seat number of other owners", () => {
    const { game, viewerId } = scenarios.mapMidgame();
    render(<MapView game={game} viewerId={viewerId} positions={positionsOf(game)} canRoll />);
    for (const label of ["05", "12", "27"]) {
      expect(tile(label)).toHaveClass("board-tile--mine");
      expect(within(tile(label)).queryByTestId("owner-badge")).not.toBeInTheDocument();
    }
    expect(within(tile("08")).getByTestId("owner-badge")).toHaveTextContent("2");
    expect(within(tile("33")).getByTestId("owner-badge")).toHaveTextContent("3");
    expect(within(tile("22")).getByTestId("owner-badge")).toHaveTextContent("4");
    expect(tile("08")).not.toHaveClass("board-tile--mine");
    expect(tile("20")).not.toHaveClass("board-tile--mine");
    expect(within(tile("20")).queryByTestId("owner-badge")).not.toBeInTheDocument();
  });

  it("draws every alive king as a token with an initial, several on one tile", () => {
    const { game, viewerId } = scenarios.mapMidgame();
    render(<MapView game={game} viewerId={viewerId} positions={positionsOf(game)} canRoll />);
    expect(screen.getAllByTestId("king-token")).toHaveLength(4);
    expect(within(tile("04")).getByTestId("king-token")).toHaveTextContent("A");
    expect(within(tile("04")).getByLabelText("Alice (you)")).toBeInTheDocument();
    const shared = within(tile("15")).getAllByTestId("king-token");
    expect(shared.map((token) => token.textContent)).toEqual(["B", "C"]);
    expect(within(tile("31")).getByTestId("king-token")).toHaveTextContent("D");
  });

  it("does not draw eliminated kings", () => {
    const { game, viewerId } = scenarios.spectator();
    render(<MapView game={game} viewerId={viewerId} positions={positionsOf(game)} canRoll={false} />);
    expect(screen.getAllByTestId("king-token")).toHaveLength(2);
  });

  it("draws a king where the movement says, not where the engine already put them", () => {
    const { game, viewerId } = scenarios.rolled(4);
    const positions = { ...positionsOf(game), "0": 3 };
    render(<MapView game={game} viewerId={viewerId} positions={positions} canRoll={false} />);
    expect(within(tile("03")).getByLabelText("Alice (you)")).toBeInTheDocument();
    expect(within(tile("05")).queryByLabelText("Alice (you)")).not.toBeInTheDocument();
  });

  it("enables Tap to Roll only when it can be used", () => {
    const { game, viewerId } = scenarios.mapStart();
    const onRoll = vi.fn();
    const { rerender } = render(<MapView game={game} viewerId={viewerId} positions={positionsOf(game)} canRoll onRoll={onRoll} />);
    fireEvent.click(screen.getByRole("button", { name: "Tap to Roll" }));
    expect(onRoll).toHaveBeenCalledTimes(1);
    rerender(<MapView game={game} viewerId={viewerId} positions={positionsOf(game)} canRoll={false} onRoll={onRoll} />);
    expect(screen.getByRole("button", { name: "Tap to Roll" })).toBeDisabled();
  });

  it("shows the die value and the move total after a roll", () => {
    const { game, viewerId } = scenarios.rolled(4);
    render(<MapView game={game} viewerId={viewerId} positions={positionsOf(game)} canRoll={false} />);
    expect(screen.getByRole("img", { name: "Dice 4" })).toBeInTheDocument();
    expect(screen.getByTestId("dice-total")).toHaveTextContent("4");
  });

  it("shakes the die while rolling", () => {
    const { game, viewerId } = scenarios.mapStart();
    render(<MapView game={game} viewerId={viewerId} positions={positionsOf(game)} canRoll={false} rolling />);
    expect(screen.getByRole("img", { name: /^Dice/ })).toHaveClass("ui-dice--rolling");
  });

  it("offers the Horse only to the turn player holding one before the roll", () => {
    const { game, viewerId } = scenarios.mapHorse();
    const onUseHorse = vi.fn();
    const { rerender } = render(<MapView game={game} viewerId={viewerId} positions={positionsOf(game)} canRoll onUseHorse={onUseHorse} />);
    fireEvent.click(screen.getByRole("button", { name: "Use Horse (+3)" }));
    expect(onUseHorse).toHaveBeenCalledTimes(1);

    rerender(<MapView game={game} viewerId="1" positions={positionsOf(game)} canRoll={false} />);
    expect(screen.queryByRole("button", { name: /Use Horse/ })).not.toBeInTheDocument();

    const plain = scenarios.mapStart();
    rerender(<MapView game={plain.game} viewerId={plain.viewerId} positions={positionsOf(plain.game)} canRoll />);
    expect(screen.queryByRole("button", { name: /Use Horse/ })).not.toBeInTheDocument();
  });

  it("tells the viewer whose turn it is", () => {
    const { game } = scenarios.mapStart();
    render(<MapView game={game} viewerId="1" positions={positionsOf(game)} canRoll={false} />);
    expect(screen.getByText("Alice's turn")).toBeInTheDocument();
  });
});
