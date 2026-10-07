import type { CSSProperties } from "react";
import type { TileId } from "@moronarchy/core/engine";
import { cx } from "../../ui/cx";
import { tileLabel } from "../../game/labels";
import { getTileCell } from "./board-layout";
import { KingToken } from "./KingToken";
import type { KingTokenProps } from "./KingToken";
import "./MapView.css";

export interface BoardTileProps {
  tileId: TileId;
  // Seat number of the owner (1-based), null while nobody owns the plot.
  ownerSeat: number | null;
  isMine: boolean;
  tokens: KingTokenProps[];
}

export const BoardTile = ({ tileId, ownerSeat, isMine, tokens }: BoardTileProps) => {
  const { row, col } = getTileCell(tileId);
  const isStart = tileId === 1;
  const label = tileLabel(tileId);
  const description = isStart
    ? "Start"
    : isMine
      ? "your plot"
      : ownerSeat !== null
        ? `owned by seat ${ownerSeat}`
        : "free plot";
  return (
    <div
      className={cx("board-tile", isStart && "board-tile--start", isMine && "board-tile--mine", ownerSeat !== null && !isMine && "board-tile--owned")}
      data-testid="board-tile"
      data-tile={label}
      aria-label={`Tile ${label}, ${description}`}
      style={{ gridRow: row, gridColumn: col } as CSSProperties}
    >
      <span className="board-tile__label">{label}</span>
      {ownerSeat !== null && !isMine ? (
        <span className="board-tile__owner" data-testid="owner-badge">
          {ownerSeat}
        </span>
      ) : null}
      {tokens.length > 0 ? (
        <span className="board-tile__tokens">
          {tokens.map((token, index) => (
            <KingToken key={token.playerId} {...token} slot={index} />
          ))}
        </span>
      ) : null}
    </div>
  );
};
