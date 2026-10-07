import { getPlotInfo } from "@moronarchy/core/engine";
import type { GameState, ItemId, ItemUse, TileId } from "@moronarchy/core/engine";

// Where each kind of item is used. No numbers here: the engine content has them (ITEMS[id].summary / description).
export const ITEM_WHERE: Record<ItemUse, string> = {
  now: "Use it on your turn, or in a fight before you roll.",
  plot: "Choose one of your plots to use it on.",
  map: "Used on the Map when you roll the dice.",
  fight: "Used in a fight, before you roll.",
  passive: "Equipment: its bonus is already part of your stats."
};

// Why a Use button is disabled. `usablePlots` is how many own plots the engine would accept a plot item on.
export const getUseHint = (game: GameState, itemId: ItemId, use: "now" | "plot", ownedPlotIds: TileId[], usablePlots: number): string | null => {
  if (use === "now") {
    return "Not now: use it on your turn";
  }
  if (ownedPlotIds.length === 0) {
    return "You own no plots yet";
  }
  if (usablePlots > 0) {
    return null;
  }
  const allHealthy = ownedPlotIds.every((plotId) => {
    const info = getPlotInfo(game, plotId);
    return info !== null && info.health >= info.maxHealth;
  });
  return itemId === "hammer" && allHealthy
    ? "All your plots are in full health"
    : "Not now: use it on your turn, before you roll, at the Start Station or after you moved";
};
