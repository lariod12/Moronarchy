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
  const landTiles = state.tiles.filter((tile) => tile.type === "land");

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
        <section className="land-ledger-modal" onClick={() => setIsStatusOpen(false)}>
          <div
            className="land-ledger-screen"
            role="dialog"
            aria-modal="true"
            aria-labelledby="land-ledger-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="land-ledger-header">
              <span className="tag">Round {Math.min(state.currentRound, state.maxRounds)}</span>
              <strong id="land-ledger-title" className="tag center">
                {matchID.slice(0, 6)}
              </strong>
              <span className="tag">{player.name}</span>
            </header>

            <section className="land-ledger-table" aria-label="Land ownership and levels">
              <div className="land-ledger-row land-ledger-row-head">
                <span>Name</span>
                <span>Level</span>
                <span>Plots</span>
                <span>Plots LV</span>
              </div>
              <div className="land-ledger-body">
                {landTiles.map((tile) => {
                  const owner =
                    tile.ownerId !== null ? state.players.find((item) => item.id === tile.ownerId) : null;
                  const isOwnedByPlayer = tile.ownerId === player.id;
                  return (
                    <div
                      key={tile.id}
                      className={`land-ledger-row ${isOwnedByPlayer ? "is-owned-self" : ""}`}
                    >
                      <span>{String(tile.id).padStart(2, "0")}</span>
                      <span>{tile.landLevel}</span>
                      <span>{isOwnedByPlayer ? "Mine" : owner ? `P${Number(owner.id) + 1}` : "-"}</span>
                      <span>{isOwnedByPlayer ? tile.landLevel : "-"}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <button className="land-ledger-close" type="button" onClick={() => setIsStatusOpen(false)}>
              Close
            </button>
          </div>
        </section>
      )}
    </footer>
  );
};
