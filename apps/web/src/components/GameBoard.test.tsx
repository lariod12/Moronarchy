import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createInitialState } from "@moronarchy/core";
import { GameBoard } from "./GameBoard";

describe("GameBoard", () => {
  it("renders exactly 40 board tiles", () => {
    render(<GameBoard state={createInitialState(["0", "1"])} currentPlayerId="0" />);

    expect(screen.getAllByText(/^\d{2}$/)).toHaveLength(40);
  });

  it("renders only the current turn player marker", () => {
    const { container } = render(
      <GameBoard state={createInitialState(["0", "1", "2", "3"])} currentPlayerId="0" turnPlayerId="2" />
    );

    expect(container.querySelectorAll(".king-token")).toHaveLength(1);
    expect(screen.getByLabelText("Player 3 marker")).toBeInTheDocument();
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
