import { Castle } from "lucide-react";
import { getPlotInfo } from "@moronarchy/core/engine";
import type { GameState, PlayerId, PlotInfo, TileId } from "@moronarchy/core/engine";
import { plotLabel } from "../../game/labels";
import { Button } from "../../ui/Button/Button";
import { DataTable } from "../../ui/DataTable/DataTable";
import type { DataTableColumn } from "../../ui/DataTable/DataTable";
import { Tabs } from "../../ui/Tabs/Tabs";
import { Tile } from "../../ui/Tile/Tile";
import { EmptyState } from "../info/EmptyState";
import "../info/info-page.css";
import "./PlotsView.css";

export type PlotsScope = "mine" | "all";
export type PlotsLayout = "table" | "grid";

export interface PlotsViewProps {
  game: GameState;
  viewerId: PlayerId;
  scope: PlotsScope;
  layout: PlotsLayout;
  onScope: (scope: PlotsScope) => void;
  onLayout: (layout: PlotsLayout) => void;
  onOpenPlot: (plotId: TileId) => void;
}

const SCOPE_TABS = [
  { key: "mine", label: "Mine" },
  { key: "all", label: "All" }
] as const;

// Every plot tile (Start is not one) or only the viewer's, with the engine's numbers for each.
export const getPlotRows = (game: GameState, viewerId: PlayerId, scope: PlotsScope): PlotInfo[] =>
  game.plots.flatMap((plot) => {
    if (scope === "mine" && plot.ownerId !== viewerId) {
      return [];
    }
    const info = getPlotInfo(game, plot.id);
    return info ? [info] : [];
  });

const dash = (info: PlotInfo, value: number): string | number => (info.owned ? value : "–");

const BASE_COLUMNS: Array<DataTableColumn<PlotInfo>> = [
  { key: "plot", header: "Plots", render: (row) => row.id },
  { key: "level", header: "Level", render: (row) => dash(row, row.level) },
  { key: "income", header: "Income", render: (row) => dash(row, row.income) },
  { key: "price", header: "Price", render: (row) => row.price }
];

const ALL_COLUMNS: Array<DataTableColumn<PlotInfo>> = [
  { key: "plot", header: "Plots", width: "15%", render: (row) => row.id },
  { key: "level", header: "Level", width: "15%", render: (row) => dash(row, row.level) },
  { key: "income", header: "Income", width: "19%", render: (row) => dash(row, row.income) },
  { key: "price", header: "Price", width: "15%", render: (row) => row.price },
  { key: "owner", header: "Owner", width: "36%", render: (row) => <span className="plots-owner">{row.ownerName ?? "–"}</span> }
];

export const PlotsView = ({ game, viewerId, scope, layout, onScope, onLayout, onOpenPlot }: PlotsViewProps) => {
  const rows = getPlotRows(game, viewerId, scope);
  const columns = scope === "all" ? ALL_COLUMNS : BASE_COLUMNS;

  return (
    <div className="info-page info-page--fill plots" data-testid="plots-page">
      <Tabs tabs={[...SCOPE_TABS]} active={scope} onChange={onScope} label="Plots shown" />
      {rows.length === 0 ? (
        <EmptyState text="You own no plots yet" />
      ) : layout === "grid" ? (
        <>
          <div className="info-scroll">
            <ul className="info-grid" data-testid="plots-grid">
              {rows.map((row) => (
                <li key={row.id}>
                  <Tile
                    title={plotLabel(row.id)}
                    icon={<Castle size={56} />}
                    badge={scope === "all" && row.ownerName ? [`Level: ${row.level}`, row.ownerName] : [`Level: ${row.level}`]}
                    onClick={() => onOpenPlot(row.id)}
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
          key={scope}
          className={`plots-table plots-table--${scope}`}
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          onRowAction={(row) => onOpenPlot(row.id)}
          actionPlacement="below"
          initialSelectedId={rows[0]?.id}
          footerLabel="View All"
          onFooterAction={() => onLayout("grid")}
        />
      )}
    </div>
  );
};
