import { useState } from "react";
import { useNavigate } from "react-router";
import type { MoronarchyState } from "@moronarchy/core";

interface PlayerHudProps {
  state: MoronarchyState;
  playerId: string;
  matchID: string;
}

export const PlayerHud = ({ state, playerId, matchID }: PlayerHudProps) => {
  const navigate = useNavigate();
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const player = state.players.find((item) => item.id === playerId) ?? state.players[0];
  const ownedLand = state.tiles.filter((tile) => tile.ownerId === player?.id).length;

  if (!player) return null;

  return (
    <footer className="player-hud" aria-label="Player heads up display">
      <section className="panel player-card" aria-label="Current player">
        <div className="player-name">{player.name}</div>
        <div className="avatar" aria-hidden="true">
          <div className="avatar-head" />
          <div className="avatar-body" />
        </div>
      </section>

      <section className="stats" aria-label="Player stats">
        <div className="stat-row">health: {player.health}</div>
        <div className="stat-row">coin: {player.coin}</div>
        <div className="stat-row">level: {player.level}</div>
      </section>

      <button className="panel nav-button" type="button" onClick={() => navigate(`/room/${matchID}`)} aria-label="Back to room lobby">
        <span className="back-disc" aria-hidden="true" />
      </button>

      <button className="panel crown-button" type="button" onClick={() => setIsStatusOpen(true)} aria-label="Open king status">
        <span className="crown" aria-hidden="true" />
      </button>

      {isStatusOpen && (
        <section className="modal" onClick={() => setIsStatusOpen(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="king-status-title" onClick={(event) => event.stopPropagation()}>
            <strong id="king-status-title">King Status</strong>
            <span>
              Health {player.health} / Coin {player.coin} / Level {player.level} / Land {ownedLand} / Lap {player.lapCount}
            </span>
            <button type="button" onClick={() => setIsStatusOpen(false)}>
              Close
            </button>
          </div>
        </section>
      )}
    </footer>
  );
};
