import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

  it("walks the moving marker through each tile instead of crossing the board", () => {
    vi.useFakeTimers();

    try {
      const state = createInitialState(["0", "1"]);
      state.players[0]!.position = 7;
      state.lastDiceRoll = {
        playerId: "0",
        from: 1,
        to: 7,
        value: 6,
        passedStart: false
      };

      const { container } = render(<GameBoard state={state} currentPlayerId="0" visiblePlayerIds={["0"]} />);
      const token = container.querySelector(".king-token");

      expect(token).toHaveStyle({ top: "4.545454545454546%" });

      act(() => {
        vi.advanceTimersByTime(750);
      });

      expect(token).toHaveStyle({ top: "13.636363636363635%" });

      act(() => {
        vi.advanceTimersByTime(260);
      });

      expect(token).toHaveStyle({ top: "22.727272727272727%" });
    } finally {
      vi.useRealTimers();
    }
  });
});
