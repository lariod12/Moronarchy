import { getPositionsView } from "@moronarchy/core/engine";
import type { GameState, PlayerId, PositionRow } from "@moronarchy/core/engine";
import { tileLabel } from "../../game/labels";
import { DataTable } from "../../ui/DataTable/DataTable";
import { Tag } from "../../ui/Tag/Tag";
import type { DataTableColumn } from "../../ui/DataTable/DataTable";
import "./MapView.css";

export interface PositionsViewProps {
  game: GameState;
  viewerId: PlayerId;
  // Kings the server reports as disconnected: dimmed and tagged "offline".
  offlineIds?: ReadonlySet<PlayerId>;
}

// "Steps": where every king stands, in turn order. The king whose turn it is is marked, the eliminated ones are greyed.
export const PositionsView = ({ game, viewerId, offlineIds }: PositionsViewProps) => {
  const columns: Array<DataTableColumn<PositionRow>> = [
    { key: "turn", header: "Turn", width: "16%", render: (row) => row.turn },
    {
      key: "player",
      header: "Player",
      width: "38%",
      render: (row) => (
        <span className="positions__player" data-testid="positions-player" data-player={row.playerId}>
          {row.isCurrent ? <span aria-hidden="true">{"▸ "}</span> : null}
          <span>{row.playerId === viewerId ? `${row.name} (you)` : row.name}</span>
          {row.isCurrent ? <span className="sr-only"> (current turn)</span> : null}
          {row.eliminated ? <span className="sr-only"> (out of the game)</span> : null}
          {!row.eliminated && offlineIds?.has(row.playerId) ? (
            <Tag tone="muted" className="positions__offline">
              offline
            </Tag>
          ) : null}
        </span>
      )
    },
    { key: "position", header: "Position", width: "26%", render: (row) => tileLabel(row.position) },
    { key: "laps", header: "Laps", width: "20%", render: (row) => row.laps }
  ];

  return (
    <div className="positions" data-testid="positions">
      <DataTable
        className="positions__table"
        columns={columns}
        rows={getPositionsView(game)}
        getRowId={(row) => row.playerId}
        getRowClassName={(row) =>
          row.eliminated
            ? "positions-row--out"
            : [row.isCurrent ? "positions-row--current" : "", offlineIds?.has(row.playerId) ? "positions-row--offline" : ""].filter(Boolean).join(" ") || undefined
        }
      />
    </div>
  );
};
