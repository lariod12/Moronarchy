import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Crown, Map, Wifi, WifiOff } from "lucide-react";
import { useNavigate } from "react-router";
import type { MoronarchyState } from "@moronarchy/core";
import { ActionPanel } from "./ActionPanel";
import { GameBoard } from "./GameBoard";
import { PlayerHud } from "./PlayerHud";

interface GameTableProps {
  G: MoronarchyState;
  ctx: {
    currentPlayer: string;
    gameover?: { winner?: string };
  };
  moves: {
    [moveName: string]: (...args: unknown[]) => void;
  };
  playerID?: string | null;
  matchID?: string;
  isActive?: boolean;
  isConnected?: boolean;
}

export const GameTable = ({
  G,
  ctx,
  moves,
  playerID,
  matchID = "local",
  isActive = false,
  isConnected = false
}: GameTableProps) => {
  const navigate = useNavigate();
  const currentPlayerId = playerID ?? "0";
  const currentPlayer = G.players.find((player) => player.id === ctx.currentPlayer);
  const winner = G.winnerId ?? ctx.gameover?.winner ?? null;
  const latestLog = G.logs[0]?.message ?? "Roll dice and claim the kingdom.";

  return (
    <main className="phone-frame game-screen">
      <header className="game-topbar">
        <button className="icon-button" onClick={() => navigate(`/room/${matchID}`)} aria-label="Back to room">
          <ArrowLeft size={20} />
        </button>
        <div className="round-chip">
          <span>Round</span>
          <strong>{Math.min(G.currentRound, G.maxRounds)} / {G.maxRounds}</strong>
        </div>
        <div className="room-chip">
          <span>Room</span>
          <strong>{matchID.slice(0, 6)}</strong>
        </div>
        <button className="icon-button" aria-label="Map">
          <Map size={20} />
        </button>
      </header>

      <section className="turn-banner">
        <div>
          <span>Current king</span>
          <strong>{currentPlayer?.name ?? `Player ${Number(ctx.currentPlayer) + 1}`}</strong>
        </div>
        <div className={isConnected ? "connection connected" : "connection disconnected"}>
          {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span>{isConnected ? "Online" : "Offline"}</span>
        </div>
      </section>

      <GameBoard state={G} currentPlayerId={currentPlayerId} />

      <section className="dice-panel" aria-label="Dice result">
        <motion.div
          key={G.lastDiceRoll?.value ?? "idle"}
          animate={{ rotate: G.lastDiceRoll ? [0, -8, 8, 0] : 0, scale: G.lastDiceRoll ? [1, 1.08, 1] : 1 }}
          className="dice-face"
        >
          {G.lastDiceRoll?.value ?? "?"}
        </motion.div>
        <p>{latestLog}</p>
      </section>

      <PlayerHud state={G} playerId={currentPlayerId} />
      <ActionPanel
        state={G}
        playerId={currentPlayerId}
        isActive={isActive}
        moves={{
          rollDice: () => moves.rollDice?.(),
          buyLand: () => moves.buyLand?.(),
          upgradeLand: () => moves.upgradeLand?.(),
          skipTileAction: () => moves.skipTileAction?.()
        }}
      />

      <AnimatePresence>
        {winner && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="result-modal"
              initial={{ scale: 0.94, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 18 }}
            >
              <Crown size={38} />
              <span>Game Over</span>
              <strong>Player {Number(winner) + 1} wins</strong>
              <button className="primary-action" onClick={() => navigate(`/result/${matchID}`)}>
                View result
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};
