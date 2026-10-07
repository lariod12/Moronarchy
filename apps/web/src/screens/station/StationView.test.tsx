import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getPlotHealCost, getPlotUpgradeCost, getResidentHealCost } from "@moronarchy/core/engine";
import { createCanRun } from "../../game/game-actions";
import type { CanRun } from "../../game/game-actions";
import * as scenarios from "../../dev/gallery/game-fixtures";
import { StationView } from "./StationView";
import type { StationScope } from "./StationView";

interface Options {
  canRun?: CanRun;
  scope?: StationScope;
  remainingSteps?: number;
}

const renderStation = ({ canRun, scope = { kind: "station" }, remainingSteps }: Options = {}) => {
  const { game, viewerId } = scenarios.station();
  if (remainingSteps !== undefined) {
    game.turn.remainingSteps = remainingSteps;
  }
  const onAction = vi.fn();
  const onDone = vi.fn();
  render(
    <StationView game={game} viewerId={viewerId} scope={scope} canRun={canRun ?? createCanRun(game, viewerId)} onAction={onAction} onDone={onDone} />
  );
  return { game, viewerId, onAction, onDone };
};

const plotRows = (): HTMLElement[] => screen.getAllByTestId("station-plot-row");

describe("StationView", () => {
  it("summarises the lap from the engine log", () => {
    renderStation();
    expect(screen.getByTestId("station-summary")).toHaveTextContent(/^Lap complete: \+100 coin · Level 2 · Income \+\d+$/);
  });

  it("shows owned plots with the costs the engine computes", () => {
    const { game } = renderStation();
    const rows = plotRows();
    expect(rows).toHaveLength(2);
    const plot5 = game.plots[3];
    const plot12 = game.plots[10];
    if (!plot5 || !plot12) {
      throw new Error("plots missing");
    }
    expect(within(rows[0] as HTMLElement).getByText("Plot 5")).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByRole("button", { name: `Upgrade ${getPlotUpgradeCost(plot5)}` })).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByRole("button", { name: `Heal ${getPlotHealCost(plot12)}` })).toBeInTheDocument();
  });

  it("disables a button exactly when the engine would reject it", () => {
    const { game, viewerId } = renderStation();
    const canRun = createCanRun(game, viewerId);
    const rows = plotRows();
    // Plot 5 is at full health, so Heal is rejected; Plot 12 is damaged, so Heal is allowed.
    expect(canRun("healPlot", 5)).toBe(false);
    expect(within(rows[0] as HTMLElement).getByRole("button", { name: /^Heal/ })).toBeDisabled();
    expect(canRun("healPlot", 12)).toBe(true);
    expect(within(rows[1] as HTMLElement).getByRole("button", { name: /^Heal/ })).toBeEnabled();
    [5, 12].forEach((plotId, index) => {
      const upgrade = within(rows[index] as HTMLElement).getByRole("button", { name: /^Upgrade/ });
      expect(upgrade.hasAttribute("disabled"), `Upgrade Plot ${plotId}`).toBe(!canRun("upgradePlot", plotId));
    });
  });

  it("disables every button of every tab when canRun refuses", () => {
    renderStation({ canRun: () => false });
    for (const tab of ["Plots", "Residents", "Shop"]) {
      fireEvent.click(screen.getByRole("tab", { name: tab }));
      const buttons = within(screen.getByRole("tabpanel")).getAllByRole("button");
      expect(buttons.length, tab).toBeGreaterThan(0);
      for (const button of buttons) {
        expect(button, `${tab}: ${button.textContent}`).toBeDisabled();
      }
    }
  });

  it("enables every button of every tab when canRun accepts", () => {
    renderStation({ canRun: () => true });
    for (const tab of ["Plots", "Residents", "Shop"]) {
      fireEvent.click(screen.getByRole("tab", { name: tab }));
      for (const button of within(screen.getByRole("tabpanel")).getAllByRole("button")) {
        expect(button, `${tab}: ${button.textContent}`).toBeEnabled();
      }
    }
  });

  it("lists residents with heal cost and recruit buttons that show their costs", () => {
    const { game } = renderStation();
    fireEvent.click(screen.getByRole("tab", { name: "Residents" }));
    const residentRow = screen.getByTestId("station-resident-row");
    const resident = Object.values(game.residents)[0];
    if (!resident) {
      throw new Error("resident missing");
    }
    expect(within(residentRow).getByText("Warrior 01")).toBeInTheDocument();
    expect(within(residentRow).getByRole("button", { name: `Heal ${getResidentHealCost(resident)}` })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Recruit Warrior 70" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Recruit Farmer 40" }).length).toBeGreaterThan(0);
  });

  it("sells every item in the shop at its price", () => {
    renderStation();
    fireEvent.click(screen.getByRole("tab", { name: "Shop" }));
    const rows = screen.getAllByTestId("station-shop-row");
    expect(rows).toHaveLength(10);
    expect(within(rows[0] as HTMLElement).getByText("Horse")).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByRole("button", { name: "Buy 40" })).toBeEnabled();
  });

  it("asks before spending on upgrades, recruits and purchases, but not before healing", () => {
    const { onAction } = renderStation();
    fireEvent.click(within(plotRows()[0] as HTMLElement).getByRole("button", { name: /^Upgrade/ }));
    expect(screen.getByRole("dialog", { name: "Upgrade" })).toHaveTextContent(/Spend \d+ coin for next level of Plot 5\?/);
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.click(within(plotRows()[0] as HTMLElement).getByRole("button", { name: /^Upgrade/ }));
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(onAction).toHaveBeenLastCalledWith({ name: "upgradePlot", plotId: 5 });

    fireEvent.click(within(plotRows()[1] as HTMLElement).getByRole("button", { name: /^Heal/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onAction).toHaveBeenLastCalledWith({ name: "healPlot", plotId: 12 });

    fireEvent.click(screen.getByRole("tab", { name: "Residents" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Recruit Farmer 40" })[0] as HTMLElement);
    expect(screen.getByRole("dialog", { name: "Recruit" })).toHaveTextContent("Spend 40 coin to recruit a Farmer on Plot 5?");
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(onAction).toHaveBeenLastCalledWith({ name: "recruitResident", plotId: 5, kind: "farmer" });

    fireEvent.click(screen.getByRole("tab", { name: "Shop" }));
    fireEvent.click(within(screen.getAllByTestId("station-shop-row")[0] as HTMLElement).getByRole("button", { name: "Buy 40" }));
    expect(screen.getByRole("dialog", { name: "Buy" })).toHaveTextContent("Spend 40 coin to buy Horse?");
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(onAction).toHaveBeenLastCalledWith({ name: "buyItem", itemId: "horse" });
  });

  it("offers Continue moving while steps remain", () => {
    const { game, onDone } = renderStation();
    expect(game.turn.remainingSteps).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Continue moving" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("offers Done when no steps remain", () => {
    renderStation({ remainingSteps: 0 });
    expect(screen.queryByRole("button", { name: "Continue moving" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });

  it("limits the plot screen to one plot without a shop", () => {
    renderStation({ scope: { kind: "plot", plotId: 5 } });
    expect(screen.getByTestId("station-summary")).toHaveTextContent("Plot 5 · Level 1 · Residents 1/2");
    expect(plotRows()).toHaveLength(1);
    expect(screen.queryByRole("tab", { name: "Shop" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });
});
