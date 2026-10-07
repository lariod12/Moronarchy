import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getItemCount } from "@moronarchy/core/engine";
import * as scenarios from "../../dev/gallery/game-fixtures";
import type { GameScenario } from "../../dev/gallery/game-fixtures";
import { createCanRun } from "../../game/game-actions";
import { FIGHT_ITEM_IDS } from "../../game/labels";
import { ItemSheet } from "./ItemSheet";

const entriesOf = ({ game, viewerId }: GameScenario) => {
  const canRun = createCanRun(game, viewerId);
  const king = game.kings[viewerId];
  return FIGHT_ITEM_IDS.flatMap((itemId) => {
    const count = king ? getItemCount(king, itemId) : 0;
    return count > 0 ? [{ itemId, count, enabled: canRun("useItem", itemId) }] : [];
  });
};

describe("ItemSheet", () => {
  it("lists the fight items with counts and effects and uses the chosen one", () => {
    const onUse = vi.fn();
    render(<ItemSheet items={entriesOf(scenarios.fightKingStart("1"))} onUse={onUse} onClose={() => undefined} />);
    const rows = screen.getAllByTestId("item-sheet-row");
    expect(rows.map((row) => row.textContent)).toEqual([
      "Meat ×2Heal 30 healthUse",
      "War Horn ×1+3 attack for this fightUse",
      "Wood Shield ×1+3 defense for this fightUse"
    ]);
    for (const row of rows) {
      expect(within(row).getByRole("button")).toBeEnabled();
    }
    fireEvent.click(within(rows[1] as HTMLElement).getByRole("button", { name: "Use War Horn" }));
    expect(onUse).toHaveBeenCalledWith("warHorn");
  });

  it("enables an item only when the engine would accept it (not after rolling)", () => {
    const scenario = scenarios.fightWaiting();
    const king = scenario.game.kings["1"];
    if (!king) {
      throw new Error("king missing");
    }
    king.items = { warHorn: 1 };
    render(<ItemSheet items={entriesOf(scenario)} onUse={() => undefined} onClose={() => undefined} />);
    expect(screen.getByRole("button", { name: "Use War Horn" })).toBeDisabled();
  });

  it("explains an empty bag and closes", () => {
    const onClose = vi.fn();
    render(<ItemSheet items={[]} onUse={() => undefined} onClose={onClose} />);
    expect(screen.getByTestId("item-sheet-empty")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
