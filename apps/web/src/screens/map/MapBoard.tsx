import type { ReactNode } from "react";
import { getPlot } from "@moronarchy/core/engine";
import type { GameState, PlayerId, TileId } from "@moronarchy/core/engine";
import { seatNumber } from "../../game/labels";
import { BOARD_TILE_IDS } from "./board-layout";
import { BoardTile } from "./BoardTile";
import type { KingTokenProps } from "./KingToken";
import "./MapView.css";

export interface MapBoardProps {
  game: GameState;
  viewerId: PlayerId;
  // Where each king is drawn right now (mid-walk for the turn player).
  positions: Record<PlayerId, TileId>;
  children?: ReactNode;
}

// The 40-tile ring with plot owners and king tokens; `children` fill the empty middle.
export const MapBoard = ({ game, viewerId, positions, children }: MapBoardProps) => {
  const tokensByTile = new Map<TileId, KingTokenProps[]>();
  for (const playerId of game.turnOrder) {
    const king = game.kings[playerId];
    const tileId = positions[playerId];
    if (!king || king.eliminated || tileId === undefined) {
      continue;
    }
    const list = tokensByTile.get(tileId) ?? [];
    list.push({ playerId, name: king.name, isViewer: playerId === viewerId });
    tokensByTile.set(tileId, list);
  }

  return (
    <div className="map-board" data-testid="map-board">
      {BOARD_TILE_IDS.map((tileId) => {
        const ownerId = getPlot(game, tileId)?.ownerId ?? null;
        return (
          <BoardTile
            key={tileId}
            tileId={tileId}
            ownerSeat={ownerId === null ? null : seatNumber(ownerId)}
            isMine={ownerId !== null && ownerId === viewerId}
            tokens={tokensByTile.get(tileId) ?? []}
          />
        );
      })}
      <div className="map-board__center">{children}</div>
    </div>
  );
};
