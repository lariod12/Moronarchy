import { getResidentsByKind } from "@moronarchy/core/engine";
import type { GameState, PlayerId, ResidentInfo, ResidentKind } from "@moronarchy/core/engine";
import { residentIcon } from "../../game/game-icons";
import { RESIDENT_LABELS, plotLabel } from "../../game/labels";
import { Button } from "../../ui/Button/Button";
import { DataTable } from "../../ui/DataTable/DataTable";
import type { DataTableColumn } from "../../ui/DataTable/DataTable";
import { Tile } from "../../ui/Tile/Tile";
import { EmptyState } from "../info/EmptyState";
import "../info/info-page.css";
import "./ResidentsView.css";

export type ResidentsLayout = "table" | "grid";

export interface ResidentsKindViewProps {
  game: GameState;
  viewerId: PlayerId;
  kind: ResidentKind;
  layout: ResidentsLayout;
  onLayout: (layout: ResidentsLayout) => void;
  onOpenResident: (resident: ResidentInfo) => void;
}

const COLUMNS: Array<DataTableColumn<ResidentInfo>> = [
  { key: "name", header: "Name", render: (row) => row.name },
  { key: "level", header: "Level", render: (row) => row.level },
  { key: "plot", header: "Plots", render: (row) => row.plotId },
  { key: "plotLevel", header: "Plots LV", render: (row) => row.plotLevel }
];

// The viewer's residents of one kind as a table (Name | Level | Plots | Plots LV) or, with View All, a grid of cards.
export const ResidentsKindView = ({ game, viewerId, kind, layout, onLayout, onOpenResident }: ResidentsKindViewProps) => {
  const residents = getResidentsByKind(game, viewerId)[kind];
  const label = RESIDENT_LABELS[kind];

  if (residents.length === 0) {
    return (
      <div className="info-page" data-testid="residents-kind">
        <EmptyState text={`You have no ${label}s yet`} />
      </div>
    );
  }

  return (
    <div className="info-page info-page--fill residents-list" data-testid="residents-kind" data-layout={layout}>
      {layout === "grid" ? (
        <>
          <div className="info-scroll">
            <ul className="info-grid" data-testid="residents-grid">
              {residents.map((resident) => (
                <li key={resident.id}>
                  <Tile
                    title={label}
                    icon={residentIcon(kind, 56)}
                    badge={[plotLabel(resident.plotId), `Name: ${resident.name}`]}
                    onClick={() => onOpenResident(resident)}
                  />
                </li>
              ))}
            </ul>
          </div>
          <div className="info-footer">
            <Button size="sm" onClick={() => onLayout("table")}>
              View Table
            </Button>
          </div>
        </>
      ) : (
        <DataTable
          columns={COLUMNS}
          rows={residents}
          getRowId={(row) => row.id}
          onRowAction={onOpenResident}
          actionPlacement="below"
          initialSelectedId={residents[0]?.id}
          footerLabel="View All"
          onFooterAction={() => onLayout("grid")}
        />
      )}
    </div>
  );
};
