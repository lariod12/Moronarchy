import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createInitialState } from "@moronarchy/core";
import { GameBoard } from "./GameBoard";

describe("GameBoard", () => {
  it("renders exactly 40 board tiles", () => {
    render(<GameBoard state={createInitialState(["0", "1"])} currentPlayerId="0" />);

    expect(screen.getAllByText(/^\d{2}$/)).toHaveLength(40);
  });
});
