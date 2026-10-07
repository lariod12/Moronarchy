import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as scenarios from "../../dev/gallery/game-fixtures";
import { CardPickView } from "./CardPickView";

const offers = () => {
  const { game } = scenarios.cardPick();
  if (game.pending?.kind !== "pickCard") {
    throw new Error("expected a card pick");
  }
  return game.pending.offers;
};

describe("CardPickView", () => {
  it("shows each offered card with its name and value", () => {
    render(<CardPickView offers={offers()} onPick={vi.fn()} />);
    const cards = screen.getAllByTestId("upgrade-card");
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent("Max Health");
    expect(cards[0]).toHaveTextContent("+15");
    expect(cards[1]).toHaveTextContent("Attack");
    expect(cards[2]).toHaveTextContent("Defense");
  });

  it("reports the tapped card", () => {
    const onPick = vi.fn();
    render(<CardPickView offers={offers()} onPick={onPick} />);
    fireEvent.click(screen.getAllByTestId("upgrade-card")[1] as HTMLElement);
    expect(onPick).toHaveBeenCalledWith(1);
  });

  it("asks for confirmation of the chosen card", () => {
    const onNo = vi.fn();
    const onYes = vi.fn();
    render(<CardPickView offers={offers()} onPick={vi.fn()} confirmIndex={1} onConfirmNo={onNo} onConfirmYes={onYes} />);
    expect(screen.getByRole("dialog", { name: "You have picked" })).toHaveTextContent("Attack +2. Are you sure?");
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(onNo).toHaveBeenCalledTimes(1);
    expect(onYes).toHaveBeenCalledTimes(1);
  });

  it("congratulates on the card that was taken", () => {
    const onDone = vi.fn();
    render(<CardPickView offers={offers()} onPick={vi.fn()} congrats={offers()[0]} onCongratsDone={onDone} />);
    expect(screen.getByRole("dialog", { name: "Congratulation!" })).toHaveTextContent("You got Max Health +15");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
