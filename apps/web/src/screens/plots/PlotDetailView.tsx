import { useState } from "react";
import { Castle } from "lucide-react";
import { getPlotInfo } from "@moronarchy/core/engine";
import type { GameState, PlayerId, ResidentInfo, TileId } from "@moronarchy/core/engine";
import type { RunCheck } from "../../game/game-actions";
import { getManageHint } from "../../game/hints";
import { plotLabel } from "../../game/labels";
import { residentIcon } from "../../game/game-icons";
import { Button } from "../../ui/Button/Button";
import { Tag } from "../../ui/Tag/Tag";
import { EmptyState } from "../info/EmptyState";
import { InfoCard } from "../info/InfoCard";
import "../info/info-page.css";
import { StationConfirmDialog, costLabel, describeConfirm, residentName } from "../station/station-confirm";
import type { Confirm, StationAction } from "../station/station-confirm";
import "./PlotsView.css";

export interface PlotDetailViewProps {
  game: GameState;
  viewerId: PlayerId;
  plotId: TileId;
  check: RunCheck;
  onAction: (action: StationAction) => void;
  onOpenResident: (resident: ResidentInfo) => void;
  // Gallery hook: open with the "Spend X coin" question already showing.
  initialConfirm?: StationAction;
}

// Plot detail: the numbers of the plot, who lives there and, for the owner, Upgrade (only when the engine would take it).
export const PlotDetailView = ({ game, viewerId, plotId, check, onAction, onOpenResident, initialConfirm }: PlotDetailViewProps) => {
  const [confirm, setConfirm] = useState<Confirm | null>(() => (initialConfirm ? describeConfirm(game, initialConfirm) : null));
  const info = getPlotInfo(game, plotId);
  if (!info) {
    return <EmptyState text="Unknown plot" />;
  }

  const isMine = info.ownerId === viewerId;
  const result = check("upgradePlot", plotId);
  const upgradeHint = isMine
    ? getManageHint(result, info.upgradeCost === null ? "Highest level reached" : "Your king level is too low for the next plot level")
    : null;
  const dash = (value: string | number): string | number => (info.owned ? value : "–");

  return (
    <div className="info-page" data-testid="plot-detail" data-plot={plotId}>
      <InfoCard
        title={plotLabel(plotId)}
        icon={<Castle />}
        stats={[
          { label: "Level", value: dash(info.level) },
          { label: "Price", value: info.price },
          { label: "Income", value: dash(info.income) },
          { label: "Fee", value: dash(info.fee) },
          { label: "Health", value: info.owned ? `${info.health}/${info.maxHealth}` : "–" },
          { label: "Defense", value: dash(info.defense) },
          { label: "Max Resident", value: dash(info.maxResidents) },
          { label: "Owner", value: info.ownerName ?? "None" }
        ]}
        actions={
          isMine ? (
            <Button
              tone="strong"
              disabled={!result.ok}
              onClick={() => setConfirm(describeConfirm(game, { name: "upgradePlot", plotId }))}
            >
              {costLabel("Upgrade", info.upgradeCost)}
            </Button>
          ) : undefined
        }
      />
      {upgradeHint ? (
        <p className="info-hint" data-testid="upgrade-hint">
          {upgradeHint}
        </p>
      ) : null}
      {info.residents.length > 0 ? (
        <section aria-label="Residents on this plot">
          <h3 className="plot-detail__title">{`Residents ${info.residents.length}/${info.maxResidents}`}</h3>
          <ul className="info-list">
            {info.residents.map((resident) => (
              <li key={resident.id}>
                <button type="button" className="plot-detail__resident" data-testid="plot-resident" onClick={() => onOpenResident(resident)}>
                  <span className="plot-detail__resident-icon">{residentIcon(resident.kind, 28)}</span>
                  <span>{residentName(resident)}</span>
                  <Tag>{`Lv ${resident.level}`}</Tag>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {confirm ? (
        <StationConfirmDialog
          confirm={confirm}
          onNo={() => setConfirm(null)}
          onYes={() => {
            setConfirm(null);
            onAction(confirm.action);
          }}
        />
      ) : null}
    </div>
  );
};
