import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createInitialState } from "@moronarchy/core";
import { GameBoard } from "./GameBoard";

describe("GameBoard", () => {
  it("renders exactly 40 board tiles", () => {
    render(<GameBoard state={createInitialState(["0", "1"])} currentPlayerId="0" />);

    expect(screen.getAllByText(/^\d{2}$/)).toHaveLength(40);
  });

  it("renders markers for every visible player", () => {
    const { container } = render(
      <GameBoard state={createInitialState(["0", "1", "2", "3"])} currentPlayerId="0" visiblePlayerIds={["0", "1"]} />
    );
    const board = within(container);

    expect(container.querySelectorAll(".king-token")).toHaveLength(2);
    expect(board.getByLabelText("Player 1 marker")).toBeInTheDocument();
    expect(board.getByLabelText("Player 2 marker")).toBeInTheDocument();
    expect(board.queryByLabelText("Player 3 marker")).not.toBeInTheDocument();
    expect(container.querySelector(".turn-token-caret")).not.toBeInTheDocument();
  });

  it("renders the turn indicator only when enabled for the local player", () => {
    const { container } = render(
      <GameBoard
        state={createInitialState(["0", "1"])}
        currentPlayerId="1"
        turnPlayerId="1"
        showTurnIndicator
      />
    );

    expect(container.querySelector(".turn-token-caret")).toBeInTheDocument();
  });
});
