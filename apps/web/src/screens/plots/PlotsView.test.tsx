import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as scenarios from "../../dev/gallery/game-fixtures";
import { PlotsView } from "./PlotsView";
import type { PlotsLayout, PlotsScope } from "./PlotsView";

const renderPlots = (scenario: scenarios.GameScenario, scope: PlotsScope, layout: PlotsLayout) => {
  const handlers = { onScope: vi.fn(), onLayout: vi.fn(), onOpenPlot: vi.fn() };
  render(<PlotsView game={scenario.game} viewerId={scenario.viewerId} scope={scope} layout={layout} {...handlers} />);
  return handlers;
};

const dataRows = (): HTMLElement[] => screen.getAllByRole("row").slice(1).filter((row) => !row.classList.contains("ui-data-table__action-row"));

const cellTexts = (row: HTMLElement): string[] => within(row).getAllByRole("cell").map((cell) => cell.textContent ?? "");

describe("PlotsView", () => {
  it("lists only my plots with Plots | Level | Income | Price, and no Owner column", () => {
    renderPlots(scenarios.infoGame(), "mine", "table");
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Plots", "Level", "Income", "Price"]);
    expect(dataRows().map((row) => cellTexts(row)[0])).toEqual(["5", "12", "27"]);
    // Plot 5: level 1, income and bank price from the engine.
    expect(cellTexts(dataRows()[0] as HTMLElement)).toEqual(["5", "1", "16", "60"]);
  });

  it("lists all 39 plots with an Owner column, Start excluded", () => {
    renderPlots(scenarios.infoGame(), "all", "table");
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Plots", "Level", "Income", "Price", "Owner"]);
    const rows = dataRows();
    expect(rows).toHaveLength(39);
    expect(cellTexts(rows[0] as HTMLElement)[0]).toBe("2");
    const rowOf = (plot: string) => rows.find((row) => cellTexts(row)[0] === plot) as HTMLElement;
    expect(cellTexts(rowOf("5"))[4]).toBe("Alice");
    expect(cellTexts(rowOf("8"))[4]).toBe("Bob");
    expect(cellTexts(rowOf("3"))[4]).toBe("–");
  });

  it("shows details for the selected row and opens that plot", () => {
    const handlers = renderPlots(scenarios.infoGame(), "mine", "table");
    // The first row starts selected.
    fireEvent.click(screen.getByRole("button", { name: "details" }));
    expect(handlers.onOpenPlot).toHaveBeenLastCalledWith(5);
    fireEvent.click(within(dataRows()[1] as HTMLElement).getAllByRole("cell")[0] as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "details" }));
    expect(handlers.onOpenPlot).toHaveBeenLastCalledWith(12);
  });

  it("switches Mine | All and the layout through callbacks", () => {
    const handlers = renderPlots(scenarios.infoGame(), "mine", "table");
    expect(screen.getByRole("tab", { name: "Mine" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "All" }));
    expect(handlers.onScope).toHaveBeenCalledWith("all");
    fireEvent.click(screen.getByRole("button", { name: "View All" }));
    expect(handlers.onLayout).toHaveBeenCalledWith("grid");
  });

  it("draws a grid of plot cards with the level", () => {
    const handlers = renderPlots(scenarios.infoGame(), "mine", "grid");
    const cards = within(screen.getByTestId("plots-grid")).getAllByRole("button");
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent("Plot 5");
    expect(cards[0]).toHaveTextContent("Level: 1");
    fireEvent.click(cards[1] as HTMLElement);
    expect(handlers.onOpenPlot).toHaveBeenCalledWith(12);
    fireEvent.click(screen.getByRole("button", { name: "View Table" }));
    expect(handlers.onLayout).toHaveBeenCalledWith("table");
  });

  it("shows the owner on grid cards of the All scope", () => {
    renderPlots(scenarios.infoGame(), "all", "grid");
    const cards = within(screen.getByTestId("plots-grid")).getAllByRole("button");
    expect(cards).toHaveLength(39);
    expect(cards.find((card) => card.textContent?.includes("Plot 8"))).toHaveTextContent("Bob");
  });

  it("has an empty state for a king without plots, but All still lists every plot", () => {
    const empty = scenarios.mapStart();
    const { unmount } = render(
      <PlotsView game={empty.game} viewerId={empty.viewerId} scope="mine" layout="table" onScope={vi.fn()} onLayout={vi.fn()} onOpenPlot={vi.fn()} />
    );
    expect(screen.getByText("You own no plots yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    unmount();
    renderPlots(empty, "all", "table");
    expect(dataRows()).toHaveLength(39);
  });
});
