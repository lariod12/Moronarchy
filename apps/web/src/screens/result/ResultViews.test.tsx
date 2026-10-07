import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RankingRow } from "../../game/end-model";
import { LoseView } from "./LoseView";
import { RankingView } from "./RankingView";
import { WinView } from "./WinView";

const ROWS: RankingRow[] = [
  { playerId: "0", name: "Alice", isSelf: false, rank: 1, outRound: null, outReason: null },
  { playerId: "1", name: "Bob", isSelf: true, rank: 2, outRound: 4, outReason: "bankrupt" },
  { playerId: "2", name: "Cara", isSelf: false, rank: 3, outRound: 2, outReason: "left" }
];

describe("LoseView", () => {
  it("says you are out, in which round, and continues on the button", () => {
    const onContinue = vi.fn();
    render(<LoseView round={4} continueLabel="Keep watching" onContinue={onContinue} />);
    expect(screen.getByRole("heading", { name: "You are out!" })).toBeInTheDocument();
    expect(screen.getByText("Bankrupt in round 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep watching" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Leave room" })).not.toBeInTheDocument();
  });

  it("tells a king who was removed for staying disconnected", () => {
    render(<LoseView round={3} reason="left" continueLabel="Keep watching" onContinue={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "You were removed" })).toBeInTheDocument();
    expect(screen.getByText("Disconnected for too long")).toBeInTheDocument();
    expect(screen.queryByText(/Bankrupt/)).not.toBeInTheDocument();
  });

  it("offers Leave room only when it is given", () => {
    const onLeave = vi.fn();
    render(<LoseView round={null} continueLabel="See ranking" onContinue={vi.fn()} onLeave={onLeave} />);
    expect(screen.getByText("Bankrupt")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Leave room" }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});

describe("WinView", () => {
  it("celebrates and goes on to the ranking", () => {
    const onContinue = vi.fn();
    render(<WinView onContinue={onContinue} />);
    expect(screen.getByRole("heading", { name: "You win!" })).toBeInTheDocument();
    expect(screen.getByText("Last king standing")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "See ranking" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

describe("RankingView", () => {
  it("lists the kings in the given order with rank, (you) marker and status", () => {
    render(<RankingView rows={ROWS} isHost onPlayAgain={vi.fn()} onQuit={vi.fn()} />);
    const rows = screen.getAllByTestId("ranking-row");
    expect(rows.map((row) => row.textContent)).toEqual(["1AliceWinner", "2Bob (you)Out in round 4", "3CaraLeft in round 2"]);
    expect(within(rows[0] as HTMLElement).getByText("Winner")).toBeInTheDocument();
  });

  it("gives the host an enabled Play Again next to Quit", () => {
    const onPlayAgain = vi.fn();
    const onQuit = vi.fn();
    render(<RankingView rows={ROWS} isHost onPlayAgain={onPlayAgain} onQuit={onQuit} />);
    fireEvent.click(screen.getByRole("button", { name: "Play Again" }));
    fireEvent.click(screen.getByRole("button", { name: "Quit" }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    expect(onQuit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Waiting for the host to start again")).not.toBeInTheDocument();
  });

  it("disables Play Again for a guest, explains it, and still lets them Quit", () => {
    const onPlayAgain = vi.fn();
    const onQuit = vi.fn();
    render(<RankingView rows={ROWS} isHost={false} onPlayAgain={onPlayAgain} onQuit={onQuit} />);
    expect(screen.getByRole("button", { name: "Play Again" })).toBeDisabled();
    expect(screen.getByText("Waiting for the host to start again")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Quit" }));
    expect(onQuit).toHaveBeenCalledTimes(1);
    expect(onPlayAgain).not.toHaveBeenCalled();
  });
});
