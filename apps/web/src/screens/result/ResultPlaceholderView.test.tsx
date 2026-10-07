import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResultPlaceholderView } from "./ResultPlaceholderView";

const RANKING = [
  { playerId: "0", name: "Alice" },
  { playerId: "1", name: "Bob" },
  { playerId: "2", name: "Cara" }
];

describe("ResultPlaceholderView", () => {
  it("shows Game over, the winner and the ranking", () => {
    render(<ResultPlaceholderView winnerName="Alice" ranking={RANKING} isHost={false} onQuit={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Game over" })).toBeInTheDocument();
    expect(screen.getByText("Winner: Alice")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["1. Alice", "2. Bob", "3. Cara"]);
  });

  it("lets only the host go back to the lobby, and everyone quit", () => {
    const onBack = vi.fn();
    const onQuit = vi.fn();
    const { rerender } = render(<ResultPlaceholderView winnerName="Alice" ranking={RANKING} isHost onBackToLobby={onBack} onQuit={onQuit} />);
    fireEvent.click(screen.getByRole("button", { name: "Back to lobby" }));
    fireEvent.click(screen.getByRole("button", { name: "Quit" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onQuit).toHaveBeenCalledTimes(1);

    rerender(<ResultPlaceholderView winnerName="Alice" ranking={RANKING} isHost={false} onBackToLobby={onBack} onQuit={onQuit} />);
    expect(screen.queryByRole("button", { name: "Back to lobby" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quit" })).toBeInTheDocument();
  });
});
