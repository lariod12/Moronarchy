import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import * as scenarios from "../dev/gallery/game-fixtures";
import { renderGame } from "./test-utils";

const topBarTitle = (): string => (document.querySelector(".shell-top-bar__side--end")?.textContent ?? "").trim();

describe("in-game info pages", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("opens every Home tile, titles the TopBar and goes Back to Home", () => {
    const { game, viewerId } = scenarios.infoGame();
    const view = renderGame(game, viewerId, { page: "home" });
    const expectations: Array<[string, string, string]> = [
      ["Stats", "/room/R001/stats/0", "Players Info"],
      ["Plots", "/room/R001/plots", "Plots"],
      ["Map", "/room/R001/map", "Map"],
      ["Residents", "/room/R001/residents", "Residents"],
      ["Items", "/room/R001/items", "Items"],
      ["Events", "/room/R001/events", "Events"]
    ];
    for (const [tile, path, title] of expectations) {
      fireEvent.click(screen.getByRole("button", { name: tile }));
      expect(view.path()).toBe(path);
      expect(topBarTitle()).toBe(title);
      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      expect(view.path()).toBe("/room/R001/home");
    }
  });

  it("stays on the info page when the Crown is tapped (navigation is the Back arrow's job)", () => {
    const { game, viewerId } = scenarios.infoGame();
    const view = renderGame(game, viewerId, { page: "items" });
    fireEvent.click(screen.getByRole("button", { name: /^Crown/ }));
    expect(view.path()).toBe("/room/R001/items");
  });

  it("opens my Players Info from the HUD avatar, and cycles through the kings in turn order", () => {
    const { game, viewerId } = scenarios.infoGame();
    const view = renderGame(game, viewerId, { page: "map" });
    fireEvent.click(screen.getByRole("button", { name: /Alice: profile/ }));
    expect(view.path()).toBe("/room/R001/stats/0");
    expect(topBarTitle()).toBe("Players Info");
    expect(screen.getByRole("heading", { name: "Alice" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next king" }));
    expect(view.path()).toBe("/room/R001/stats/1");
    expect(screen.getByRole("heading", { name: "Bob" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next king" }));
    fireEvent.click(screen.getByRole("button", { name: "Next king" }));
    expect(screen.getByRole("heading", { name: "Dan" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next king" }));
    expect(view.path()).toBe("/room/R001/stats/0");
    fireEvent.click(screen.getByRole("button", { name: "Previous king" }));
    expect(screen.getByRole("heading", { name: "Dan" })).toBeInTheDocument();

    // Stepping between kings replaces the entry: Back leaves the page.
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(view.path()).toBe("/room/R001/map");
  });

  it("sends an unknown player back to my own page", () => {
    const { game, viewerId } = scenarios.infoGame();
    const view = renderGame(game, viewerId, { page: "stats/9" });
    expect(view.path()).toBe("/room/R001/stats/0");
  });

  it("walks Plots -> Plot detail -> Back and keeps the All scope and the grid", () => {
    const { game, viewerId } = scenarios.infoGame();
    const view = renderGame(game, viewerId, { page: "home" });
    fireEvent.click(screen.getByRole("button", { name: "Plots" }));
    expect(screen.getAllByRole("row").slice(1).filter((row) => !row.classList.contains("ui-data-table__action-row"))).toHaveLength(3);
    fireEvent.click(screen.getByRole("tab", { name: "All" }));
    expect(view.path()).toBe("/room/R001/plots");
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toContain("Owner");
    fireEvent.click(screen.getByRole("button", { name: "View All" }));
    fireEvent.click(within(screen.getByTestId("plots-grid")).getByRole("button", { name: /Plot 8/ }));
    expect(view.path()).toBe("/room/R001/plots/8");
    expect(topBarTitle()).toBe("Plot 8");
    expect(screen.getByText("Owner: Bob")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(view.path()).toBe("/room/R001/plots");
    expect(screen.getByTestId("plots-grid")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
  });

  it("walks Residents -> Warrior -> a resident and titles each page", () => {
    const { game, viewerId } = scenarios.infoGame();
    const view = renderGame(game, viewerId, { page: "residents" });
    fireEvent.click(screen.getByRole("button", { name: /Warrior/ }));
    expect(view.path()).toBe("/room/R001/residents/warrior");
    expect(topBarTitle()).toBe("Warrior");
    fireEvent.click(screen.getByRole("button", { name: "details" }));
    expect(view.path()).toMatch(/^\/room\/R001\/residents\/warrior\/r\d+$/);
    expect(topBarTitle()).toBe("Residents");
    expect(screen.getByText("Name: 01")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(view.path()).toBe("/room/R001/residents");
  });

  it("sends an unknown resident kind or id back to the overview", () => {
    const { game, viewerId } = scenarios.infoGame();
    for (const page of ["residents/dragon", "residents/warrior/nope"]) {
      const view = renderGame(game, viewerId, { page });
      expect(view.path()).toBe("/room/R001/residents");
      view.unmount();
    }
  });

  it("opens an item, shows its name in the TopBar and sends Use to the engine", () => {
    const { game, viewerId } = scenarios.infoGame();
    const view = renderGame(game, viewerId, { page: "items" });
    fireEvent.click(screen.getByRole("button", { name: /^Meat/ }));
    expect(view.path()).toBe("/room/R001/items/meat");
    expect(topBarTitle()).toBe("Meat");
    fireEvent.click(screen.getByRole("button", { name: "Use" }));
    expect(view.send).toHaveBeenCalledWith("useItem", "meat");
  });

  it("sends the chosen plot with a Sickle", () => {
    const { game, viewerId } = scenarios.infoGame();
    const view = renderGame(game, viewerId, { page: "items/sickle" });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));
    fireEvent.click(screen.getByRole("button", { name: "Use on Plot 12" }));
    expect(view.send).toHaveBeenCalledWith("useItem", "sickle", { plotId: 12 });
  });

  it("leaves an item page for the list once the item is used up", () => {
    const { game, viewerId } = scenarios.infoGame();
    const view = renderGame(game, viewerId, { page: "items/horse" });
    expect(screen.getByRole("heading", { name: "Horse" })).toBeInTheDocument();
    const next = structuredClone(game);
    delete next.kings["0"]!.items.horse;
    view.update(next);
    expect(view.path()).toBe("/room/R001/items");
    expect(screen.queryByText("Horse")).not.toBeInTheDocument();
  });

  it("sends an unknown item to the list", () => {
    const { game, viewerId } = scenarios.infoGame();
    expect(renderGame(game, viewerId, { page: "items/nonsense" }).path()).toBe("/room/R001/items");
  });

  it("upgrades the plot I stand on from its detail page, after asking", async () => {
    const { game, viewerId } = scenarios.ownPlot();
    game.kings["0"]!.level = 2;
    const view = renderGame(game, viewerId, { page: "plots/5" });
    fireEvent.click(await screen.findByRole("button", { name: "Done" }));
    fireEvent.click(screen.getByRole("button", { name: /^Upgrade \d+$/ }));
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(view.send).toHaveBeenCalledWith("upgradePlot", 5);
  });

  it("shows the Events page and the Positions tab of the Map", () => {
    const { game, viewerId } = scenarios.eventsGame();
    renderGame(game, viewerId, { page: "events" });
    expect(screen.getAllByTestId("event-card")).toHaveLength(3);
  });

  it("switches the Map to Positions and back to the Board", () => {
    const { game, viewerId } = scenarios.infoGame();
    renderGame(game, viewerId, { page: "map" });
    expect(screen.getByTestId("map-board")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Positions" }));
    expect(screen.queryByTestId("map-board")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("positions-player")).toHaveLength(4);
    fireEvent.click(screen.getByRole("tab", { name: "Board" }));
    expect(screen.getByTestId("map-board")).toBeInTheDocument();
  });

  it("keeps every info page readable for an eliminated king, without actions", () => {
    const { game, viewerId } = scenarios.spectator();
    game.plots[3]!.ownerId = "0";
    game.plots[3]!.level = 1;
    const stats = renderGame(game, viewerId, { page: "stats/0" });
    expect(screen.getByRole("heading", { name: "Alice" })).toBeInTheDocument();
    stats.unmount();
    for (const page of ["plots/5", "residents", "items", "events", "plots"]) {
      const next = renderGame(game, viewerId, { page });
      expect(next.path()).toBe(`/room/R001/${page}`);
      expect(screen.queryByRole("button", { name: /^Upgrade/ })).not.toBeInTheDocument();
      next.unmount();
    }
  });
});
