import { useState } from "react";
import { getResidentInfo } from "@moronarchy/core/engine";
import type { GameState, PlayerId, ResidentId } from "@moronarchy/core/engine";
import type { RunCheck } from "../../game/game-actions";
import { residentIcon } from "../../game/game-icons";
import { getManageHint } from "../../game/hints";
import { plotLabel } from "../../game/labels";
import { Button } from "../../ui/Button/Button";
import { EmptyState } from "../info/EmptyState";
import { InfoCard } from "../info/InfoCard";
import "../info/info-page.css";
import { StationConfirmDialog, costLabel, describeConfirm } from "../station/station-confirm";
import type { Confirm, StationAction } from "../station/station-confirm";
import "./ResidentsView.css";

export interface ResidentDetailViewProps {
  game: GameState;
  viewerId: PlayerId;
  residentId: ResidentId;
  check: RunCheck;
  onAction: (action: StationAction) => void;
  // Gallery hook: open with the "Spend X coin" question already showing.
  initialConfirm?: StationAction;
}

// One resident: its stats and, for the owner, Upgrade (asks first) and Heal (only when the engine would take them).
export const ResidentDetailView = ({ game, viewerId, residentId, check, onAction, initialConfirm }: ResidentDetailViewProps) => {
  const [confirm, setConfirm] = useState<Confirm | null>(() => (initialConfirm ? describeConfirm(game, initialConfirm) : null));
  const info = getResidentInfo(game, residentId);
  if (!info) {
    return <EmptyState text="This resident is gone" />;
  }

  const isMine = info.ownerId === viewerId;
  const upgrade = check("upgradeResident", residentId);
  const heal = check("healResident", residentId);
  const hint = isMine
    ? getManageHint(upgrade, info.upgradeCost === null ? "Highest level reached" : "Upgrade the plot first: a resident cannot outrank its plot")
    : null;

  return (
    <div className="info-page" data-testid="resident-detail" data-resident={residentId}>
      <InfoCard
        title={info.kind === "warrior" ? "Warrior" : "Farmer"}
        icon={residentIcon(info.kind, 132)}
        stats={[
          { label: "Name", value: info.name },
          { label: "Level", value: info.level },
          { label: "Attack", value: info.attack },
          { label: "Defense", value: info.defense },
          { label: "Health", value: `${info.health}/${info.maxHealth}` },
          { label: "Plot", value: info.plotId }
        ]}
        actions={
          isMine ? (
            <>
              <Button tone="strong" disabled={!upgrade.ok} onClick={() => setConfirm(describeConfirm(game, { name: "upgradeResident", residentId }))}>
                {costLabel("Upgrade", info.upgradeCost)}
              </Button>
              <Button disabled={!heal.ok} onClick={() => onAction({ name: "healResident", residentId })}>
                {costLabel("Heal", info.healCost)}
              </Button>
            </>
          ) : undefined
        }
      />
      <p className="info-hint">{`Lives on ${plotLabel(info.plotId)}`}</p>
      {hint ? (
        <p className="info-hint" data-testid="upgrade-hint">
          {hint}
        </p>
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
