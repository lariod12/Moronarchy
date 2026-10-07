import { useState } from "react";
import { ITEMS, getItemCount, getOwnedPlots } from "@moronarchy/core/engine";
import type { GameState, ItemId, PlayerId, TileId } from "@moronarchy/core/engine";
import type { CanRun } from "../../game/game-actions";
import { itemIcon } from "../../game/game-icons";
import { ITEM_LABELS, plotLabel } from "../../game/labels";
import { Button } from "../../ui/Button/Button";
import { Dialog } from "../../ui/Dialog/Dialog";
import { Tag } from "../../ui/Tag/Tag";
import { EmptyState } from "../info/EmptyState";
import { InfoCard } from "../info/InfoCard";
import "../info/info-page.css";
import { ITEM_WHERE, getUseHint } from "./item-use";
import "./ItemsView.css";

export interface ItemDetailViewProps {
  game: GameState;
  viewerId: PlayerId;
  itemId: ItemId;
  canRun: CanRun;
  onUse: (itemId: ItemId, target?: { plotId: TileId }) => void;
  // Gallery hook: open with a popup already showing.
  initialDialog?: "description" | "choosePlot";
}

// One item: how many, a short text, View Details for the full text and, for items that can be used from here, Use.
export const ItemDetailView = ({ game, viewerId, itemId, canRun, onUse, initialDialog }: ItemDetailViewProps) => {
  const [dialog, setDialog] = useState<"description" | "choosePlot" | null>(initialDialog ?? null);
  const king = game.kings[viewerId];
  const def = ITEMS[itemId];
  const count = king ? getItemCount(king, itemId) : 0;
  if (count === 0) {
    return <EmptyState text="You do not have this item" />;
  }

  const plots = getOwnedPlots(game, viewerId);
  const plotChoices = plots.map((plot) => ({ plot, enabled: canRun("useItem", itemId, { plotId: plot.id }) }));
  const usableOn = plotChoices.filter((choice) => choice.enabled).length;
  const canUse = def.use === "now" ? canRun("useItem", itemId) : def.use === "plot" ? usableOn > 0 : false;
  const showUse = def.use === "now" || def.use === "plot";
  const hint = showUse && !canUse ? getUseHint(game, itemId, def.use as "now" | "plot", plots.map((plot) => plot.id), usableOn) : null;

  return (
    <div className="info-page" data-testid="item-detail" data-item={itemId}>
      <InfoCard
        title={ITEM_LABELS[itemId]}
        corner={`x${count}`}
        icon={itemIcon(itemId, 132)}
        stats={[]}
        note={<span data-testid="item-summary">{def.summary}</span>}
        actions={
          <>
            <Button onClick={() => setDialog("description")}>View Details</Button>
            {showUse ? (
              <Button tone="strong" disabled={!canUse} onClick={() => (def.use === "plot" ? setDialog("choosePlot") : onUse(itemId))}>
                Use
              </Button>
            ) : null}
          </>
        }
        className="item-card"
      />
      <p className="info-hint" data-testid="item-where">
        {ITEM_WHERE[def.use]}
      </p>
      {hint ? (
        <p className="info-hint" data-testid="use-hint">
          {hint}
        </p>
      ) : null}
      {dialog === "description" ? (
        <Dialog title="Description" actions={[{ label: "Close", onSelect: () => setDialog(null) }]} onDismiss={() => setDialog(null)}>
          {def.description}
        </Dialog>
      ) : null}
      {dialog === "choosePlot" ? (
        <Dialog title="Choose a plot" actions={[{ label: "Close", onSelect: () => setDialog(null) }]} onDismiss={() => setDialog(null)}>
          <ul className="item-plots" data-testid="item-plots">
            {plotChoices.map(({ plot, enabled }) => (
              <li key={plot.id} className="item-plots__row">
                <span className="item-plots__info">
                  <span>{plotLabel(plot.id)}</span>
                  <Tag>{`Lv ${plot.level}`}</Tag>
                </span>
                <Button
                  size="sm"
                  disabled={!enabled}
                  aria-label={`Use on ${plotLabel(plot.id)}`}
                  onClick={() => {
                    setDialog(null);
                    onUse(itemId, { plotId: plot.id });
                  }}
                >
                  Use
                </Button>
              </li>
            ))}
          </ul>
        </Dialog>
      ) : null}
    </div>
  );
};
