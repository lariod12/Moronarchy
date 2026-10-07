import type { ItemId } from "@moronarchy/core/engine";
import { FIGHT_ITEM_EFFECTS, ITEM_LABELS } from "../../game/labels";
import { Button } from "../../ui/Button/Button";
import { Dialog } from "../../ui/Dialog/Dialog";
import "./FightView.css";

export interface ItemSheetEntry {
  itemId: ItemId;
  count: number;
  // The engine would accept using it right now.
  enabled: boolean;
}

export interface ItemSheetProps {
  items: ItemSheetEntry[];
  onUse: (itemId: ItemId) => void;
  onClose: () => void;
}

// The items a fighter can use before their roll. Only what the bag holds is listed.
export const ItemSheet = ({ items, onUse, onClose }: ItemSheetProps) => (
  <Dialog title="Use item" actions={[{ label: "Close", onSelect: onClose }]} onDismiss={onClose}>
    {items.length === 0 ? (
      <p data-testid="item-sheet-empty">You have no items for this fight.</p>
    ) : (
      <ul className="item-sheet" data-testid="item-sheet">
        {items.map((entry) => (
          <li key={entry.itemId} className="item-sheet__row" data-testid="item-sheet-row">
            <span className="item-sheet__info">
              <span>{`${ITEM_LABELS[entry.itemId]} ×${entry.count}`}</span>
              <span className="item-sheet__effect">{FIGHT_ITEM_EFFECTS[entry.itemId] ?? ""}</span>
            </span>
            <Button size="sm" onClick={() => onUse(entry.itemId)} disabled={!entry.enabled} aria-label={`Use ${ITEM_LABELS[entry.itemId]}`}>
              Use
            </Button>
          </li>
        ))}
      </ul>
    )}
  </Dialog>
);
