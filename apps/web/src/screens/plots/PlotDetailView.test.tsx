import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlayerId } from "@moronarchy/core/engine";
import * as scenarios from "../../dev/gallery/game-fixtures";
import { createRunCheck } from "../../game/game-actions";
import { MANAGE_HINT } from "../../game/hints";
import type { StationAction } from "../station/station-confirm";
import { PlotDetailView } from "./PlotDetailView";

const renderDetail = (scenario: scenarios.GameScenario, plotId: number, viewerId: PlayerId = scenario.viewerId, initialConfirm?: StationAction) => {
  const onAction = vi.fn();
  const onOpenResident = vi.fn();
  render(
    <PlotDetailView
      game={scenario.game}
      viewerId={viewerId}
      plotId={plotId}
      check={createRunCheck(scenario.game, viewerId)}
      onAction={onAction}
      onOpenResident={onOpenResident}
      initialConfirm={initialConfirm}
    />
  );
  return { onAction, onOpenResident };
};

describe("PlotDetailView", () => {
  it("shows every tag of the plot from the engine numbers", () => {
    renderDetail(scenarios.infoGame(), 12);
    expect(screen.getByRole("region", { name: "Plot 12" })).toBeInTheDocument();
    for (const text of ["Level: 2", "Price: 80", "Income: 24", "Fee: 72", "Health: 25/35", "Defense: 2", "Max Resident: 3", "Owner: Alice"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByText("Residents 3/3")).toBeInTheDocument();
  });

  it("locks Upgrade with a hint outside the Start station and the plot you stand on", () => {
    renderDetail(scenarios.infoGame(), 12);
    expect(screen.getByRole("button", { name: "Upgrade 80" })).toBeDisabled();
    expect(screen.getByTestId("upgrade-hint")).toHaveTextContent(MANAGE_HINT);
  });

  it("enables Upgrade at the Start station and asks before spending", () => {
    const { onAction } = renderDetail(scenarios.station(), 5);
    const upgrade = screen.getByRole("button", { name: /^Upgrade \d+$/ });
    expect(upgrade).toBeEnabled();
    expect(screen.queryByTestId("upgrade-hint")).not.toBeInTheDocument();
    fireEvent.click(upgrade);
    expect(screen.getByRole("dialog", { name: "Upgrade" })).toHaveTextContent(/Spend \d+ coin for next level of Plot 5\?/);
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.click(upgrade);
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(onAction).toHaveBeenCalledWith({ name: "upgradePlot", plotId: 5 });
  });

  it("opens with the confirm question for the gallery", () => {
    renderDetail(scenarios.station(), 5, "0", { name: "upgradePlot", plotId: 5 });
    expect(screen.getByRole("dialog", { name: "Upgrade" })).toBeInTheDocument();
  });

  it("says why the engine refuses: not enough coin", () => {
    const scenario = scenarios.station();
    scenario.game.kings["0"]!.coin = 1;
    renderDetail(scenario, 5);
    expect(screen.getByRole("button", { name: /^Upgrade \d+$/ })).toBeDisabled();
    expect(screen.getByTestId("upgrade-hint")).toHaveTextContent("Not enough coin");
  });

  it("has no Upgrade for another king's plot, and shows its owner", () => {
    renderDetail(scenarios.infoGame(), 8);
    expect(screen.queryByRole("button", { name: /Upgrade/ })).not.toBeInTheDocument();
    expect(screen.getByText("Owner: Bob")).toBeInTheDocument();
  });

  it("shows a free plot with its bank price and no owner", () => {
    renderDetail(scenarios.infoGame(), 3);
    expect(screen.getByText("Owner: None")).toBeInTheDocument();
    expect(screen.getByText("Price: 60")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Upgrade/ })).not.toBeInTheDocument();
  });

  it("opens a resident of the plot", () => {
    const { onOpenResident } = renderDetail(scenarios.infoGame(), 12);
    fireEvent.click(screen.getAllByTestId("plot-resident")[0] as HTMLElement);
    expect(onOpenResident).toHaveBeenCalledWith(expect.objectContaining({ kind: "warrior" }));
  });

  it("is read-only for a spectator", () => {
    renderDetail(scenarios.infoEliminated(), 5, "2");
    expect(screen.queryByRole("button", { name: /Upgrade/ })).not.toBeInTheDocument();
  });
});
