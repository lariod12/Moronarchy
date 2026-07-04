import { Crown, Heart, LandPlot, ScrollText, WalletCards } from "lucide-react";
import type { MoronarchyState } from "@moronarchy/core";

interface PlayerHudProps {
  state: MoronarchyState;
  playerId: string;
}

export const PlayerHud = ({ state, playerId }: PlayerHudProps) => {
  const player = state.players.find((item) => item.id === playerId) ?? state.players[0];
  const ownedLand = state.tiles.filter((tile) => tile.ownerId === player?.id).length;

  if (!player) return null;

  return (
    <section className="player-hud" aria-label="King status">
      <div className="avatar-block">
        <div className="avatar-mark">
          <Crown size={24} />
        </div>
        <div>
          <strong>{player.name}</strong>
          <span>{player.defeated ? "Defeated" : `Tile ${String(player.position).padStart(2, "0")}`}</span>
        </div>
      </div>
      <div className="stat-grid">
        <div className="stat-pill">
          <Heart size={16} />
          <span>{player.health}</span>
        </div>
        <div className="stat-pill">
          <WalletCards size={16} />
          <span>{player.coin}</span>
        </div>
        <div className="stat-pill">
          <Crown size={16} />
          <span>Lv {player.level}</span>
        </div>
        <div className="stat-pill">
          <LandPlot size={16} />
          <span>{ownedLand}</span>
        </div>
      </div>
      <div className="lap-line">
        <ScrollText size={14} />
        <span>Lap {player.lapCount}</span>
      </div>
    </section>
  );
};
