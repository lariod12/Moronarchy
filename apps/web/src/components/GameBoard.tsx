import { motion } from "motion/react";
import type { MoronarchyState, PlayerState, TileState } from "@moronarchy/core";
import { getTileGridPosition } from "./tile-layout";

const PLAYER_COLORS = ["#df4d3f", "#2b72d6", "#27966f", "#7c56d9"];

interface GameBoardProps {
  state: MoronarchyState;
  currentPlayerId: string;
}

const getPlayersOnTile = (players: PlayerState[], tileId: number): PlayerState[] => {
  return players.filter((player) => player.position === tileId && !player.defeated);
};

const getTileClass = (tile: TileState, currentPlayerId: string): string => {
  const classes = ["tile", `tile-${tile.type}`];
  if (tile.ownerId) classes.push("tile-owned");
  if (tile.ownerId === currentPlayerId) classes.push("tile-owned-self");
  if (tile.landLevel > 1) classes.push(`tile-level-${tile.landLevel}`);
  return classes.join(" ");
};

export const GameBoard = ({ state, currentPlayerId }: GameBoardProps) => {
  return (
    <section className="board-shell" aria-label="Moronarchy board">
      <div className="board-grid">
        {state.tiles.map((tile) => {
          const position = getTileGridPosition(tile.id);
          const occupants = getPlayersOnTile(state.players, tile.id);
          return (
            <motion.div
              layout
              key={tile.id}
              className={getTileClass(tile, currentPlayerId)}
              style={{
                gridColumn: position.gridColumn,
                gridRow: position.gridRow
              }}
            >
              <span className="tile-id">{String(tile.id).padStart(2, "0")}</span>
              {tile.ownerId && <span className="tile-owner">P{Number(tile.ownerId) + 1}</span>}
              {tile.landLevel > 0 && <span className="tile-level">L{tile.landLevel}</span>}
              <div className="token-stack">
                {occupants.map((player) => (
                  <motion.span
                    layoutId={`token-${player.id}`}
                    key={player.id}
                    className="king-token"
                    style={{ background: PLAYER_COLORS[Number(player.id)] ?? "#171312" }}
                    title={player.name}
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
        <div className="board-center">
          <span className="board-title">Moronarchy</span>
          <span className="board-subtitle">40 tiles kingdom loop</span>
        </div>
      </div>
    </section>
  );
};
