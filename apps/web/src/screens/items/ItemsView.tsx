import { ITEMS, ITEM_IDS, getItemCount } from "@moronarchy/core/engine";
import type { GameState, ItemId, PlayerId } from "@moronarchy/core/engine";
import { itemIcon } from "../../game/game-icons";
import { ITEM_LABELS } from "../../game/labels";
import { Tile } from "../../ui/Tile/Tile";
import { EmptyState } from "../info/EmptyState";
import "../info/info-page.css";

export interface ItemsViewProps {
  game: GameState;
  viewerId: PlayerId;
  onOpenItem: (itemId: ItemId) => void;
}

// What the viewer carries, in the shop's order. Consumables show how many ("x4"), equipment shows "Equipped".
export const getOwnedItems = (game: GameState, viewerId: PlayerId): Array<{ itemId: ItemId; count: number }> => {
  const king = game.kings[viewerId];
  if (!king) {
    return [];
  }
  return ITEM_IDS.flatMap((itemId) => {
    const count = getItemCount(king, itemId);
    return count > 0 ? [{ itemId, count }] : [];
  });
};

export const ItemsView = ({ game, viewerId, onOpenItem }: ItemsViewProps) => {
  const items = getOwnedItems(game, viewerId);
  return (
    <div className="info-page" data-testid="items-page">
      {items.length === 0 ? (
        <EmptyState text="You have no items yet" />
      ) : (
        <ul className="info-grid" data-testid="items-grid">
          {items.map(({ itemId, count }) => (
            <li key={itemId}>
              <Tile
                title={ITEM_LABELS[itemId]}
                icon={itemIcon(itemId, 56)}
                badge={ITEMS[itemId].kind === "equipment" ? "Equipped" : `x${count}`}
                onClick={() => onOpenItem(itemId)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
