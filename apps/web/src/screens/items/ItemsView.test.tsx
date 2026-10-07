import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ITEMS } from "@moronarchy/core/engine";
import type { ItemId } from "@moronarchy/core/engine";
import * as scenarios from "../../dev/gallery/game-fixtures";
import { createCanRun } from "../../game/game-actions";
import { ItemDetailView } from "./ItemDetailView";
import { ItemsView } from "./ItemsView";

describe("ItemsView", () => {
  it("shows what the bag holds with xN, Equipped for equipment, and opens an item", () => {
    const { game, viewerId } = scenarios.infoGame();
    const onOpenItem = vi.fn();
    render(<ItemsView game={game} viewerId={viewerId} onOpenItem={onOpenItem} />);
    const cards = within(screen.getByTestId("items-grid")).getAllByRole("button");
    expect(cards.map((card) => card.textContent)).toEqual(["Horsex1", "Lucky Diex4", "Meatx2", "Sicklex1", "Hammerx1", "Iron SwordEquipped"]);
    fireEvent.click(cards[2] as HTMLElement);
    expect(onOpenItem).toHaveBeenCalledWith("meat");
  });

  it("has an empty state for an empty bag", () => {
    const { game, viewerId } = scenarios.mapStart();
    render(<ItemsView game={game} viewerId={viewerId} onOpenItem={vi.fn()} />);
    expect(screen.getByText("You have no items yet")).toBeInTheDocument();
    expect(screen.queryByTestId("items-grid")).not.toBeInTheDocument();
  });
});

const renderDetail = (itemId: ItemId, scenario = scenarios.infoGame(), initialDialog?: "description" | "choosePlot") => {
  const onUse = vi.fn();
  const view = render(
    <ItemDetailView
      game={scenario.game}
      viewerId={scenario.viewerId}
      itemId={itemId}
      canRun={createCanRun(scenario.game, scenario.viewerId)}
      onUse={onUse}
      initialDialog={initialDialog}
    />
  );
  return { onUse, ...view };
};

describe("ItemDetailView", () => {
  it("shows the count, the name, the short text from the engine content and where it is used", () => {
    renderDetail("horse");
    expect(screen.getByRole("heading", { name: "Horse" })).toBeInTheDocument();
    expect(screen.getByText("x1")).toBeInTheDocument();
    expect(screen.getByTestId("item-summary")).toHaveTextContent(ITEMS.horse.summary);
    expect(screen.getByTestId("item-where")).toHaveTextContent("Used on the Map");
  });

  it("opens the full Description in a popup and closes it", () => {
    renderDetail("horse");
    fireEvent.click(screen.getByRole("button", { name: "View Details" }));
    const dialog = screen.getByRole("dialog", { name: "Description" });
    expect(dialog).toHaveTextContent(ITEMS.horse.description);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("explains Map and fight items instead of offering Use", () => {
    for (const [itemId, where] of [
      ["horse", "Map"],
      ["luckyDie", "Map"],
      ["ironSword", "Equipment"]
    ] as const) {
      const { unmount } = renderDetail(itemId);
      expect(screen.queryByRole("button", { name: "Use" })).not.toBeInTheDocument();
      expect(screen.getByTestId("item-where")).toHaveTextContent(where);
      unmount();
    }
    const scenario = scenarios.fightKingStart("1");
    for (const itemId of ["warHorn", "woodShield"] as const) {
      const { unmount } = renderDetail(itemId, scenario);
      expect(screen.queryByRole("button", { name: "Use" })).not.toBeInTheDocument();
      expect(screen.getByTestId("item-where")).toHaveTextContent("fight");
      unmount();
    }
  });

  it("uses Meat straight away on my turn", () => {
    const { onUse } = renderDetail("meat");
    expect(screen.getByRole("button", { name: "Use" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Use" }));
    expect(onUse).toHaveBeenCalledWith("meat");
  });

  it("locks Use with a hint when it is not my turn", () => {
    const scenario = scenarios.infoGame();
    scenario.game.turn.playerId = "1";
    renderDetail("meat", scenario);
    expect(screen.getByRole("button", { name: "Use" })).toBeDisabled();
    expect(screen.getByTestId("use-hint")).toHaveTextContent("Not now");
  });

  it("asks which plot for a Sickle and lists my plots", () => {
    const { onUse } = renderDetail("sickle");
    fireEvent.click(screen.getByRole("button", { name: "Use" }));
    const dialog = screen.getByRole("dialog", { name: "Choose a plot" });
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(3);
    for (const button of within(dialog).getAllByRole("button", { name: /^Use on/ })) {
      expect(button).toBeEnabled();
    }
    fireEvent.click(within(dialog).getByRole("button", { name: "Use on Plot 12" }));
    expect(onUse).toHaveBeenCalledWith("sickle", { plotId: 12 });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("only enables the Hammer on a damaged plot", () => {
    const { onUse } = renderDetail("hammer", scenarios.infoGame(), "choosePlot");
    const dialog = screen.getByRole("dialog", { name: "Choose a plot" });
    expect(within(dialog).getByRole("button", { name: "Use on Plot 5" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Use on Plot 12" })).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "Use on Plot 27" })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Use on Plot 12" }));
    expect(onUse).toHaveBeenCalledWith("hammer", { plotId: 12 });
  });

  it("explains why a plot item cannot be used", () => {
    const scenario = scenarios.infoGame();
    for (const plot of scenario.game.plots) {
      plot.health = plot.ownerId === null ? 0 : 999;
    }
    const { unmount } = renderDetail("hammer", scenario);
    expect(screen.getByRole("button", { name: "Use" })).toBeDisabled();
    expect(screen.getByTestId("use-hint")).toHaveTextContent("All your plots are in full health");
    unmount();

    const none = scenarios.infoGame();
    for (const plot of none.game.plots) {
      if (plot.ownerId === "0") {
        plot.ownerId = null;
        plot.residentIds = [];
      }
    }
    renderDetail("sickle", none);
    expect(screen.getByRole("button", { name: "Use" })).toBeDisabled();
    expect(screen.getByTestId("use-hint")).toHaveTextContent("You own no plots yet");
  });

  it("does not show an item that is not in the bag", () => {
    renderDetail("warHorn");
    expect(screen.getByText("You do not have this item")).toBeInTheDocument();
  });
});
