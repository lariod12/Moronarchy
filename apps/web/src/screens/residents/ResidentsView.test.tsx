import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as scenarios from "../../dev/gallery/game-fixtures";
import { createRunCheck } from "../../game/game-actions";
import { MANAGE_HINT } from "../../game/hints";
import { ResidentDetailView } from "./ResidentDetailView";
import { ResidentsKindView } from "./ResidentsKindView";
import { ResidentsView } from "./ResidentsView";

describe("ResidentsView", () => {
  it("shows a Warrior and a Farmer card with my counts and opens the kind", () => {
    const { game, viewerId } = scenarios.infoGame();
    const onOpenKind = vi.fn();
    render(<ResidentsView game={game} viewerId={viewerId} onOpenKind={onOpenKind} />);
    const warrior = screen.getByRole("button", { name: /Warrior/ });
    const farmer = screen.getByRole("button", { name: /Farmer/ });
    expect(warrior).toHaveTextContent("x3");
    expect(farmer).toHaveTextContent("x2");
    fireEvent.click(farmer);
    expect(onOpenKind).toHaveBeenCalledWith("farmer");
    fireEvent.click(warrior);
    expect(onOpenKind).toHaveBeenLastCalledWith("warrior");
  });

  it("counts only my own residents", () => {
    const { game } = scenarios.infoGame();
    render(<ResidentsView game={game} viewerId="1" onOpenKind={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Warrior/ })).toHaveTextContent("x0");
    expect(screen.getByRole("button", { name: /Farmer/ })).toHaveTextContent("x1");
  });
});

describe("ResidentsKindView", () => {
  const renderKind = (kind: "warrior" | "farmer", layout: "table" | "grid") => {
    const { game, viewerId } = scenarios.infoGame();
    const onLayout = vi.fn();
    const onOpenResident = vi.fn();
    render(<ResidentsKindView game={game} viewerId={viewerId} kind={kind} layout={layout} onLayout={onLayout} onOpenResident={onOpenResident} />);
    return { onLayout, onOpenResident };
  };

  it("lists the warriors as Name | Level | Plots | Plots LV", () => {
    const { onOpenResident } = renderKind("warrior", "table");
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Name", "Level", "Plots", "Plots LV"]);
    const rows = screen.getAllByRole("row").slice(1).filter((row) => !row.classList.contains("ui-data-table__action-row"));
    expect(rows).toHaveLength(3);
    // Warrior 01 lives on Plot 5 (level 1).
    expect(within(rows[0] as HTMLElement).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["01", "1", "5", "1"]);
    fireEvent.click(screen.getByRole("button", { name: "details" }));
    expect(onOpenResident).toHaveBeenCalledWith(expect.objectContaining({ name: "01", kind: "warrior" }));
  });

  it("toggles to the grid with View All", () => {
    const { onLayout } = renderKind("warrior", "table");
    fireEvent.click(screen.getByRole("button", { name: "View All" }));
    expect(onLayout).toHaveBeenCalledWith("grid");
  });

  it("draws grid cards with the plot and the name", () => {
    const { onLayout, onOpenResident } = renderKind("farmer", "grid");
    const cards = within(screen.getByTestId("residents-grid")).getAllByRole("button");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("Farmer");
    expect(cards[0]).toHaveTextContent("Plot 5");
    expect(cards[0]).toHaveTextContent("Name: 02");
    fireEvent.click(cards[1] as HTMLElement);
    expect(onOpenResident).toHaveBeenCalledWith(expect.objectContaining({ kind: "farmer" }));
    fireEvent.click(screen.getByRole("button", { name: "View Table" }));
    expect(onLayout).toHaveBeenCalledWith("table");
  });

  it("has an empty state without residents of that kind", () => {
    const { game, viewerId } = scenarios.mapStart();
    render(<ResidentsKindView game={game} viewerId={viewerId} kind="warrior" layout="table" onLayout={vi.fn()} onOpenResident={vi.fn()} />);
    expect(screen.getByText("You have no Warriors yet")).toBeInTheDocument();
  });
});

describe("ResidentDetailView", () => {
  const firstWarriorId = (game: ReturnType<typeof scenarios.infoGame>["game"]): string =>
    Object.values(game.residents).find((resident) => resident.ownerId === "0" && resident.kind === "warrior")?.id ?? "";

  it("shows the resident tags", () => {
    const { game, viewerId } = scenarios.infoGame();
    render(<ResidentDetailView game={game} viewerId={viewerId} residentId={firstWarriorId(game)} check={createRunCheck(game, viewerId)} onAction={vi.fn()} />);
    for (const text of ["Name: 01", "Level: 1", "Attack: 4", "Defense: 2", "Health: 24/30", "Plot: 5"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it("locks Upgrade and Heal with the hint before the Start station", () => {
    const { game, viewerId } = scenarios.infoGame();
    render(<ResidentDetailView game={game} viewerId={viewerId} residentId={firstWarriorId(game)} check={createRunCheck(game, viewerId)} onAction={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^Upgrade/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Heal/ })).toBeDisabled();
    expect(screen.getByTestId("upgrade-hint")).toHaveTextContent(MANAGE_HINT);
  });

  it("asks before upgrading and heals at once when the Start station is open", () => {
    const { game, viewerId } = scenarios.station();
    // The warrior stands on a level 1 plot: raise it so that the resident may level up too.
    game.plots[3]!.level = 2;
    const residentId = Object.values(game.residents).find((resident) => resident.ownerId === "0")?.id ?? "";
    const onAction = vi.fn();
    render(<ResidentDetailView game={game} viewerId={viewerId} residentId={residentId} check={createRunCheck(game, viewerId)} onAction={onAction} />);
    expect(screen.queryByTestId("upgrade-hint")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Heal/ }));
    expect(onAction).toHaveBeenCalledWith({ name: "healResident", residentId });
    fireEvent.click(screen.getByRole("button", { name: /^Upgrade/ }));
    expect(screen.getByRole("dialog", { name: "Upgrade" })).toHaveTextContent(/Spend \d+ coin for next level of Warrior 01\?/);
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(onAction).toHaveBeenLastCalledWith({ name: "upgradeResident", residentId });
  });

  it("has no actions for someone else's resident", () => {
    const { game } = scenarios.infoGame();
    render(<ResidentDetailView game={game} viewerId="1" residentId={firstWarriorId(game)} check={createRunCheck(game, "1")} onAction={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /^Upgrade/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Heal/ })).not.toBeInTheDocument();
  });

  it("explains that a resident cannot outrank its plot", () => {
    const { game, viewerId } = scenarios.station();
    const residentId = Object.values(game.residents).find((resident) => resident.ownerId === "0")?.id ?? "";
    render(<ResidentDetailView game={game} viewerId={viewerId} residentId={residentId} check={createRunCheck(game, viewerId)} onAction={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^Upgrade/ })).toBeDisabled();
    expect(screen.getByTestId("upgrade-hint")).toHaveTextContent("Upgrade the plot first");
  });

  it("says when the resident is gone", () => {
    const { game, viewerId } = scenarios.infoGame();
    render(<ResidentDetailView game={game} viewerId={viewerId} residentId="nope" check={createRunCheck(game, viewerId)} onAction={vi.fn()} />);
    expect(screen.getByText("This resident is gone")).toBeInTheDocument();
  });
});
