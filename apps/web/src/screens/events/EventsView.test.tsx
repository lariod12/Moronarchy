import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import * as scenarios from "../../dev/gallery/game-fixtures";
import { EventsView, activeLabel, durationLabel } from "./EventsView";

describe("EventsView", () => {
  it("shows the History Events tab and a card per event, active global event first", () => {
    const { game, viewerId } = scenarios.eventsGame();
    render(<EventsView game={game} viewerId={viewerId} />);
    expect(screen.getByRole("tab", { name: "History Events" })).toHaveAttribute("aria-selected", "true");
    const cards = screen.getAllByTestId("event-card");
    expect(cards.map((card) => card.getAttribute("data-event"))).toEqual(["bountifulYear", "pickpocket", "treasureChest"]);
    expect(cards.map((card) => card.getAttribute("data-active"))).toEqual(["true", "false", "false"]);
  });

  it("shows the name, the quoted description and the scope and duration tags", () => {
    const { game, viewerId } = scenarios.eventsGame();
    render(<EventsView game={game} viewerId={viewerId} />);
    const [bountiful, pickpocket, treasure] = screen.getAllByTestId("event-card") as [HTMLElement, HTMLElement, HTMLElement];
    expect(within(bountiful).getByText("Bountiful Year")).toBeInTheDocument();
    expect(within(bountiful).getByText('"Plot income x2 for two rounds."')).toBeInTheDocument();
    expect(within(bountiful).getByText("Active · 2 rounds left")).toBeInTheDocument();
    expect(within(bountiful).getByText("All")).toBeInTheDocument();
    expect(within(bountiful).getByText("2 Rounds")).toBeInTheDocument();
    // Personal events: Bob's is tagged with his name, Alice's own with "You"; both are instant.
    expect(within(pickpocket).getByText("Bob")).toBeInTheDocument();
    expect(within(pickpocket).getByText("Instant")).toBeInTheDocument();
    expect(within(pickpocket).queryByText(/Active/)).not.toBeInTheDocument();
    expect(within(treasure).getByText("You")).toBeInTheDocument();
    expect(within(treasure).getByText('"Found a treasure chest: +60 coin."')).toBeInTheDocument();
  });

  it("tags events from the viewer's side", () => {
    const { game } = scenarios.eventsGame();
    render(<EventsView game={game} viewerId="1" />);
    const cards = screen.getAllByTestId("event-card");
    expect(within(cards[1] as HTMLElement).getByText("You")).toBeInTheDocument();
    expect(within(cards[2] as HTMLElement).getByText("Alice")).toBeInTheDocument();
  });

  it("has an empty state without events", () => {
    const { game, viewerId } = scenarios.mapStart();
    render(<EventsView game={game} viewerId={viewerId} />);
    expect(screen.getByText("No events yet")).toBeInTheDocument();
    expect(screen.queryByTestId("event-card")).not.toBeInTheDocument();
  });

  it("is readable by an eliminated king", () => {
    const { game } = scenarios.eventsGame();
    const cara = game.kings["2"]!;
    cara.eliminated = true;
    render(<EventsView game={game} viewerId="2" />);
    expect(screen.getAllByTestId("event-card")).toHaveLength(3);
  });
});

describe("event labels", () => {
  it("names durations and the rounds left", () => {
    expect(durationLabel(0)).toBe("Instant");
    expect(durationLabel(1)).toBe("1 Round");
    expect(durationLabel(2)).toBe("2 Rounds");
    expect(activeLabel(1)).toBe("Active · 1 round left");
    expect(activeLabel(2)).toBe("Active · 2 rounds left");
  });
});
